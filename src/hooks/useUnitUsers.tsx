import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "./useUserRole";

export interface UnitUser {
  id: string;
  user_id: string;
  unit_id: string;
  is_primary: boolean;
  nickname: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const MAX_ADDITIONAL_USERS = 4;

export const useUnitUsers = (unitId?: string) => {
  const queryClient = useQueryClient();
  const { userId } = useUserRole();

  // Check if current user is the primary user of the unit
  const { data: isPrimaryUser } = useQuery({
    queryKey: ["unit-user-primary", unitId, userId],
    queryFn: async () => {
      if (!unitId || !userId) return false;
      
      const { data, error } = await supabase
        .from("unit_users")
        .select("is_primary")
        .eq("unit_id", unitId)
        .eq("user_id", userId)
        .single();

      if (error) return false;
      return data?.is_primary ?? false;
    },
    enabled: !!unitId && !!userId,
  });

  // Get all users for a unit
  const { data: unitUsers, isLoading, refetch } = useQuery({
    queryKey: ["unit-users", unitId],
    queryFn: async () => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from("unit_users")
        .select(`
          *,
          profile:profiles(id, full_name, avatar_url)
        `)
        .eq("unit_id", unitId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        profile: Array.isArray(item.profile) ? item.profile[0] : item.profile
      })) as UnitUser[];
    },
    enabled: !!unitId,
  });

  // Get the current user's unit
  const { data: userUnit } = useQuery({
    queryKey: ["user-unit", userId],
    queryFn: async () => {
      if (!userId) return null;

      // First check unit_users
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

  const additionalUsersCount = (unitUsers || []).filter(u => !u.is_primary).length;
  const canAddMoreUsers = additionalUsersCount < MAX_ADDITIONAL_USERS;

  // Add a new user to the unit
  const addUnitUser = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      fullName: string;
      nickname?: string;
    }) => {
      if (!unitId) throw new Error("Unidade não definida");
      if (!canAddMoreUsers) throw new Error(`Limite de ${MAX_ADDITIONAL_USERS} usuários adicionais atingido`);

      // Create the user via edge function
      const { data: createResult, error: createError } = await supabase.functions.invoke("create-user", {
        body: {
          email: userData.email,
          password: userData.password,
          full_name: userData.fullName,
          role: "morador",
        },
      });

      if (createError) throw createError;
      if (createResult.error) throw new Error(createResult.error);

      const newUserId = createResult.user.id;

      // Add to unit_users
      const { error: unitUserError } = await supabase
        .from("unit_users")
        .insert({
          user_id: newUserId,
          unit_id: unitId,
          is_primary: false,
          nickname: userData.nickname || null,
        });

      if (unitUserError) throw unitUserError;

      // Also create resident record
      const { error: residentError } = await supabase
        .from("residents")
        .insert({
          user_id: newUserId,
          unit_id: unitId,
          resident_type: "inquilino",
          is_active: true,
        });

      if (residentError) {
        console.error("Error creating resident record:", residentError);
      }

      return { userId: newUserId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-users", unitId] });
      toast.success("Usuário adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    },
  });

  // Update unit user nickname
  const updateUnitUser = useMutation({
    mutationFn: async ({ unitUserId, nickname }: { unitUserId: string; nickname: string }) => {
      const { error } = await supabase
        .from("unit_users")
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq("id", unitUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-users", unitId] });
      toast.success("Apelido atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Remove a user from the unit
  const removeUnitUser = useMutation({
    mutationFn: async (unitUserId: string) => {
      // Get the user_id first
      const { data: unitUser, error: fetchError } = await supabase
        .from("unit_users")
        .select("user_id, is_primary")
        .eq("id", unitUserId)
        .single();

      if (fetchError) throw fetchError;
      if (unitUser.is_primary) throw new Error("Não é possível remover o usuário titular");

      // Remove from unit_users
      const { error: deleteError } = await supabase
        .from("unit_users")
        .delete()
        .eq("id", unitUserId);

      if (deleteError) throw deleteError;

      // Deactivate resident record
      const { error: residentError } = await supabase
        .from("residents")
        .update({ is_active: false })
        .eq("user_id", unitUser.user_id)
        .eq("unit_id", unitId);

      if (residentError) {
        console.error("Error deactivating resident:", residentError);
      }

      // Delete the user via edge function
      const { error: deleteUserError } = await supabase.functions.invoke("delete-user", {
        body: { userId: unitUser.user_id },
      });

      if (deleteUserError) {
        console.error("Error deleting user:", deleteUserError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-users", unitId] });
      toast.success("Usuário removido da unidade!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover usuário: ${error.message}`);
    },
  });

  return {
    unitUsers,
    isLoading,
    isPrimaryUser,
    userUnit,
    canAddMoreUsers,
    additionalUsersCount,
    maxAdditionalUsers: MAX_ADDITIONAL_USERS,
    addUnitUser,
    updateUnitUser,
    removeUnitUser,
    refetch,
  };
};
