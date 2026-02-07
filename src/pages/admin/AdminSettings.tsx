import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { hapticFeedback, isHapticSupported } from "@/lib/haptics";
import { Eye, EyeOff, Mail, Lock, Save, User, Volume2, VolumeX, Vibrate, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { useSoundSettings, useHapticSettings } from "@/hooks/useSoundSettings";
export default function AdminSettings() {
  const {
    profile,
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // Name change state
  const [contactName, setContactName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sound settings
  const { soundEnabled, setSoundEnabled } = useSoundSettings();
  const { hapticEnabled, setHapticEnabled } = useHapticSettings();
  const hapticSupported = isHapticSupported();

  // Initialize name from profile
  useEffect(() => {
    if (profile?.contact_name) {
      setContactName(profile.contact_name);
    }
  }, [profile?.contact_name]);
  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your name."
      });
      return;
    }
    if (!user?.id) return;
    setNameLoading(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        contact_name: contactName.trim()
      }).eq("id", user.id);
      if (error) throw error;
      hapticFeedback("success");
      toast({
        title: "Name updated",
        description: "Your name has been changed successfully."
      });
    } catch (error: any) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Failed to update name",
        description: error.message
      });
    } finally {
      setNameLoading(false);
    }
  };
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter a new email address."
      });
      return;
    }
    setEmailLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
      hapticFeedback("success");
      toast({
        title: "Confirmation email sent",
        description: "Check your new email address to confirm the change."
      });
      setNewEmail("");
    } catch (error: any) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Failed to update email",
        description: error.message
      });
    } finally {
      setEmailLoading(false);
    }
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Password required",
        description: "Please enter and confirm your new password."
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      hapticFeedback("warning");
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "New password and confirmation must match."
      });
      return;
    }
    if (newPassword.length < 6) {
      hapticFeedback("warning");
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters."
      });
      return;
    }
    setPasswordLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      hapticFeedback("success");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully."
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      hapticFeedback("error");
      toast({
        variant: "destructive",
        title: "Failed to update password",
        description: error.message
      });
    } finally {
      setPasswordLoading(false);
    }
  };
  return <AdminLayout>
      <div className="mb-6 pt-12">
        <h1 className="font-display text-2xl font-bold">Account Settings</h1>
        <p className="text-gray-400 text-sm">Manage your admin account credentials</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Current Account Info */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <h2 className="mb-4 text-lg font-semibold">Current Account</h2>
          <div className="space-y-2 text-gray-400">
            <p><span className="text-white">Name:</span> {profile?.contact_name}</p>
            <p><span className="text-white">Email:</span> {profile?.email}</p>
          </div>
        </div>

        {/* Change Name */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Change Name
          </h2>
          <form onSubmit={handleNameChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Display Name</Label>
              <Input id="contactName" type="text" placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)} className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
            </div>
            <Button type="submit" disabled={nameLoading || !contactName.trim() || contactName === profile?.contact_name} className="bg-primary hover:bg-primary/90" haptic="light">
              {nameLoading ? <LoadingSpinner size="sm" /> : <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Name
                </>}
            </Button>
          </form>
        </div>

        {/* Change Email */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Change Email
          </h2>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input id="newEmail" type="email" placeholder="newemail@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">
              A confirmation email will be sent to your new address.
            </p>
            <Button type="submit" disabled={emailLoading || !newEmail} className="bg-primary hover:bg-primary/90" haptic="light">
              {emailLoading ? <LoadingSpinner size="sm" /> : <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Email
                </>}
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input id="newPassword" type={showNewPassword ? "text" : "password"} placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pr-10 bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pr-10 bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Password must be at least 6 characters.
            </p>
            <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} className="bg-primary hover:bg-primary/90" haptic="light">
              {passwordLoading ? <LoadingSpinner size="sm" /> : <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </>}
            </Button>
          </form>
        </div>

        {/* Feedback Settings */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <h2 className="mb-4 text-lg font-semibold">Feedback Settings</h2>
          
          {/* Sound Toggle */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-white">Sound Feedback</p>
                <p className="text-sm text-gray-400">
                  Audio cues for swipe gestures and actions
                </p>
              </div>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(checked) => {
                setSoundEnabled(checked);
                hapticFeedback("light");
                toast({ 
                  title: checked ? "Sound feedback enabled" : "Sound feedback disabled" 
                });
              }}
            />
          </div>

          {/* Haptic Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-[#333]">
            <div className="flex items-center gap-3">
              <Vibrate className={`h-5 w-5 ${hapticEnabled && hapticSupported ? "text-primary" : "text-gray-400"}`} />
              <div>
                <p className="text-sm font-medium text-white">Haptic Feedback</p>
                <p className="text-sm text-gray-400">
                  {hapticSupported 
                    ? "Vibration for button presses and gestures"
                    : "Not supported on this device"
                  }
                </p>
              </div>
            </div>
            {hapticSupported ? (
              <Switch
                checked={hapticEnabled}
                onCheckedChange={(checked) => {
                  setHapticEnabled(checked);
                  toast({ 
                    title: checked ? "Haptic feedback enabled" : "Haptic feedback disabled" 
                  });
                }}
              />
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Smartphone className="h-3 w-3" />
                Not available
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>;
}