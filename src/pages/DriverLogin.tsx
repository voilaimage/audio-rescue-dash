import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Eye, EyeOff, Mail, Lock, Truck } from "lucide-react";
import logo from "@/assets/logo-white.png";
import authBg from "@/assets/auth-bg.png";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      // Only allow drivers and admins to access driver portal
      if (profile?.role === "driver" || profile?.role === "admin") {
        navigate("/driver", { replace: true });
      } else {
        // Sign out non-driver users and show error
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This login is for drivers only. Please use the Partner Portal.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
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
            <div className="mt-2 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <p className="text-lg text-primary font-semibold">Driver Portal</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="w-full max-w-sm animate-fade-in">
            <div className="rounded-xl border border-primary/30 bg-[#1d1d1d] backdrop-blur-sm p-6 shadow-card">
              <h2 className="mb-6 text-center font-display text-xl font-semibold text-white">
                Driver Sign In
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="driver@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[#28292b] border-primary/30 text-white placeholder:text-gray-500 focus:border-primary"
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
                      className="pl-10 pr-10 bg-[#28292b] border-primary/30 text-white placeholder:text-gray-500 focus:border-primary"
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

                <Button type="submit" className="w-full touch-target font-semibold" disabled={loading}>
                  {loading ? <LoadingSpinner size="sm" /> : (
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Sign In as Driver
                    </span>
                  )}
                </Button>
              </form>
            </div>

            <div className="mt-6 text-center text-sm text-white space-y-1 pb-8">
              <p className="text-base text-gray-400">Are you a partner?</p>
              <Link to="/login" className="font-bold text-base text-[#f59f0a] underline hover:text-[#f59f0a]/80">
                Go to Partner Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
