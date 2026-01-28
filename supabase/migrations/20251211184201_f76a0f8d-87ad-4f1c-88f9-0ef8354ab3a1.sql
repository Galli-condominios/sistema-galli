-- Função para criar notificações quando uma autorização de visitante é criada
CREATE OR REPLACE FUNCTION public.notify_visitor_authorization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_name TEXT;
  unit_number TEXT;
  porteiro_record RECORD;
  admin_record RECORD;
BEGIN
  -- Buscar nome do morador e unidade
  SELECT p.full_name, u.unit_number INTO resident_name, unit_number
  FROM residents r
  JOIN profiles p ON r.user_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE r.id = NEW.resident_id;

  -- Notificar todos os porteiros
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
      '/dashboard/door-auth'
    );
  END LOOP;

  -- Notificar todos os administradores e síndicos
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
      '/dashboard/door-auth'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de autorização
DROP TRIGGER IF EXISTS on_visitor_authorization_created ON visitor_authorizations;
CREATE TRIGGER on_visitor_authorization_created
  AFTER INSERT ON visitor_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_visitor_authorization();