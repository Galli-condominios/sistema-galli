// Re-export from context for backwards compatibility
// Safe wrapper that doesn't throw when used outside provider
import { useUserRoleContext } from "@/contexts/UserRoleContext";

export const useUserRole = () => {
  try {
    return useUserRoleContext();
  } catch {
    // Return default values when not within provider (e.g., during initial render)
    return {
      role: null,
      loading: true,
      userId: null,
      userName: null,
      hasRole: () => false,
      isOwner: () => false,
      isAdmin: () => false,
      isResident: () => false,
      isDoorkeeper: () => false,
      refetch: async () => {},
    };
  }
};
