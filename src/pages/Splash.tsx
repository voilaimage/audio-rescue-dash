import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import logo from "@/assets/logo-white.png";
import authBg from "@/assets/auth-bg.png";

export default function Splash() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (!user) {
        navigate("/login", { replace: true });
      } else if (profile?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (profile) {
        navigate("/home", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background image */}
      <div 
        className="absolute inset-0 animate-[splash-zoom_3s_ease-out_forwards]"
        style={{
          backgroundImage: `url(${authBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      

      
      <div className="animate-fade-in flex flex-col items-center gap-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Audio Salvage UK" className="h-24 w-auto" />
          <p className="text-base text-muted-foreground">Partner</p>
        </div>

        {/* Loading */}
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="md" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>

      <p className="absolute bottom-8 text-center text-sm text-muted-foreground z-10">
        Free collection of high-end audio equipment
      </p>
    </div>
  );
}
