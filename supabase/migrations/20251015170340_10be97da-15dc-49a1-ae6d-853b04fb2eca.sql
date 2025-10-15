-- Corregir función validate_clocking con search_path
CREATE OR REPLACE FUNCTION validate_clocking()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_clocking RECORD;
  schedule RECORD;
  notification_msg TEXT;
BEGIN
  -- Obtener el último fichaje del empleado
  SELECT * INTO last_clocking
  FROM clockings
  WHERE employee_id = NEW.employee_id
    AND id != NEW.id
  ORDER BY fecha_hora DESC
  LIMIT 1;

  -- Validar que no haya dos fichajes del mismo tipo consecutivos
  IF last_clocking.tipo = NEW.tipo THEN
    RAISE EXCEPTION 'No se puede registrar dos fichajes de % consecutivos', NEW.tipo;
  END IF;

  -- Obtener el horario configurado para este día
  SELECT * INTO schedule
  FROM work_schedules
  WHERE employee_id = NEW.employee_id
    AND dia_semana = EXTRACT(DOW FROM NEW.fecha_hora);

  -- Si hay horario configurado, validar tolerancia
  IF schedule IS NOT NULL THEN
    IF NEW.tipo = 'entrada' THEN
      -- Verificar si llega tarde
      IF NEW.fecha_hora::TIME > (schedule.hora_entrada + (schedule.tolerancia_minutos || ' minutes')::INTERVAL) THEN
        notification_msg := 'Fichaje de entrada tardío: ' || 
          TO_CHAR(NEW.fecha_hora, 'HH24:MI') || ' (esperado: ' || 
          TO_CHAR(schedule.hora_entrada, 'HH24:MI') || ')';
        
        INSERT INTO notifications (employee_id, tipo, mensaje, clocking_id)
        VALUES (NEW.employee_id, 'fichaje_tardio', notification_msg, NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Corregir función notify_clocking_correction con search_path
CREATE OR REPLACE FUNCTION notify_clocking_correction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_msg TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    notification_msg := 'Fichaje corregido: ' || 
      TO_CHAR(OLD.fecha_hora, 'DD/MM/YYYY HH24:MI') || ' → ' || 
      TO_CHAR(NEW.fecha_hora, 'DD/MM/YYYY HH24:MI');
    
    INSERT INTO notifications (employee_id, tipo, mensaje, clocking_id)
    VALUES (NEW.employee_id, 'fichaje_corregido', notification_msg, NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    notification_msg := 'Fichaje eliminado: ' || 
      TO_CHAR(OLD.fecha_hora, 'DD/MM/YYYY HH24:MI');
    
    INSERT INTO notifications (employee_id, tipo, mensaje)
    VALUES (OLD.employee_id, 'fichaje_corregido', notification_msg);
  END IF;

  RETURN NEW;
END;
$$;