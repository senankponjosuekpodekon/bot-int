-- pgvector migration: add vector column to knowledge_chunks
-- Run this after CREATE EXTENSION vector (handled by pgvector/pg16 image)

-- Create extension if not already present
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (1536 dims = text-embedding-3-small default; adjust to your embed model, see EMBEDDING_DIMS)
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Backfill from existing JSON embeddings
UPDATE knowledge_chunks
SET embedding_vector = embedding::vector(1536)
WHERE embedding IS NOT NULL AND embedding_vector IS NULL;

-- Create IVFFLAT index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector
ON knowledge_chunks USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Add index on documentId for faster joins
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
ON knowledge_chunks(documentId);
