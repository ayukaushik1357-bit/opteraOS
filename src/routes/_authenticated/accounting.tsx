import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Plus,
  Receipt,
  BookOpen,
  PieChart,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  Building2,
  Download,
  Percent,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspace } from "@/components/app/AppShell";
import { accountingApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "Accounting & General Ledger — opteraOS";
const description = "Double-entry accounting, balanced general ledger journal entries, chart of accounts, balance sheet, and P&L.";

export const Route = createFileRoute("/_authenticated/accounting")({
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
  component: AccountingMasterPage,
});

function AccountingMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const currency = current?.currency || "INR";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("general_ledger");
  const [newJournalOpen, setNewJournalOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);

  // Queries
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounting_accounts", orgId],
    queryFn: () => accountingApi.getAccounts(orgId),
    enabled: !!orgId,
  });

  const { data: journalRes, isLoading: loadingJournals } = useQuery({
    queryKey: ["accounting_journals", orgId],
    queryFn: () => accountingApi.getJournalEntries(orgId),
    enabled: !!orgId,
  });
  const journals = journalRes?.rows || [];

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["accounting_reports", orgId],
    queryFn: () => accountingApi.getReports(orgId),
    enabled: !!orgId,
  });

  const { data: expenseRes, isLoading: loadingExpenses } = useQuery({
    queryKey: ["accounting_expenses", orgId],
    queryFn: () => accountingApi.getExpenses(orgId),
    enabled: !!orgId,
  });
  const expenses = expenseRes?.rows || [];

  // Mutations
  const seedMutation = useMutation({
    mutationFn: () => accountingApi.seedAccounts(orgId),
    onSuccess: () => {
      toast.success("Standard Chart of Accounts initialized!");
      queryClient.invalidateQueries({ queryKey: ["accounting_accounts", orgId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_reports", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to initialize COA"),
  });

  const createAccountMutation = useMutation({
    mutationFn: (dto: any) => accountingApi.createAccount(orgId, dto),
    onSuccess: () => {
      toast.success("Account created successfully!");
      setNewAccountOpen(false);
      queryClient.invalidateQueries({ queryKey: ["accounting_accounts", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create account"),
  });

  const createJournalMutation = useMutation({
    mutationFn: (dto: any) => accountingApi.createJournalEntry(orgId, dto),
    onSuccess: () => {
      toast.success("Journal Entry posted to General Ledger!");
      setNewJournalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["accounting_journals", orgId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_reports", orgId] });
      queryClient.invalidateQueries({ queryKey: ["accounting_accounts", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to post journal entry"),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (dto: any) => accountingApi.createExpense(orgId, dto),
    onSuccess: () => {
      toast.success("Expense recorded!");
      setNewExpenseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["accounting_expenses", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to record expense"),
  });

  // State for new journal entry form
  const [journalRef, setJournalRef] = useState("");
  const [journalNotes, setJournalNotes] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [journalAmount, setJournalAmount] = useState("");
  const [journalItemName, setJournalItemName] = useState("");

  // State for new account form
  const [newAccCode, setNewAccCode] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<string>("EXPENSE");

  // State for expense form
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Operating & Admin Expenses");

  const totalAssets = reports?.balanceSheet?.totalAssets || 0;
  const totalLiabilities = reports?.balanceSheet?.totalLiabilities || 0;
  const totalRevenue = reports?.profitAndLoss?.totalRevenue || 0;
  const totalExpenses = reports?.profitAndLoss?.totalExpenses || 0;
  const netProfit = reports?.profitAndLoss?.netProfit || 0;

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Accounting &amp; General Ledger
            </h1>
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs">
              Double-Entry
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Enterprise-grade General Ledger, real-time Balance Sheet, Profit &amp; Loss, and balanced Journal Entries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Init Chart of Accounts
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setNewJournalOpen(true)}
            className="bg-[#008080] hover:bg-[#006666] text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* ── Executive Metrics Summary ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Total Assets</span>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {currency} {totalAssets.toLocaleString()}
          </div>
          <span className="text-[11px] text-green-700 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3" /> Real Ledger Balance
          </span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Total Liabilities</span>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {currency} {totalLiabilities.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Accounts Payable &amp; GST</span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Revenue (P&amp;L)</span>
          <div className="text-xl font-bold text-green-700 mt-1">
            {currency} {totalRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-green-700 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" /> Sales &amp; Services
          </span>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <span className="text-xs font-medium text-gray-500">Net Profit</span>
          <div className={`text-xl font-bold mt-1 ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {currency} {netProfit.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">
            Margin: {reports?.profitAndLoss?.netMargin ? `${reports.profitAndLoss.netMargin.toFixed(1)}%` : "0%"}
          </span>
        </div>
      </div>

      {/* ── Main Accounting Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="general_ledger" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <FileText className="h-3.5 w-3.5" /> General Ledger
          </TabsTrigger>
          <TabsTrigger value="chart_of_accounts" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Layers className="h-3.5 w-3.5" /> Chart of Accounts ({accounts.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <PieChart className="h-3.5 w-3.5" /> Balance Sheet &amp; P&amp;L
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Receipt className="h-3.5 w-3.5" /> Expenses ({expenses.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. General Ledger ───────────────────────────────────────────────── */}
        <TabsContent value="general_ledger" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">General Ledger Journal Entries</h2>
              <span className="text-xs text-gray-500">{journals.length} posted entries</span>
            </div>

            {loadingJournals ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : journals.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Journal Entries Posted Yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Post your first balanced double-entry transaction or generate invoices and bills to automatically create ledger records.
                </p>
                <Button size="sm" onClick={() => setNewJournalOpen(true)} className="mt-4 bg-[#008080] hover:bg-[#006666] text-white">
                  Post First Entry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Entry #</TableHead>
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Reference</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-gray-500">Debit Lines</TableHead>
                    <TableHead className="text-gray-500">Credit Lines</TableHead>
                    <TableHead className="text-right text-gray-500">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {journals.map((j: any) => {
                    const totalDebit = (j.items || []).reduce((s: number, i: any) => s + Number(i.debit || 0), 0);
                    return (
                      <TableRow key={j.id} className="hover:bg-[#F8FAFC]">
                        <TableCell className="font-mono text-xs text-blue-600 font-semibold">{j.entryNumber}</TableCell>
                        <TableCell className="text-xs text-gray-600">{shortDate(j.date)}</TableCell>
                        <TableCell className="text-xs text-gray-600">{j.reference || j.notes || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                            {j.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {(j.items || [])
                            .filter((i: any) => Number(i.debit) > 0)
                            .map((i: any) => `${i.account?.code} (${i.name})`)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {(j.items || [])
                            .filter((i: any) => Number(i.credit) > 0)
                            .map((i: any) => `${i.account?.code} (${i.name})`)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-gray-900 font-semibold">
                          {currency} {totalDebit.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 2. Chart of Accounts ────────────────────────────────────────────── */}
        <TabsContent value="chart_of_accounts" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Chart of Accounts (COA)</h2>
                <p className="text-xs text-gray-500">Structured classification of Assets, Liabilities, Equity, Revenues &amp; Expenses</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNewAccountOpen(true)} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Account
              </Button>
            </div>

            {loadingAccounts ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Code</TableHead>
                    <TableHead className="text-gray-500">Account Name</TableHead>
                    <TableHead className="text-gray-500">Type</TableHead>
                    <TableHead className="text-right text-gray-500">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {accounts.map((acc: any) => (
                    <TableRow key={acc.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{acc.code}</TableCell>
                      <TableCell className="text-xs text-gray-900 font-medium">{acc.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            acc.type === "ASSET"
                              ? "border-blue-200 text-blue-700 bg-blue-50"
                              : acc.type === "LIABILITY"
                              ? "border-amber-200 text-amber-700 bg-amber-50"
                              : acc.type === "REVENUE"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : "border-purple-200 text-purple-700 bg-purple-50"
                          }`}
                        >
                          {acc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-gray-800">
                        {currency} {Number(acc.balance || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 3. Balance Sheet & P&L ──────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Balance Sheet */}
            <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-600" /> Balance Sheet
                </h3>
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs">
                  Balanced
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Assets</span>
                  {(reports?.balanceSheet?.assets || []).map((a: any) => (
                    <div key={a.id} className="flex justify-between py-1 border-b border-[#E5EAF1]/50 text-gray-600">
                      <span>{a.code} - {a.name}</span>
                      <span className="font-mono text-gray-900">{currency} {a.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-gray-900 border-t border-[#E5EAF1] mt-1">
                    <span>Total Assets</span>
                    <span className="font-mono">{currency} {totalAssets.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Liabilities &amp; Equity</span>
                  {(reports?.balanceSheet?.liabilities || []).map((l: any) => (
                    <div key={l.id} className="flex justify-between py-1 border-b border-[#E5EAF1]/50 text-gray-600">
                      <span>{l.code} - {l.name}</span>
                      <span className="font-mono text-gray-900">{currency} {l.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 border-b border-[#E5EAF1]/50 text-gray-600">
                    <span>Retained Earnings (Net Profit)</span>
                    <span className="font-mono text-green-700 font-semibold">{currency} {netProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-gray-900 border-t border-[#E5EAF1] mt-1">
                    <span>Total Liabilities &amp; Equity</span>
                    <span className="font-mono">{currency} {(totalLiabilities + netProfit).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Loss Statement */}
            <div className="rounded-xl border border-[#E5EAF1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Profit &amp; Loss Statement
                </h3>
                <span className="text-xs text-gray-500">Current Financial Period</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Operating Revenues</span>
                  {(reports?.profitAndLoss?.revenue || []).map((r: any) => (
                    <div key={r.id} className="flex justify-between py-1 border-b border-[#E5EAF1]/50 text-gray-600">
                      <span>{r.code} - {r.name}</span>
                      <span className="font-mono text-green-700 font-semibold">{currency} {r.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-green-700 border-t border-[#E5EAF1] mt-1">
                    <span>Total Operating Revenue</span>
                    <span className="font-mono">{currency} {totalRevenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="font-semibold text-gray-700 uppercase tracking-wider text-[10px]">Operating Expenses</span>
                  {(reports?.profitAndLoss?.expenses || []).map((e: any) => (
                    <div key={e.id} className="flex justify-between py-1 border-b border-[#E5EAF1]/50 text-gray-600">
                      <span>{e.code} - {e.name}</span>
                      <span className="font-mono text-gray-900">{currency} {e.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-bold text-gray-900 border-t border-[#E5EAF1] mt-1">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">{currency} {totalExpenses.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex justify-between items-center mt-3">
                  <span className="font-bold text-gray-900 text-sm">Net Operating Profit</span>
                  <span className={`text-base font-bold font-mono ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {currency} {netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 4. Expenses ─────────────────────────────────────────────────────── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Operational Expenses &amp; Reimbursements</h2>
                <p className="text-xs text-gray-500">Track and categorize company expenditures and employee claims</p>
              </div>
              <Button size="sm" onClick={() => setNewExpenseOpen(true)} className="bg-[#008080] hover:bg-[#006666] text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Record Expense
              </Button>
            </div>

            {loadingExpenses ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Expenses Recorded</p>
                <p className="text-xs text-gray-500 mt-1">Record company operational costs and team expenditures.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Expense Title</TableHead>
                    <TableHead className="text-gray-500">Category</TableHead>
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-right text-gray-500">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {expenses.map((exp: any) => (
                    <TableRow key={exp.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-semibold text-gray-900">{exp.title}</TableCell>
                      <TableCell className="text-xs text-gray-600">{exp.category}</TableCell>
                      <TableCell className="text-xs text-gray-500">{shortDate(exp.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                          {exp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-gray-900 font-bold">
                        {currency} {Number(exp.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: New Journal Entry ────────────────────────────────────────── */}
      <Dialog open={newJournalOpen} onOpenChange={setNewJournalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Balanced Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Transaction Reference / Description</Label>
              <Input
                value={journalItemName}
                onChange={(e) => setJournalItemName(e.target.value)}
                placeholder="e.g. Server infrastructure cloud invoice payment"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-700">Debit Account (+ Asset / Expense)</Label>
                <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Debit Account" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700">Credit Account (- Asset / + Liability)</Label>
                <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Credit Account" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-700">Amount ({currency})</Label>
              <Input
                type="number"
                value={journalAmount}
                onChange={(e) => setJournalAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewJournalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amt = Number(journalAmount);
                if (!amt || amt <= 0 || !debitAccountId || !creditAccountId) {
                  toast.error("Please fill in both debit and credit accounts and a positive amount.");
                  return;
                }
                createJournalMutation.mutate({
                  reference: journalRef || journalItemName,
                  notes: journalNotes,
                  items: [
                    { accountId: debitAccountId, name: journalItemName || "Debit line", debit: amt, credit: 0 },
                    { accountId: creditAccountId, name: journalItemName || "Credit line", debit: 0, credit: amt },
                  ],
                });
              }}
              disabled={createJournalMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              {createJournalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post to General Ledger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: New Account ─────────────────────────────────────────────── */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Account to Chart of Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Account Code</Label>
              <Input
                value={newAccCode}
                onChange={(e) => setNewAccCode(e.target.value)}
                placeholder="e.g. 6300"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Account Name</Label>
              <Input
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                placeholder="e.g. Software &amp; SaaS Subscriptions"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Classification Type</Label>
              <Select value={newAccType} onValueChange={setNewAccType}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ASSET">ASSET</SelectItem>
                  <SelectItem value="LIABILITY">LIABILITY</SelectItem>
                  <SelectItem value="EQUITY">EQUITY</SelectItem>
                  <SelectItem value="REVENUE">REVENUE</SelectItem>
                  <SelectItem value="EXPENSE">EXPENSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAccountOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newAccCode || !newAccName) {
                  toast.error("Please provide both account code and name.");
                  return;
                }
                createAccountMutation.mutate({ code: newAccCode, name: newAccName, type: newAccType });
              }}
              disabled={createAccountMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Record Expense ──────────────────────────────────────────── */}
      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Operational Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Expense Title</Label>
              <Input
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="e.g. AWS Cloud Infrastructure Hosting"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Amount ({currency})</Label>
              <Input
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Category</Label>
              <Input
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                placeholder="e.g. Operations, Marketing, Travel"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExpenseOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amt = Number(expAmount);
                if (!expTitle || !amt || amt <= 0) {
                  toast.error("Please provide a valid title and positive amount.");
                  return;
                }
                createExpenseMutation.mutate({ title: expTitle, amount: amt, category: expCategory });
              }}
              disabled={createExpenseMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Record Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
