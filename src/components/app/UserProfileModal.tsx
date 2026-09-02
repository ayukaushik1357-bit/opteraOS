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
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-border bg-card shadow-2xl rounded-2xl">
        {/* Header Hero Banner */}
        <div className="relative bg-gradient-to-r from-brand-indigo/20 via-brand-indigo/10 to-brand-cyan/20 p-6 border-b border-border/80">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-indigo text-white font-bold text-xl shadow-lg shadow-brand-indigo/30 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{displayName}</h2>
              <p className="text-xs text-muted-foreground truncate">{email || "user@optera.internal"}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-background/60 font-semibold text-brand-indigo border-brand-indigo/30">
                  <Shield className="h-3 w-3 mr-1" />
                  {current?.role || "Owner"}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-background/60 font-semibold text-foreground border-border">
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
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="profile" className="text-xs font-semibold">
                <User className="h-3.5 w-3.5 mr-1.5" /> Profile Details
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs font-semibold">
                <Lock className="h-3.5 w-3.5 mr-1.5" /> Security & Password
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 mt-0">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Full Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Work Email</Label>
                    <Input
                      type="email"
                      value={email || ""}
                      disabled
                      className="h-9 text-sm bg-muted/50 cursor-not-allowed opacity-80"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-medium">Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Job Title / Department</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Chief Executive Officer"
                    className="h-9 text-sm"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
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
                  <Label className="text-xs font-medium">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-medium">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Key className="h-3.5 w-3.5 text-brand-indigo" />
                    <span>Password Security Advice</span>
                  </div>
                  <p>Use at least 8 characters with a combination of uppercase letters, numbers, and symbols.</p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-brand-indigo text-white hover:bg-brand-indigo/90"
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
