-- Crear tabla de configuración de horarios laborales
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  tolerancia_minutos INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, dia_semana)
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fichaje_tardio', 'fichaje_inconsistente', 'fichaje_olvidado', 'fichaje_corregido')),
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT false,
  clocking_id UUID REFERENCES public.clockings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para work_schedules
CREATE POLICY "Todos pueden ver horarios"
  ON public.work_schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins pueden gestionar horarios"
  ON public.work_schedules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email') 
    AND rol = 'administrador' 
    AND activo = true
  ));

-- Políticas para notifications
CREATE POLICY "Usuarios ven sus propias notificaciones"
  ON public.notifications FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins ven todas las notificaciones"
  ON public.notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email') 
    AND rol = 'administrador' 
    AND activo = true
  ));

CREATE POLICY "Sistema puede crear notificaciones"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sus notificaciones"
  ON public.notifications FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE email = (auth.jwt() ->> 'email')
    )
  );

-- Agregar políticas para actualizar y eliminar fichajes (solo admins)
CREATE POLICY "Admins pueden actualizar fichajes"
  ON public.clockings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email') 
    AND rol = 'administrador' 
    AND activo = true
  ));

CREATE POLICY "Admins pueden eliminar fichajes"
  ON public.clockings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email') 
    AND rol = 'administrador' 
    AND activo = true
  ));

-- Función para validar fichajes
CREATE OR REPLACE FUNCTION validate_clocking()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para validar fichajes
DROP TRIGGER IF EXISTS validate_clocking_trigger ON clockings;
CREATE TRIGGER validate_clocking_trigger
  BEFORE INSERT OR UPDATE ON clockings
  FOR EACH ROW
  EXECUTE FUNCTION validate_clocking();

-- Función para notificar cuando se corrige un fichaje
CREATE OR REPLACE FUNCTION notify_clocking_correction()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para notificar correcciones
DROP TRIGGER IF EXISTS notify_correction_trigger ON clockings;
CREATE TRIGGER notify_correction_trigger
  AFTER UPDATE OR DELETE ON clockings
  FOR EACH ROW
  EXECUTE FUNCTION notify_clocking_correction();

-- Trigger para updated_at en work_schedules
DROP TRIGGER IF EXISTS update_work_schedules_updated_at ON work_schedules;
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();