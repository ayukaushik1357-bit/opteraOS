-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix RAG RPC return type + ensure service_role grants
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fix match_document_chunks — add `metadata` to RETURNS TABLE.
--    Previous version omitted it, causing NULL metadata in all RAG results.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_org_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  WHERE c.org_id = p_org_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Ensure service_role has EXECUTE on the RPC (needed by webhook & server fns using service client)
GRANT EXECUTE ON FUNCTION public.match_document_chunks TO service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks TO authenticated;

-- 3. Fix service_role grants for webhook tables.
--    The Razorpay webhook uses a service_role Supabase client (no auth user),
--    so it needs explicit grants even though service_role bypasses RLS.
GRANT ALL ON public.processed_webhook_events TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.invoices TO service_role;

-- 4. Add HNSW approximate nearest-neighbor index for fast vector search.
--    Using halfvec cast requires pgvector >= 0.7; cosine distance matches our operator.
--    Create index only if it does not already exist (idempotent via IF NOT EXISTS equivalent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'document_chunks'
      AND indexname = 'idx_doc_chunks_embedding_hnsw'
  ) THEN
    EXECUTE $idx$
      CREATE INDEX idx_doc_chunks_embedding_hnsw
        ON public.document_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $idx$;
  END IF;
END;
$$;

-- 5. Partial index to skip chunks without embeddings during keyword-fallback scans
CREATE INDEX IF NOT EXISTS idx_doc_chunks_no_embedding
  ON public.document_chunks(org_id)
  WHERE embedding IS NULL;
