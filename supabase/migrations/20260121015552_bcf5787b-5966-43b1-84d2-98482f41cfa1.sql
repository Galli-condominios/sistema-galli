-- =====================================================
-- CORREÇÕES DE SEGURANÇA - FASE 2
-- =====================================================

-- 1. PROFILES: Restringir para apenas usuários da mesma organização
DROP POLICY IF EXISTS "Profiles viewable by authenticated users only" ON public.profiles;

CREATE POLICY "Profiles viewable by same organization members" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Usuário pode ver seu próprio perfil
    id = auth.uid()
    OR
    -- Admins/Síndicos podem ver perfis de sua organização
    (
      (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
      AND EXISTS (
        SELECT 1 FROM public.user_organization_members uom1
        JOIN public.user_organization_members uom2 ON uom1.organization_id = uom2.organization_id
        WHERE uom1.user_id = auth.uid() AND uom2.user_id = profiles.id
      )
    )
    OR
    -- Moradores podem ver perfis de moradores do mesmo condomínio
    EXISTS (
      SELECT 1 FROM public.residents r1
      JOIN public.units u1 ON r1.unit_id = u1.id
      JOIN public.units u2 ON u1.condominium_id = u2.condominium_id
      JOIN public.residents r2 ON r2.unit_id = u2.id
      WHERE r1.user_id = auth.uid() AND r2.user_id = profiles.id
    )
    OR
    -- Porteiros podem ver perfis de moradores do seu condomínio
    (
      public.has_role(auth.uid(), 'porteiro')
      AND EXISTS (
        SELECT 1 FROM public.employees e
        JOIN public.profiles p ON p.id = auth.uid()
        JOIN public.residents r ON r.user_id = profiles.id
        JOIN public.units u ON r.unit_id = u.id
        WHERE e.condominium_id = u.condominium_id AND e.name = p.full_name
      )
    )
  )
);

-- 2. VISITOR_AUTHORIZATIONS: Corrigir política existente que ainda estava muito permissiva
DROP POLICY IF EXISTS "Doorkeepers view authorizations in their condominium" ON public.visitor_authorizations;
DROP POLICY IF EXISTS "Staff veem autorizações do seu condominium" ON public.visitor_authorizations;

CREATE POLICY "Staff view authorizations in their condominium only" 
ON public.visitor_authorizations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Moradores podem ver suas próprias autorizações
    EXISTS (
      SELECT 1 FROM public.residents r 
      WHERE r.id = visitor_authorizations.resident_id 
      AND r.user_id = auth.uid()
      AND r.is_active = true
    )
    OR
    -- Admins/Síndicos podem ver autorizações do seu condomínio específico (não de toda organização)
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
    -- Porteiros só podem ver do condomínio onde trabalham
    (
      public.has_role(auth.uid(), 'porteiro')
      AND EXISTS (
        SELECT 1 FROM public.units u
        JOIN public.employees e ON e.condominium_id = u.condominium_id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE u.id = visitor_authorizations.unit_id
        AND e.name = p.full_name
      )
    )
  )
);

-- 3. ACCESS_LOGS: Restringir ao condomínio específico
DROP POLICY IF EXISTS "Staff view access logs in their condominium" ON public.access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;

CREATE POLICY "Staff view access logs in their condominium only" 
ON public.access_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins/Síndicos podem ver logs do condomínio da organização
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
    -- Porteiros só podem ver do condomínio onde trabalham
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

-- 4. Adicionar política INSERT para access_logs para porteiros
DROP POLICY IF EXISTS "Doorkeepers can insert access logs" ON public.access_logs;
CREATE POLICY "Staff can insert access logs in their condominium" 
ON public.access_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins/Síndicos podem inserir
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

-- 5. Adicionar política UPDATE para access_logs
DROP POLICY IF EXISTS "Staff can update access logs" ON public.access_logs;
CREATE POLICY "Staff can update access logs in their condominium" 
ON public.access_logs 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND (
    (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
    OR
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