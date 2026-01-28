import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import type { Database } from "@/integrations/supabase/types";

type Package = Database["public"]["Tables"]["packages"]["Row"];
type PackageInsert = Database["public"]["Tables"]["packages"]["Insert"];

export const usePackages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages", condominiumId],
    queryFn: async () => {
      let query = supabase
        .from("packages")
        .select(`
          *,
          units!inner(unit_number, condominium_id, condominiums(name)),
          profiles(full_name)
        `)
        .order("received_at", { ascending: false });
      
      // Filter by condominium if admin with selected condominium
      if (shouldFilter && condominiumId) {
        query = query.eq("units.condominium_id", condominiumId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const createPackage = useMutation({
    mutationFn: async (newPackage: PackageInsert) => {
      const { data, error } = await supabase
        .from("packages")
        .insert(newPackage)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast({
        title: "Encomenda registrada",
        description: "A encomenda foi registrada e o morador será notificado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar encomenda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsCollected = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("packages")
        .update({ 
          status: "coletada",
          collected_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast({
        title: "Encomenda coletada",
        description: "A encomenda foi marcada como coletada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar encomenda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    packages,
    isLoading,
    createPackage: createPackage.mutate,
    markAsCollected: markAsCollected.mutate,
    isCreating: createPackage.isPending,
    isUpdating: markAsCollected.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["packages"] }),
  };
};
