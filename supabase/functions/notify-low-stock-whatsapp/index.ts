import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  productName: string;
  currentStock: number;
  minStock: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Notify low stock WhatsApp function invoked');
    const { productName, currentStock, minStock }: NotificationRequest = await req.json();
    console.log('Request data:', { productName, currentStock, minStock });

    // Obtener configuración desde settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('notification_recipients')
      .eq('id', 'site')
      .single();

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

    console.log('Twilio config:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasFrom: !!twilioWhatsappFrom
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
      throw new Error('Credenciales de Twilio no configuradas');
    }

    // Helper para normalizar teléfonos españoles
    const normalizePhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '');
      
      if (digits.startsWith('0034')) {
        return `whatsapp:+34${digits.slice(4)}`;
      }
      
      if (digits.startsWith('34') && digits.length > 9) {
        return `whatsapp:+${digits}`;
      }
      
      if (digits.startsWith('0')) {
        return `whatsapp:+34${digits.slice(1)}`;
      }
      
      if (digits.length === 9 && !digits.startsWith('34')) {
        return `whatsapp:+34${digits}`;
      }
      
      if (digits.startsWith('+') || phone.startsWith('+')) {
        return `whatsapp:${phone.startsWith('+') ? phone : '+' + digits}`;
      }
      
      return `whatsapp:+34${digits}`;
    };

    // Obtener destinatarios administrativos desde settings
    const recipientsSet = new Set<string>();
    
    if (settings?.notification_recipients && Array.isArray(settings.notification_recipients)) {
      settings.notification_recipients.forEach((phone: string) => {
        if (phone && phone.trim()) {
          recipientsSet.add(normalizePhone(phone));
        }
      });
    }
    
    const recipients = Array.from(recipientsSet);
    
    if (recipients.length === 0) {
      console.warn('No recipients configured');
      return new Response(
        JSON.stringify({ success: false, error: 'No recipients configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const message = `⚠️ *ALERTA DE STOCK BAJO*\n\nProducto: ${productName}\nStock actual: ${currentStock} unidades\nStock mínimo: ${minStock} unidades\n\n¡Es necesario reabastecer!`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const sendResults: Array<{ to: string; sid?: string; status: number; ok: boolean }> = [];
    const messageSids: string[] = [];

    console.log('Sending to recipients:', recipients);

    for (const to of recipients) {
      const formData = new URLSearchParams();
      formData.append('From', twilioWhatsappFrom);
      formData.append('To', to);
      formData.append('Body', message);

      console.log('Sending message to:', to);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      console.log('Twilio response status:', response.status, 'for', to);

      if (response.ok) {
        const data = await response.json();
        console.log('WhatsApp sent successfully:', data.sid, 'to', to);
        messageSids.push(data.sid);
        sendResults.push({ to, sid: data.sid, status: response.status, ok: true });
      } else {
        const errorText = await response.text();
        console.error('Twilio error:', errorText, 'for', to);
        sendResults.push({ to, status: response.status, ok: false });
      }
    }

    // Registrar en sync_logs
    await supabaseAdmin.from('sync_logs').insert({
      source: 'twilio',
      action: 'low_stock_alert',
      success: messageSids.length > 0,
      message: messageSids.length > 0 
        ? `Alerta enviada a ${messageSids.length} destinatario(s)` 
        : 'No se pudo enviar alerta',
      details: { product: productName, currentStock, minStock, sentTo: recipients.length }
    });

    if (!messageSids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No messages sent', results: sendResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageSids, sentTo: recipients }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error en notify-low-stock-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
