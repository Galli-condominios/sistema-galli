-- Create documents table for document library
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('ata', 'regimento', 'convencao', 'comunicado', 'manual', 'contrato', 'outro')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_text TEXT, -- Extracted text for AI context
  uploaded_by UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT true,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Admin/Síndico can manage all documents
CREATE POLICY "Admins can manage documents"
ON public.documents
FOR ALL
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- Residents can view public documents from their condominium
CREATE POLICY "Residents can view public documents"
ON public.documents
FOR SELECT
USING (
  is_public = true 
  AND condominium_id IN (
    SELECT u.condominium_id FROM units u
    JOIN residents r ON r.unit_id = u.id
    WHERE r.user_id = auth.uid()
  )
);

-- Doorkeepers can view public documents
CREATE POLICY "Doorkeepers can view public documents"
ON public.documents
FOR SELECT
USING (is_public = true AND has_role(auth.uid(), 'porteiro'));

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for condominium documents
INSERT INTO storage.buckets (id, name, public) VALUES ('condominium-documents', 'condominium-documents', true);

-- Storage policies for condominium-documents bucket
CREATE POLICY "Anyone can view condominium documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'condominium-documents');

CREATE POLICY "Admins can upload condominium documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'condominium-documents' 
  AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
);

CREATE POLICY "Admins can delete condominium documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'condominium-documents' 
  AND (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
);