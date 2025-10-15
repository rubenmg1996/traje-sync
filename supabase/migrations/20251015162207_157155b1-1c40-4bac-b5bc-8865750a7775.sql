-- Update RLS on clockings to use email-based checks instead of user_id
DROP POLICY IF EXISTS "Admins can insert any clocking" ON public.clockings;
DROP POLICY IF EXISTS "Employees can insert their own clockings" ON public.clockings;

-- Admins can insert any clocking (by email)
CREATE POLICY "Admins can insert any clocking" 
ON public.clockings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE email = auth.jwt()->>'email'
      AND rol = 'administrador'
      AND activo = true
  )
);

-- Employees can insert their own clockings (by email)
CREATE POLICY "Employees can insert their own clockings" 
ON public.clockings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = clockings.employee_id
      AND e.email = auth.jwt()->>'email'
      AND e.activo = true
  )
);
