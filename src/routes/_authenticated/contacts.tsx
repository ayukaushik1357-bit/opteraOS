import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Contact as ContactIcon,
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  Tag as TagIcon,
  MapPin,
  MessageSquare,
  Send,
  MoreHorizontal,
  Edit2,
  Trash2,
  Globe,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/components/app/AppShell";
import {
  contactsApi,
  companiesApi,
  tagsApi,
  commentsApi,
  addressesApi,
  communicationsApi,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const { current } = useWorkspace();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactType, setContactType] = useState("INDIVIDUAL");
  const [notes, setNotes] = useState("");

  // Email form
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Comments state
  const [newComment, setNewComment] = useState("");

  // Fetch Contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", current?.id, search, typeFilter],
    queryFn: async () => {
      if (!current?.id) return { rows: [], total: 0 };
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter !== "ALL") params.type = typeFilter;
      const res = await contactsApi.list(params, current.id);
      if (Array.isArray(res)) return { rows: res, total: res.length };
      if (res?.data && Array.isArray(res.data)) return { rows: res.data, total: res.data.length };
      return res || { rows: [], total: 0 };
    },
    enabled: !!current?.id,
  });

  // Fetch Companies for dropdown
  const { data: companiesData } = useQuery({
    queryKey: ["companies", current?.id],
    queryFn: async () => {
      if (!current?.id) return [];
      const res = await companiesApi.list({}, current.id);
      return Array.isArray(res) ? res : (res?.data || res?.rows || []);
    },
    enabled: !!current?.id,
  });

  // Fetch comments for selected contact
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", "contact", selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact?.id || !current?.id) return [];
      const res = await commentsApi.list("Contact", selectedContact.id, current.id);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!selectedContact?.id && !!current?.id,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (dto: any) => contactsApi.create(dto, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", current?.id] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id, current?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", current?.id] });
      setSelectedContact(null);
    },
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      commentsApi.create(
        { entityType: "Contact", entityId: selectedContact.id, content },
        current?.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", "contact", selectedContact?.id] });
      setNewComment("");
    },
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setMobile("");
    setJobTitle("");
    setCompanyId("");
    setContactType("INDIVIDUAL");
    setNotes("");
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    createMutation.mutate({
      firstName,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      mobile: mobile || undefined,
      jobTitle: jobTitle || undefined,
      companyId: companyId || undefined,
      type: contactType,
      notes: notes || undefined,
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact?.email || !emailSubject.trim()) return;
    setSendingEmail(true);
    try {
      await communicationsApi.sendEmail(
        {
          to: selectedContact.email,
          subject: emailSubject,
          text: emailBody,
        },
        current?.id,
      );
      setIsEmailOpen(false);
      setEmailSubject("");
      setEmailBody("");
      alert("Email sent successfully!");
    } catch (err: any) {
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const contacts = Array.isArray(contactsData)
    ? contactsData
    : (contactsData?.rows || []);

  const companies = Array.isArray(companiesData) ? companiesData : [];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ContactIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Universal Contacts Directory
              </h1>
              <p className="text-xs text-gray-500">
                Manage individuals, business reps, customers, partners, and key stakeholder profiles.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="bg-[#008080] hover:bg-[#006666] text-white text-xs gap-1.5 h-9 font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Contact
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
            placeholder="Search by name, email, phone, role..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["ALL", "INDIVIDUAL", "CUSTOMER", "PROSPECT", "VENDOR", "PARTNER"].map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => setTypeFilter(type)}
              className={`h-8 px-3 text-xs rounded-lg transition-all ${
                typeFilter === type
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Contacts Table & Detail Split ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table List */}
        <div className={`${selectedContact ? "lg:col-span-7" : "lg:col-span-12"} transition-all`}>
          <div className="rounded-xl border border-[#E5EAF1] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="border-b border-[#E5EAF1] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email &amp; Phone</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF1] font-normal">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          Loading contacts directory...
                        </div>
                      </td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        No contacts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    contacts.map((c: any) => {
                      const isSelected = selectedContact?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedContact(c)}
                          className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50/70 border-l-2 border-l-blue-600" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-gray-900">{c.name}</div>
                            {c.jobTitle && (
                              <div className="text-[11px] text-gray-500 mt-0.5">{c.jobTitle}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-mono tracking-wider border-[#E5EAF1] bg-gray-50 text-gray-700"
                            >
                              {c.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {c.company ? (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{c.company.displayName || c.company.legalName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-[#E5EAF1] text-gray-800">
                                <DropdownMenuItem
                                  onClick={() => setSelectedContact(c)}
                                  className="cursor-pointer"
                                >
                                  View Details
                                </DropdownMenuItem>
                                {c.email && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedContact(c);
                                      setIsEmailOpen(true);
                                    }}
                                    className="cursor-pointer text-blue-600"
                                  >
                                    Send Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm("Delete this contact?")) {
                                      deleteMutation.mutate(c.id);
                                    }
                                  }}
                                  className="cursor-pointer text-red-600 hover:text-red-700"
                                >
                                  Delete Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Selected Contact Detailed Drawer Panel */}
        {selectedContact && (
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E5EAF1] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{selectedContact.name}</h2>
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                      {selectedContact.type}
                    </Badge>
                  </div>
                  {selectedContact.jobTitle && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedContact.jobTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedContact.email && (
                    <Button
                      size="sm"
                      onClick={() => setIsEmailOpen(true)}
                      className="h-8 text-xs bg-[#008080] hover:bg-[#006666] text-white gap-1 px-2.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Email
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedContact(null)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Company</span>
                  <span className="text-gray-900 font-medium mt-0.5 block truncate">
                    {selectedContact.company?.displayName || selectedContact.company?.legalName || "None"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Status</span>
                  <span className="text-green-700 font-medium mt-0.5 block">
                    {selectedContact.status || "ACTIVE"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] col-span-2">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Email Address</span>
                  <span className="text-gray-900 font-mono mt-0.5 block truncate">
                    {selectedContact.email || "No email"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Phone</span>
                  <span className="text-gray-900 font-mono mt-0.5 block">
                    {selectedContact.phone || "—"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1]">
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Mobile</span>
                  <span className="text-gray-900 font-mono mt-0.5 block">
                    {selectedContact.mobile || "—"}
                  </span>
                </div>
              </div>

              {/* Notes / Comments Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Internal Notes &amp; Discussion
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-2 bg-[#F8FAFC] rounded">
                      No internal notes attached yet.
                    </p>
                  ) : (
                    comments.map((cm: any) => (
                      <div key={cm.id} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAF1] text-xs">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="font-semibold text-gray-700">{cm.author?.firstName} {cm.author?.lastName}</span>
                          <span>{shortDate(cm.createdAt)}</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{cm.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add an internal note or update..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newComment.trim()) {
                        addCommentMutation.mutate(newComment);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    onClick={() => addCommentMutation.mutate(newComment)}
                    className="h-8 text-xs bg-[#008080] hover:bg-[#006666] text-white px-3"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Contact Modal ────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E5EAF1] bg-white text-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ContactIcon className="h-4 w-4 text-blue-600" /> Create New Contact
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">First Name *</label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@company.com"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Contact Type</label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="PARTNER">Partner</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1">Phone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1">Job Title</label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. VP of Operations"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-600 block mb-1">Associated Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-8 px-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None (Individual Contact)</option>
                  {companies.map((comp: any) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.displayName || comp.legalName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-600 block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context or background details..."
                  className="w-full p-2 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Send Outbound Email Modal ────────────────────────────────────── */}
      {isEmailOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E5EAF1] bg-white text-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" /> Send Email to {selectedContact.name}
              </h3>
              <button onClick={() => setIsEmailOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-600 block mb-1">To</label>
                <Input
                  disabled
                  value={selectedContact.email}
                  className="h-8 text-xs bg-gray-50 border-[#E5EAF1] text-gray-700 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1">Subject *</label>
                <Input
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Meeting Follow-up / Project Discussion"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-gray-600 block mb-1">Message Body</label>
                <textarea
                  rows={5}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your email message here..."
                  className="w-full p-2.5 rounded-md bg-white border border-[#E5EAF1] text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF1]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEmailOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={sendingEmail}
                  className="bg-[#008080] hover:bg-[#006666] text-white gap-1.5"
                >
                  {sendingEmail ? "Dispatching..." : "Send Email"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
