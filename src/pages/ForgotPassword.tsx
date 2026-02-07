import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Mail, Send } from "lucide-react";
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Render Turnstile widget
    if (turnstileRef.current && window.turnstile) {
      window.turnstile.render("#turnstile-forgot", {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }

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
      // Verify CAPTCHA with backend (using forgot-password endpoint for rate limiting)
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-turnstile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ token, endpoint: "forgot-password" }),
        }
      );

      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        // Check for rate limiting
        if (verifyResponse.status === 429 || verifyData.rateLimited) {
          throw new Error(verifyData.error || "Too many failed attempts. Please try again later.");
        }
        throw new Error(verifyData.error || "CAPTCHA verification failed");
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "Check your inbox for the password reset link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: error.message,
      });
      // Reset CAPTCHA on error
      if (window.turnstile && typeof window.turnstile.reset === 'function') {
        window.turnstile.reset();
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 relative z-10">
          {/* Logo */}
          <div className="mb-10 flex flex-col items-center -mt-24">
            <img src={logo} alt="Audio Salvage UK" className="h-24 w-auto" />
            <p className="mt-2 text-lg text-white">Password Recovery</p>
          </div>

          {/* Forgot Password Form */}
          <div className="w-full max-w-sm animate-fade-in">
            <div className="rounded-xl border border-[#555555] bg-[#1d1d1d] backdrop-blur-sm p-6 shadow-card">
              {!emailSent ? (
                <>
                  <h2 className="mb-2 text-center font-display text-xl font-semibold text-white">
                    Forgot Password?
                  </h2>
                  <p className="mb-6 text-center text-sm text-gray-400">
                    Enter your email and we'll send you a reset link
                  </p>

                   <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="email" className="text-white">Email</Label>
                       <div className="relative">
                         <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                         <Input
                           id="email"
                           type="email"
                           placeholder="your@email.com"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="pl-10 bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500"
                           required
                         />
                       </div>
                     </div>

                     <div className="mb-4">
                       <div id="turnstile-forgot" ref={turnstileRef} className="flex justify-center"></div>
                     </div>

                     <Button 
                       type="submit" 
                       className="w-full touch-target font-semibold bg-[#f59f0a] hover:bg-[#f59f0a]/90 text-white" 
                       disabled={loading}
                     >
                       {loading ? <LoadingSpinner size="sm" /> : (
                         <>
                           <Send className="mr-2 h-4 w-4" />
                           Send Reset Link
                         </>
                       )}
                     </Button>
                   </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="mb-2 font-display text-xl font-semibold text-white">
                    Check Your Email
                  </h2>
                  <p className="text-sm text-gray-400 mb-4">
                    We've sent a password reset link to<br />
                    <span className="text-white font-medium">{email}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Didn't receive it? Check your spam folder or{" "}
                    <button 
                      onClick={() => setEmailSent(false)} 
                      className="text-[#f59f0a] underline hover:text-[#f59f0a]/80"
                    >
                      try again
                    </button>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 text-center pb-8">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-white hover:text-[#f59f0a] transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
