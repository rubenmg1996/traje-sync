-- Crear función para actualizar productos de un encargo (con SECURITY DEFINER para bypasear RLS)
CREATE OR REPLACE FUNCTION public.update_encargo_productos(
  p_encargo_id UUID,
  p_productos JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE email = auth.jwt() ->> 'email' 
    AND rol = 'administrador' 
    AND activo = true
  ) THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  -- Eliminar productos anteriores
  DELETE FROM encargo_productos
  WHERE encargo_id = p_encargo_id;

  -- Insertar nuevos productos si hay
  IF jsonb_array_length(p_productos) > 0 THEN
    INSERT INTO encargo_productos (encargo_id, producto_id, cantidad, precio_unitario, observaciones)
    SELECT 
      p_encargo_id,
      (producto->>'producto_id')::UUID,
      (producto->>'cantidad')::INTEGER,
      (producto->>'precio_unitario')::NUMERIC,
      producto->>'observaciones'
    FROM jsonb_array_elements(p_productos) AS producto;
  END IF;
END;
$$;