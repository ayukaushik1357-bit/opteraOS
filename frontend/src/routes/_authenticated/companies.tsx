import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Plus,
  Network,
  Users,
  Globe,
  Mail,
  Phone,
  MoreHorizontal,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import { companiesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [relFilter, setRelFilter] = useState<string>("ALL");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [relationshipType, setRelationshipType] = useState("CUSTOMER");
  const [parentCompanyId, setParentCompanyId] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch Companies List
  const { data: companiesData, isLoading } = useQuery({
    queryKey: ["companies", current?.id, search, relFilter],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const params: any = {};
      if (search) params.search = search;
      if (relFilter !== "ALL") params.relationshipType = relFilter;
      const res = await companiesApi.list(params, current.id);
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
  });

  // Fetch Hierarchy Tree
  const { data: treeData = [] } = useQuery({
    queryKey: ["companies-tree", current?.id],
    queryFn: async () => {
      if (!current?.id) return [];
      const res = await companiesApi.getTree(current.id);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!current?.id && viewMode === "tree",
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (dto: any) => companiesApi.create(dto, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["companies-tree", current?.id] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesApi.delete(id, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", current?.id] });
      queryClient.invalidateQueries({ queryKey: ["companies-tree", current?.id] });
      setSelectedCompany(null);
    },
  });

  const resetForm = () => {
    setLegalName("");
    setDisplayName("");
    setIndustry("");
    setCompanySize("");
    setEmail("");
    setPhone("");
    setWebsite("");
    setRelationshipType("CUSTOMER");
    setParentCompanyId("");
    setGstin("");
    setPan("");
    setNotes("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) return;
    createMutation.mutate({
      legalName,
      displayName: displayName || legalName,
      industry: industry || undefined,
      companySize: companySize || undefined,
      email: email || undefined,
      phone: phone || undefined,
      website: website || undefined,
      relationshipType,
      parentCompanyId: parentCompanyId || undefined,
      taxIdentifiers: {
        ...(gstin ? { gstin } : {}),
        ...(pan ? { pan } : {}),
      },
      notes: notes || undefined,
    });
  };

  const companies = Array.isArray(companiesData)
    ? companiesData
    : (companiesData?.rows || []);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                B2B Business Entities &amp; Companies
              </h1>
              <p className="text-xs text-gray-500">
                Corporate accounts, group holding hierarchies, subsidiaries, vendors, and partners.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#E5EAF1] rounded-lg p-0.5 bg-[#F8FAFC]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-7 px-2.5 text-xs rounded-md ${
                viewMode === "list" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              List View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("tree")}
              className={`h-7 px-2.5 text-xs rounded-md ${
                viewMode === "tree" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Network className="h-3.5 w-3.5 mr-1" /> Hierarchy Tree
            </Button>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 h-9 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by legal name, display name, tax ID..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["ALL", "CUSTOMER", "PROSPECT", "VENDOR", "PARTNER", "SUBSIDIARY"].map((rel) => (
            <Button
              key={rel}
              variant="ghost"
              size="sm"
              onClick={() => setRelFilter(rel)}
              className={`h-8 px-3 text-xs rounded-lg transition-all ${
                relFilter === rel
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {rel}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Hierarchy Tree View ─────────────────────────────────────────── */}
      {viewMode === "tree" ? (
        <div className="rounded-xl border border-[#E5EAF1] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Network className="h-4 w-4 text-blue-600" /> Corporate Entity Hierarchy
          </h3>
          <div className="space-y-3">
            {treeData.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No corporate hierarchy registered yet.</p>
            ) : (
              treeData.map((root: any) => (
                <div key={root.id} className="rounded-lg border border-[#E5EAF1] bg-[#F8FAFC] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-gray-900 text-sm">{root.displayName || root.legalName}</span>
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                        Parent Group
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {root.subsidiaries?.length || 0} subsidiaries • {root.contacts?.length || 0} contacts
                    </span>
                  </div>

                  {/* Subsidiaries */}
                  {root.subsidiaries && root.subsidiaries.length > 0 && (
                    <div className="pl-6 border-l-2 border-blue-200 space-y-2 mt-2">
                      {root.subsidiaries.map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between p-2.5 rounded bg-white border border-[#E5EAF1] text-xs">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium text-gray-800">{sub.displayName || sub.legalName}</span>
                            <Badge variant="outline" className="text-[9px] uppercase border-[#E5EAF1] bg-gray-50">
                              {sub.relationshipType}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-gray-500">{sub.industry || "General"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── Companies Table View ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`${selectedCompany ? "lg:col-span-7" : "lg:col-span-12"} transition-all`}>
            <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="border-b border-[#E5EAF1] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Relationship</th>
                      <th className="px-4 py-3">Industry &amp; Size</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF1] font-normal">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            Loading companies...
                          </div>
                        </td>
                      </tr>
                    ) : companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                          No company records found.
                        </td>
                      </tr>
                    ) : (
                      companies.map((c: any) => {
                        const isSelected = selectedCompany?.id === c.id;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedCompany(c)}
                            className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                              isSelected ? "bg-blue-50/70 border-l-2 border-l-blue-600" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-gray-900">{c.displayName || c.legalName}</div>
                              {c.legalName !== c.displayName && (
                                <div className="text-[11px] text-gray-500 mt-0.5">{c.legalName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-mono tracking-wider border-[#E5EAF1] bg-gray-50 text-gray-700"
                              >
                                {c.relationshipType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-gray-800">{c.industry || "General"}</div>
                              {c.companySize && (
                                <div className="text-[11px] text-gray-500">{c.companySize} employees</div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                {c.email && (
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <span className="truncate">{c.email}</span>
                                  </div>
                                )}
                                {c.phone && (
                                  <div className="flex items-center gap-1.5 text-gray-500">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span>{c.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedCompany(c)}
                                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Selected Company Drawer */}
          {selectedCompany && (
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-[#E5EAF1] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedCompany.displayName || selectedCompany.legalName}
                    </h2>
                    <p className="text-xs text-gray-500">{selectedCompany.legalName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCompany(null)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">Relationship</span>
                    <span className="text-blue-700 font-medium mt-0.5 block">{selectedCompany.relationshipType}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">Industry</span>
                    <span className="text-gray-800 font-medium mt-0.5 block">{selectedCompany.industry || "General"}</span>
                  </div>
                  {selectedCompany.website && (
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] col-span-2">
                      <span className="text-gray-500 block text-[10px] uppercase font-semibold">Website</span>
                      <a
                        href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Globe className="h-3 w-3" /> {selectedCompany.website}
                      </a>
                    </div>
                  )}
                  {selectedCompany.taxIdentifiers && (
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] col-span-2">
                      <span className="text-gray-500 block text-[10px] uppercase font-semibold">Tax Identifiers</span>
                      <div className="mt-1 space-y-1 font-mono text-[11px] text-gray-800">
                        {Object.entries(selectedCompany.taxIdentifiers).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="uppercase text-gray-500">{k}:</span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Company Modal ─────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E5EAF1] bg-white text-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Create Business Entity
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-600 block mb-1">Legal Registered Name *</label>
                <Input
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Acme Global Solutions Pvt Ltd"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Acme Global"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Relationship Type</label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="PARTNER">Partner</option>
                    <option value="SUBSIDIARY">Subsidiary</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Industry</label>
                  <Input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Technology, Manufacturing"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 Employees</option>
                    <option value="11-50">11-50 Employees</option>
                    <option value="51-200">51-200 Employees</option>
                    <option value="201-500">201-500 Employees</option>
                    <option value="500+">500+ Employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">GSTIN (India)</label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27ABCDE1234F1Z5"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">PAN / Tax ID</label>
                  <Input
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    placeholder="ABCDE1234F"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@acme.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Website</label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="www.acme.com"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
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
                  Save Company
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
