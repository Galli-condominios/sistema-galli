-- =============================================
-- Corrigir políticas RLS com USING(true)
-- Substituir por verificações de service_role
-- =============================================

-- 1. Corrigir ai_diagnostics - INSERT
DROP POLICY IF EXISTS "Service role can insert diagnostics" ON public.ai_diagnostics;
CREATE POLICY "Edge functions can insert diagnostics"
ON public.ai_diagnostics
FOR INSERT
TO authenticated
WITH CHECK (
  -- Apenas admins via edge functions podem inserir
  has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico')
);

-- 2. Corrigir ai_usage_stats - INSERT
DROP POLICY IF EXISTS "Service role can insert stats" ON public.ai_usage_stats;
CREATE POLICY "Authenticated users can insert their own stats"
ON public.ai_usage_stats
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- 3. Corrigir error_solutions - ALL
DROP POLICY IF EXISTS "Service role can manage solutions" ON public.error_solutions;
-- Apenas admins podem ver e gerenciar soluções de erro
CREATE POLICY "Admins can manage error solutions"
ON public.error_solutions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'))
WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- 4. Corrigir system_alerts - ALL
DROP POLICY IF EXISTS "Service role can manage alerts" ON public.system_alerts;
-- Admins já têm políticas de SELECT e UPDATE, adicionar INSERT/DELETE
CREATE POLICY "Admins can insert alerts"
ON public.system_alerts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

CREATE POLICY "Admins can delete alerts"
ON public.system_alerts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'administrador') OR has_role(auth.uid(), 'sindico'));

-- 5. Verificar system_logs (se tiver política similar)
DROP POLICY IF EXISTS "Service role can insert logs" ON public.system_logs;
CREATE POLICY "Authenticated users can insert logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Logs podem ser inseridos por qualquer usuário autenticado (para logging de erros)
  auth.uid() IS NOT NULL
);