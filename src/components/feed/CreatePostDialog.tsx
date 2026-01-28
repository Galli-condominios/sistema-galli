import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Image, Video, Globe, Users2, Plus, X, Loader2, HelpCircle, AlertCircle } from "lucide-react";
import { useBlockGroups, BlockGroup } from "@/hooks/useBlockGroups";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreatePostDialogProps {
  onSubmit: (data: {
    content: string;
    condominium_id: string;
    group_id?: string | null;
    media_url?: string | null;
    media_type?: "image" | "video" | null;
    is_global?: boolean;
  }) => void;
  isSubmitting?: boolean;
}

export const CreatePostDialog = ({ onSubmit, isSubmitting }: CreatePostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { condominiumId } = useCondominiumFilter();
  const { blockGroups } = useBlockGroups();
  const { isAdmin } = useUserRoleContext();
  const { toast } = useToast();

  // Check if any groups have units
  const groupsWithUnits = blockGroups?.filter((g) => (g.units_count || 0) > 0) || [];
  const hasConfiguredGroups = groupsWithUnits.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      toast({
        title: "Arquivo inválido",
        description: "Apenas imagens e vídeos são permitidos",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for images, 50MB for videos)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: `O tamanho máximo é ${isVideo ? "50MB" : "10MB"}`,
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !condominiumId) return;

    let mediaUrl: string | null = null;
    let mediaType: "image" | "video" | null = null;

    // Upload media if present
    if (mediaFile) {
      setIsUploading(true);
      try {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `feed/${condominiumId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, mediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        mediaUrl = urlData.publicUrl;
        mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar o arquivo",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSubmit({
      content: content.trim(),
      condominium_id: condominiumId,
      group_id: isGlobal ? null : selectedGroup || null,
      media_url: mediaUrl,
      media_type: mediaType,
      is_global: isGlobal,
    });

    // Reset form
    setContent("");
    setIsGlobal(false);
    setSelectedGroup("");
    removeMedia();
    setOpen(false);
  };

  const canPostGlobal = isAdmin();

  // Determine who will see this post
  const getAudienceDescription = () => {
    if (isGlobal) {
      return "Todos os moradores do condomínio verão esta publicação";
    }
    if (selectedGroup) {
      const group = blockGroups?.find((g) => g.id === selectedGroup);
      if (group) {
        return `Apenas moradores do "${group.name}" verão esta publicação`;
      }
    }
    return "Selecione quem verá esta publicação";
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button variant="gradient" size="lg" className="gap-2 shadow-lg">
          <Plus className="h-5 w-5" />
          Nova Publicação
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Nova Publicação
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Mensagem</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você quer compartilhar com o condomínio?"
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {mediaFile?.type.startsWith("video/") ? (
                <video src={mediaPreview} className="w-full max-h-48 object-contain" controls />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-48 object-contain" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Media buttons */}
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("image-upload")?.click()}
              disabled={!!mediaFile}
            >
              <Image className="h-4 w-4 mr-2" />
              Imagem
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("video-upload")?.click()}
              disabled={!!mediaFile}
            >
              <Video className="h-4 w-4 mr-2" />
              Vídeo
            </Button>
          </div>

          {/* Audience selection section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">Quem verá esta publicação?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Escolha se a publicação será visível para todos ou apenas para um grupo específico de moradores.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Global toggle (admin only) */}
            {canPostGlobal && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="is_global" className="cursor-pointer font-medium">
                      Publicação Global
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Todos os moradores do condomínio
                    </p>
                  </div>
                </div>
                <Switch
                  id="is_global"
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
              </div>
            )}

            {/* Group selection */}
            {!isGlobal && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="group" className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                    Enviar para um grupo específico
                  </Label>
                </div>
                
                {hasConfiguredGroups ? (
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo de moradores..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groupsWithUnits.map((group: BlockGroup) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <span>{group.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {group.units_count} unidades
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : blockGroups && blockGroups.length > 0 ? (
                  <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-sm text-amber-600 dark:text-amber-300/80">
                      Os grupos existentes não possuem unidades vinculadas. Configure os grupos para enviar mensagens segmentadas.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum grupo configurado. A publicação será visível para todos.
                  </p>
                )}
              </div>
            )}

            {/* Audience preview */}
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              {isGlobal ? (
                <Globe className="h-4 w-4 text-primary" />
              ) : (
                <Users2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {getAudienceDescription()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={!content.trim() || isSubmitting || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
