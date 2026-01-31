import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import logoWhite from "@/assets/logo-white.png";
import { Truck, Check, Download } from "lucide-react";

type InviteData = {
  id: string;
  contact_name: string;
  phone: string;
  status: string;
  coverage_areas: string[];
};

export default function DriverSetup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"password" | "install" | "complete">("password");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from("driver_invites")
        .select("id, contact_name, phone, status, coverage_areas")
        .eq("invite_token", token)
        .maybeSingle();

      if (error || !data) {
        setError("Invite not found or has expired");
      } else if (data.status === "completed") {
        setError("This invite has already been used");
      } else {
        setInvite(data);
      }
      setLoading(false);
    };

    fetchInvite();
  }, [token]);

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create email from phone (using phone as unique identifier)
      const email = `driver-${invite!.phone.replace(/\D/g, "")}@audio-salvage.driver`;

      // Sign up the driver
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/driver`,
          data: {
            phone: invite!.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create account");

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email,
        contact_name: invite!.contact_name,
        phone: invite!.phone,
        role: "driver",
        business_name: "Driver",
        address_line1: "N/A",
        city: "N/A",
        postcode: "N/A",
        coverage_areas: invite!.coverage_areas || [],
      });

      if (profileError) throw profileError;

      // Update invite status
      await supabase
        .from("driver_invites")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          profile_id: authData.user.id,
        })
        .eq("id", invite!.id);

      setStep("install");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstallComplete = () => {
    setStep("complete");
  };

  const handleGoToApp = () => {
    navigate("/driver");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <Truck className="h-16 w-16 text-gray-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
        <p className="text-gray-400">{error}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => navigate("/driver-login")}
        >
          Go to Driver Login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header */}
      <div className="border-b border-[#333] px-6 py-4">
        <img src={logoWhite} alt="Audio Salvage UK" className="h-8 w-auto" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        {step === "password" && (
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome, {invite?.contact_name}!</h1>
              <p className="mt-2 text-gray-400">
                Create a password to complete your driver account setup.
              </p>
            </div>

            <form onSubmit={handleCreatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Create Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#1d1d1d] border-[#333] text-white"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#1d1d1d] border-[#333] text-white"
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : "Continue"}
              </Button>
            </form>
          </div>
        )}

        {step === "install" && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Install the App</h1>
            <p className="text-gray-400">
              Add Audio Salvage Driver to your home screen for quick access.
            </p>

            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4 text-left">
              <p className="text-sm font-medium text-white mb-2">On iPhone:</p>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Tap the Share button</li>
                <li>Scroll and tap "Add to Home Screen"</li>
                <li>Tap "Add"</li>
              </ol>
            </div>

            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4 text-left">
              <p className="text-sm font-medium text-white mb-2">On Android:</p>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Tap the menu (⋮) button</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add"</li>
              </ol>
            </div>

            <Button onClick={handleInstallComplete} className="w-full">
              I've Installed the App
            </Button>

            <button
              onClick={handleInstallComplete}
              className="text-sm text-gray-500 hover:text-gray-400"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "complete" && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">You're All Set!</h1>
            <p className="text-gray-400">
              Your driver account is now active. You can start accepting collection jobs.
            </p>

            <Button onClick={handleGoToApp} className="w-full">
              Open Driver App
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
