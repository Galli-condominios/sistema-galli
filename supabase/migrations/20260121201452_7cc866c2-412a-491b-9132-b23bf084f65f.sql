-- =============================================
-- FASE 1: Corrigir Recursão Infinita em profiles
-- =============================================

-- Dropar todas as políticas existentes da tabela profiles
DROP POLICY IF EXISTS "Admins and síndicos can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Porteiros can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Porteiros podem visualizar profiles do seu condominium" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by same organization members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own last_seen_at" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recriar políticas simplificadas SEM recursão

-- 1. Usuários podem ver seu próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Usuários podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Admins e síndicos podem ver todos os perfis (usando função has_role)
CREATE POLICY "profiles_select_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'sindico'));

-- 4. Admins podem gerenciar todos os perfis
CREATE POLICY "profiles_all_admin"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- 5. Porteiros podem ver perfis de moradores (simplificado - sem JOIN complexo)
-- Porteiros precisam ver nomes de moradores para o controle de acesso
CREATE POLICY "profiles_select_doorkeeper"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'porteiro') 
  AND EXISTS (
    SELECT 1 FROM public.residents r
    WHERE r.user_id = profiles.id
  )
);

-- =============================================
-- FASE 3: Corrigir função categorize_error
-- =============================================

CREATE OR REPLACE FUNCTION public.categorize_error(message text, service text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  IF message ILIKE '%policy%' OR message ILIKE '%RLS%' OR message ILIKE '%permission denied%' THEN
    RETURN 'rls';
  END IF;
  
  IF message ILIKE '%auth%' OR message ILIKE '%token%' OR message ILIKE '%unauthorized%' OR message ILIKE '%jwt%' THEN
    RETURN 'auth';
  END IF;
  
  IF message ILIKE '%database%' OR message ILIKE '%query%' OR message ILIKE '%constraint%' OR message ILIKE '%foreign key%' OR message ILIKE '%recursion%' THEN
    RETURN 'database';
  END IF;
  
  IF message ILIKE '%rate limit%' OR message ILIKE '%too many%' THEN
    RETURN 'rate-limit';
  END IF;
  
  IF message ILIKE '%timeout%' OR message ILIKE '%connection%' OR message ILIKE '%fetch%' OR message ILIKE '%network%' THEN
    RETURN 'network';
  END IF;
  
  IF message ILIKE '%validation%' OR message ILIKE '%invalid%' OR message ILIKE '%required%' THEN
    RETURN 'validation';
  END IF;
  
  IF service = 'edge-function' THEN
    RETURN 'edge-function';
  END IF;
  
  RETURN 'other';
END;
$function$;

-- =============================================
-- Atualizar função notify_visitor_authorization
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_visitor_authorization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  resident_name TEXT;
  unit_number TEXT;
  porteiro_record RECORD;
  admin_record RECORD;
BEGIN
  SELECT p.full_name, u.unit_number INTO resident_name, unit_number
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.resident_id;

  FOR porteiro_record IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'porteiro'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      porteiro_record.user_id,
      'Nova Autorização de Visitante',
      'O morador ' || COALESCE(resident_name, 'Desconhecido') || ' (Unidade ' || COALESCE(unit_number, '?') || ') autorizou a entrada de ' || NEW.visitor_name || '.',
      'visitor',
      'normal',
      '/dashboard/access'
    );
  END LOOP;

  FOR admin_record IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role IN ('administrador', 'sindico')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      admin_record.user_id,
      'Nova Autorização de Visitante',
      'O morador ' || COALESCE(resident_name, 'Desconhecido') || ' (Unidade ' || COALESCE(unit_number, '?') || ') autorizou a entrada de ' || NEW.visitor_name || '.',
      'visitor',
      'normal',
      '/dashboard/access'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;