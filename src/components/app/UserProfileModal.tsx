import { useState } from "react";
import { User, Mail, Shield, Building2, Key, CheckCircle2, Lock, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useWorkspace } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({ open, onOpenChange }: UserProfileModalProps) {
  const { current, email } = useWorkspace();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile fields
  const defaultName = email
    ? (email.split("@")[0] || "User").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Business Leader";
  const [displayName, setDisplayName] = useState(defaultName);
  const [phone, setPhone] = useState("+91 98765 43210");
  const [jobTitle, setJobTitle] = useState("Administrator");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName, phone, job_title: jobTitle },
      });
      setSaving(false);
      if (error) throw error;
      toast.success("Profile details updated successfully!");
      onOpenChange(false);
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setSaving(false);
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      onOpenChange(false);
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Failed to update password");
    }
  };

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-[rgba(0,128,128,0.2)] bg-white shadow-2xl rounded-2xl">
        {/* Header Hero Banner */}
        <div className="relative bg-gradient-to-r from-[#008080]/15 via-[#0D9488]/10 to-[#14B8A6]/15 p-6 border-b border-[rgba(0,128,128,0.14)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#008080] via-[#0D9488] to-[#14B8A6] text-white font-bold text-xl shadow-teal-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#0F2423] truncate">{displayName}</h2>
              <p className="text-xs text-[#617D7B] truncate">{email || "user@optera.internal"}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-white/80 font-semibold text-[#008080] border-[rgba(0,128,128,0.3)]">
                  <Shield className="h-3 w-3 mr-1" />
                  {current?.role || "Owner"}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-white/80 font-semibold text-[#0F2423] border-[rgba(0,128,128,0.2)]">
                  <Building2 className="h-3 w-3 mr-1" />
                  {current?.name || "Workspace"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#EDF4F3] border border-[rgba(0,128,128,0.12)]">
              <TabsTrigger value="profile" className="text-xs font-semibold data-[state=active]:bg-[#008080] data-[state=active]:text-white">
                <User className="h-3.5 w-3.5 mr-1.5" /> Profile Details
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs font-semibold data-[state=active]:bg-[#008080] data-[state=active]:text-white">
                <Lock className="h-3.5 w-3.5 mr-1.5" /> Security & Password
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 mt-0">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-[#0F2423]">Full Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="h-9 text-sm border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-[#0F2423]">Work Email</Label>
                    <Input
                      type="email"
                      value={email || ""}
                      disabled
                      className="h-9 text-sm bg-[#EDF4F3]/60 cursor-not-allowed opacity-80 border-[rgba(0,128,128,0.15)] text-[#617D7B]"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium text-[#0F2423]">Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="h-9 text-sm border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-[#0F2423]">Job Title / Department</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Chief Executive Officer"
                    className="h-9 text-sm border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-[rgba(0,128,128,0.2)] text-[#0F2423] hover:border-[#008080]">
                    Close
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#008080] text-white hover:bg-[#006666] shadow-teal-sm"
                    disabled={saving}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4 mt-0">
              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-[#0F2423]">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-9 text-sm border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium text-[#0F2423]">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-9 text-sm border-[rgba(0,128,128,0.2)] focus-visible:ring-[#008080] text-[#0F2423]"
                  />
                </div>

                <div className="p-3 rounded-xl border border-[rgba(0,128,128,0.18)] bg-[#EDF4F3]/50 text-xs text-[#617D7B]">
                  <div className="flex items-center gap-1.5 font-semibold text-[#0F2423] mb-1">
                    <Key className="h-3.5 w-3.5 text-[#008080]" />
                    <span>Password Security Advice</span>
                  </div>
                  <p>Use at least 8 characters with a combination of uppercase letters, numbers, and symbols.</p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-[rgba(0,128,128,0.2)] text-[#0F2423] hover:border-[#008080]">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#008080] text-white hover:bg-[#006666] shadow-teal-sm"
                    disabled={saving || !newPassword}
                  >
                    Update Password
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
