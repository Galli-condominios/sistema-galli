-- Tabela para tracking de uso do sistema (métricas globais)
CREATE TABLE IF NOT EXISTS public.system_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, metric_type, organization_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON public.system_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_type ON public.system_usage_stats(metric_type);

-- Enable RLS
ALTER TABLE public.system_usage_stats ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se é owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'
  )
$$;

-- RLS: Somente owners podem ver stats de uso
CREATE POLICY "Owners can view all usage stats" ON public.system_usage_stats
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

CREATE POLICY "Owners can insert usage stats" ON public.system_usage_stats
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as organizações
CREATE POLICY "Owners can view all organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os condomínios
CREATE POLICY "Owners can view all condominiums" ON public.condominiums
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os perfis
CREATE POLICY "Owners can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os user_roles
CREATE POLICY "Owners can view all user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as unidades
CREATE POLICY "Owners can view all units" ON public.units
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os moradores
CREATE POLICY "Owners can view all residents" ON public.residents
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as conversas de IA
CREATE POLICY "Owners can view all ai_conversations" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as mensagens de IA
CREATE POLICY "Owners can view all ai_messages" ON public.ai_messages
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as cobranças financeiras
CREATE POLICY "Owners can view all financial_charges" ON public.financial_charges
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os logs do sistema
CREATE POLICY "Owners can view all system_logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os alertas do sistema
CREATE POLICY "Owners can view all system_alerts" ON public.system_alerts
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as reservas
CREATE POLICY "Owners can view all reservations" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODAS as ocorrências de manutenção
CREATE POLICY "Owners can view all maintenance_requests" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- Owner pode ver TODOS os membros de organização
CREATE POLICY "Owners can view all org_members" ON public.user_organization_members
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));