import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Search, BookOpen, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import {
  listDocuments,
  uploadDocument,
  searchKnowledgeBase,
  deleteDocument,
  reEmbedDocument,
} from "@/lib/rag.functions";
import { shortDate } from "@/lib/format";

const title = "Knowledge Base & RAG — opteraOS";
const description = "Upload company SOPs, policies, and documents for AI Retrieval-Augmented Generation (RAG).";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchDocs = useServerFn(listDocuments);
  const upload = useServerFn(uploadDocument);
  const searchRAG = useServerFn(searchKnowledgeBase);
  const remove = useServerFn(deleteDocument);
  const reEmbed = useServerFn(reEmbedDocument);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<any | null>(null);
  const [docForm, setDocForm] = useState({
    name: "",
    content: "",
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", current?.id],
    queryFn: () => fetchDocs({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["documents", current?.id] });
  };

  const uploadMutation = useMutation({
    mutationFn: () => upload({ data: { ...docForm, orgId: current!.id } }),
    onSuccess: (res) => {
      setLastUploadResult(res);
      if (res.semanticSearchEnabled) {
        toast.success(
          `Document indexed: ${res.embeddedChunks}/${res.totalChunks} chunks embedded. Semantic search enabled.`,
        );
      } else {
        toast.warning(
          `Document stored (${res.totalChunks} chunks) — embeddings NOT generated. ` +
            (res.geminiKeyConfigured
              ? "Embedding API returned no results."
              : "Configure GEMINI_API_KEY on the server to enable semantic RAG."),
        );
      }
      setOpen(false);
      setDocForm({ name: "", content: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const searchMutation = useMutation({
    mutationFn: () => searchRAG({ data: { orgId: current!.id, query: searchQuery } }),
    onSuccess: (res) => {
      setSearchResults(res);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Document deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reEmbedMutation = useMutation({
    mutationFn: (documentId: string) => reEmbed({ data: { orgId: current!.id, documentId } }),
    onSuccess: (res) => {
      toast.success(`Re-embedding complete: ${res.embeddedChunks}/${res.totalChunks} chunks embedded.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Determine if last search was keyword-only due to missing embedding key
  const semanticUnavailable =
    searchResults !== null && searchResults.length > 0 && searchResults[0]?.semanticUnavailable === true;
  const keywordFallback =
    searchResults !== null && searchResults.some((r) => r.search_type === "keyword");
  const semanticSearch =
    searchResults !== null && searchResults.some((r) => r.search_type === "semantic");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Knowledge Base (RAG)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingest business SOPs, policies, and guidelines for optera AI to search and reference.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#008080] hover:bg-[#006666] text-white">
              <Upload className="mr-1 h-4 w-4" /> Ingest Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Knowledge SOP / Document</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="d-name">Document Title</Label>
                <Input
                  id="d-name"
                  placeholder="e.g. Sales Follow-up Policy & Guidelines"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="d-content">Text Content / SOP Policy</Label>
                <Textarea
                  id="d-content"
                  rows={8}
                  placeholder="Paste company policies, refund terms, sales guides, or technical SOPs..."
                  value={docForm.content}
                  onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-[#008080] hover:bg-[#006666] text-white"
                disabled={docForm.name.trim().length < 2 || docForm.content.trim().length < 10 || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? "Chunking & Indexing..." : "Ingest into RAG"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upload result status banner */}
      {lastUploadResult && !lastUploadResult.semanticSearchEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Semantic RAG unavailable for this document</p>
            <p className="mt-0.5 text-xs">
              {lastUploadResult.geminiKeyConfigured
                ? `Embedding generation failed. ${lastUploadResult.totalChunks} chunks stored — keyword search only.`
                : `GEMINI_API_KEY is not configured on the server. ${lastUploadResult.totalChunks} chunks stored without vector embeddings. Configure the key and use the Re-embed button to backfill.`}
            </p>
          </div>
        </div>
      )}

      {/* Search panel */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Test Semantic RAG Search</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search company knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchQuery && searchMutation.mutate()}
          />
          <Button variant="secondary" onClick={() => searchQuery && searchMutation.mutate()}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </div>

        {searchResults !== null && (
          <div className="mt-4 grid gap-2">
            {/* Search type indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                RAG Search Results ({searchResults.length} chunks retrieved)
              </span>
              {semanticSearch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                  <Zap className="h-3 w-3" /> Semantic
                </span>
              )}
              {keywordFallback && !semanticSearch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                  <Search className="h-3 w-3" /> Keyword fallback
                </span>
              )}
            </div>

            {semanticUnavailable && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <strong>Semantic RAG unavailable.</strong> GEMINI_API_KEY is not configured on
                  the server — match_document_chunks was not called. Results are keyword-matched only.
                </span>
              </div>
            )}

            {searchResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching knowledge chunks found.</p>
            ) : (
              searchResults.map((c, i) => (
                <div key={i} className="rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      {c.metadata?.document_name || "Document"}
                    </span>
                    <div className="flex items-center gap-2">
                      {c.similarity != null && (
                        <span className="text-indigo-600 font-mono dark:text-indigo-300">
                          {(c.similarity * 100).toFixed(1)}% match
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.search_type === "semantic"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                        }`}
                      >
                        {c.search_type === "semantic" ? "⚡ semantic" : "🔍 keyword"}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-foreground leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Documents table */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="grid gap-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (documents ?? []).length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-medium">Knowledge Base Empty</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload company SOPs, refund policies, and onboarding guides for AI answer retrieval.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(documents ?? []).map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-blue" />
                      {doc.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{doc.file_type}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(doc.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Re-embed (requires GEMINI_API_KEY)"
                        onClick={() => reEmbedMutation.mutate(doc.id)}
                        disabled={reEmbedMutation.isPending}
                        aria-label={`Re-embed ${doc.name}`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
