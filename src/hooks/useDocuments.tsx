import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";

export interface Document {
  id: string;
  condominium_id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  condominiums?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

export interface DocumentFormData {
  condominium_id: string;
  title: string;
  description?: string;
  category: string;
  is_public: boolean;
}

export function useDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { condominiumId, shouldFilter } = useCondominiumFilter();

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', condominiumId],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          condominiums(name),
          profiles:uploaded_by(full_name)
        `)
        .order('created_at', { ascending: false });

      // Filter by condominium if admin with selected condominium
      if (shouldFilter && condominiumId) {
        query = query.eq('condominium_id', condominiumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Document[];
    }
  });

  const uploadDocument = useCallback(async (
    file: File,
    formData: DocumentFormData
  ): Promise<Document | null> => {
    setUploading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${formData.condominium_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('condominium-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('condominium-documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data: document, error: insertError } = await supabase
        .from('documents')
        .insert({
          condominium_id: formData.condominium_id,
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          is_public: formData.is_public
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso."
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      return document;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar documento",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [toast, queryClient]);

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const document = documents.find(d => d.id === documentId);
      
      if (document) {
        // Extract file path from URL
        const urlParts = document.file_url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        
        // Delete from storage
        await supabase.storage
          .from('condominium-documents')
          .remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir documento",
        variant: "destructive"
      });
    }
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentFormData> }) => {
      const { error } = await supabase
        .from('documents')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Documento atualizado com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar documento",
        variant: "destructive"
      });
    }
  });

  return {
    documents,
    isLoading,
    uploading,
    refetch,
    uploadDocument,
    deleteDocument: deleteDocument.mutate,
    updateDocument: updateDocument.mutate
  };
}
