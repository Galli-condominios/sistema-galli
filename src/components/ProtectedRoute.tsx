import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { useFirstCondominiumCheck } from "@/hooks/useFirstCondominiumCheck";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
  skipCondominiumCheck?: boolean;
}

export const ProtectedRoute = ({ children, requiredRole, skipCondominiumCheck = false }: ProtectedRouteProps) => {
  const { role, loading, hasRole } = useUserRoleContext();
  const { needsFirstCondominium, loading: condoCheckLoading } = useFirstCondominiumCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  const isOwnerRole = role === "owner";
  const isAdminRole = role === "administrador" || role === "sindico";
  const isOnboardingRoute = location.pathname === "/onboarding/first-condominium";

  useEffect(() => {
    // Wait for both checks to complete
    if (loading || hasRedirected.current) return;
    
    // Owner skips condominium check
    if (isOwnerRole) {
      // Owner has access, no redirect needed unless role check fails
    } else if (isAdminRole && !skipCondominiumCheck && condoCheckLoading) {
      // For admin roles, also wait for condominium check (unless skipping)
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[Auth] Checking route protection:', { 
        role, 
        path: location.pathname, 
        requiredRole,
        needsFirstCondominium,
        isOnboardingRoute 
      });
    }

    if (!role) {
      if (import.meta.env.DEV) {
        console.log('[Auth] No role, redirecting to /auth');
      }
      hasRedirected.current = true;
      navigate("/auth", { replace: true });
      return;
    }

    // Check if admin needs to create first condominium (owner skips this)
    if (!isOwnerRole && isAdminRole && !skipCondominiumCheck && needsFirstCondominium && !isOnboardingRoute) {
      if (import.meta.env.DEV) {
        console.log('[Auth] Admin needs first condominium, redirecting to onboarding');
      }
      hasRedirected.current = true;
      navigate("/onboarding/first-condominium", { replace: true });
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      if (import.meta.env.DEV) {
        console.log('[Auth] Insufficient permissions, redirecting based on role');
      }
      hasRedirected.current = true;
      
      // Redirect to appropriate dashboard based on role
      switch (role) {
        case "morador":
          navigate("/dashboard/resident", { replace: true });
          break;
        case "porteiro":
          navigate("/dashboard/doorkeeper", { replace: true });
          break;
        case "owner":
        case "administrador":
        case "sindico":
          navigate("/dashboard", { replace: true });
          break;
        default:
          navigate("/auth", { replace: true });
      }
    }
  }, [role, loading, requiredRole, hasRole, navigate, location.pathname, needsFirstCondominium, condoCheckLoading, isAdminRole, isOwnerRole, skipCondominiumCheck, isOnboardingRoute]);

  // Reset redirect flag on location change
  useEffect(() => {
    hasRedirected.current = false;
  }, [location.pathname]);

  // Show loading while checking auth and condominium status
  if (loading || (!isOwnerRole && isAdminRole && !skipCondominiumCheck && condoCheckLoading)) {
    return <PageLoadingSpinner message="Verificando acesso..." fullScreen />;
  }

  if (!role || (requiredRole && !hasRole(requiredRole))) {
    return null;
  }

  return <>{children}</>;
};
