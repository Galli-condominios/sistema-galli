-- Remover colunas de extração/IA que não serão mais usadas
ALTER TABLE public.documents DROP COLUMN IF EXISTS content_text;
ALTER TABLE public.documents DROP COLUMN IF EXISTS extraction_status;
ALTER TABLE public.documents DROP COLUMN IF EXISTS ai_enabled;