-- Create separate table for sensitive AI configuration (owner-only access)
CREATE TABLE public.organization_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  ai_provider text DEFAULT 'lovable',
  ai_model text DEFAULT 'google/gemini-3-flash-preview',
  ai_api_key_encrypted text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_ai_config ENABLE ROW LEVEL SECURITY;

-- Only organization owners can view AI config
CREATE POLICY "Only owners can view AI config"
ON public.organization_ai_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_ai_config.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_organization_members uom
    WHERE uom.organization_id = organization_ai_config.organization_id
    AND uom.user_id = auth.uid()
    AND uom.role IN ('owner', 'admin')
  )
);

-- Only organization owners can insert AI config
CREATE POLICY "Only owners can insert AI config"
ON public.organization_ai_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_ai_config.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_organization_members uom
    WHERE uom.organization_id = organization_ai_config.organization_id
    AND uom.user_id = auth.uid()
    AND uom.role IN ('owner', 'admin')
  )
);

-- Only organization owners can update AI config
CREATE POLICY "Only owners can update AI config"
ON public.organization_ai_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_ai_config.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_organization_members uom
    WHERE uom.organization_id = organization_ai_config.organization_id
    AND uom.user_id = auth.uid()
    AND uom.role IN ('owner', 'admin')
  )
);

-- Only organization owners can delete AI config
CREATE POLICY "Only owners can delete AI config"
ON public.organization_ai_config
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_ai_config.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_organization_members uom
    WHERE uom.organization_id = organization_ai_config.organization_id
    AND uom.user_id = auth.uid()
    AND uom.role IN ('owner', 'admin')
  )
);

-- Migrate existing AI config from organizations table to new table
INSERT INTO public.organization_ai_config (organization_id, ai_provider, ai_model, ai_api_key_encrypted)
SELECT id, ai_provider, ai_model, ai_api_key_encrypted
FROM public.organizations
WHERE ai_api_key_encrypted IS NOT NULL OR ai_provider != 'lovable';

-- Remove sensitive AI columns from organizations table (keep them null-able for backward compat during transition)
-- We'll drop them in a future migration after confirming everything works
ALTER TABLE public.organizations 
  DROP COLUMN IF EXISTS ai_api_key_encrypted,
  DROP COLUMN IF EXISTS ai_provider,
  DROP COLUMN IF EXISTS ai_model;

-- Create index for faster lookups
CREATE INDEX idx_organization_ai_config_org_id ON public.organization_ai_config(organization_id);