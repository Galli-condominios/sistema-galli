-- =====================================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- =====================================================

-- 1. PROFILES: Restringir SELECT apenas para usuários autenticados
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. UNIT_MEMBERS: Verificar que o usuário está autenticado e é morador ativo da unidade
DROP POLICY IF EXISTS "Residents can view their unit members" ON public.unit_members;
CREATE POLICY "Active residents can view their unit members" 
ON public.unit_members 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.residents r 
    WHERE r.unit_id = unit_members.unit_id 
    AND r.user_id = auth.uid() 
    AND r.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins can manage unit members" ON public.unit_members;
CREATE POLICY "Admins can manage unit members" 
ON public.unit_members 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'administrador') 
  OR public.has_role(auth.uid(), 'sindico')
);

-- 3. VISITOR_AUTHORIZATIONS: Restringir porteiros ao seu condomínio específico
-- Primeiro precisamos verificar as políticas existentes
DROP POLICY IF EXISTS "Doorkeepers can view authorizations" ON public.visitor_authorizations;
DROP POLICY IF EXISTS "Porteiros podem visualizar autorizacoes de visitantes" ON public.visitor_authorizations;

CREATE POLICY "Doorkeepers view authorizations in their condominium" 
ON public.visitor_authorizations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins/Síndicos podem ver tudo na organização
    (
      (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
      AND EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.condominiums c ON c.id = u.condominium_id
        JOIN public.user_organization_members uom ON uom.organization_id = c.organization_id
        WHERE u.id = visitor_authorizations.unit_id
        AND uom.user_id = auth.uid()
      )
    )
    OR
    -- Porteiros só podem ver do condomínio onde estão vinculados
    (
      public.has_role(auth.uid(), 'porteiro')
      AND EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.condominiums c ON c.id = u.condominium_id
        JOIN public.employees e ON e.condominium_id = c.id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE u.id = visitor_authorizations.unit_id
        AND e.name = p.full_name
      )
    )
    OR
    -- Moradores podem ver suas próprias autorizações
    EXISTS (
      SELECT 1 FROM public.residents r 
      WHERE r.id = visitor_authorizations.resident_id 
      AND r.user_id = auth.uid()
      AND r.is_active = true
    )
  )
);

-- 4. ACCESS_LOGS: Restringir porteiros ao seu condomínio específico
DROP POLICY IF EXISTS "Porteiros podem visualizar todos os logs de acesso" ON public.access_logs;
DROP POLICY IF EXISTS "Staff can view access logs" ON public.access_logs;

CREATE POLICY "Staff view access logs in their condominium" 
ON public.access_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins/Síndicos podem ver da organização
    (
      (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
      AND EXISTS (
        SELECT 1 FROM public.condominiums c
        JOIN public.user_organization_members uom ON uom.organization_id = c.organization_id
        WHERE c.id = access_logs.condominium_id
        AND uom.user_id = auth.uid()
      )
    )
    OR
    -- Porteiros só do seu condomínio
    (
      public.has_role(auth.uid(), 'porteiro')
      AND EXISTS (
        SELECT 1 FROM public.employees e
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE e.condominium_id = access_logs.condominium_id
        AND e.name = p.full_name
      )
    )
  )
);

-- 5. FINANCIAL_CHARGES: Verificar que morador está ativo
DROP POLICY IF EXISTS "Residents can view their unit charges" ON public.financial_charges;
CREATE POLICY "Active residents can view their unit charges" 
ON public.financial_charges 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins da organização
    (
      (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
      AND EXISTS (
        SELECT 1 FROM public.condominiums c
        JOIN public.user_organization_members uom ON uom.organization_id = c.organization_id
        WHERE c.id = financial_charges.condominium_id
        AND uom.user_id = auth.uid()
      )
    )
    OR
    -- Moradores ATIVOS podem ver cobranças da sua unidade
    EXISTS (
      SELECT 1 FROM public.residents r 
      WHERE r.unit_id = financial_charges.unit_id 
      AND r.user_id = auth.uid()
      AND r.is_active = true
    )
  )
);

-- 6. UNIT_USERS: Adicionar verificação de autenticação explícita
DROP POLICY IF EXISTS "Users can manage their unit associations" ON public.unit_users;
CREATE POLICY "Authenticated users can manage their unit associations" 
ON public.unit_users 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'administrador') 
    OR public.has_role(auth.uid(), 'sindico')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'administrador') 
    OR public.has_role(auth.uid(), 'sindico')
  )
);