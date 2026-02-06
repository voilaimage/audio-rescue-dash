import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, LogOut, Truck, Users, Shield, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoWhite from "@/assets/logo-white.png";
interface AdminLayoutProps {
  children: React.ReactNode;
}
const sidebarItems = [{
  path: "/admin",
  icon: LayoutDashboard,
  label: "Dashboard"
}, {
  path: "/admin/requests",
  icon: ClipboardList,
  label: "All Requests"
}, {
  path: "/admin/drivers",
  icon: Users,
  label: "Drivers"
}, {
  path: "/admin/audit-logs",
  icon: Shield,
  label: "Audit Logs"
}, {
  path: "/admin/settings",
  icon: Settings,
  label: "Settings"
}, {
  path: "/driver",
  icon: Truck,
  label: "Driver Mode"
}];
export function AdminLayout({
  children
}: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut,
    profile
  } = useAuth();
  useEffect(() => {
    document.title = "Audio Salvage Admin";
  }, []);
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", {
      replace: true
    });
  };
  return <div className="flex min-h-screen bg-[#121212]">
      {/* Sidebar - hidden on mobile */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 bg-black md:block">
        <div className="absolute right-0 top-0 h-full w-0.5 bg-primary" />
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-[#333] px-5 py-5 flex flex-col items-center">
            <img src={logoWhite} alt="Audio Salvage UK" className="h-20 w-auto" />
            <p className="mt-1 text-gray-400 text-center text-sm">Admin Dashboard</p>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1 p-3">
            {sidebarItems.map(({
            path,
            icon: Icon,
            label
          }) => {
            const isActive = location.pathname === path;
            return <Link key={path} to={path} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all", isActive ? "bg-primary text-primary-foreground" : "text-white hover:bg-white/10 hover:text-primary")}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>;
          })}
          </nav>

          {/* User Section */}
          <div className="border-t border-[#333] p-3">
            <div className="mb-3 rounded-lg bg-white/10 p-3">
              <p className="text-sm font-medium text-white">{profile?.contact_name}</p>
              <p className="text-xs text-gray-400">{profile?.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-white hover:bg-white/10 hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#333] bg-black px-4 md:hidden">
        <img src={logoWhite} alt="Audio Salvage UK" className="h-8 w-auto" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{profile?.contact_name}</span>
          <Button variant="ghost" size="icon" className="text-white hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-primary bg-black md:hidden">
        <div className="flex justify-around py-2">
          {sidebarItems.slice(0, 5).map(({
            path,
            icon: Icon,
            label
          }) => {
            const isActive = location.pathname === path;
            return <Link 
              key={path} 
              to={path} 
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-white hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[60px]">{label.split(" ")[0]}</span>
            </Link>;
          })}
        </div>
      </nav>

      {/* Main Content - responsive margin */}
      <main className="min-h-screen w-full overflow-x-hidden bg-[#121212] p-4 pt-16 pb-20 text-white md:ml-60 md:p-6 md:pt-6 md:pb-6">{children}</main>
    </div>;
}