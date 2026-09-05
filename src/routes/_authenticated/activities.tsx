import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  Search,
  Plus,
  PhoneCall,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  User,
  Filter,
} from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import { activitiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activities")({
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("NOTE");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("COMPLETED");
  const [dueDate, setDueDate] = useState("");

  // Fetch Activities
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ["activities", current?.id, search, typeFilter, statusFilter],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter !== "ALL") params.type = typeFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await activitiesApi.list(current.id, params);
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (dto: any) => activitiesApi.create(current?.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", current?.id] });
      setIsLogOpen(false);
      resetForm();
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      activitiesApi.update(id, { status }, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", current?.id] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("NOTE");
    setPriority("MEDIUM");
    setStatus("COMPLETED");
    setDueDate("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title,
      description: description || undefined,
      type,
      priority,
      status,
      dueDate: dueDate || undefined,
    });
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "CALL":
        return <PhoneCall className="h-4 w-4 text-green-600" />;
      case "EMAIL":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "MEETING":
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case "STATUS_CHANGE":
        return <CheckCircle2 className="h-4 w-4 text-amber-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const activities = Array.isArray(activitiesData)
    ? activitiesData
    : (activitiesData?.rows || []);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ActivityIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Universal Activities &amp; Timeline
              </h1>
              <p className="text-xs text-gray-500">
                Full interaction history across meetings, calls, email exchanges, notes, and system events.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsLogOpen(true);
          }}
          className="bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 h-9 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" /> Log Activity
        </Button>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["ALL", "NOTE", "CALL", "EMAIL", "MEETING", "STATUS_CHANGE"].map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter(t)}
              className={`h-8 px-3 text-xs rounded-lg transition-all ${
                typeFilter === t
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Timeline List ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#E5EAF1] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Loading timeline activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No activities recorded yet. Click "Log Activity" to start tracking.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-blue-100 space-y-6">
            {activities.map((act: any) => (
              <div key={act.id} className="relative group">
                {/* Dot on line */}
                <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-xs" />

                <div className="rounded-lg border border-[#E5EAF1] bg-[#F8FAFC] p-4 space-y-2 hover:bg-white hover:shadow-xs transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-white border border-[#E5EAF1] shadow-xs">
                        {getTypeIcon(act.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{act.title}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                          <span className="font-mono">{shortDate(act.createdAt)}</span>
                          {act.user && (
                            <span className="flex items-center gap-1 text-gray-600">
                              • <User className="h-3 w-3 text-gray-400" /> {act.user.firstName} {act.user.lastName}
                            </span>
                          )}
                          {act.customer && (
                            <span className="text-blue-600">• Customer: {act.customer.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono tracking-wider ${
                          act.status === "COMPLETED"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : act.status === "PLANNED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "border-[#E5EAF1] bg-gray-50 text-gray-600"
                        }`}
                      >
                        {act.status}
                      </Badge>
                      {act.status === "PLANNED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatusMutation.mutate({ id: act.id, status: "COMPLETED" })}
                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Done
                        </Button>
                      )}
                    </div>
                  </div>

                  {act.description && (
                    <p className="text-xs text-gray-600 leading-relaxed pl-8">
                      {act.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Log Activity Modal ───────────────────────────────────────────── */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E5EAF1] bg-white text-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-blue-600" /> Log Universal Activity
              </h3>
              <button onClick={() => setIsLogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-600 block mb-1">Activity Title *</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Discussed Q3 roadmap & contract renewal"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Activity Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="NOTE">Note</option>
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="STATUS_CHANGE">Status Change</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="PLANNED">Planned / Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Due Date / Scheduled At</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-600 block mb-1">Description / Notes</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key discussion points, action items, outcomes..."
                  className="w-full p-2.5 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLogOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                  className="bg-[#008080] hover:bg-[#006666] text-white"
                >
                  Record Activity
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
