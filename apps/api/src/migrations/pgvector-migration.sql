-- pgvector migration: add vector column to knowledge_chunks
-- Run this after CREATE EXTENSION vector (handled by pgvector/pg16 image)

-- Create extension if not already present
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column (3072 dims for llama3.2, adjust for your embed model)
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(3072);

-- Backfill from existing JSON embeddings
UPDATE knowledge_chunks
SET embedding_vector = embedding::vector(3072)
WHERE embedding IS NOT NULL AND embedding_vector IS NULL;

-- Create IVFFLAT index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector
ON knowledge_chunks USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Add index on documentId for faster joins
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
ON knowledge_chunks(documentId);
