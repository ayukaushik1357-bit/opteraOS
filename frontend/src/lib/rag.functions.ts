import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgInput = z.object({ orgId: z.string().uuid() });

// ─────────────────────────────────────────────────────────────────────────────
// Text chunking — splits on word boundaries with overlap
// ─────────────────────────────────────────────────────────────────────────────
function chunkText(text: string, chunkSize = 400, overlap = 60): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let index = 0;
  while (index < words.length) {
    const chunk = words.slice(index, index + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    index += chunkSize - overlap;
  }
  return chunks.length > 0 ? chunks : [text.trim()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedding generation via Gemini text-embedding-004
// IMPORTANT: reads ONLY from server-side env vars — never VITE_ prefixed.
// Falls back gracefully and clearly reports unavailability when key is absent.
// ─────────────────────────────────────────────────────────────────────────────
function hasGeminiKey(): boolean {
  const key = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"];
  return typeof key === "string" && key.trim().length > 0;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  // Only use server-side env vars — NEVER VITE_ prefixed ones
  const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"];

  if (!apiKey) {
    // Logged once per call; the caller accumulates and surfaces this clearly.
    console.warn(
      "[optera RAG] No GEMINI_API_KEY configured — chunk stored without embedding. " +
        "Semantic search unavailable; falling back to keyword search.",
    );
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      },
    );

    if (res.status === 429) {
      console.warn("[optera RAG] Embedding API rate-limited; storing chunk without embedding.");
      return null;
    }

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.warn(`[optera RAG] Embedding API error (${res.status}): ${err}`);
      return null;
    }

    const data = await res.json();
    const values: number[] | undefined = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      console.warn("[optera RAG] Unexpected embedding response shape:", data);
      return null;
    }
    return values;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn("[optera RAG] Embedding API timed out; chunk stored without embedding.");
    } else {
      console.warn("[optera RAG] Embedding generation failed:", err.message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Query embedding for search (taskType: RETRIEVAL_QUERY)
// Returns null if key absent — callers must degrade gracefully.
// ─────────────────────────────────────────────────────────────────────────────
async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env["GEMINI_API_KEY"] || process.env["GOOGLE_API_KEY"];
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_QUERY",
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values: number[] | undefined = data?.embedding?.values;
    return Array.isArray(values) && values.length > 0 ? values : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// listDocuments
// ─────────────────────────────────────────────────────────────────────────────
export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("documents")
      .select("id, org_id, name, file_type, file_size, created_at")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }
    return rows ?? [];
  });

// ─────────────────────────────────────────────────────────────────────────────
// uploadDocument — chunk + embed + store
// Returns detailed embedding status so the UI can surface RAG availability.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(160),
        fileType: z.string().default("text/plain"),
        content: z.string().trim().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const fileSize = new Blob([data.content]).size;
    const geminiAvailable = hasGeminiKey();

    if (!geminiAvailable) {
      console.warn(
        "[optera RAG] uploadDocument: GEMINI_API_KEY is absent. " +
          "Chunks will be stored WITHOUT embeddings. " +
          "Semantic vector search is UNAVAILABLE. Keyword (ilike) search will be used as fallback.",
      );
    }

    // 1. Insert document record
    const { data: doc, error: docErr } = await context.supabase
      .from("documents")
      .insert({
        org_id: data.orgId,
        name: data.name,
        file_type: data.fileType,
        file_size: fileSize,
        content: data.content,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (docErr || !doc) throw new Error(docErr?.message ?? "Failed to save document");

    // 2. Chunk the text
    const chunks = chunkText(data.content);

    // 3. Generate embeddings and build insert rows
    // We embed chunks sequentially to avoid rate-limiting (free tier: 60 req/min)
    const chunkInserts: any[] = [];
    let embeddedCount = 0;
    let chunkIdx = 0;

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      if (embedding) embeddedCount++;

      chunkInserts.push({
        org_id: data.orgId,
        document_id: doc.id,
        chunk_index: chunkIdx,
        content: chunk,
        // pgvector accepts the string literal '[x1,x2,...]' format via the REST API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        embedding: embedding ? (`[${embedding.join(",")}]` as any) : null,
        metadata: {
          document_name: data.name,
          chunk_index: chunkIdx,
          has_embedding: embedding !== null,
        },
      });

      // Small delay to respect rate limits on free tier (avoid 429s)
      if (chunkIdx < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
      chunkIdx++;
    }

    // 4. Batch insert chunks
    const { error: chunkErr } = await context.supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (chunkErr) {
      console.warn("[optera RAG] Chunk insert error:", chunkErr.message);
    }

    const semanticSearchEnabled = embeddedCount > 0;

    if (!semanticSearchEnabled) {
      console.warn(
        `[optera RAG] Document "${data.name}" (${chunks.length} chunks) stored WITHOUT embeddings. ` +
          "Vector search will NOT work. Only keyword (ilike) search available.",
      );
    } else {
      console.info(
        `[optera RAG] Document "${data.name}" indexed: ${embeddedCount}/${chunks.length} chunks embedded. Vector search ENABLED.`,
      );
    }

    return {
      id: doc.id,
      totalChunks: chunks.length,
      embeddedChunks: embeddedCount,
      semanticSearchEnabled,
      // Surface the key status so UI can show an actionable warning
      geminiKeyConfigured: geminiAvailable,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// searchKnowledgeBase
// Uses vector similarity when embeddings exist; explicitly reports which path
// was taken. Never silently claims vector search is working when it is not.
//
// ALWAYS filtered to org_id — cross-org access is impossible:
//   - match_document_chunks SQL enforces WHERE c.org_id = p_org_id
//   - keyword fallback enforces .eq("org_id", data.orgId)
// ─────────────────────────────────────────────────────────────────────────────
export const searchKnowledgeBase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orgId: z.string().uuid(),
        query: z.string().trim().min(2),
        limit: z.number().int().min(1).max(10).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 5;
    const geminiAvailable = hasGeminiKey();

    // ── Try vector search first ───────────────────────────────────────────────
    if (geminiAvailable) {
      const queryEmbedding = await generateQueryEmbedding(data.query);

      if (queryEmbedding) {
        try {
          // match_document_chunks enforces org isolation via p_org_id
          const { data: chunks, error } = await context.supabase.rpc("match_document_chunks", {
            query_embedding: `[${queryEmbedding.join(",")}]`,
            match_threshold: 0.65,
            match_count: limit,
            p_org_id: data.orgId,
          });

          if (!error && chunks && Array.isArray(chunks) && chunks.length > 0) {
            console.info(
              `[optera RAG] searchKnowledgeBase: match_document_chunks returned ${chunks.length} semantic results for org ${data.orgId}`,
            );
            return chunks.map((c) => ({
              id: c.id,
              document_id: c.document_id,
              content: c.content,
              similarity: c.similarity,
              metadata: c.metadata,
              search_type: "semantic" as const,
            }));
          }

          if (error) {
            console.warn("[optera RAG] Vector search RPC error:", error.message);
          } else {
            console.info(
              "[optera RAG] match_document_chunks returned 0 results; falling back to keyword search.",
            );
          }
        } catch (rpcErr: any) {
          console.warn("[optera RAG] Vector search RPC exception:", rpcErr.message);
        }
      } else {
        console.warn("[optera RAG] Query embedding generation failed; using keyword fallback.");
      }
    } else {
      // IMPORTANT: explicit log so it is clear semantic RAG is not running
      console.warn(
        "[optera RAG] searchKnowledgeBase: GEMINI_API_KEY not configured. " +
          "Skipping match_document_chunks call. Using keyword (ilike) fallback. " +
          "Semantic RAG is UNAVAILABLE.",
      );
    }

    // ── Fallback: keyword search (always org-scoped) ──────────────────────────
    const { data: chunks, error } = await context.supabase
      .from("document_chunks")
      .select("id, document_id, content, metadata")
      .eq("org_id", data.orgId)
      .ilike("content", `%${data.query}%`)
      .limit(limit);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("42P01")) {
        return [];
      }
      throw new Error(error.message);
    }

    console.info(
      `[optera RAG] searchKnowledgeBase: keyword fallback returned ${(chunks ?? []).length} results for org ${data.orgId}`,
    );

    return (chunks ?? []).map((c) => ({
      ...c,
      similarity: null,
      search_type: "keyword" as const,
      semanticUnavailable: !geminiAvailable,
    }));
  });

// ─────────────────────────────────────────────────────────────────────────────
// deleteDocument
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Cascades to document_chunks via FK ON DELETE CASCADE
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────────────────
// reEmbedDocument — backfill embeddings for existing chunks
// Used to populate embeddings after GEMINI_API_KEY is configured post-upload.
// ─────────────────────────────────────────────────────────────────────────────
export const reEmbedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), documentId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!hasGeminiKey()) {
      throw new Error(
        "Cannot re-embed: GEMINI_API_KEY is not configured on the server. " +
          "Configure the key and try again.",
      );
    }

    // Verify org ownership
    const { data: doc, error: docErr } = await context.supabase
      .from("documents")
      .select("id, org_id, content, name")
      .eq("id", data.documentId)
      .eq("org_id", data.orgId)
      .single();

    if (docErr || !doc) throw new Error("Document not found or access denied.");

    // Get existing chunks (prefer those without embeddings first)
    const { data: existingChunks, error: chunkFetchErr } = await context.supabase
      .from("document_chunks")
      .select("id, content, chunk_index")
      .eq("document_id", data.documentId)
      .eq("org_id", data.orgId)
      .order("chunk_index");

    if (chunkFetchErr) throw new Error(chunkFetchErr.message);

    let embeddedCount = 0;
    const chunks = existingChunks ?? [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      if (embedding) {
        await context.supabase
          .from("document_chunks")
          .update({
            // pgvector accepts '[x1,x2,...]' string format via Supabase REST API
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            embedding: `[${embedding.join(",")}]` as any,
            metadata: { document_name: doc.name, chunk_index: chunk.chunk_index, has_embedding: true },
          })
          .eq("id", chunk.id);
        embeddedCount++;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    console.info(
      `[optera RAG] reEmbedDocument "${doc.name}": ${embeddedCount}/${chunks.length} chunks embedded.`,
    );

    return { ok: true, totalChunks: chunks.length, embeddedChunks: embeddedCount };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Exported helper for ai.functions.ts (server-side only, no HTTP boundary)
// ─────────────────────────────────────────────────────────────────────────────
export { generateQueryEmbedding, hasGeminiKey };
