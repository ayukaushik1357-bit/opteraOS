import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/components/app/AppShell";
import { listLeads, saveLead, deleteLead } from "@/lib/leads.functions";
import { shortDate } from "@/lib/format";
import { appHead } from "@/lib/app-head";
import {
  EmptyState,
  PageHeader,
  Pager,
  SearchInput,
  StatusBadge,
} from "@/components/shared/ui-kit";

export const Route = createFileRoute("/_authenticated/leads")({
  head: appHead("Leads", "Inbound leads with AI scoring, source and owner in one queue."),
  component: LeadsPage,
});

const PAGE_SIZE = 5;
const STAGES = ["new", "contacted", "qualified", "unqualified"] as const;
type LeadStage = (typeof STAGES)[number];

const stageTone: Record<LeadStage, "positive" | "brand" | "neutral" | "danger"> = {
  qualified: "positive",
  contacted: "brand",
  new: "neutral",
  unqualified: "danger",
};

type DraftLead = {
  id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  score: number;
  stage: LeadStage;
};

const emptyDraft: DraftLead = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "Direct",
  score: 50,
  stage: "new",
};

function LeadsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const save = useServerFn(saveLead);
  const remove = useServerFn(deleteLead);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftLead>(emptyDraft);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", current?.id],
    queryFn: () => fetchLeads({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", current?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          orgId: current!.id,
          name: draft.name,
          company: draft.company,
          email: draft.email,
          phone: draft.phone,
          source: draft.source,
          score: draft.score,
          stage: draft.stage,
        },
      }),
    onSuccess: () => {
      toast.success(draft.id ? "Lead updated" : "Lead created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter(
      (l) =>
        (stage === "all" || l.stage === stage) &&
        (l.name + (l.company ?? "") + (l.email ?? "")).toLowerCase().includes(query.toLowerCase()),
    );
  }, [data, query, stage]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew() {
    setDraft(emptyDraft);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Every inbound lead, scored by optera AI and routed to an owner."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                onClick={openNew}
              >
                <Plus className="mr-1 h-4 w-4" /> Create Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit lead" : "Create lead"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="l-name">Full name</Label>
                  <Input
                    id="l-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Sarah Connor"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="l-company">Company</Label>
                  <Input
                    id="l-company"
                    value={draft.company}
                    onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                    placeholder="Cyberdyne Systems"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="l-email">Email</Label>
                    <Input
                      id="l-email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      placeholder="sarah@cyberdyne.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="l-phone">Phone</Label>
                    <Input
                      id="l-phone"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      placeholder="+1 555-0199"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="l-source">Source</Label>
                    <Input
                      id="l-source"
                      value={draft.source}
                      onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                      placeholder="Website, Referral, etc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="l-score">Lead score (0-100)</Label>
                    <Input
                      id="l-score"
                      type="number"
                      min={0}
                      max={100}
                      value={draft.score}
                      onChange={(e) => setDraft({ ...draft, score: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Stage</Label>
                  <Select
                    value={draft.stage}
                    onValueChange={(v) => setDraft({ ...draft, stage: v as LeadStage })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-gradient-brand text-primary-foreground"
                  disabled={draft.name.trim().length < 2 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  Save lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          label="Search leads"
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search by name, company or email"
        />
        <Select
          value={stage}
          onValueChange={(v) => {
            setStage(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by stage">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            {["all", ...STAGES].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All stages" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No leads match this view"
          description="Try a different search term, stage filter, or create a new lead."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Lead", "Source", "Score", "Stage", "Created", "Actions"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-4 py-3 font-medium ${h === "Actions" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.company || l.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.source || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{l.score}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={l.stage} tone={stageTone[l.stage]} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(l.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraft({
                          id: l.id,
                          name: l.name,
                          company: l.company ?? "",
                          email: l.email ?? "",
                          phone: l.phone ?? "",
                          source: l.source ?? "Direct",
                          score: l.score ?? 0,
                          stage: l.stage as LeadStage,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(l.id)}
                      aria-label={`Delete ${l.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}
