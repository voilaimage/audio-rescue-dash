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
import logo from "@/assets/logo-white.png";
import authBg from "@/assets/auth-bg.png";

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

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one digit" };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: "Password must contain at least one symbol (!@#$%^&*...)" };
    }
    return { valid: true, message: "" };
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
    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.valid) {
      toast({ variant: "destructive", title: "Password requirements not met", description: passwordCheck.message });
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
      const redirectUrl = window.location.origin;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          emailRedirectTo: redirectUrl,
          data: {
            business_name: formData.business_name,
            contact_name: formData.contact_name,
            phone: formData.phone,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || "",
            city: formData.city,
            postcode: formData.postcode.toUpperCase(),
            driver_notes: formData.driver_notes || "",
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Send verification email via our custom edge function
      const { error: emailError } = await supabase.functions.invoke("send-auth-email", {
        body: {
          email: formData.email,
          token: "",
          token_hash: authData.session ? "" : "pending",
          redirect_to: redirectUrl,
          email_action_type: "signup",
        },
      });

      if (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail registration, just warn
      }

      toast({ 
        title: "Registration successful!", 
        description: "Please check your email to verify your account." 
      });
      navigate("/login", { replace: true });
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
    <div 
      className="h-screen flex flex-col bg-background relative overflow-hidden"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-5 py-6 pb-12 relative z-10">
          {/* Back button and Logo row */}
          <div className="flex items-center gap-4 mt-8 mb-6">
            <button onClick={() => (step === 1 ? navigate("/login") : handleBack())} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 flex justify-center">
              <img src={logo} alt="Audio Salvage UK" className="h-16 w-auto" />
            </div>
            {/* Spacer to balance the layout */}
            <div className="w-10" />
          </div>

          {/* Progress */}
          <div className="mb-6 flex justify-center">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="animate-fade-in rounded-xl border border-[#555555] bg-[#1d1d1d] backdrop-blur-sm p-5 shadow-card">
            <form onSubmit={handleSubmit}>
              {/* Step Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {step === 1 && <Building2 className="h-5 w-5 text-primary" />}
                  {step === 2 && <User className="h-5 w-5 text-primary" />}
                  {step === 3 && <MapPin className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">{stepTitles[step - 1]}</h2>
                  <p className="text-sm text-gray-400">{stepDescs[step - 1]}</p>
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Business Name *</Label>
                    <Input value={formData.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="Your Business Ltd" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Contact Name *</Label>
                    <Input value={formData.contact_name} onChange={(e) => updateField("contact_name", e.target.value)} placeholder="John Smith" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Phone Number *</Label>
                    <Input type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="07xxx xxxxxx" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                  </div>
                  <Button type="button" onClick={handleNext} className="mt-4 w-full touch-target font-semibold">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

               {step === 2 && (
                 <div className="space-y-3">
                   <div className="space-y-1.5">
                     <Label className="text-sm text-white">Email *</Label>
                     <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="your@email.com" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-sm text-white">Password *</Label>
                     <Input type="password" value={formData.password} onChange={(e) => updateField("password", e.target.value)} placeholder="••••••••" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                   </div>
                   <div className="space-y-1.5">
                     <Label className="text-sm text-white">Confirm Password *</Label>
                     <Input type="password" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="••••••••" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                   </div>
                   <Button type="button" onClick={handleNext} className="w-full touch-target font-semibold mt-4">
                     Continue <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                 </div>
               )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Address Line 1 *</Label>
                    <Input value={formData.address_line1} onChange={(e) => updateField("address_line1", e.target.value)} placeholder="123 High Street" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Address Line 2</Label>
                    <Input value={formData.address_line2} onChange={(e) => updateField("address_line2", e.target.value)} placeholder="Unit 5, Business Park" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-white">City *</Label>
                      <Input value={formData.city} onChange={(e) => updateField("city", e.target.value)} placeholder="London" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-white">Postcode *</Label>
                      <Input value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} placeholder="SW1A 1AA" className="bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-white">Driver Notes (Optional)</Label>
                    <Textarea value={formData.driver_notes} onChange={(e) => updateField("driver_notes", e.target.value)} placeholder="Parking instructions, access codes, etc." rows={2} className="resize-none bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
                  </div>
                  <Button type="submit" className="mt-4 w-full touch-target font-semibold" disabled={loading}>
                    {loading ? <LoadingSpinner size="sm" /> : <><Check className="mr-2 h-4 w-4" /> Complete Registration</>}
                  </Button>
                </div>
              )}
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-white space-y-3 pb-8">
            <p className="text-base">Already have an account?</p>
            <Link to="/login" className="font-extrabold text-base text-primary underline hover:text-primary/80">Sign in</Link>
            
            <div className="pt-2 border-t border-[#555555] text-xs text-gray-400 space-y-1">
              <p>
                By registering, you agree to our{" "}
                <Link to="/terms-of-service" className="text-[#f59f0a] hover:text-[#f59f0a]/80 underline">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link to="/privacy-policy" className="text-[#f59f0a] hover:text-[#f59f0a]/80 underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
