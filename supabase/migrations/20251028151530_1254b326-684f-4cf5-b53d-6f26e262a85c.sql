-- Crear tabla de facturas
CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holded_id TEXT,
  encargo_id UUID REFERENCES public.encargos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'factura' CHECK (tipo IN ('factura', 'albaran')),
  numero_documento TEXT,
  nombre_cliente TEXT NOT NULL,
  correo_cliente TEXT,
  telefono_cliente TEXT,
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'pagada', 'cancelada')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para facturas
CREATE POLICY "Usuarios autenticados pueden ver facturas"
  ON public.facturas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins pueden insertar facturas"
  ON public.facturas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'administrador'
      AND activo = true
    )
  );

CREATE POLICY "Admins pueden actualizar facturas"
  ON public.facturas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'administrador'
      AND activo = true
    )
  );

CREATE POLICY "Admins pueden eliminar facturas"
  ON public.facturas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'administrador'
      AND activo = true
    )
  );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_facturas_encargo_id ON public.facturas(encargo_id);
CREATE INDEX idx_facturas_estado ON public.facturas(estado);
CREATE INDEX idx_facturas_fecha_emision ON public.facturas(fecha_emision DESC);