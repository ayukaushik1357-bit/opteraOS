import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Calendar,
  Clock,
  Briefcase,
  CheckCircle2,
  UserCheck,
  Building2,
  Loader2,
  HeartHandshake,
  GraduationCap,
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
import { hrApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

const title = "HR & People Operations — opteraOS";
const description = "Employee directory, time-off approvals, attendance tracking, and recruitment ATS.";

export const Route = createFileRoute("/_authenticated/hr")({
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
  component: HrMasterPage,
});

function HrMasterPage() {
  const { current } = useWorkspace();
  const orgId = current?.id || "";
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("employees");
  const [newEmpOpen, setNewEmpOpen] = useState(false);
  const [newTimeOffOpen, setNewTimeOffOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);

  // Queries
  const { data: empRes, isLoading: loadingEmp } = useQuery({
    queryKey: ["hr_employees", orgId],
    queryFn: () => hrApi.getEmployees(orgId),
    enabled: !!orgId,
  });
  const employees = empRes?.rows || [];

  const { data: timeOffList = [], isLoading: loadingTimeOff } = useQuery({
    queryKey: ["hr_time_off", orgId],
    queryFn: () => hrApi.getTimeOffRequests(orgId),
    enabled: !!orgId,
  });

  const { data: attendances = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["hr_attendance", orgId],
    queryFn: () => hrApi.getAttendance(orgId),
    enabled: !!orgId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["hr_jobs", orgId],
    queryFn: () => hrApi.getJobs(orgId),
    enabled: !!orgId,
  });

  // Mutations
  const createEmpMutation = useMutation({
    mutationFn: (dto: any) => hrApi.createEmployee(orgId, dto),
    onSuccess: () => {
      toast.success("Employee onboarded!");
      setNewEmpOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr_employees", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add employee"),
  });

  const createTimeOffMutation = useMutation({
    mutationFn: (dto: any) => hrApi.createTimeOffRequest(orgId, dto),
    onSuccess: () => {
      toast.success("Time off requested!");
      setNewTimeOffOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr_time_off", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to request time off"),
  });

  const approveTimeOffMutation = useMutation({
    mutationFn: (id: string) => hrApi.approveTimeOff(orgId, id),
    onSuccess: () => {
      toast.success("Time off approved!");
      queryClient.invalidateQueries({ queryKey: ["hr_time_off", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to approve time off"),
  });

  const createJobMutation = useMutation({
    mutationFn: (dto: any) => hrApi.createJob(orgId, dto),
    onSuccess: () => {
      toast.success("Job position posted!");
      setNewJobOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr_jobs", orgId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create job posting"),
  });

  // Form states
  const [empFirst, setEmpFirst] = useState("");
  const [empLast, setEmpLast] = useState("");
  const [empTitle, setEmpTitle] = useState("");

  const [toEmpId, setToEmpId] = useState("");
  const [toType, setToType] = useState("Paid Time Off");
  const [toDays, setToDays] = useState("2");
  const [toReason, setToReason] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [jobType, setJobType] = useState("Full-time");

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5EAF1] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                HR &amp; People Operations
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Employee directory, leave approvals, attendance logging, and recruitment pipeline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewTimeOffOpen(true)}
            className="text-xs h-9"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Request Leave
          </Button>

          <Button
            size="sm"
            onClick={() => setNewEmpOpen(true)}
            className="bg-[#008080] hover:bg-[#006666] text-white gap-1.5 shadow-sm text-xs h-9 font-medium"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#F8FAFC] border border-[#E5EAF1] p-1">
          <TabsTrigger value="employees" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Users className="h-3.5 w-3.5" /> Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="time_off" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Calendar className="h-3.5 w-3.5" /> Time Off / Leaves ({timeOffList.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Clock className="h-3.5 w-3.5" /> Attendance ({attendances.length})
          </TabsTrigger>
          <TabsTrigger value="recruitment" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs">
            <Briefcase className="h-3.5 w-3.5" /> Recruitment ATS ({jobs.length})
          </TabsTrigger>
        </TabsList>

        {/* ── 1. Employees Directory ──────────────────────────────────────────── */}
        <TabsContent value="employees" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Employee Directory</h2>
              <span className="text-xs text-gray-500">{employees.length} active staff</span>
            </div>

            {loadingEmp ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Employees Found</p>
                <p className="text-xs text-gray-500 mt-1">Onboard employees and team members to manage payroll and leaves.</p>
                <Button size="sm" onClick={() => setNewEmpOpen(true)} className="mt-4 bg-[#008080] hover:bg-[#006666] text-white text-xs">
                  Onboard First Employee
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Employee #</TableHead>
                    <TableHead className="text-gray-500">Name</TableHead>
                    <TableHead className="text-gray-500">Job Title</TableHead>
                    <TableHead className="text-gray-500">Department</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {employees.map((emp: any) => (
                    <TableRow key={emp.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">{emp.employeeNumber}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-900">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{emp.jobTitle}</TableCell>
                      <TableCell className="text-xs text-gray-500">{emp.department?.name || "General"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                          {emp.employmentType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 2. Time Off / Leaves ────────────────────────────────────────────── */}
        <TabsContent value="time_off" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Time Off &amp; Leave Requests</h2>
              <Button size="sm" onClick={() => setNewTimeOffOpen(true)} className="bg-[#008080] hover:bg-[#006666] text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Request Leave
              </Button>
            </div>

            {loadingTimeOff ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : timeOffList.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Leave Requests Pending</p>
                <p className="text-xs text-gray-500 mt-1">Submitted time-off applications will show here for approval.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Employee</TableHead>
                    <TableHead className="text-gray-500">Leave Type</TableHead>
                    <TableHead className="text-gray-500">Dates</TableHead>
                    <TableHead className="text-gray-500">Duration</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                    <TableHead className="text-right text-gray-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {timeOffList.map((to: any) => (
                    <TableRow key={to.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900">
                        {to.employee?.firstName} {to.employee?.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{to.leaveType}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {shortDate(to.startDate)} → {shortDate(to.endDate)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{to.daysCount} days</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            to.status === "APPROVED"
                              ? "border-green-200 text-green-700 bg-green-50"
                              : "border-amber-200 text-amber-700 bg-amber-50"
                          }`}
                        >
                          {to.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {to.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveTimeOffMutation.mutate(to.id)}
                            disabled={approveTimeOffMutation.isPending}
                            className="h-7 text-[11px] border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
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

        {/* ── 3. Attendance Logs ──────────────────────────────────────────────── */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Daily Attendance &amp; Punch Logs</h2>
              <span className="text-xs text-gray-500">{attendances.length} records</span>
            </div>

            {loadingAtt ? (
              <div className="p-8 space-y-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : attendances.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Attendance Records</p>
                <p className="text-xs text-gray-500 mt-1">Punch logs and biometric check-ins will display here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Date</TableHead>
                    <TableHead className="text-gray-500">Employee</TableHead>
                    <TableHead className="text-gray-500">Check In</TableHead>
                    <TableHead className="text-gray-500">Check Out</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {attendances.map((att: any) => (
                    <TableRow key={att.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs text-gray-500">{shortDate(att.date)}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-900">
                        {att.employee?.firstName} {att.employee?.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{new Date(att.checkIn).toLocaleTimeString()}</TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : "Active"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                          {att.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── 4. Recruitment ATS ──────────────────────────────────────────────── */}
        <TabsContent value="recruitment" className="space-y-4">
          <div className="rounded-xl border border-[#E5EAF1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-[#E5EAF1] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recruitment &amp; Job Openings</h2>
              <Button size="sm" onClick={() => setNewJobOpen(true)} className="bg-[#008080] hover:bg-[#006666] text-white text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Post Job Opening
              </Button>
            </div>

            {jobs.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-800">No Open Job Postings</p>
                <p className="text-xs text-gray-500 mt-1">Post job vacancies to manage applicant pipelines in your ATS.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow className="border-b border-[#E5EAF1]">
                    <TableHead className="text-gray-500">Position Title</TableHead>
                    <TableHead className="text-gray-500">Type</TableHead>
                    <TableHead className="text-gray-500">Department</TableHead>
                    <TableHead className="text-gray-500">Applicants</TableHead>
                    <TableHead className="text-gray-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#E5EAF1]">
                  {jobs.map((j: any) => (
                    <TableRow key={j.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-xs font-bold text-gray-900">{j.title}</TableCell>
                      <TableCell className="text-xs text-gray-600">{j.employmentType || "Full-time"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{j.department?.name || "Engineering"}</TableCell>
                      <TableCell className="text-xs text-blue-600 font-semibold">{j._count?.applicants || 0} candidates</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px]">
                          {j.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Onboard Employee ────────────────────────────────────────── */}
      <Dialog open={newEmpOpen} onOpenChange={setNewEmpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Onboard New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-700">First Name</Label>
                <Input
                  value={empFirst}
                  onChange={(e) => setEmpFirst(e.target.value)}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-700">Last Name</Label>
                <Input
                  value={empLast}
                  onChange={(e) => setEmpLast(e.target.value)}
                  placeholder="Doe"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Job Title</Label>
              <Input
                value={empTitle}
                onChange={(e) => setEmpTitle(e.target.value)}
                placeholder="Senior Software Engineer"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEmpOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!empFirst || !empLast || !empTitle) {
                  toast.error("Please fill in employee name and title.");
                  return;
                }
                createEmpMutation.mutate({ firstName: empFirst, lastName: empLast, jobTitle: empTitle });
              }}
              disabled={createEmpMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Onboard Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Request Leave ───────────────────────────────────────────── */}
      <Dialog open={newTimeOffOpen} onOpenChange={setNewTimeOffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave / Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Employee</Label>
              <select
                value={toEmpId}
                onChange={(e) => setToEmpId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-[#E5EAF1] bg-white text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.jobTitle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-700">Leave Type</Label>
              <Input
                value={toType}
                onChange={(e) => setToType(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Duration (Days)</Label>
              <Input
                type="number"
                value={toDays}
                onChange={(e) => setToDays(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Reason</Label>
              <Input
                value={toReason}
                onChange={(e) => setToReason(e.target.value)}
                placeholder="Personal leave / Family event"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTimeOffOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!toEmpId || Number(toDays) <= 0) {
                  toast.error("Please select an employee and duration.");
                  return;
                }
                const start = new Date();
                const end = new Date();
                end.setDate(start.getDate() + Number(toDays));
                createTimeOffMutation.mutate({
                  employeeId: toEmpId,
                  leaveType: toType,
                  startDate: start.toISOString(),
                  endDate: end.toISOString(),
                  daysCount: Number(toDays),
                  reason: toReason,
                });
              }}
              disabled={createTimeOffMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Post Job ────────────────────────────────────────────────── */}
      <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Open Job Vacancy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-gray-700">Job Title</Label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Lead Full-Stack Architect"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-700">Employment Type</Label>
              <Input
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="Full-time, Contract, Remote"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewJobOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!jobTitle) {
                  toast.error("Please provide job title.");
                  return;
                }
                createJobMutation.mutate({ title: jobTitle, employmentType: jobType });
              }}
              disabled={createJobMutation.isPending}
              className="bg-[#008080] hover:bg-[#006666] text-white text-xs"
            >
              Publish Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
