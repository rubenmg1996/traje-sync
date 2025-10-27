-- Crear tipo enum para estados de encargo
CREATE TYPE estado_encargo AS ENUM ('pendiente', 'en_produccion', 'listo_recoger', 'entregado', 'cancelado');

-- Tabla principal de encargos
CREATE TABLE public.encargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_encargo TEXT UNIQUE NOT NULL DEFAULT 'ENC-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0'),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  cliente_email TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  estado estado_encargo NOT NULL DEFAULT 'pendiente',
  precio_total NUMERIC NOT NULL DEFAULT 0,
  notas TEXT,
  actualizado_por UUID REFERENCES employees(id),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de productos en encargos (relación muchos a muchos)
CREATE TABLE public.encargo_productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encargo_id UUID NOT NULL REFERENCES encargos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_encargos_estado ON encargos(estado);
CREATE INDEX idx_encargos_cliente ON encargos(cliente_nombre);
CREATE INDEX idx_encargos_fecha_creacion ON encargos(fecha_creacion DESC);
CREATE INDEX idx_encargo_productos_encargo ON encargo_productos(encargo_id);

-- Enable RLS
ALTER TABLE public.encargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encargo_productos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para encargos
CREATE POLICY "Anyone authenticated can view encargos"
ON public.encargos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert encargos"
ON public.encargos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can update encargos"
ON public.encargos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can delete encargos"
ON public.encargos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- RLS Policies para encargo_productos
CREATE POLICY "Anyone authenticated can view encargo_productos"
ON public.encargo_productos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert encargo_productos"
ON public.encargo_productos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can update encargo_productos"
ON public.encargo_productos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can delete encargo_productos"
ON public.encargo_productos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = (auth.jwt() ->> 'email')
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Trigger para actualizar updated_at en encargos
CREATE TRIGGER update_encargos_updated_at
BEFORE UPDATE ON public.encargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para descontar stock al marcar como entregado
CREATE OR REPLACE FUNCTION public.descontar_stock_encargo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el estado cambia a 'entregado', descontamos stock
  IF NEW.estado = 'entregado' AND OLD.estado != 'entregado' THEN
    UPDATE productos p
    SET stock_actual = stock_actual - ep.cantidad
    FROM encargo_productos ep
    WHERE ep.encargo_id = NEW.id
    AND p.id = ep.producto_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para descontar stock automáticamente
CREATE TRIGGER trigger_descontar_stock_encargo
AFTER UPDATE ON public.encargos
FOR EACH ROW
EXECUTE FUNCTION public.descontar_stock_encargo();