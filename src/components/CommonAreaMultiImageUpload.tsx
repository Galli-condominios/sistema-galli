import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, ImagePlus, Loader2 } from "lucide-react";

interface CommonAreaMultiImageUploadProps {
  currentUrls?: string[];
  onUploadComplete: (urls: string[]) => void;
  maxImages?: number;
}

const CommonAreaMultiImageUpload = ({
  currentUrls = [],
  onUploadComplete,
  maxImages = 10,
}: CommonAreaMultiImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(currentUrls);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - imageUrls.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Limite de imagens",
        description: `Você pode adicionar apenas mais ${remainingSlots} imagem(ns).`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Tipo de arquivo inválido",
            description: `${file.name} não é uma imagem válida.`,
            variant: "destructive",
          });
          continue;
        }

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o limite de 5MB.`,
            variant: "destructive",
          });
          continue;
        }

        // Gerar nome único
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `common-areas/${fileName}`;

        // Upload para o bucket
        const { error: uploadError } = await supabase.storage
          .from("common-area-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Erro no upload",
            description: `Erro ao enviar ${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
          continue;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from("common-area-images")
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        const updatedUrls = [...imageUrls, ...newUrls];
        setImageUrls(updatedUrls);
        onUploadComplete(updatedUrls);
        toast({
          title: "Upload concluído",
          description: `${newUrls.length} imagem(ns) enviada(s) com sucesso.`,
        });
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao enviar as imagens.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedUrls = imageUrls.filter((_, index) => index !== indexToRemove);
    setImageUrls(updatedUrls);
    onUploadComplete(updatedUrls);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Fotos da Área</Label>
        <span className="text-sm text-muted-foreground">
          {imageUrls.length}/{maxImages} fotos
        </span>
      </div>

      {/* Grid de imagens */}
      <div className="grid grid-cols-3 gap-3">
        {imageUrls.map((url, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
          >
            <img
              src={url}
              alt={`Imagem ${index + 1}`}
              className="object-cover w-full h-full"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Botão de adicionar (se ainda houver espaço) */}
        {imageUrls.length < maxImages && (
          <label
            className={`aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors ${
              isUploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB por imagem.
      </p>
    </div>
  );
};

export default CommonAreaMultiImageUpload;