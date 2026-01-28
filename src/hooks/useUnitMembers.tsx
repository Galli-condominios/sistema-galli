import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "./useUserRole";

export interface UnitMember {
  id: string;
  unit_id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_MEMBERS = 4;

export const useUnitMembers = (unitId?: string) => {
  const queryClient = useQueryClient();
  const { userId } = useUserRole();

  // Get the current user's unit
  const { data: userUnit } = useQuery({
    queryKey: ["user-unit-for-members", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Check unit_users first
      const { data: unitUserData, error: unitUserError } = await supabase
        .from("unit_users")
        .select("unit_id, is_primary, units(id, unit_number, block, condominium_id)")
        .eq("user_id", userId)
        .maybeSingle();

      if (!unitUserError && unitUserData) {
        return {
          unitId: unitUserData.unit_id,
          isPrimary: unitUserData.is_primary,
          unit: unitUserData.units,
        };
      }

      // Fallback to residents table
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select("unit_id, resident_type, units(id, unit_number, block, condominium_id)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!residentError && residentData) {
        return {
          unitId: residentData.unit_id,
          isPrimary: residentData.resident_type === "proprietario",
          unit: residentData.units,
        };
      }

      return null;
    },
    enabled: !!userId,
  });

  const effectiveUnitId = unitId || userUnit?.unitId;

  // Get all members for a unit
  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["unit-members", effectiveUnitId],
    queryFn: async () => {
      if (!effectiveUnitId) return [];

      const { data, error } = await supabase
        .from("unit_members")
        .select("*")
        .eq("unit_id", effectiveUnitId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as UnitMember[];
    },
    enabled: !!effectiveUnitId,
  });

  const membersCount = members?.length || 0;
  const canAddMore = membersCount < MAX_MEMBERS;

  // Add a new member
  const addMember = useMutation({
    mutationFn: async (memberData: {
      fullName: string;
      nickname?: string;
      phone?: string;
    }) => {
      if (!effectiveUnitId) throw new Error("Unidade não definida");
      if (!canAddMore) throw new Error(`Limite de ${MAX_MEMBERS} membros atingido`);

      const { data, error } = await supabase
        .from("unit_members")
        .insert({
          unit_id: effectiveUnitId,
          full_name: memberData.fullName,
          nickname: memberData.nickname || null,
          phone: memberData.phone || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-members", effectiveUnitId] });
      toast.success("Membro adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar membro: ${error.message}`);
    },
  });

  // Update a member
  const updateMember = useMutation({
    mutationFn: async ({ memberId, ...updateData }: { 
      memberId: string; 
      fullName?: string;
      nickname?: string;
      phone?: string;
    }) => {
      const updates: Partial<UnitMember> = {};
      if (updateData.fullName !== undefined) updates.full_name = updateData.fullName;
      if (updateData.nickname !== undefined) updates.nickname = updateData.nickname;
      if (updateData.phone !== undefined) updates.phone = updateData.phone;

      const { error } = await supabase
        .from("unit_members")
        .update(updates)
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-members", effectiveUnitId] });
      toast.success("Membro atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Remove a member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("unit_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-members", effectiveUnitId] });
      toast.success("Membro removido!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover membro: ${error.message}`);
    },
  });

  return {
    members,
    isLoading,
    userUnit,
    isPrimaryUser: userUnit?.isPrimary ?? false,
    canAddMore,
    membersCount,
    maxMembers: MAX_MEMBERS,
    addMember,
    updateMember,
    removeMember,
    refetch,
  };
};
