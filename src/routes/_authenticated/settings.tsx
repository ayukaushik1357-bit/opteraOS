import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Shield,
  Save,
  Copy,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { orgsApi } from "@/lib/api";
import { useWorkspace } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"general" | "team" | "security">("general");

  // Org form states
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [industry, setIndustry] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [country, setCountry] = useState("IN");
  const [companySize, setCompanySize] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");

  // Fetch Org Details
  const { data: org, isLoading: loadingOrg } = useQuery({
    queryKey: ["org-details", current?.id],
    queryFn: async () => {
      if (!current?.id) return null;
      return orgsApi.get(current.id);
    },
    enabled: !!current?.id,
  });

  // Sync state when org loads
  useEffect(() => {
    if (org) {
      setName(org.name || "");
      setLegalName(org.legalName || "");
      setIndustry(org.industry || "");
      setCurrency(org.currency || "INR");
      setTimezone(org.timezone || "Asia/Kolkata");
      setCountry(org.country || "IN");
      setCompanySize(org.companySize || "");
      setEmail(org.email || "");
      setPhone(org.phone || "");
      setWebsite(org.website || "");
      setAddress(org.address || "");
      setCity(org.city || "");
      setState(org.state || "");
      setPostalCode(org.postalCode || "");
    }
  }, [org]);

  // Fetch Members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["org-members", current?.id],
    queryFn: async () => {
      if (!current?.id) return [];
      const res = await orgsApi.getMembers(current.id);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!current?.id,
  });

  // Update Org Mutation
  const updateOrgMutation = useMutation({
    mutationFn: (dto: any) => orgsApi.update(current!.id, dto),
    onSuccess: () => {
      toast.success("Organization details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["org-details", current?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update organization");
    },
  });

  // Invite Member Mutation
  const inviteMutation = useMutation({
    mutationFn: (dto: any) => orgsApi.inviteMember(current!.id, dto),
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["org-members", current?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invite");
    },
  });

  // Update Member Role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      orgsApi.updateMemberRole(current!.id, userId, role),
    onSuccess: () => {
      toast.success("Member role updated");
      queryClient.invalidateQueries({ queryKey: ["org-members", current?.id] });
    },
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgMutation.mutate({
      name,
      legalName: legalName || undefined,
      industry: industry || undefined,
      currency,
      timezone,
      country,
      companySize: companySize || undefined,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Organization Settings</h1>
          <p className="text-xs text-[#4B5563] mt-1">
            Manage organization profile, team members, roles, and security credentials.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-px">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "general"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-[#4B5563] hover:text-[#111827]"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> General Profile
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "team"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-[#4B5563] hover:text-[#111827]"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Members &amp; Roles
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "security"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-[#4B5563] hover:text-[#111827]"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Tenant Security
        </button>
      </div>

      {/* Tab: General */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Company Name</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Legal Entity Name</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Acme Technologies Pvt Ltd"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Industry</label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="SaaS / Manufacturing"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="INR"
                className="h-9 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Contact Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@acme.com"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] block mb-1">Website</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
            <Button
              type="submit"
              disabled={updateOrgMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-9"
            >
              <Save className="w-3.5 h-3.5" /> Save Organization Profile
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Members & Roles */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <form onSubmit={handleInvite} className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[#111827]">Invite Team Member</h2>
            <div className="flex flex-col md:flex-row items-center gap-3">
              <Input
                required
                type="email"
                placeholder="colleague@yourcompany.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-9 text-xs flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-9 px-3 rounded-md bg-white border border-[#E2E8F0] text-[#111827] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0"
              >
                Send Invite
              </Button>
            </div>
          </form>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[#111827]">Organization Members ({members.length})</h2>
            <div className="divide-y divide-[#E2E8F0]">
              {members.map((m: any) => (
                <div key={m.id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#111827]">
                      {m.user?.firstName} {m.user?.lastName}
                    </div>
                    <div className="text-[#6B7280] text-[11px] font-mono mt-0.5">{m.user?.email}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      disabled={m.role === "OWNER"}
                      value={m.role}
                      onChange={(e) => updateRoleMutation.mutate({ userId: m.userId, role: e.target.value })}
                      className="h-7 px-2 rounded bg-white border border-[#E2E8F0] text-[#111827] text-xs disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="VIEWER">Viewer</option>
                    </select>

                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-mono ${
                        m.status === "ACTIVE"
                          ? "text-green-700 border-green-200 bg-green-50"
                          : m.status === "SUSPENDED"
                          ? "text-amber-700 border-amber-200 bg-amber-50"
                          : "text-gray-500 border-gray-200"
                      }`}
                    >
                      {m.status || "ACTIVE"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === "security" && (
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs text-xs">
          <h2 className="text-sm font-bold text-[#111827]">Multi-Tenant Isolation &amp; Access Credentials</h2>
          <p className="text-[#4B5563] leading-relaxed">
            Every database query and API mutation is isolated by tenant organization ID with Row-Level Security (RLS) database enforcement.
          </p>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[#111827]">Tenant Organization ID</div>
              <div className="font-mono text-[#6B7280] text-[11px] mt-1">{current?.id}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (current?.id) navigator.clipboard.writeText(current.id);
                toast.success("Organization ID copied to clipboard");
              }}
              className="h-8 text-xs gap-1.5 bg-white"
            >
              <Copy className="w-3.5 h-3.5" /> Copy ID
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
