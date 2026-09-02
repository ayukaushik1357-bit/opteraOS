import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Send,
  FileSignature,
  Files,
  FileText,
  CheckCircle2,
  Lock,
  Globe,
  Loader2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { discussApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Discuss, Documents & Signatures — opteraOS";
const description = "Team discussion channels, cloud document management, and digital contract signatures.";

export const Route = createFileRoute("/_authenticated/discuss")({
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
  component: DiscussMasterPage,
});

function DiscussMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("channels");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newSignOpen, setNewSignOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  // Queries
  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["discuss_channels", orgId],
    queryFn: () => discussApi.getChannels(orgId),
    enabled: !!orgId,
  });

  const activeChannel = channels.find((c: any) => c.id === selectedChannelId) || channels[0];
  const activeChannelId = activeChannel?.id;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["channel_messages", orgId, activeChannelId],
    queryFn: () => discussApi.getChannelMessages(orgId, activeChannelId),
    enabled: !!orgId && !!activeChannelId,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["discuss_documents", orgId],
    queryFn: () => discussApi.getDocuments(orgId),
    enabled: !!orgId,
  });

  const { data: signatures = [], isLoading: loadingSigns } = useQuery({
    queryKey: ["discuss_signatures", orgId],
    queryFn: () => discussApi.getSignatures(orgId),
    enabled: !!orgId,
  });

  // Mutations
  const createChannelMutation = useMutation({
    mutationFn: (dto: any) => discussApi.createChannel(orgId, dto),
    onSuccess: () => {
      toast.success("Channel created!");
      setNewChannelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discuss_channels", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create channel"),
  });

  const postMessageMutation = useMutation({
    mutationFn: (dto: any) => discussApi.postMessage(orgId, activeChannelId, dto),
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["channel_messages", orgId, activeChannelId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send message"),
  });

  const createDocMutation = useMutation({
    mutationFn: (dto: any) => discussApi.createDocument(orgId, dto),
    onSuccess: () => {
      toast.success("Document added!");
      setNewDocOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discuss_documents", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add document"),
  });

  const createSignMutation = useMutation({
    mutationFn: (dto: any) => discussApi.createSignatureRequest(orgId, dto),
    onSuccess: () => {
      toast.success("Signature request issued!");
      setNewSignOpen(false);
      queryClient.invalidateQueries({ queryKey: ["discuss_signatures", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to issue signature request"),
  });

  const signDocMutation = useMutation({
    mutationFn: (id: string) => discussApi.signDocument(orgId, id),
    onSuccess: () => {
      toast.success("Document cryptographically signed!");
      queryClient.invalidateQueries({ queryKey: ["discuss_signatures", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to sign document"),
  });

  // State for forms
  const [chName, setChName] = useState("");
  const [chDesc, setChDesc] = useState("");

  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docCategory, setDocCategory] = useState("Contracts");

  const [signTitle, setSignTitle] = useState("");
  const [signDocUrl, setSignDocUrl] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Discuss, Documents &amp; Sign
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time team communication, centralized cloud documents, and legally binding digital signatures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewDocOpen(true)}
            className="text-xs h-9"
          >
            <Files className="h-3.5 w-3.5 mr-1.5" /> Upload Document
          </Button>

          <Button
            size="sm"
            onClick={() => setNewSignOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
          >
            <FileSignature className="h-4 w-4" /> Request Signature
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="channels" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Channels &amp; Chat ({channels.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Files className="h-3.5 w-3.5" /> Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="signatures" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <FileSignature className="h-3.5 w-3.5" /> Digital Signatures ({signatures.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Channels & Chat ──────────────────────────────────────────────── */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px] rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Channels Sidebar */}
            <div className="border-r border-[#E5EAF1] p-3 space-y-3 flex flex-col h-full bg-[#F8FAFC]">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Channels</span>
                <Button size="sm" variant="ghost" onClick={() => setNewChannelOpen(true)} className="h-6 w-6 p-0 text-gray-400 hover:text-gray-900">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {channels.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400">
                    No channels yet.
                    <Button size="sm" onClick={() => createChannelMutation.mutate({ name: "general", description: "General company discussions" })} className="mt-2 text-xs w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Create #general
                    </Button>
                  </div>
                ) : (
                  channels.map((ch: any) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                        activeChannelId === ch.id
                          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="md:col-span-3 flex flex-col h-full bg-white">
              <div className="p-3 border-b border-[#E5EAF1] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-gray-900">{activeChannel?.name || "general"}</span>
                </div>
                <span className="text-[11px] text-gray-500">{activeChannel?.description || "Channel discussions"}</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-10 w-1/2" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs font-medium text-gray-800">Welcome to #{activeChannel?.name || "general"}!</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Send a message to start the team conversation.</p>
                  </div>
                ) : (
                  messages.map((m: any) => (
                    <div key={m.id} className="flex gap-2.5 items-start">
                      <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {m.user?.firstName?.[0] || "U"}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{m.user?.firstName || "Team Member"}</span>
                          <span className="text-[10px] text-gray-400">{shortDate(m.createdAt)}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#F8FAFC] text-xs text-gray-800 border border-[#E5EAF1] leading-relaxed">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-[#E5EAF1] bg-[#F8FAFC]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!messageInput.trim() || !activeChannelId) return;
                    postMessageMutation.mutate({ content: messageInput.trim() });
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message #${activeChannel?.name || "channel"}...`}
                    className="h-9 text-xs"
                  />
                  <Button type="submit" size="sm" disabled={postMessageMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 2. Documents ────────────────────────────────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Enterprise Cloud Document Vault</h2>
              <Button size="sm" onClick={() => setNewDocOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
              </Button>
            </div>

            {loadingDocs ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <Files className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Documents Uploaded</p>
                <p className="text-xs text-gray-500 mt-1">Keep master client contracts, legal agreements, and corporate SOPs organized.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Document Name</TableHead>
                    <TableHead className="text-gray-500">Category</TableHead>
                    <TableHead className="text-gray-500">File Type</TableHead>
                    <TableHead className="text-gray-500">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {doc.name}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{doc.category || "General"}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{doc.mimeType || "PDF"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{shortDate(doc.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 3. Digital Signatures ───────────────────────────────────────────── */}
        <TabsContent value="signatures" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Digital Signatures &amp; Contract Execution</h2>
                <p className="text-xs text-gray-500">Audit-logged electronic sign requests with cryptographic hash validation</p>
              </div>
              <Button size="sm" onClick={() => setNewSignOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Request Signature
              </Button>
            </div>

            {loadingSigns ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : signatures.length === 0 ? (
              <div className="p-12 text-center">
                <FileSignature className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Signature Requests</p>
                <p className="text-xs text-gray-500 mt-1">Issue digital signature requests for customer proposals or NDAs.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Document Title</TableHead>
                    <TableHead className="text-gray-500">Signer</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Audit Hash</TableHead>
                    <TableHead className="text-right text-gray-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {signatures.map((sig: any) => (
                    <TableRow key={sig.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900">{sig.title}</TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {sig.signerName} ({sig.signerEmail})
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sig.status === "SIGNED"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : "border-amber-200 text-amber-700 bg-amber-50"
                          }`}
                        >
                          {sig.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-gray-400 truncate max-w-xs">
                        {sig.auditHash || "Pending Signature"}
                      </TableCell>
                      <TableCell className="text-right">
                        {sig.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => signDocMutation.mutate(sig.id)}
                            disabled={signDocMutation.isPending}
                            className="h-7 text-[11px] border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Sign Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Create Channel ──────────────────────────────────────────── */}
      <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Team Discussion Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Channel Name</Label>
              <Input
                value={chName}
                onChange={(e) => setChName(e.target.value)}
                placeholder="e.g. engineering-ops"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Description</Label>
              <Input
                value={chDesc}
                onChange={(e) => setChDesc(e.target.value)}
                placeholder="Topic of conversation"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChannelOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!chName) {
                  toast.error("Please provide a channel name.");
                  return;
                }
                createChannelMutation.mutate({ name: chName, description: chDesc });
              }}
              disabled={createChannelMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add Document ────────────────────────────────────────────── */}
      <Dialog open={newDocOpen} onOpenChange={setNewDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document to Cloud Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Document Title</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Master Services Agreement 2026"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Category</Label>
              <Input
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                placeholder="Contracts, Legal, HR, Finance"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Document File URL</Label>
              <Input
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://storage.googleapis.com/..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDocOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!docName || !docUrl) {
                  toast.error("Please provide document name and URL.");
                  return;
                }
                createDocMutation.mutate({ name: docName, fileUrl: docUrl, category: docCategory, mimeType: "PDF" });
              }}
              disabled={createDocMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Request Signature ───────────────────────────────────────── */}
      <Dialog open={newSignOpen} onOpenChange={setNewSignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Digital Signature Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Contract / Agreement Title</Label>
              <Input
                value={signTitle}
                onChange={(e) => setSignTitle(e.target.value)}
                placeholder="e.g. Enterprise SLA Agreement"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Document File URL</Label>
              <Input
                value={signDocUrl}
                onChange={(e) => setSignDocUrl(e.target.value)}
                placeholder="https://storage.googleapis.com/..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-700">Signer Name</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Alice Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Signer Email</Label>
                <Input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="alice@client.com"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSignOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!signTitle || !signDocUrl || !signerEmail) {
                  toast.error("Please fill in title, doc URL, and signer email.");
                  return;
                }
                createSignMutation.mutate({
                  title: signTitle,
                  documentUrl: signDocUrl,
                  signerName: signerName || "Signer",
                  signerEmail: signerEmail,
                });
              }}
              disabled={createSignMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
