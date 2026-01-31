import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/loading-spinner";

// Pages
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NewRequest from "./pages/NewRequest";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminRequestDetail from "./pages/admin/AdminRequestDetail";
import AdminDrivers from "./pages/admin/AdminDrivers";

// Driver Pages
import DriverLogin from "./pages/DriverLogin";
import DriverInstall from "./pages/DriverInstall";
import DriverHome from "./pages/driver/DriverHome";
import DriverJobDetail from "./pages/driver/DriverJobDetail";
import MarkCollected from "./pages/driver/MarkCollected";

const queryClient = new QueryClient();

function ProtectedRoute({ 
  children, 
  allowedRoles = ["customer"] 
}: { 
  children: React.ReactNode; 
  allowedRoles?: Array<"customer" | "admin" | "driver">;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  // Redirect based on role
  if (profile?.role === "admin" && !allowedRoles.includes("admin")) {
    return <Navigate to="/admin" replace />;
  }
  if (profile?.role === "driver" && !allowedRoles.includes("driver")) {
    return <Navigate to="/driver" replace />;
  }
  if (profile?.role === "customer" && !allowedRoles.includes("customer")) {
    // Customer trying to access admin/driver routes
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (user && profile?.role === "driver") return <Navigate to="/driver" replace />;
  if (user && profile) return <Navigate to="/home" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/driver-login" element={<PublicRoute><DriverLogin /></PublicRoute>} />
      <Route path="/driver-install" element={<DriverInstall />} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* Customer Routes */}
      <Route path="/home" element={<ProtectedRoute allowedRoles={["customer"]}><Home /></ProtectedRoute>} />
      <Route path="/new-request" element={<ProtectedRoute allowedRoles={["customer"]}><NewRequest /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute allowedRoles={["customer"]}><Requests /></ProtectedRoute>} />
      <Route path="/requests/:id" element={<ProtectedRoute allowedRoles={["customer"]}><RequestDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={["customer"]}><Profile /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/requests" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRequests /></ProtectedRoute>} />
      <Route path="/admin/requests/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRequestDetail /></ProtectedRoute>} />
      <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDrivers /></ProtectedRoute>} />
      
      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><DriverHome /></ProtectedRoute>} />
      <Route path="/driver/job/:id" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><DriverJobDetail /></ProtectedRoute>} />
      <Route path="/driver/job/:id/collect" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><MarkCollected /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
