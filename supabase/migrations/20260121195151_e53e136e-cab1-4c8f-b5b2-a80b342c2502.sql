-- Add AI configuration columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'lovable',
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'google/gemini-3-flash-preview';

-- Create RLS policy for AI config - only owners can manage
CREATE POLICY "Only owners can update AI config"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());