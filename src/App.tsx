import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { isNativeApp } from "@/lib/capacitor";
import { useNativeInit } from "@/hooks/useNativeInit";

// Pages
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NewRequest from "./pages/NewRequest";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Profile from "./pages/Profile";
import Help from "./pages/Help";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

// Admin Pages (web-only)
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminRequestDetail from "./pages/admin/AdminRequestDetail";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";

// Driver Pages (web-only)
import DriverLogin from "./pages/DriverLogin";
import DriverInstall from "./pages/DriverInstall";
import DriverSetup from "./pages/DriverSetup";
import DriverHome from "./pages/driver/DriverHome";
import DriverJobDetail from "./pages/driver/DriverJobDetail";
import DriverProfile from "./pages/driver/DriverProfile";
import MarkCollected from "./pages/driver/MarkCollected";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const { initialized: nativeInitialized } = useNativeInit();
  const isNative = isNativeApp();

  // Protected Route wrapper
  const ProtectedRoute = ({ 
    children, 
    allowedRoles = ["customer"] 
  }: { 
    children: React.ReactNode; 
    allowedRoles?: Array<"customer" | "admin" | "driver">;
  }) => {
    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    
    // In native app, only allow customer role
    if (isNative && profile?.role !== "customer") {
      // Sign out admin/driver users in native app and redirect to login
      return <Navigate to="/login" replace />;
    }
    
    // Redirect based on role (web only)
    if (!isNative) {
      if (profile?.role === "admin" && !allowedRoles.includes("admin")) {
        return <Navigate to="/admin" replace />;
      }
      if (profile?.role === "driver" && !allowedRoles.includes("driver")) {
        return <Navigate to="/driver" replace />;
      }
    }
    
    if (profile?.role === "customer" && !allowedRoles.includes("customer")) {
      return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
  };

  // Public Route wrapper
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) return <LoadingScreen />;
    
    // In native app, only redirect customers to home
    if (isNative) {
      if (user && profile?.role === "customer") return <Navigate to="/home" replace />;
      // Don't auto-redirect admin/driver in native app
      return <>{children}</>;
    }
    
    // Web behavior
    if (user && profile?.role === "admin") return <Navigate to="/admin" replace />;
    if (user && profile?.role === "driver") return <Navigate to="/driver" replace />;
    if (user && profile) return <Navigate to="/home" replace />;

    return <>{children}</>;
  };

  return (
    <Routes>
      {/* Public legal pages - no auth required */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      
      {/* Customer Routes - Available in both web and native */}
      <Route path="/home" element={<ProtectedRoute allowedRoles={["customer"]}><Home /></ProtectedRoute>} />
      <Route path="/new-request" element={<ProtectedRoute allowedRoles={["customer"]}><NewRequest /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute allowedRoles={["customer"]}><Requests /></ProtectedRoute>} />
      <Route path="/requests/:id" element={<ProtectedRoute allowedRoles={["customer"]}><RequestDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={["customer"]}><Profile /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute allowedRoles={["customer"]}><Help /></ProtectedRoute>} />
      
      {/* Admin & Driver Routes - Web only */}
      {!isNative && (
        <>
          {/* Driver public routes */}
          <Route path="/driver-login" element={<PublicRoute><DriverLogin /></PublicRoute>} />
          <Route path="/driver-install" element={<DriverInstall />} />
          <Route path="/driver-setup/:token" element={<DriverSetup />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/requests" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRequests /></ProtectedRoute>} />
          <Route path="/admin/requests/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRequestDetail /></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDrivers /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAuditLogs /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminNotifications /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
          
          {/* Driver Routes */}
          <Route path="/driver" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><DriverHome /></ProtectedRoute>} />
          <Route path="/driver/profile" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><DriverProfile /></ProtectedRoute>} />
          <Route path="/driver/job/:id" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><DriverJobDetail /></ProtectedRoute>} />
          <Route path="/driver/job/:id/collect" element={<ProtectedRoute allowedRoles={["admin", "driver"]}><MarkCollected /></ProtectedRoute>} />
        </>
      )}
      
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
