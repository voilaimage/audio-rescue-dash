import { useState, useRef, useEffect } from "react";
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

declare global {
  interface Window {
    turnstile: {
      render: (id: string, options: { sitekey: string; theme: string }) => void;
      getResponse: () => string | undefined;
      reset: () => void;
    };
  }
}

const TURNSTILE_SITE_KEY = "0x4AAAAAACYhxsndid19yosKrIZSK6cSg60";

type Step = 1 | 2 | 3;

export default function Register() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    // Render Turnstile widget when step 2 is reached
    if (step === 2 && turnstileRef.current && window.turnstile) {
      window.turnstile.render("#turnstile-register", {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
      });
    }
  }, [step]);

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

    // Check if Turnstile is loaded and get token
    if (!window.turnstile || typeof window.turnstile.getResponse !== 'function') {
      toast({
        variant: "destructive",
        title: "CAPTCHA Not Ready",
        description: "Please wait for CAPTCHA to load and try again",
      });
      return;
    }

    const token = window.turnstile.getResponse();
    if (!token) {
      toast({
        variant: "destructive",
        title: "CAPTCHA Required",
        description: "Please complete the CAPTCHA verification",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify CAPTCHA with backend
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-turnstile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ token }),
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "CAPTCHA verification failed");
      }

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
      // Reset CAPTCHA on error
      if (window.turnstile && typeof window.turnstile.reset === 'function') {
        window.turnstile.reset();
      }
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
                   <div className="mb-4 mt-4">
                     <div id="turnstile-register" ref={turnstileRef} className="flex justify-center"></div>
                   </div>
                   <Button type="button" onClick={handleNext} className="w-full touch-target font-semibold">
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

          <div className="mt-6 text-center text-sm text-white space-y-1">
            <p className="text-base">Already have an account?</p>
            <Link to="/login" className="font-extrabold text-base text-primary underline hover:text-primary/80">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
