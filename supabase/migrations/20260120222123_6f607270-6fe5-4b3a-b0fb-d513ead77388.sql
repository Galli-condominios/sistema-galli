-- =====================================================
-- SECURITY HARDENING - RLS POLICY CORRECTIONS
-- =====================================================
-- Este script corrige vulnerabilidades críticas de segurança
-- identificadas na auditoria de RLS policies
-- =====================================================

-- 1. PROFILES - Restringir acesso de porteiros ao mesmo condomínio
-- Problema: Porteiros podiam ver todos os profiles
-- Solução: Filtrar por organização do porteiro

DROP POLICY IF EXISTS "Porteiros podem visualizar profiles" ON profiles;
DROP POLICY IF EXISTS "Doorkeepers can view profiles" ON profiles;

CREATE POLICY "Porteiros podem visualizar profiles do seu condominium"
ON profiles FOR SELECT
USING (
  -- Usuário pode ver seu próprio profile
  auth.uid() = id
  OR
  -- Admins e síndicos podem ver todos da organização
  (
    (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'))
    AND id IN (
      SELECT user_id FROM user_organization_members 
      WHERE organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  )
  OR
  -- Porteiros só veem profiles de moradores do mesmo condomínio
  (
    public.has_role(auth.uid(), 'porteiro')
    AND EXISTS (
      SELECT 1 FROM residents r
      JOIN units u ON r.unit_id = u.id
      JOIN condominiums c ON u.condominium_id = c.id
      WHERE r.user_id = profiles.id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  )
);

-- 2. VISITOR_AUTHORIZATIONS - Filtrar por condomínio para staff
-- Problema: Porteiros podiam ver autorizações de qualquer condomínio
-- Solução: Adicionar filtro de organização

DROP POLICY IF EXISTS "Doorkeepers can view authorizations" ON visitor_authorizations;
DROP POLICY IF EXISTS "Staff can view all authorizations" ON visitor_authorizations;

CREATE POLICY "Staff veem autorizações do seu condominium"
ON visitor_authorizations FOR SELECT
USING (
  -- Moradores veem suas próprias autorizações
  resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
  OR
  -- Admins/Síndicos/Porteiros veem autorizações da sua organização
  (
    (public.has_role(auth.uid(), 'administrador') 
     OR public.has_role(auth.uid(), 'sindico')
     OR public.has_role(auth.uid(), 'porteiro'))
    AND EXISTS (
      SELECT 1 FROM units u
      JOIN condominiums c ON u.condominium_id = c.id
      WHERE u.id = visitor_authorizations.unit_id
      AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    )
  )
);

-- 3. ACCESS_LOGS - Adicionar filtro de condomínio para staff
-- Problema: Staff podia ver logs de qualquer condomínio
-- Solução: Filtrar por organização

DROP POLICY IF EXISTS "Staff can view access logs" ON access_logs;
DROP POLICY IF EXISTS "Staff can view all access logs" ON access_logs;

CREATE POLICY "Staff veem logs do seu condominium"
ON access_logs FOR SELECT
USING (
  (public.has_role(auth.uid(), 'administrador') 
   OR public.has_role(auth.uid(), 'sindico')
   OR public.has_role(auth.uid(), 'porteiro'))
  AND EXISTS (
    SELECT 1 FROM condominiums c
    WHERE c.id = access_logs.condominium_id
    AND c.organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  )
);

-- 4. BLOCK_GROUP_MEMBERS - Remover USING(true) inseguro
-- Problema: Qualquer pessoa podia ver membros de grupos
-- Solução: Restringir a membros do grupo ou admins
-- NOTA: Coluna correta é block_group_id, não group_id

DROP POLICY IF EXISTS "Anyone can view group members" ON block_group_members;
DROP POLICY IF EXISTS "Users can view all group members" ON block_group_members;

CREATE POLICY "Membros podem ver membros do mesmo grupo"
ON block_group_members FOR SELECT
USING (
  -- Usuário é membro do grupo
  EXISTS (
    SELECT 1 FROM block_group_members bgm
    WHERE bgm.block_group_id = block_group_members.block_group_id
    AND bgm.user_id = auth.uid()
  )
  -- Ou é admin/síndico
  OR public.has_role(auth.uid(), 'administrador')
  OR public.has_role(auth.uid(), 'sindico')
);

-- 5. VISITOR_DOCUMENTS Storage - Proteger documentos de visitantes
-- Garantir que apenas staff pode ver/gerenciar documentos

-- Política de SELECT para visitor-documents bucket
DROP POLICY IF EXISTS "Staff can view visitor documents" ON storage.objects;

CREATE POLICY "Staff can view visitor documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitor-documents'
  AND (
    public.has_role(auth.uid(), 'administrador')
    OR public.has_role(auth.uid(), 'sindico')
    OR public.has_role(auth.uid(), 'porteiro')
  )
);

-- Política de INSERT para visitor-documents bucket
DROP POLICY IF EXISTS "Staff can upload visitor documents" ON storage.objects;

CREATE POLICY "Staff can upload visitor documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visitor-documents'
  AND (
    public.has_role(auth.uid(), 'administrador')
    OR public.has_role(auth.uid(), 'sindico')
    OR public.has_role(auth.uid(), 'porteiro')
  )
);

-- Política de DELETE para visitor-documents bucket
DROP POLICY IF EXISTS "Staff can delete visitor documents" ON storage.objects;

CREATE POLICY "Staff can delete visitor documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visitor-documents'
  AND (
    public.has_role(auth.uid(), 'administrador')
    OR public.has_role(auth.uid(), 'sindico')
  )
);