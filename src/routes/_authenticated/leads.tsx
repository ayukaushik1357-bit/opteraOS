import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appHead } from "@/lib/app-head";
import { mockLeads, type MockLead } from "@/lib/mock/data";
import { shortDate } from "@/lib/format";
import {
  EmptyState, PageHeader, Pager, SearchInput, StatusBadge, TableSkeleton, useMockData,
} from "@/components/shared/ui-kit";

export const Route = createFileRoute("/_authenticated/leads")({
  head: appHead("Leads", "Inbound leads with AI scoring, source and owner in one queue."),
  component: LeadsPage,
});

const PAGE_SIZE = 5;

const stageTone: Record<MockLead["stage"], "positive" | "brand" | "neutral" | "danger"> = {
  qualified: "positive",
  contacted: "brand",
  new: "neutral",
  unqualified: "danger",
};

function LeadsPage() {
  const { loading, data } = useMockData(mockLeads);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter(
      (l) =>
        (stage === "all" || l.stage === stage) &&
        (l.name + l.company + l.email).toLowerCase().includes(query.toLowerCase()),
    );
  }, [data, query, stage]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Every inbound lead, scored by optera AI and routed to an owner."
        actions={
          <Button
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            onClick={() => toast.info("Lead capture form is ready for backend integration.")}
          >
            Create Lead
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput label="Search leads" value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search by name, company or email" />
        <Select value={stage} onValueChange={(v) => { setStage(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by stage">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            {["all", "new", "contacted", "qualified", "unqualified"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All stages" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No leads match this view" description="Try a different search term or stage filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {["Lead", "Source", "Score", "Stage", "Owner", "Created"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.company}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.source}</td>
                  <td className="px-4 py-3 tabular-nums">{l.score}</td>
                  <td className="px-4 py-3"><StatusBadge label={l.stage} tone={stageTone[l.stage]} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.owner}</td>
                  <td className="px-4 py-3 text-muted-foreground">{shortDate(l.createdAt)}</td>
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
