-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'site',
  -- Datos de la tienda
  store_name TEXT,
  store_email TEXT,
  store_phone TEXT,
  store_address TEXT,
  tax_id TEXT,
  
  -- WooCommerce
  woo_url TEXT,
  woo_consumer_key TEXT,
  woo_consumer_secret TEXT,
  
  -- Twilio WhatsApp
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_whatsapp_from TEXT,
  notification_recipients JSONB DEFAULT '[]'::jsonb,
  
  -- Holded
  holded_api_key TEXT,
  
  -- Ajustes de la app
  default_stock_min INTEGER DEFAULT 5,
  sync_auto BOOLEAN DEFAULT FALSE,
  sync_interval TEXT DEFAULT 'off', -- off, 6h, 12h, 24h
  
  -- Templates y otros
  templates JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de logs de sincronización
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'woocommerce', 'twilio', 'holded'
  action TEXT NOT NULL, -- 'sync', 'test_connection', 'send_notification', etc.
  success BOOLEAN NOT NULL,
  message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden leer settings
CREATE POLICY "Admins can view settings"
ON public.settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = auth.jwt() ->> 'email'
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Solo administradores pueden insertar/actualizar settings
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = auth.jwt() ->> 'email'
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Habilitar RLS en sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Solo administradores pueden ver logs
CREATE POLICY "Admins can view sync_logs"
ON public.sync_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE email = auth.jwt() ->> 'email'
    AND rol = 'administrador'
    AND activo = true
  )
);

-- Sistema puede insertar logs
CREATE POLICY "System can insert sync_logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (true);

-- Trigger para actualizar updated_at en settings
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar configuración inicial si no existe
INSERT INTO public.settings (id, store_name, default_stock_min, sync_auto, sync_interval)
VALUES ('site', 'Tienda', 5, false, 'off')
ON CONFLICT (id) DO NOTHING;