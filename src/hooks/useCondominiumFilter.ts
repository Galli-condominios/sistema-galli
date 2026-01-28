import { useCondominium } from "@/contexts/CondominiumContext";

/**
 * Hook to easily access condominium filter for queries.
 * Use this in pages that need to filter data by selected condominium.
 */
export function useCondominiumFilter() {
  const { selectedCondominiumId, selectedCondominium, isAdmin, loading } = useCondominium();

  return {
    condominiumId: selectedCondominiumId,
    condominium: selectedCondominium,
    isAdmin,
    loading,
    /**
     * Returns true if data should be filtered by condominium
     * (admin role with selected condominium)
     */
    shouldFilter: isAdmin && !!selectedCondominiumId,
  };
}
