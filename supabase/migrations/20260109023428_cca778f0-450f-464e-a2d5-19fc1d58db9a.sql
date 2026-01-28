-- Trigger para notificar vizinho quando mediação é criada
CREATE OR REPLACE FUNCTION public.notify_mediation_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requester_name TEXT;
  requester_unit TEXT;
  target_resident RECORD;
BEGIN
  -- Buscar nome do solicitante
  SELECT p.full_name, u.unit_number INTO requester_name, requester_unit
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.requester_resident_id;

  -- Notificar todos os moradores da unidade alvo
  FOR target_resident IN 
    SELECT r.user_id 
    FROM residents r 
    WHERE r.unit_id = NEW.target_unit_id AND r.is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      target_resident.user_id,
      'Nova Mediação Recebida',
      'O morador da Unidade ' || COALESCE(requester_unit, '?') || ' iniciou uma mediação. Motivo: ' || LEFT(NEW.complaint_reason, 100) || CASE WHEN LENGTH(NEW.complaint_reason) > 100 THEN '...' ELSE '' END,
      'mediation',
      'high',
      '/dashboard/maintenance'
    );
  END LOOP;

  -- Notificar administradores e síndicos
  INSERT INTO notifications (user_id, title, message, type, priority, link)
  SELECT 
    ur.user_id,
    'Nova Mediação entre Vizinhos',
    'Nova mediação iniciada pelo morador ' || COALESCE(requester_name, 'Desconhecido') || ' (Unidade ' || COALESCE(requester_unit, '?') || ').',
    'mediation',
    'normal',
    '/dashboard/maintenance'
  FROM user_roles ur 
  WHERE ur.role IN ('administrador', 'sindico');

  RETURN NEW;
END;
$function$;

-- Trigger para notificar quando síndico é acionado
CREATE OR REPLACE FUNCTION public.notify_mediation_syndic_requested()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requester_name TEXT;
  requester_unit TEXT;
  target_unit TEXT;
BEGIN
  -- Só executa se syndic_intervention_requested mudou para true
  IF OLD.syndic_intervention_requested = NEW.syndic_intervention_requested OR NEW.syndic_intervention_requested = false THEN
    RETURN NEW;
  END IF;

  -- Buscar informações
  SELECT p.full_name, u.unit_number INTO requester_name, requester_unit
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.requester_resident_id;

  SELECT u.unit_number INTO target_unit
  FROM units u
  WHERE u.id = NEW.target_unit_id;

  -- Notificar administradores e síndicos com prioridade urgente
  INSERT INTO notifications (user_id, title, message, type, priority, link)
  SELECT 
    ur.user_id,
    'Intervenção do Síndico Solicitada',
    'A mediação entre Unidades ' || COALESCE(requester_unit, '?') || ' e ' || COALESCE(target_unit, '?') || ' requer sua intervenção. Prazo expirado sem resolução.',
    'mediation',
    'urgent',
    '/dashboard/maintenance'
  FROM user_roles ur 
  WHERE ur.role IN ('administrador', 'sindico');

  RETURN NEW;
END;
$function$;

-- Trigger para notificar quando resposta é adicionada
CREATE OR REPLACE FUNCTION public.notify_mediation_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requester_user_id UUID;
  responder_name TEXT;
  responder_unit TEXT;
BEGIN
  -- Buscar user_id do solicitante
  SELECT r.user_id INTO requester_user_id
  FROM mediation_responses mr
  JOIN neighbor_mediations nm ON nm.id = NEW.mediation_id
  JOIN residents r ON r.id = nm.requester_resident_id
  WHERE mr.id = NEW.id;

  -- Buscar nome do respondente
  SELECT p.full_name, u.unit_number INTO responder_name, responder_unit
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.responder_resident_id;

  -- Notificar o solicitante
  IF requester_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      requester_user_id,
      'Nova Resposta na Mediação',
      'O morador da Unidade ' || COALESCE(responder_unit, '?') || ' respondeu à sua mediação.',
      'mediation',
      'normal',
      '/dashboard/maintenance'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger para notificar quando mediação é resolvida
CREATE OR REPLACE FUNCTION public.notify_mediation_resolved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requester_user_id UUID;
  target_resident RECORD;
BEGIN
  -- Só executa se o status mudou para resolvido
  IF OLD.status = NEW.status OR NEW.status != 'resolvido' THEN
    RETURN NEW;
  END IF;

  -- Buscar user_id do solicitante
  SELECT r.user_id INTO requester_user_id
  FROM residents r
  WHERE r.id = NEW.requester_resident_id;

  -- Notificar solicitante
  IF requester_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      requester_user_id,
      'Mediação Resolvida',
      'A mediação foi marcada como resolvida. Obrigado pela colaboração!',
      'mediation',
      'normal',
      '/dashboard/maintenance'
    );
  END IF;

  -- Notificar moradores da unidade alvo
  FOR target_resident IN 
    SELECT r.user_id 
    FROM residents r 
    WHERE r.unit_id = NEW.target_unit_id AND r.is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      target_resident.user_id,
      'Mediação Resolvida',
      'A mediação foi marcada como resolvida. Obrigado pela colaboração!',
      'mediation',
      'normal',
      '/dashboard/maintenance'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Criar os triggers
CREATE TRIGGER on_mediation_created
  AFTER INSERT ON public.neighbor_mediations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mediation_created();

CREATE TRIGGER on_mediation_syndic_requested
  AFTER UPDATE ON public.neighbor_mediations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mediation_syndic_requested();

CREATE TRIGGER on_mediation_resolved
  AFTER UPDATE ON public.neighbor_mediations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mediation_resolved();

CREATE TRIGGER on_mediation_response_created
  AFTER INSERT ON public.mediation_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mediation_response();