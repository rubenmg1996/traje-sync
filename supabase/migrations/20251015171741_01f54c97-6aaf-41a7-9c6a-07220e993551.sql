-- Crear tabla de incidencias
CREATE TABLE public.incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'resuelta')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  creado_por UUID NOT NULL,
  asignado_a UUID,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

-- Política: Empleados pueden ver sus propias incidencias
CREATE POLICY "Empleados ven sus propias incidencias"
ON public.incidencias
FOR SELECT
USING (
  creado_por IN (
    SELECT id FROM employees WHERE email = (auth.jwt() ->> 'email'::text)
  )
  OR
  asignado_a IN (
    SELECT id FROM employees WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Política: Administradores ven todas las incidencias
CREATE POLICY "Admins ven todas las incidencias"
ON public.incidencias
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email'::text) 
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Política: Empleados pueden crear sus propias incidencias
CREATE POLICY "Empleados pueden crear incidencias"
ON public.incidencias
FOR INSERT
WITH CHECK (
  creado_por IN (
    SELECT id FROM employees WHERE email = (auth.jwt() ->> 'email'::text) AND activo = true
  )
);

-- Política: Admins pueden actualizar todas las incidencias
CREATE POLICY "Admins pueden actualizar incidencias"
ON public.incidencias
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email'::text) 
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Política: Empleados pueden actualizar sus propias incidencias
CREATE POLICY "Empleados pueden actualizar sus incidencias"
ON public.incidencias
FOR UPDATE
USING (
  creado_por IN (
    SELECT id FROM employees WHERE email = (auth.jwt() ->> 'email'::text) AND activo = true
  )
);

-- Política: Admins pueden eliminar incidencias
CREATE POLICY "Admins pueden eliminar incidencias"
ON public.incidencias
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = (auth.jwt() ->> 'email'::text) 
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_incidencias_updated_at
BEFORE UPDATE ON public.incidencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar el rendimiento
CREATE INDEX idx_incidencias_estado ON public.incidencias(estado);
CREATE INDEX idx_incidencias_prioridad ON public.incidencias(prioridad);
CREATE INDEX idx_incidencias_creado_por ON public.incidencias(creado_por);
CREATE INDEX idx_incidencias_asignado_a ON public.incidencias(asignado_a);