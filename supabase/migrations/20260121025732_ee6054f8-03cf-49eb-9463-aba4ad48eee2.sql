-- Tabela para armazenar soluções aprendidas pela IA
CREATE TABLE public.error_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern TEXT NOT NULL, -- Padrão do erro (regex ou texto)
  error_category TEXT NOT NULL, -- auth, database, api, edge-function, rls, etc
  service TEXT, -- Serviço relacionado
  solution TEXT NOT NULL, -- Solução que funcionou
  prevention TEXT, -- Como prevenir
  times_applied INT DEFAULT 1,
  times_resolved INT DEFAULT 0,
  effectiveness_score FLOAT DEFAULT 0.5, -- 0-1 baseado em feedback
  last_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_error_solutions_category ON public.error_solutions(error_category);
CREATE INDEX idx_error_solutions_pattern ON public.error_solutions USING gin(to_tsvector('portuguese', error_pattern));
CREATE INDEX idx_error_solutions_effectiveness ON public.error_solutions(effectiveness_score DESC);

-- RLS
ALTER TABLE public.error_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view solutions"
ON public.error_solutions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

CREATE POLICY "Service role can manage solutions"
ON public.error_solutions
FOR ALL
USING (true)
WITH CHECK (true);

-- Adicionar coluna de feedback na tabela de diagnósticos
ALTER TABLE public.ai_diagnostics 
ADD COLUMN IF NOT EXISTS feedback_resolved BOOLEAN,
ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- Adicionar política para update de feedback
CREATE POLICY "Admins can update diagnostics feedback"
ON public.ai_diagnostics
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

-- Tabela para alertas de spike/anomalias
CREATE TABLE public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- spike, cascade, degradation, recurring
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, critical
  title TEXT NOT NULL,
  description TEXT,
  affected_service TEXT,
  error_count INT DEFAULT 0,
  first_occurrence TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_occurrence TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  related_log_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_system_alerts_active ON public.system_alerts(is_active, severity);
CREATE INDEX idx_system_alerts_type ON public.system_alerts(alert_type);
CREATE INDEX idx_system_alerts_created ON public.system_alerts(created_at DESC);

-- RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
ON public.system_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

CREATE POLICY "Service role can manage alerts"
ON public.system_alerts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can update alerts"
ON public.system_alerts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

-- Habilitar realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;

-- Adicionar colunas extras nos system_logs para melhor análise
ALTER TABLE public.system_logs
ADD COLUMN IF NOT EXISTS error_category TEXT,
ADD COLUMN IF NOT EXISTS similar_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

-- Função para detectar categoria de erro automaticamente
CREATE OR REPLACE FUNCTION public.categorize_error(message TEXT, service TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- RLS/Políticas
  IF message ILIKE '%policy%' OR message ILIKE '%RLS%' OR message ILIKE '%permission denied%' THEN
    RETURN 'rls';
  END IF;
  
  -- Autenticação
  IF message ILIKE '%auth%' OR message ILIKE '%token%' OR message ILIKE '%unauthorized%' OR message ILIKE '%jwt%' THEN
    RETURN 'auth';
  END IF;
  
  -- Banco de dados
  IF message ILIKE '%database%' OR message ILIKE '%query%' OR message ILIKE '%constraint%' OR message ILIKE '%foreign key%' OR message ILIKE '%recursion%' THEN
    RETURN 'database';
  END IF;
  
  -- Rate limiting
  IF message ILIKE '%rate limit%' OR message ILIKE '%too many%' THEN
    RETURN 'rate-limit';
  END IF;
  
  -- API/Network
  IF message ILIKE '%timeout%' OR message ILIKE '%connection%' OR message ILIKE '%fetch%' OR message ILIKE '%network%' THEN
    RETURN 'network';
  END IF;
  
  -- Validação
  IF message ILIKE '%validation%' OR message ILIKE '%invalid%' OR message ILIKE '%required%' THEN
    RETURN 'validation';
  END IF;
  
  -- Edge Functions
  IF service = 'edge-function' THEN
    RETURN 'edge-function';
  END IF;
  
  RETURN 'other';
END;
$$;

-- Trigger para categorizar erros automaticamente
CREATE OR REPLACE FUNCTION public.auto_categorize_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level IN ('ERROR', 'CRITICAL') AND NEW.error_category IS NULL THEN
    NEW.error_category := categorize_error(NEW.message, NEW.service);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_categorize_log
BEFORE INSERT ON public.system_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_categorize_log();