import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Condominium {
  id: string;
  name: string;
  address: string | null;
  total_units: number | null;
  organization_id: string | null;
}

interface CondominiumContextType {
  condominiums: Condominium[];
  selectedCondominiumId: string | null;
  selectedCondominium: Condominium | null;
  setSelectedCondominiumId: (id: string | null) => void;
  loading: boolean;
  isAdmin: boolean;
  refreshCondominiums: () => Promise<void>;
}

const CondominiumContext = createContext<CondominiumContextType | undefined>(undefined);

const STORAGE_KEY = "selectedCondominiumId";

export function CondominiumProvider({ children }: { children: ReactNode }) {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, hasRole, loading: roleLoading } = useUserRole();
  const { selectedOrganizationId, loading: orgLoading } = useOrganization();

  const isAdmin = hasRole(["administrador", "sindico"]);

  const fetchCondominiums = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("condominiums")
        .select("id, name, address, total_units, organization_id")
        .order("name");

      // Filter by organization if selected
      if (selectedOrganizationId) {
        query = query.eq("organization_id", selectedOrganizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCondominiums(data || []);

      // Restore selection from localStorage or select first
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId && data?.some(c => c.id === storedId)) {
        setSelectedCondominiumIdState(storedId);
      } else if (data && data.length > 0) {
        setSelectedCondominiumIdState(data[0].id);
        localStorage.setItem(STORAGE_KEY, data[0].id);
      } else {
        setSelectedCondominiumIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error fetching condominiums:", error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedOrganizationId]);

  // Load condominiums when organization changes
  useEffect(() => {
    if (roleLoading || orgLoading) return;
    fetchCondominiums();
  }, [roleLoading, orgLoading, fetchCondominiums]);

  const setSelectedCondominiumId = useCallback((id: string | null) => {
    setSelectedCondominiumIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshCondominiums = useCallback(async () => {
    await fetchCondominiums();
  }, [fetchCondominiums]);

  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId) || null;

  return (
    <CondominiumContext.Provider
      value={{
        condominiums,
        selectedCondominiumId,
        selectedCondominium,
        setSelectedCondominiumId,
        loading,
        isAdmin,
        refreshCondominiums,
      }}
    >
      {children}
    </CondominiumContext.Provider>
  );
}

export function useCondominium() {
  const context = useContext(CondominiumContext);
  if (context === undefined) {
    throw new Error("useCondominium must be used within a CondominiumProvider");
  }
  return context;
}
