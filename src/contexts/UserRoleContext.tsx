import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleContextType {
  role: AppRole | null;
  loading: boolean;
  userId: string | null;
  userName: string | null;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
  isResident: () => boolean;
  isDoorkeeper: () => boolean;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const fetchUserRole = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[Auth Context] Fetching user role');
      }
      const startTime = performance.now();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (import.meta.env.DEV) {
          console.log('[Auth Context] No user found');
        }
        setRole(null);
        setUserId(null);
        setUserName(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch role and profile in parallel
      // Use maybeSingle or handle multiple roles by selecting highest priority
      const [rolesResult, profileResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
      ]);

      if (rolesResult.error) {
        if (import.meta.env.DEV) {
          console.error("[Auth Context] Error fetching user role:", rolesResult.error);
        }
        setRole(null);
      } else {
        if (import.meta.env.DEV) {
          const endTime = performance.now();
          console.log(`[Auth Context] User role loaded: ${rolesResult.data?.role} in ${(endTime - startTime).toFixed(2)}ms`);
        }
        setRole(rolesResult.data?.role || null);
      }

      if (profileResult.error) {
        if (import.meta.env.DEV) {
          console.error("[Auth Context] Error fetching user profile:", profileResult.error);
        }
        setUserName(null);
      } else {
        setUserName(profileResult.data?.full_name || null);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[Auth Context] Error in fetchUserRole:", error);
      }
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Auth Context] Initializing auth listener');
    }
    
    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (import.meta.env.DEV) {
        console.log('[Auth Context] Auth state changed:', event);
      }
      if (event === 'SIGNED_OUT') {
        setRole(null);
        setUserId(null);
        setUserName(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      }
    });

    // Then fetch initial session
    fetchUserRole();

    return () => {
      if (import.meta.env.DEV) {
        console.log('[Auth Context] Cleaning up auth listener');
      }
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (requiredRole: AppRole | AppRole[]) => {
    if (!role) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  };

  const isOwner = () => hasRole("owner");
  const isAdmin = () => hasRole(["administrador", "sindico"]);
  const isResident = () => hasRole("morador");
  const isDoorkeeper = () => hasRole("porteiro");

  return (
    <UserRoleContext.Provider
      value={{
        role,
        loading,
        userId,
        userName,
        hasRole,
        isOwner,
        isAdmin,
        isResident,
        isDoorkeeper,
        refetch: fetchUserRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRoleContext = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRoleContext must be used within a UserRoleProvider");
  }
  return context;
};
