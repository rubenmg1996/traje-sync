-- Modificar función check_low_stock para enviar notificaciones de WhatsApp
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_employee RECORD;
  notification_msg TEXT;
BEGIN
  -- Si el stock actual cae por debajo del mínimo
  IF NEW.stock_actual < NEW.stock_minimo AND (OLD.stock_actual IS NULL OR OLD.stock_actual >= NEW.stock_minimo) THEN
    notification_msg := 'Stock bajo: "' || NEW.nombre || '" tiene ' || NEW.stock_actual || ' unidades (mínimo: ' || NEW.stock_minimo || ')';
    
    -- Crear notificación para cada administrador
    FOR admin_employee IN 
      SELECT id FROM employees WHERE rol = 'administrador' AND activo = true
    LOOP
      INSERT INTO notifications (employee_id, tipo, mensaje)
      VALUES (admin_employee.id, 'stock_bajo', notification_msg);
    END LOOP;

    -- Enviar notificación de WhatsApp
    PERFORM net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-low-stock-whatsapp'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
      ),
      body := jsonb_build_object(
        'productName', NEW.nombre,
        'currentStock', NEW.stock_actual,
        'minStock', NEW.stock_minimo
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;