import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: AppRole;
}

export const useProfile = (userId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });

  const updateProfile = useMutation({
    mutationFn: async ({ fullName, avatarUrl }: { fullName?: string; avatarUrl?: string | null }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const updates: Partial<Profile> = {};
      if (fullName !== undefined) updates.full_name = fullName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!userId) throw new Error("Usuário não autenticado");

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Delete old avatar if exists
    if (query.data?.avatar_url) {
      const oldPath = query.data.avatar_url.split("/avatars/")[1];
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const deleteAvatar = async () => {
    if (!userId || !query.data?.avatar_url) return;

    const oldPath = query.data.avatar_url.split("/avatars/")[1];
    if (oldPath) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }

    await updateProfile.mutateAsync({ avatarUrl: null });
  };

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refetch: query.refetch,
  };
};
