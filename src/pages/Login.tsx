import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { isNativeApp } from "@/lib/capacitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Detect if accessed from admin subdomain
  const isAdminDomain = window.location.hostname.startsWith('admin.');

  useEffect(() => {
    // Render Turnstile widget
    if (turnstileRef.current && window.turnstile) {
      window.turnstile.render("#turnstile-login", {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check CAPTCHA only on web, not on native app
      if (!isNativeApp()) {
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
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (profile?.role === "driver") {
        // Redirect drivers to their portal
        navigate("/driver", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
      // Reset CAPTCHA on error (only on web)
      if (!isNativeApp() && window.turnstile && typeof window.turnstile.reset === 'function') {
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
            <p className="mt-2 text-lg text-white">{isAdminDomain ? 'Admin Portal' : 'Partner Portal'}</p>
          </div>

          {/* Login Form */}
          <div className="w-full max-w-sm animate-fade-in">
            <div className="rounded-xl border border-[#555555] bg-[#1d1d1d] backdrop-blur-sm p-6 shadow-card">
              <h2 className="mb-6 text-center font-display text-xl font-semibold text-white">
                Welcome Back
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isNativeApp() && (
                  <div className="mb-4">
                    <div id="turnstile-login" ref={turnstileRef} className="flex justify-center"></div>
                  </div>
                )}

                <Button type="submit" className="w-full touch-target font-semibold bg-[#f59f0a] hover:bg-[#f59f0a]/90 text-white" disabled={loading}>
                  {loading ? <LoadingSpinner size="sm" /> : "Sign In"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-gray-400 hover:text-[#f59f0a] transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {!isAdminDomain && (
              <div className="mt-6 text-center text-sm text-white space-y-3 pb-8">
                <div>
                  <p className="text-base">Don't have an account?</p>
                  <Link to="/register" className="font-bold text-base text-[#f59f0a] underline hover:text-[#f59f0a]/80">
                    Register your business
                  </Link>
                </div>
                <div className="pt-2 border-t border-[#555555] text-xs text-white space-y-1">
                  <p>
                    By signing in, you agree to our{" "}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
