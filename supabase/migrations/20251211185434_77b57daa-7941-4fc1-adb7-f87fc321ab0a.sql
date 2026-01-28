
-- =============================================
-- 1. TRIGGER PARA ENCOMENDAS (packages)
-- Quando porteiro registra → Notifica morador da unidade
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_package_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unit_number TEXT;
  resident_record RECORD;
BEGIN
  -- Buscar número da unidade
  SELECT u.unit_number INTO unit_number
  FROM units u
  WHERE u.id = NEW.unit_id;

  -- Notificar todos os moradores da unidade
  FOR resident_record IN 
    SELECT r.user_id 
    FROM residents r 
    WHERE r.unit_id = NEW.unit_id AND r.is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      resident_record.user_id,
      'Nova Encomenda Recebida',
      'Uma encomenda de ' || COALESCE(NEW.sender, 'remetente não informado') || ' foi recebida na portaria para a Unidade ' || COALESCE(unit_number, '?') || '.',
      'package',
      'normal',
      '/dashboard/resident'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_package_created ON packages;
CREATE TRIGGER on_package_created
  AFTER INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_package_received();

-- =============================================
-- 2. TRIGGERS PARA RESERVAS (reservations)
-- =============================================

-- 2a. Morador cria reserva → Notifica admin/síndico
CREATE OR REPLACE FUNCTION public.notify_reservation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_name TEXT;
  unit_number TEXT;
  area_name TEXT;
  admin_record RECORD;
BEGIN
  -- Buscar informações
  SELECT p.full_name, u.unit_number INTO resident_name, unit_number
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.resident_id;

  SELECT ca.name INTO area_name
  FROM common_areas ca
  WHERE ca.id = NEW.common_area_id;

  -- Notificar administradores e síndicos
  FOR admin_record IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role IN ('administrador', 'sindico')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      admin_record.user_id,
      'Nova Solicitação de Reserva',
      'O morador ' || COALESCE(resident_name, 'Desconhecido') || ' (Unidade ' || COALESCE(unit_number, '?') || ') solicitou reserva do(a) ' || COALESCE(area_name, 'área comum') || ' para ' || TO_CHAR(NEW.reservation_date, 'DD/MM/YYYY') || '.',
      'reservation',
      'normal',
      '/dashboard/reservations'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reservation_created ON reservations;
CREATE TRIGGER on_reservation_created
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_created();

-- 2b. Admin atualiza status da reserva → Notifica morador
CREATE OR REPLACE FUNCTION public.notify_reservation_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_user_id UUID;
  area_name TEXT;
  status_text TEXT;
BEGIN
  -- Só executa se o status mudou
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar user_id do morador
  SELECT r.user_id INTO resident_user_id
  FROM residents r
  WHERE r.id = NEW.resident_id;

  -- Buscar nome da área
  SELECT ca.name INTO area_name
  FROM common_areas ca
  WHERE ca.id = NEW.common_area_id;

  -- Traduzir status
  CASE NEW.status
    WHEN 'aprovada' THEN status_text := 'APROVADA';
    WHEN 'rejeitada' THEN status_text := 'REJEITADA';
    WHEN 'cancelada' THEN status_text := 'CANCELADA';
    ELSE status_text := NEW.status;
  END CASE;

  -- Notificar morador
  IF resident_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      resident_user_id,
      'Atualização de Reserva',
      'Sua reserva do(a) ' || COALESCE(area_name, 'área comum') || ' para ' || TO_CHAR(NEW.reservation_date, 'DD/MM/YYYY') || ' foi ' || status_text || '.',
      'reservation',
      CASE WHEN NEW.status = 'rejeitada' THEN 'high' ELSE 'normal' END,
      '/dashboard/resident'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reservation_status_changed ON reservations;
CREATE TRIGGER on_reservation_status_changed
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation_status_changed();

-- =============================================
-- 3. TRIGGERS PARA OCORRÊNCIAS (maintenance_requests)
-- =============================================

-- 3a. Morador abre ocorrência → Notifica admin/síndico
CREATE OR REPLACE FUNCTION public.notify_maintenance_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_name TEXT;
  unit_number TEXT;
  admin_record RECORD;
BEGIN
  -- Buscar informações (se tiver resident_id)
  IF NEW.resident_id IS NOT NULL THEN
    SELECT p.full_name, u.unit_number INTO resident_name, unit_number
    FROM residents r
    JOIN profiles p ON r.user_id = p.id
    JOIN units u ON r.unit_id = u.id
    WHERE r.id = NEW.resident_id;
  END IF;

  -- Notificar administradores e síndicos
  FOR admin_record IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role IN ('administrador', 'sindico')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      admin_record.user_id,
      'Nova Ocorrência Registrada',
      CASE 
        WHEN resident_name IS NOT NULL THEN 
          'O morador ' || resident_name || ' (Unidade ' || COALESCE(unit_number, '?') || ') registrou: ' || NEW.title
        ELSE 
          'Nova ocorrência registrada: ' || NEW.title
      END,
      'maintenance',
      CASE NEW.priority WHEN 'urgente' THEN 'urgent' WHEN 'alta' THEN 'high' ELSE 'normal' END,
      '/dashboard/maintenance'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_created ON maintenance_requests;
CREATE TRIGGER on_maintenance_created
  AFTER INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_maintenance_created();

-- 3b. Admin atualiza status → Notifica morador
CREATE OR REPLACE FUNCTION public.notify_maintenance_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_user_id UUID;
  status_text TEXT;
BEGIN
  -- Só executa se o status mudou e tem resident_id
  IF OLD.status = NEW.status OR NEW.resident_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar user_id do morador
  SELECT r.user_id INTO resident_user_id
  FROM residents r
  WHERE r.id = NEW.resident_id;

  -- Traduzir status
  CASE NEW.status
    WHEN 'em_andamento' THEN status_text := 'EM ANDAMENTO';
    WHEN 'concluido' THEN status_text := 'CONCLUÍDA';
    WHEN 'cancelado' THEN status_text := 'CANCELADA';
    ELSE status_text := UPPER(NEW.status);
  END CASE;

  -- Notificar morador
  IF resident_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      resident_user_id,
      'Atualização de Ocorrência',
      'Sua ocorrência "' || NEW.title || '" foi atualizada para: ' || status_text || '.',
      'maintenance',
      'normal',
      '/dashboard/resident'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_status_changed ON maintenance_requests;
CREATE TRIGGER on_maintenance_status_changed
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_maintenance_status_changed();

-- =============================================
-- 4. TRIGGER PARA COBRANÇAS (financial_charges)
-- Admin cria cobrança → Notifica morador da unidade
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_financial_charge_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unit_number TEXT;
  resident_record RECORD;
  charge_type_text TEXT;
BEGIN
  -- Buscar número da unidade
  SELECT u.unit_number INTO unit_number
  FROM units u
  WHERE u.id = NEW.unit_id;

  -- Traduzir tipo de cobrança
  CASE NEW.charge_type
    WHEN 'condominio' THEN charge_type_text := 'Taxa de Condomínio';
    WHEN 'extra' THEN charge_type_text := 'Taxa Extra';
    WHEN 'multa' THEN charge_type_text := 'Multa';
    ELSE charge_type_text := NEW.charge_type;
  END CASE;

  -- Notificar todos os moradores da unidade
  FOR resident_record IN 
    SELECT r.user_id 
    FROM residents r 
    WHERE r.unit_id = NEW.unit_id AND r.is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, priority, link)
    VALUES (
      resident_record.user_id,
      'Nova Cobrança Gerada',
      charge_type_text || ' no valor de R$ ' || TO_CHAR(NEW.amount, 'FM999G999D00') || ' com vencimento em ' || TO_CHAR(NEW.due_date, 'DD/MM/YYYY') || '.',
      'financial',
      'high',
      '/dashboard/resident-financial'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_financial_charge_created ON financial_charges;
CREATE TRIGGER on_financial_charge_created
  AFTER INSERT ON financial_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_financial_charge_created();
