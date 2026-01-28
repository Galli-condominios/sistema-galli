import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCondominium } from "@/contexts/CondominiumContext";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { cacheConfig } from "@/lib/queryKeys";

// Prefetch configurations for different routes
const routePrefetchConfig: Record<string, string[]> = {
  '/dashboard': ['condominiums', 'units', 'residents'],
  '/dashboard/condominiums': ['condominiums'],
  '/dashboard/units': ['units', 'residents'],
  '/dashboard/residents': ['residents', 'units'],
  '/dashboard/vehicles': ['vehicles'],
  '/dashboard/employees': ['employees'],
  '/dashboard/common-areas': ['common-areas'],
  '/dashboard/reservations': ['reservations', 'common-areas'],
  '/dashboard/documents': ['documents'],
  '/dashboard/financial': ['financial-charges'],
  '/dashboard/resident-financial': ['resident-charges'],
  '/dashboard/packages': ['packages'],
  '/dashboard/maintenance': ['maintenance-requests'],
  '/dashboard/utility-readings': ['water-readings', 'gas-readings', 'electricity-readings'],
  '/dashboard/resident': ['resident-charges', 'notifications'],
  '/dashboard/doorkeeper': ['packages', 'access-logs'],
};

// Data fetchers for prefetching - simplified to avoid type issues
const createFetchers = (condominiumId?: string) => {
  const fetchCondominiums = async () => {
    const { data } = await supabase
      .from('condominiums')
      .select('id, name, address, total_units')
      .order('name');
    return data ?? [];
  };

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('id, unit_number, block, floor, condominium_id')
      .order('unit_number');
    return data ?? [];
  };

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('id, full_name, unit_id, type, is_active')
      .eq('is_active', true);
    return data ?? [];
  };

  const fetchCommonAreas = async () => {
    const { data } = await supabase
      .from('common_areas')
      .select('id, name, capacity, opening_time, closing_time, condominium_id')
      .order('name');
    return data ?? [];
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('id, title, category, file_name, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  };

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, model, color')
      .order('plate')
      .limit(100);
    return data ?? [];
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, position, contact')
      .order('name');
    return data ?? [];
  };

  const fetchPackages = async () => {
    const { data } = await supabase
      .from('packages')
      .select('id, recipient_name, sender, status, received_at')
      .order('received_at', { ascending: false })
      .limit(50);
    return data ?? [];
  };

  const fetchReservations = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('id, reservation_date, start_time, end_time, status')
      .order('reservation_date', { ascending: false })
      .limit(50);
    return data ?? [];
  };

  const fetchFinancialCharges = async () => {
    const { data } = await supabase
      .from('financial_charges')
      .select('id, amount, due_date, status, charge_type')
      .order('due_date', { ascending: false })
      .limit(100);
    return data ?? [];
  };

  const fetchMaintenanceRequests = async () => {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('id, title, status, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  };

  return {
    'condominiums': fetchCondominiums,
    'units': fetchUnits,
    'residents': fetchResidents,
    'common-areas': fetchCommonAreas,
    'documents': fetchDocuments,
    'vehicles': fetchVehicles,
    'employees': fetchEmployees,
    'packages': fetchPackages,
    'reservations': fetchReservations,
    'financial-charges': fetchFinancialCharges,
    'maintenance-requests': fetchMaintenanceRequests,
  };
};

export const usePrefetch = () => {
  const queryClient = useQueryClient();
  const { selectedCondominiumId } = useCondominium();
  const { role } = useUserRoleContext();
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  
  const prefetchRoute = useCallback(async (route: string) => {
    // Skip if already prefetched in this session
    if (prefetchedRoutes.current.has(route)) return;
    
    const dataTypes = routePrefetchConfig[route];
    if (!dataTypes) return;
    
    const fetchers = createFetchers(selectedCondominiumId || undefined);
    
    // Mark as prefetched early to prevent duplicate calls
    prefetchedRoutes.current.add(route);
    
    console.log(`[Prefetch] Prefetching data for ${route}`);
    
    await Promise.all(
      dataTypes.map(async (type) => {
        const fetcher = fetchers[type as keyof typeof fetchers];
        if (!fetcher) return;
        
        try {
          await queryClient.prefetchQuery({
            queryKey: [type, { condominiumId: selectedCondominiumId }],
            queryFn: fetcher as () => Promise<unknown>,
            staleTime: cacheConfig.semiDynamic.staleTime,
          });
        } catch (error) {
          console.warn(`[Prefetch] Failed to prefetch ${type}:`, error);
        }
      })
    );
  }, [queryClient, selectedCondominiumId]);
  
  // Prefetch based on user role on initial load
  const prefetchForRole = useCallback(async () => {
    if (!role) return;
    
    const rolePrefetchMap: Record<string, string[]> = {
      administrador: ['/dashboard', '/dashboard/condominiums', '/dashboard/financial'],
      sindico: ['/dashboard', '/dashboard/condominiums', '/dashboard/maintenance'],
      morador: ['/dashboard/resident', '/dashboard/reservations'],
      porteiro: ['/dashboard/doorkeeper', '/dashboard/packages'],
    };
    
    const routes = rolePrefetchMap[role] || [];
    
    // Prefetch in sequence with small delay to avoid overwhelming
    for (const route of routes) {
      await prefetchRoute(route);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [role, prefetchRoute]);
  
  // Clear prefetch cache (useful when changing condominiums)
  const clearPrefetchCache = useCallback(() => {
    prefetchedRoutes.current.clear();
  }, []);
  
  return {
    prefetchRoute,
    prefetchForRole,
    clearPrefetchCache,
  };
};

// Hook to attach prefetch to navigation links
export const useLinkPrefetch = (to: string) => {
  const { prefetchRoute } = usePrefetch();
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleMouseEnter = useCallback(() => {
    // Delay prefetch slightly to avoid prefetching on quick mouse movements
    timeoutRef.current = setTimeout(() => {
      prefetchRoute(to);
    }, 100);
  }, [to, prefetchRoute]);
  
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
};
