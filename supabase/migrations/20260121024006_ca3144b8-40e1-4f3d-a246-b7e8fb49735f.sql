-- Tabela principal de logs do sistema
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
  service TEXT NOT NULL, -- 'auth', 'api', 'edge-function', 'database', 'frontend'
  function_name TEXT, -- Nome da edge function se aplicável
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Dados extras (stack trace, request info, etc)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  request_id TEXT, -- Para correlacionar requests
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_system_logs_timestamp ON public.system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs(level);
CREATE INDEX idx_system_logs_service ON public.system_logs(service);
CREATE INDEX idx_system_logs_resolved ON public.system_logs(resolved);
CREATE INDEX idx_system_logs_request_id ON public.system_logs(request_id);

-- Habilitar RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins e síndicos podem visualizar logs
CREATE POLICY "Admins can view all system logs"
ON public.system_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

-- Service role pode inserir logs (via edge functions)
CREATE POLICY "Service role can insert logs"
ON public.system_logs
FOR INSERT
WITH CHECK (true);

-- Admins podem atualizar (marcar como resolvido)
CREATE POLICY "Admins can update system logs"
ON public.system_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- Trigger para notificar admins sobre erros críticos
CREATE OR REPLACE FUNCTION public.notify_critical_system_error()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level = 'CRITICAL' THEN
    INSERT INTO public.notifications (user_id, title, message, type, priority, link)
    SELECT 
      ur.user_id,
      '🚨 Erro Crítico no Sistema',
      'Serviço: ' || NEW.service || ' - ' || LEFT(NEW.message, 100),
      'system',
      'urgent',
      '/monitoramento'
    FROM public.user_roles ur 
    WHERE ur.role IN ('administrador', 'sindico');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_critical_error
AFTER INSERT ON public.system_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_critical_system_error();

-- Tabela para armazenar diagnósticos da IA
CREATE TABLE public.ai_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES public.system_logs(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  root_cause TEXT,
  impact TEXT,
  solution TEXT,
  prevention TEXT,
  related_logs UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_ai_diagnostics_log_id ON public.ai_diagnostics(log_id);

-- RLS
ALTER TABLE public.ai_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view diagnostics"
ON public.ai_diagnostics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador', 'sindico')
  )
);

CREATE POLICY "Service role can insert diagnostics"
ON public.ai_diagnostics
FOR INSERT
WITH CHECK (true);