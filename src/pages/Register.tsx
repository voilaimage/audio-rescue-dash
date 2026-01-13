import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, ArrowRight, Building2, User, MapPin, Check } from "lucide-react";

type Step = 1 | 2 | 3;

export default function Register() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    driver_notes: "",
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.business_name || !formData.contact_name || !formData.phone) {
      toast({ variant: "destructive", title: "Missing information", description: "Please fill in all required fields" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast({ variant: "destructive", title: "Missing information", description: "Please fill in all required fields" });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure your passwords match" });
      return false;
    }
    if (formData.password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Password must be at least 6 characters" });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.address_line1 || !formData.city || !formData.postcode) {
      toast({ variant: "destructive", title: "Missing address", description: "Please fill in your pickup address" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        business_name: formData.business_name,
        contact_name: formData.contact_name,
        phone: formData.phone,
        email: formData.email,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        city: formData.city,
        postcode: formData.postcode.toUpperCase(),
        driver_notes: formData.driver_notes || null,
        role: "customer",
      });

      if (profileError) throw profileError;

      toast({ title: "Registration successful!", description: "Welcome to AudioSalvageUK Partner" });
      navigate("/home", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const stepIcons = [Building2, User, MapPin];
  const stepTitles = ["Business Details", "Account Details", "Pickup Address"];
  const stepDescs = ["Tell us about your business", "Create your login credentials", "Where should we collect from?"];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => (step === 1 ? navigate("/login") : handleBack())} className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5 shadow-card">
          <form onSubmit={handleSubmit}>
            {/* Step Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {step === 1 && <Building2 className="h-5 w-5 text-primary" />}
                {step === 2 && <User className="h-5 w-5 text-primary" />}
                {step === 3 && <MapPin className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">{stepTitles[step - 1]}</h2>
                <p className="text-sm text-muted-foreground">{stepDescs[step - 1]}</p>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Business Name *</Label>
                  <Input value={formData.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="Your Business Ltd" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Contact Name *</Label>
                  <Input value={formData.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} placeholder="John Smith" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Phone Number *</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="07xxx xxxxxx" required />
                </div>
                <Button type="button" onClick={handleNext} className="mt-4 w-full touch-target font-semibold">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="your@email.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Password *</Label>
                  <Input type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Confirm Password *</Label>
                  <Input type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="••••••••" required />
                </div>
                <Button type="button" onClick={handleNext} className="mt-4 w-full touch-target font-semibold">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Address Line 1 *</Label>
                  <Input value={formData.address_line1} onChange={(e) => updateField("address_line1", e.target.value)} placeholder="123 High Street" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Address Line 2</Label>
                  <Input value={formData.address_line2} onChange={(e) => updateField("address_line2", e.target.value)} placeholder="Unit 5, Business Park" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">City *</Label>
                    <Input value={formData.city} onChange={(e) => updateField("city", e.target.value)} placeholder="London" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Postcode *</Label>
                    <Input value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} placeholder="SW1A 1AA" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Driver Notes (Optional)</Label>
                  <Textarea value={formData.driver_notes} onChange={(e) => updateField("driver_notes", e.target.value)} placeholder="Parking instructions, access codes, etc." rows={2} className="resize-none" />
                </div>
                <Button type="submit" className="mt-4 w-full touch-target font-semibold" disabled={loading}>
                  {loading ? <LoadingSpinner size="sm" /> : <><Check className="mr-2 h-4 w-4" /> Complete Registration</>}
                </Button>
              </div>
            )}
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
