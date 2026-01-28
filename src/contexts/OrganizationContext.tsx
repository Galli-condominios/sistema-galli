import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  plan: string;
  max_condominiums: number;
}

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrganizationId: string | null;
  selectedOrganization: Organization | null;
  setSelectedOrganizationId: (id: string | null) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = "selectedOrganizationId";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check auth state directly instead of using UserRoleContext to avoid circular dependency
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchOrganizations = useCallback(async () => {
    if (isAuthenticated === null || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) throw error;

      setOrganizations(data || []);

      // Restore selection from localStorage or select first
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId && data?.some(o => o.id === storedId)) {
        setSelectedOrganizationIdState(storedId);
      } else if (data && data.length > 0) {
        setSelectedOrganizationIdState(data[0].id);
        localStorage.setItem(STORAGE_KEY, data[0].id);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated === null) return;
    fetchOrganizations();
  }, [isAuthenticated, fetchOrganizations]);

  const setSelectedOrganizationId = useCallback((id: string | null) => {
    setSelectedOrganizationIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshOrganizations = useCallback(async () => {
    await fetchOrganizations();
  }, [fetchOrganizations]);

  const selectedOrganization = organizations.find(o => o.id === selectedOrganizationId) || null;

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganizationId,
        selectedOrganization,
        setSelectedOrganizationId,
        loading,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
