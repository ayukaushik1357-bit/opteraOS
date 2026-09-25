import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Bot,
  User,
  Cpu,
  Globe,
  Database,
  Calendar,
  X,
  Code2,
} from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import { auditLogsApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/format";

const title = "Audit Logs & Compliance — opteraOS";
const description = "Immutable audit trail of all organization mutations, API calls, and automated actions.";

export const Route = createFileRoute("/_authenticated/audit-logs")({
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
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { current } = useWorkspace();
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Fetch Audit Logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ["audit-logs", current?.id, search, actorFilter],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const params: any = {};
      if (search) params.search = search;
      if (actorFilter !== "ALL") params.actorType = actorFilter;
      const res = await auditLogsApi.list(current.id, params);
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
  });

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case "AUTOPILOT":
        return <Bot className="h-3.5 w-3.5 text-blue-600" />;
      case "API":
        return <Globe className="h-3.5 w-3.5 text-cyan-600" />;
      case "SYSTEM":
        return <Cpu className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <User className="h-3.5 w-3.5 text-green-600" />;
    }
  };

  const logs = Array.isArray(logsData) ? logsData : (logsData?.rows || []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Immutable Audit Trail &amp; Compliance Log
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Complete traceability of user actions, API calls, Autopilot operations, and schema mutations.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-gray-600 border-gray-200 font-mono bg-gray-50">
          Security Tier 1: Multi-Tenant Isolated
        </Badge>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, resource, or request ID..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["ALL", "USER", "AUTOPILOT", "API", "SYSTEM"].map((actor) => (
            <Button
              key={actor}
              variant="ghost"
              size="sm"
              onClick={() => setActorFilter(actor)}
              className={`h-8 px-3 text-xs rounded-lg transition-all ${
                actorFilter === actor
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {actor}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Audit Logs Table ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="border-b border-[#E5EAF1] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource &amp; ID</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF1] font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Loading audit records...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {shortDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getActorIcon(log.actorType || "USER")}
                        <span className="font-semibold text-gray-900">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : log.actorType || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono tracking-wider border-blue-200 bg-blue-50 text-blue-700"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-800">
                        <Database className="h-3 w-3 text-gray-400" />
                        <span className="capitalize font-medium">{log.resource}</span>
                        {log.resourceId && (
                          <span className="text-[10px] font-mono text-gray-400 truncate max-w-[120px]">
                            #{log.resourceId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400 truncate max-w-[140px]">
                      {log.requestId || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium"
                      >
                        Inspect Diff
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── State Diff Inspection Modal ──────────────────────────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-xl border border-[#E5EAF1] bg-white text-gray-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Audit Record Diff: {selectedLog.action}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs shrink-0">
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Actor</span>
                <span className="text-gray-900 font-semibold mt-0.5 block">{selectedLog.actorType || "USER"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Resource</span>
                <span className="text-gray-900 font-semibold mt-0.5 block">{selectedLog.resource}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Correlation ID</span>
                <span className="text-gray-500 font-mono text-[10px] mt-0.5 block truncate">
                  {selectedLog.requestId || "—"}
                </span>
              </div>
            </div>

            {/* Old vs New State JSON side-by-side */}
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] space-y-1">
                <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider pb-1 border-b border-[#E5EAF1]">
                  Previous State (oldState)
                </div>
                <pre className="text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap mt-2">
                  {selectedLog.oldState ? JSON.stringify(selectedLog.oldState, null, 2) : "null (Creation)"}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] space-y-1">
                <div className="text-[11px] font-bold text-green-700 uppercase tracking-wider pb-1 border-b border-[#E5EAF1]">
                  Resulting State (newState)
                </div>
                <pre className="text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap mt-2">
                  {selectedLog.newState ? JSON.stringify(selectedLog.newState, null, 2) : "null (Deletion)"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E5EAF1] shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
