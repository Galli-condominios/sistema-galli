import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { CondominiumProvider } from "@/contexts/CondominiumContext";
import { FirstCondominiumProvider } from "@/contexts/FirstCondominiumContext";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { createIDBPersister } from "@/lib/queryPersister";
import { cacheConfig } from "@/lib/queryKeys";

import Auth from "./pages/Auth";
import AdminSetup from "./pages/AdminSetup";

// Lazy load pages for better initial load performance
const Dashboard = lazy(() => {
  console.log('[Prefetch] Loading Dashboard');
  return import("./pages/Dashboard");
});
const Condominiums = lazy(() => {
  console.log('[Prefetch] Loading Condominiums');
  return import("./pages/Condominiums");
});
const CondominiumUnits = lazy(() => {
  console.log('[Prefetch] Loading CondominiumUnits');
  return import("./pages/CondominiumUnits");
});
const Units = lazy(() => {
  console.log('[Prefetch] Loading Units');
  return import("./pages/Units");
});
const Residents = lazy(() => {
  console.log('[Prefetch] Loading Residents');
  return import("./pages/Residents");
});
const Vehicles = lazy(() => {
  console.log('[Prefetch] Loading Vehicles');
  return import("./pages/Vehicles");
});
const ResidentVehicles = lazy(() => {
  console.log('[Prefetch] Loading ResidentVehicles');
  return import("./pages/ResidentVehicles");
});
const Employees = lazy(() => {
  console.log('[Prefetch] Loading Employees');
  return import("./pages/Employees");
});
const AccessControl = lazy(() => {
  console.log('[Prefetch] Loading AccessControl');
  return import("./pages/AccessControl");
});
const UtilityReadings = lazy(() => {
  console.log('[Prefetch] Loading UtilityReadings');
  return import("./pages/UtilityReadings");
});
const ResidentDashboard = lazy(() => {
  console.log('[Prefetch] Loading ResidentDashboard');
  return import("./pages/ResidentDashboard");
});
const DoorkeeperDashboard = lazy(() => {
  console.log('[Prefetch] Loading DoorkeeperDashboard');
  return import("./pages/DoorkeeperDashboard");
});
const UserManagement = lazy(() => {
  console.log('[Prefetch] Loading UserManagement');
  return import("./pages/UserManagementOptimized");
});
const NotFound = lazy(() => {
  console.log('[Prefetch] Loading NotFound');
  return import("./pages/NotFound");
});
const CommonAreas = lazy(() => {
  console.log('[Prefetch] Loading CommonAreas');
  return import("./pages/CommonAreas");
});
const BlockGroups = lazy(() => {
  console.log('[Prefetch] Loading BlockGroups');
  return import("./pages/BlockGroups");
});
const Reservations = lazy(() => {
  console.log('[Prefetch] Loading Reservations');
  return import("./pages/Reservations");
});
const VisitorAuthorization = lazy(() => {
  console.log('[Prefetch] Loading VisitorAuthorization');
  return import("./pages/VisitorAuthorization");
});
const PackageControl = lazy(() => {
  console.log('[Prefetch] Loading PackageControl');
  return import("./pages/PackageControl");
});
const MaintenanceRequests = lazy(() => {
  console.log('[Prefetch] Loading MaintenanceRequests');
  return import("./pages/MaintenanceRequests");
});
const FinancialManagement = lazy(() => {
  console.log('[Prefetch] Loading FinancialManagement');
  return import("./pages/FinancialManagement");
});
const ResidentFinancial = lazy(() => {
  console.log('[Prefetch] Loading ResidentFinancial');
  return import("./pages/ResidentFinancial");
});
const AIAssistant = lazy(() => {
  console.log('[Prefetch] Loading AIAssistant');
  return import("./pages/AIAssistant");
});
const Documents = lazy(() => {
  console.log('[Prefetch] Loading Documents');
  return import("./pages/Documents");
});
const Settings = lazy(() => {
  console.log('[Prefetch] Loading Settings');
  return import("./pages/Settings");
});
const GroupChat = lazy(() => {
  console.log('[Prefetch] Loading GroupChat');
  return import("./pages/GroupChat");
});
const FirstCondominiumSetup = lazy(() => {
  console.log('[Prefetch] Loading FirstCondominiumSetup');
  return import("./pages/FirstCondominiumSetup");
});

// Owner pages - used by Super Admin routes with SuperAdminLayout
const OwnerDashboard = lazy(() => import("./pages/owner/OwnerDashboard"));
const OwnerOrganizations = lazy(() => import("./pages/owner/OwnerOrganizations"));
const OwnerUsers = lazy(() => import("./pages/owner/OwnerUsers"));
const OwnerFinancial = lazy(() => import("./pages/owner/OwnerFinancial"));
const OwnerAIUsage = lazy(() => import("./pages/owner/OwnerAIUsage"));
const OwnerMonitoring = lazy(() => import("./pages/owner/OwnerMonitoring"));
const OwnerSettings = lazy(() => import("./pages/owner/OwnerSettings"));

// Super Admin pages (separate authentication)
const SuperAdminLogin = lazy(() => import("./pages/superadmin/SuperAdminLogin"));
const SuperAdminAccount = lazy(() => import("./pages/superadmin/SuperAdminAccount"));

// Prefetch map for eager loading
export const prefetchMap: Record<string, () => Promise<any>> = {
  '/': () => import("./pages/Auth"),
  '/auth': () => import("./pages/Auth"),
  '/dashboard': () => import("./pages/Dashboard"),
  '/dashboard/condominiums': () => import("./pages/Condominiums"),
  '/dashboard/units': () => import("./pages/Units"),
  '/dashboard/residents': () => import("./pages/Residents"),
  '/dashboard/vehicles': () => import("./pages/Vehicles"),
  '/dashboard/employees': () => import("./pages/Employees"),
  '/dashboard/access': () => import("./pages/AccessControl"),
  '/dashboard/utility-readings': () => import("./pages/UtilityReadings"),
  '/dashboard/users': () => import("./pages/UserManagementOptimized"),
  '/dashboard/resident': () => import("./pages/ResidentDashboard"),
  '/dashboard/doorkeeper': () => import("./pages/DoorkeeperDashboard"),
  '/dashboard/common-areas': () => import("./pages/CommonAreas"),
  '/dashboard/block-groups': () => import("./pages/BlockGroups"),
  '/dashboard/group-chat': () => import("./pages/GroupChat"),
  '/dashboard/reservations': () => import("./pages/Reservations"),
  '/dashboard/visitor-auth': () => import("./pages/VisitorAuthorization"),
  
  '/dashboard/packages': () => import("./pages/PackageControl"),
  '/dashboard/maintenance': () => import("./pages/MaintenanceRequests"),
  '/dashboard/financial': () => import("./pages/FinancialManagement"),
  '/dashboard/resident-financial': () => import("./pages/ResidentFinancial"),
  '/dashboard/ai-assistant': () => import("./pages/AIAssistant"),
  '/dashboard/documents': () => import("./pages/Documents"),
  '/dashboard/settings': () => import("./pages/Settings"),
};

// Performance logger component
const RouteLogger = () => {
  const location = useLocation();
  
  useEffect(() => {
    const startTime = performance.now();
    console.log(`[Navigation] Started navigation to: ${location.pathname}`);
    
    return () => {
      const endTime = performance.now();
      console.log(`[Navigation] Completed navigation to: ${location.pathname} in ${(endTime - startTime).toFixed(2)}ms`);
    };
  }, [location.pathname]);
  
  return null;
};

// Query client with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: cacheConfig.semiDynamic.staleTime, // 5 minutes default
      gcTime: cacheConfig.semiDynamic.gcTime, // 15 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Persister for IndexedDB storage
const persister = createIDBPersister();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 w-full max-w-4xl px-4">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  </div>
);

const App = () => (
  <PersistQueryClientProvider 
    client={queryClient} 
    persistOptions={{ 
      persister,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      buster: 'v1.0.0', // Change this to bust cache on app updates
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SuperAdminProvider>
        <UserRoleProvider>
          <FirstCondominiumProvider>
            <OrganizationProvider>
              <CondominiumProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
                <BrowserRouter>
                  <RouteLogger />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/auth" replace />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/admin-setup" element={<AdminSetup />} />
                      <Route path="/onboarding/first-condominium" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]} skipCondominiumCheck>
                          <FirstCondominiumSetup />
                        </ProtectedRoute>
                      } />
                    
                      {/* Super Admin Routes - Using Owner pages with SuperAdminLayout */}
                      <Route path="/superadmin" element={<SuperAdminLogin />} />
                      <Route path="/superadmin/dashboard" element={
                        <SuperAdminRoute><OwnerDashboard /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/organizations" element={
                        <SuperAdminRoute><OwnerOrganizations /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/users" element={
                        <SuperAdminRoute><OwnerUsers /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/financial" element={
                        <SuperAdminRoute><OwnerFinancial /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/ai-usage" element={
                        <SuperAdminRoute><OwnerAIUsage /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/monitoring" element={
                        <SuperAdminRoute><OwnerMonitoring /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/settings" element={
                        <SuperAdminRoute><OwnerSettings /></SuperAdminRoute>
                      } />
                      <Route path="/superadmin/account" element={
                        <SuperAdminRoute><SuperAdminAccount /></SuperAdminRoute>
                      } />
                    
                      {/* Admin/Síndico Routes */}
                      <Route path="/dashboard" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/condominiums" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Condominiums />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/condominiums/:condominiumId/units" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <CondominiumUnits />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/units" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Units />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/residents" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Residents />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/residents/:residentId/vehicles" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <ResidentVehicles />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/vehicles" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Vehicles />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/employees" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <Employees />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/utility-readings" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <UtilityReadings />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/users" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <UserManagement />
                        </ProtectedRoute>
                      } />
                      
                      {/* Resident Routes */}
                      <Route path="/dashboard/resident" element={
                        <ProtectedRoute requiredRole="morador">
                          <ResidentDashboard />
                        </ProtectedRoute>
                      } />
                      
                      {/* Doorkeeper Routes */}
                      <Route path="/dashboard/doorkeeper" element={
                        <ProtectedRoute requiredRole="porteiro">
                          <DoorkeeperDashboard />
                        </ProtectedRoute>
                      } />
                      
                      {/* Shared Routes (accessible by multiple roles) */}
                      <Route path="/dashboard/access" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "porteiro"]}>
                          <AccessControl />
                        </ProtectedRoute>
                      } />
                      
                      {/* Module 2: Operations and Routines */}
                      <Route path="/dashboard/common-areas" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <CommonAreas />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/block-groups" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <BlockGroups />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/group-chat" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador"]}>
                          <GroupChat />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/group-chat/:groupId" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador"]}>
                          <GroupChat />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/reservations" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador"]}>
                          <Reservations />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/visitor-auth" element={
                        <ProtectedRoute requiredRole="morador">
                          <VisitorAuthorization />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/packages" element={
                        <ProtectedRoute requiredRole={["porteiro", "administrador", "sindico"]}>
                          <PackageControl />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/maintenance" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador"]}>
                          <MaintenanceRequests />
                        </ProtectedRoute>
                      } />
                      
                      {/* Module 3: Financial Management */}
                      <Route path="/dashboard/financial" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico"]}>
                          <FinancialManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/resident-financial" element={
                        <ProtectedRoute requiredRole="morador">
                          <ResidentFinancial />
                        </ProtectedRoute>
                      } />
                      
                      {/* Documents Library */}
                      <Route path="/dashboard/documents" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador", "porteiro"]}>
                          <Documents />
                        </ProtectedRoute>
                      } />
                      {/* AI Assistant - accessible by all roles */}
                      <Route path="/dashboard/ai-assistant" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador", "porteiro"]}>
                          <AIAssistant />
                        </ProtectedRoute>
                      } />
                      
                      {/* Settings - accessible by all roles */}
                      <Route path="/dashboard/settings" element={
                        <ProtectedRoute requiredRole={["administrador", "sindico", "morador", "porteiro"]}>
                          <Settings />
                        </ProtectedRoute>
                      } />
                      
                      
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </CondominiumProvider>
          </OrganizationProvider>
        </FirstCondominiumProvider>
      </UserRoleProvider>
    </SuperAdminProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
