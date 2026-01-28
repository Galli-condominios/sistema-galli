import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoleContext } from "@/contexts/UserRoleContext";

interface FirstCondominiumContextValue {
  needsFirstCondominium: boolean;
  loading: boolean;
  organizationId: string | null;
  organizationName: string | null;
  refetch: () => void;
  setNeedsFirstCondominium: (value: boolean) => void;
}

const FirstCondominiumContext = createContext<FirstCondominiumContextValue | null>(null);

export function FirstCondominiumProvider({ children }: { children: ReactNode }) {
  const [needsFirstCondominium, setNeedsFirstCondominium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const { role, loading: roleLoading, userId } = useUserRoleContext();

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const checkFirstCondominium = async () => {
      // Only check for admins and síndicos
      if (roleLoading || !userId) {
        return;
      }

      const isAdminRole = role === "administrador" || role === "sindico";
      
      if (!isAdminRole) {
        setLoading(false);
        setNeedsFirstCondominium(false);
        return;
      }

      try {
        // Get user's organization
        const { data: membership, error: membershipError } = await supabase
          .from("user_organization_members")
          .select("organization_id, organizations(id, name)")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (membershipError || !membership) {
          setLoading(false);
          setNeedsFirstCondominium(false);
          return;
        }

        const orgId = membership.organization_id;
        const org = membership.organizations as { id: string; name: string } | null;
        
        setOrganizationId(orgId);
        setOrganizationName(org?.name || null);

        // Count condominiums in this organization
        const { count, error: countError } = await supabase
          .from("condominiums")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);

        if (countError) {
          console.error("Error counting condominiums:", countError);
          setLoading(false);
          setNeedsFirstCondominium(false);
          return;
        }

        setNeedsFirstCondominium(count === 0);
      } catch (error) {
        console.error("Error checking first condominium:", error);
        setNeedsFirstCondominium(false);
      } finally {
        setLoading(false);
      }
    };

    checkFirstCondominium();
  }, [role, roleLoading, userId, refetchTrigger]);

  return (
    <FirstCondominiumContext.Provider 
      value={{
        needsFirstCondominium,
        loading,
        organizationId,
        organizationName,
        refetch,
        setNeedsFirstCondominium,
      }}
    >
      {children}
    </FirstCondominiumContext.Provider>
  );
}

export function useFirstCondominiumContext(): FirstCondominiumContextValue {
  const context = useContext(FirstCondominiumContext);
  if (!context) {
    throw new Error("useFirstCondominiumContext must be used within FirstCondominiumProvider");
  }
  return context;
}
