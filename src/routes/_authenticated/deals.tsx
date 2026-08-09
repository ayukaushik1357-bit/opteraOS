import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/components/app/AppShell";
import { listDeals, saveDeal, setDealStage, deleteDeal } from "@/lib/crm.functions";
import { money, shortDate } from "@/lib/format";

const title = "Sales pipeline — opteraOS";
const description = "Track every deal from lead to won across a live sales pipeline with values, owners and close dates.";

export const Route = createFileRoute("/_authenticated/deals")({
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
  component: DealsPage,
});

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

type Draft = {
  id?: string;
  title: string;
  value: string;
  stage: Stage;
  customerId: string;
  expectedClose: string;
};

const emptyDraft: Draft = { title: "", value: "", stage: "lead", customerId: "", expectedClose: "" };

function DealsPage() {
  const { current } = useWorkspace();
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();
  const fetchDeals = useServerFn(listDeals);
  const save = useServerFn(saveDeal);
  const move = useServerFn(setDealStage);
  const remove = useServerFn(deleteDeal);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const { data, isLoading } = useQuery({
    queryKey: ["deals", current?.id],
    queryFn: () => fetchDeals({ data: { orgId: current!.id } }),
    enabled: !!current,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deals", current?.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", current?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          orgId: current!.id,
          title: draft.title,
          value: Number(draft.value || 0),
          stage: draft.stage,
          customerId: draft.customerId,
          expectedClose: draft.expectedClose,
        },
      }),
    onSuccess: () => {
      toast.success(draft.id ? "Deal updated" : "Deal created");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stageMutation = useMutation({
    mutationFn: (v: { id: string; stage: Stage }) => move({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Deal deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deals = data?.deals ?? [];
  const customers = data?.customers ?? [];
  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sales pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">Move deals through stages and watch the overview update live.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-brand text-primary-foreground" onClick={() => setDraft(emptyDraft)}>
              <Plus className="mr-1 h-4 w-4" /> New deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit deal" : "New deal"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="d-title">Title</Label>
                <Input id="d-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="d-value">Value ({currency})</Label>
                  <Input id="d-value" type="number" min={0} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-close">Expected close</Label>
                  <Input id="d-close" type="date" value={draft.expectedClose} onChange={(e) => setDraft({ ...draft, expectedClose: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Stage</Label>
                <Select value={draft.stage} onValueChange={(v) => setDraft({ ...draft, stage: v as Stage })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Customer</Label>
                <Select value={draft.customerId || "none"} onValueChange={(v) => setDraft({ ...draft, customerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-gradient-brand text-primary-foreground"
                disabled={draft.title.trim().length < 2 || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const items = deals.filter((d) => d.stage === stage);
            const total = items.reduce((s, d) => s + Number(d.value ?? 0), 0);
            return (
              <section key={stage} className="glass rounded-2xl p-4">
                <header className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium capitalize">{stage}</h2>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </header>
                <p className="mt-1 text-xs text-muted-foreground">{money(total, currency)}</p>
                <ul className="mt-3 grid gap-2">
                  {items.map((d) => (
                    <li key={d.id} className="rounded-xl bg-secondary/40 p-3">
                      <button
                        className="block w-full text-left text-sm font-medium"
                        onClick={() => {
                          setDraft({
                            id: d.id,
                            title: d.title,
                            value: String(d.value ?? 0),
                            stage: d.stage as Stage,
                            customerId: d.customer_id ?? "",
                            expectedClose: d.expected_close ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        {d.title}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {money(Number(d.value ?? 0), currency)}
                        {customerName(d.customer_id) ? ` · ${customerName(d.customer_id)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Close {shortDate(d.expected_close)}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <Select value={d.stage} onValueChange={(v) => stageMutation.mutate({ id: d.id, stage: v as Stage })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(d.id)} aria-label={`Delete ${d.title}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-xs text-muted-foreground">Empty</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}