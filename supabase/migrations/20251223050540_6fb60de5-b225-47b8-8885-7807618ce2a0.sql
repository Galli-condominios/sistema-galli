-- Create ai_knowledge_base table for FAQs and knowledge content
CREATE TABLE public.ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id uuid REFERENCES public.condominiums(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('faq', 'rule', 'info')),
  question text,
  answer text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add ai_enabled column to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT false;

-- Enable RLS on ai_knowledge_base
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and síndicos can manage knowledge base entries
CREATE POLICY "Admins can manage knowledge base"
ON public.ai_knowledge_base FOR ALL
USING (
  public.has_role(auth.uid(), 'administrador'::app_role) 
  OR public.has_role(auth.uid(), 'sindico'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::app_role) 
  OR public.has_role(auth.uid(), 'sindico'::app_role)
);

-- Policy: Everyone can read active knowledge base entries
CREATE POLICY "Everyone can read active knowledge"
ON public.ai_knowledge_base FOR SELECT
USING (is_active = true);

-- Create index for better performance
CREATE INDEX idx_ai_knowledge_base_condominium ON public.ai_knowledge_base(condominium_id);
CREATE INDEX idx_ai_knowledge_base_type ON public.ai_knowledge_base(type);
CREATE INDEX idx_ai_knowledge_base_active ON public.ai_knowledge_base(is_active);
CREATE INDEX idx_documents_ai_enabled ON public.documents(ai_enabled) WHERE ai_enabled = true;

-- Trigger for updated_at
CREATE TRIGGER update_ai_knowledge_base_updated_at
BEFORE UPDATE ON public.ai_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();