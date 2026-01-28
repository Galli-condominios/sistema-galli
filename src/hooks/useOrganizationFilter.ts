import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Hook to easily access organization filter for queries.
 * Use this in pages that need to filter data by selected organization.
 */
export function useOrganizationFilter() {
  const { selectedOrganizationId, selectedOrganization, loading } = useOrganization();
  const { hasRole } = useUserRole();

  const isAdmin = hasRole(["administrador", "sindico"]);

  return {
    organizationId: selectedOrganizationId,
    organization: selectedOrganization,
    isAdmin,
    loading,
    /**
     * Returns true if data should be filtered by organization
     * (admin role with selected organization)
     */
    shouldFilter: isAdmin && !!selectedOrganizationId,
  };
}
