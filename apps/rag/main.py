"""bot-int RAG microservice — FastAPI + LangChain + pgvector.

Roles:
  POST /ingest  — semantic chunking + Ollama embeddings → knowledge_chunks
  POST /search  — hybrid search (vector cosine + FTS) with RRF fusion
  POST /embed   — raw embeddings passthrough (debug/utility)
  GET  /health  — liveness + DB check
"""
import os
import logging
from contextlib import asynccontextmanager

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from langchain_text_splitters import RecursiveCharacterTextSplitter

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("rag")

DATABASE_URL = os.environ["DATABASE_URL"]
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "llama3.1:latest")
CF_ID = os.environ.get("OLLAMA_CF_ACCESS_CLIENT_ID", "")
CF_SECRET = os.environ.get("OLLAMA_CF_ACCESS_CLIENT_SECRET", "")
CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.environ.get("CHUNK_OVERLAP", "200"))
EMBEDDING_DIMS = int(os.environ.get("EMBEDDING_DIMS", "1536"))
MAX_K = int(os.environ.get("MAX_SEARCH_RESULTS", "6"))
SIM_THRESHOLD = float(os.environ.get("KNOWLEDGE_SIMILARITY_THRESHOLD", "0.2"))

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", "? ", "! ", ", ", " ", ""],
)

_headers = {}
if CF_ID and CF_SECRET:
    _headers = {"CF-Access-Client-Id": CF_ID, "CF-Access-Client-Secret": CF_SECRET}

pool: asyncpg.Pool | None = None
http: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool, http
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
    http = httpx.AsyncClient(timeout=httpx.Timeout(30.0), headers=_headers)
    yield
    await http.aclose()
    await pool.close()


app = FastAPI(title="bot-int RAG", lifespan=lifespan)


class IngestReq(BaseModel):
    documentId: str
    content: str = Field(min_length=1)


class SearchReq(BaseModel):
    tenantId: str
    query: str
    agentId: str = ""
    businessId: str = ""
    k: int = MAX_K


class EmbedReq(BaseModel):
    texts: list[str]


async def embed(texts: list[str]) -> list[list[float] | None]:
    out: list[list[float] | None] = []
    for t in texts:
        try:
            r = await http.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": OLLAMA_EMBED_MODEL, "prompt": t},
            )
            r.raise_for_status()
            vec = r.json()["embedding"]
            out.append(vec if len(vec) == EMBEDDING_DIMS else vec)
        except Exception as e:
            log.warning("embed failed: %s", e)
            out.append(None)
    return out


@app.get("/health")
async def health():
    try:
        await pool.fetchval("SELECT 1")
        db = "ok"
    except Exception:
        db = "error"
    return {"status": "ok" if db == "ok" else "degraded", "database": db}


@app.post("/ingest")
async def ingest(req: IngestReq):
    chunks = splitter.split_text(req.content)
    if not chunks:
        chunks = [req.content]
    vectors = await embed(chunks)
    async with pool.acquire() as conn:
        await conn.execute('DELETE FROM knowledge_chunks WHERE "documentId" = $1', req.documentId)
        for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
            row = await conn.fetchrow(
                'INSERT INTO knowledge_chunks ("documentId", content, embedding, "chunkIndex")'
                " VALUES ($1, $2, $3, $4) RETURNING id",
                req.documentId, chunk,
                str(vec) if vec else None, i,
            )
            if vec:
                await conn.execute(
                    "UPDATE knowledge_chunks SET embedding_vector = $1::vector WHERE id = $2",
                    "[" + ",".join(str(x) for x in vec) + "]", row["id"],
                )
    return {"documentId": req.documentId, "chunks": len(chunks), "embedded": sum(v is not None for v in vectors)}


@app.post("/search")
async def search(req: SearchReq):
    vec = (await embed([req.query]))[0]
    k = min(req.k, 20)
    scope = "(doc.shared = true OR (doc.scope = 'business' AND doc.\"businessId\" = $4) OR (doc.scope = 'agent' AND doc.\"agentId\" = $5))"
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            WITH vec AS (
                SELECT chunk.id, 1 - (chunk.embedding_vector <=> $2::vector) AS score
                FROM knowledge_chunks chunk
                JOIN knowledge_documents doc ON chunk."documentId" = doc.id
                WHERE doc."tenantId" = $1 AND chunk.embedding_vector IS NOT NULL AND {scope}
                ORDER BY chunk.embedding_vector <=> $2::vector LIMIT $6
            ),
            fts AS (
                SELECT chunk.id, ts_rank_cd(
                    to_tsvector('simple', chunk.content),
                    plainto_tsquery('simple', $3)) AS score
                FROM knowledge_chunks chunk
                JOIN knowledge_documents doc ON chunk."documentId" = doc.id
                WHERE doc."tenantId" = $1 AND {scope}
                ORDER BY score DESC LIMIT $6
            ),
            fused AS (
                SELECT id,
                       COALESCE(1.0/(60 + v.r), 0) + COALESCE(1.0/(60 + f.r), 0) AS rrf
                FROM (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) r FROM vec
                ) v
                FULL OUTER JOIN (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) r FROM fts
                ) f USING (id)
            )
            SELECT chunk.content, doc."sourceUrl", doc."createdAt", fused.rrf
            FROM fused
            JOIN knowledge_chunks chunk ON chunk.id = fused.id
            JOIN knowledge_documents doc ON chunk."documentId" = doc.id
            ORDER BY fused.rrf DESC LIMIT $6
            """,
            req.tenantId,
            "[" + ",".join(str(x) for x in vec) + "]" if vec else None,
            req.query, req.businessId, req.agentId, k,
        )
    results = [
        {"content": r["content"], "sourceUrl": r["sourceUrl"], "createdAt": str(r["createdAt"]), "score": float(r["rrf"])}
        for r in rows
    ]
    return {"results": results}


@app.post("/embed")
async def embed_endpoint(req: EmbedReq):
    vecs = await embed(req.texts)
    if any(v is None for v in vecs):
        raise HTTPException(502, "embedding backend failed for at least one text")
    return {"embeddings": vecs}
