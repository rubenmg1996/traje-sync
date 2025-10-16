-- Crear tabla de productos
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
  talla TEXT,
  color TEXT,
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  imagen_url TEXT,
  woocommerce_id TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Todos los autenticados pueden ver productos
CREATE POLICY "Anyone authenticated can view products"
ON public.productos
FOR SELECT
USING (true);

-- Solo admins pueden insertar productos
CREATE POLICY "Admins can insert products"
ON public.productos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Solo admins pueden actualizar productos
CREATE POLICY "Admins can update products"
ON public.productos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Solo admins pueden eliminar productos
CREATE POLICY "Admins can delete products"
ON public.productos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_productos_updated_at
BEFORE UPDATE ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para detectar stock bajo y crear notificación
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para detectar stock bajo
CREATE TRIGGER check_low_stock_trigger
AFTER INSERT OR UPDATE OF stock_actual, stock_minimo
ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock();

-- Crear bucket de storage para imágenes de productos
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: Todos pueden ver imágenes
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'productos');

-- Solo admins pueden subir imágenes
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Solo admins pueden actualizar imágenes
CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Solo admins pueden eliminar imágenes
CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'productos' AND
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);