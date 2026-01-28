import { Navigate } from "react-router-dom";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { isAuthenticated, isLoading } = useSuperAdmin();

  if (isLoading) {
    return <PageLoadingSpinner message="Verificando acesso..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin" replace />;
  }

  return <>{children}</>;
};