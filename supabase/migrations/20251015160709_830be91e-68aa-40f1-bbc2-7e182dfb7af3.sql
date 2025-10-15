-- Eliminar políticas existentes de employees
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;

-- Crear nuevas políticas que verifican el email del usuario autenticado
CREATE POLICY "Admins can insert employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = auth.jwt()->>'email' 
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can update employees" 
ON public.employees 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = auth.jwt()->>'email' 
    AND rol = 'administrador'
    AND activo = true
  )
);

CREATE POLICY "Admins can delete employees" 
ON public.employees 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = auth.jwt()->>'email' 
    AND rol = 'administrador'
    AND activo = true
  )
);