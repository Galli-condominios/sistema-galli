-- =====================================================
-- SECURITY HARDENING: Restrict system_logs INSERT to service_role only
-- =====================================================

-- Drop existing permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.system_logs;

-- Create restrictive INSERT policy (only service role can insert)
-- Note: This effectively blocks client-side inserts while allowing Edge Functions with service_role key
CREATE POLICY "Only service role can insert logs" 
ON public.system_logs 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Ensure SELECT policies are properly restricted to admin roles only
DROP POLICY IF EXISTS "Admins can view all logs" ON public.system_logs;

CREATE POLICY "Admins and sindicos can view all logs" 
ON public.system_logs 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
);

-- Add index for faster log queries
CREATE INDEX IF NOT EXISTS idx_system_logs_created_level 
ON public.system_logs (created_at DESC, level);

CREATE INDEX IF NOT EXISTS idx_system_logs_service 
ON public.system_logs (service, created_at DESC);

-- =====================================================
-- Add resolved tracking to system_logs
-- =====================================================

-- Add resolved_at column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_logs' 
    AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.system_logs ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add resolved_by column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'system_logs' 
    AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE public.system_logs ADD COLUMN resolved_by UUID;
  END IF;
END $$;

-- =====================================================
-- Harden ai_diagnostics and error_solutions access
-- =====================================================

-- Ensure ai_diagnostics has proper RLS
DROP POLICY IF EXISTS "Admins can manage ai_diagnostics" ON public.ai_diagnostics;

CREATE POLICY "Admins and sindicos can manage ai_diagnostics" 
ON public.ai_diagnostics 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
);

-- Ensure error_solutions has proper RLS
DROP POLICY IF EXISTS "Admins can manage error_solutions" ON public.error_solutions;

CREATE POLICY "Admins and sindicos can manage error_solutions" 
ON public.error_solutions 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
);

-- Ensure system_alerts has proper RLS
DROP POLICY IF EXISTS "Admins can manage system_alerts" ON public.system_alerts;

CREATE POLICY "Admins and sindicos can manage system_alerts" 
ON public.system_alerts 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador') OR 
  public.has_role(auth.uid(), 'sindico')
);