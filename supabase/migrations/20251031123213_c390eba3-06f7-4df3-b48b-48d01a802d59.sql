-- Remove sensitive API credentials from settings table
-- These are now stored securely in Supabase secrets

ALTER TABLE public.settings 
DROP COLUMN IF EXISTS woo_consumer_key,
DROP COLUMN IF EXISTS woo_consumer_secret,
DROP COLUMN IF EXISTS twilio_account_sid,
DROP COLUMN IF EXISTS twilio_auth_token,
DROP COLUMN IF EXISTS twilio_whatsapp_from,
DROP COLUMN IF EXISTS holded_api_key;

COMMENT ON TABLE public.settings IS 'Application settings. Sensitive API credentials are stored in Supabase secrets, not in this table.';