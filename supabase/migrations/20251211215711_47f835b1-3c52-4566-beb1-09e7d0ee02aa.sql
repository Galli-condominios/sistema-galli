-- Adicionar coluna para URL da imagem nas áreas comuns
ALTER TABLE public.common_areas ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar bucket para imagens das áreas comuns
INSERT INTO storage.buckets (id, name, public) 
VALUES ('common-area-images', 'common-area-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket
CREATE POLICY "Admins can upload common area images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'common-area-images' 
  AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
);

CREATE POLICY "Admins can update common area images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'common-area-images' 
  AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
);

CREATE POLICY "Admins can delete common area images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'common-area-images' 
  AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
);

CREATE POLICY "Anyone can view common area images"
ON storage.objects FOR SELECT
USING (bucket_id = 'common-area-images');