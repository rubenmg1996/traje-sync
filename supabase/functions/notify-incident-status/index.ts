import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  incidenciaId?: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_curso' | 'resuelta';
  creadoPorNombre?: string;
  creadoPorTelefono?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Notify incident status function invoked');
    const {
      incidenciaId,
      titulo,
      descripcion,
      prioridad,
      estado,
      creadoPorNombre,
      creadoPorTelefono
    }: NotificationRequest = await req.json();
    
    console.log('Request data:', { incidenciaId, titulo, prioridad, estado });

    // Solo enviar notificación si prioridad es alta
    if (prioridad !== 'alta') {
      return new Response(
        JSON.stringify({ success: true, message: 'No notification needed for non-high priority' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Obtener configuración desde settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('notification_recipients, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from')
      .eq('id', 'site')
      .single();

    const twilioAccountSid = settings?.twilio_account_sid;
    const twilioAuthToken = settings?.twilio_auth_token;
    const twilioWhatsappFrom = settings?.twilio_whatsapp_from;

    console.log('Twilio config:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasFrom: !!twilioWhatsappFrom
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
      console.error('Twilio credentials not configured');
      await supabaseAdmin.from('sync_logs').insert({
        source: 'twilio',
        action: 'incident_alert',
        success: false,
        message: 'Credenciales de Twilio no configuradas',
        details: { incidenciaId, titulo, prioridad }
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Helper para normalizar teléfonos
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

    // Obtener destinatarios administrativos (solo admins para incidencias)
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
      await supabaseAdmin.from('sync_logs').insert({
        source: 'twilio',
        action: 'incident_alert',
        success: false,
        message: 'No hay destinatarios configurados',
        details: { incidenciaId, titulo, prioridad }
      });
      
      return new Response(
        JSON.stringify({ success: false, error: 'No recipients configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Preparar mensaje
    const estadoEmoji = estado === 'pendiente' ? '🆕' : estado === 'en_curso' ? '⚙️' : '✅';
    const creadoPor = creadoPorNombre ? `\nReportado por: ${creadoPorNombre}` : '';
    
    const message = `🚨 *INCIDENCIA PRIORIDAD ALTA*\n\n${estadoEmoji} ${titulo}\n\n${descripcion}${creadoPor}\n\nEstado: ${estado}\n\n¡Requiere atención inmediata!`;

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
      action: 'incident_alert',
      success: messageSids.length > 0,
      message: messageSids.length > 0 
        ? `Alerta de incidencia enviada a ${messageSids.length} destinatario(s)` 
        : 'No se pudo enviar alerta de incidencia',
      details: { 
        incidenciaId, 
        titulo, 
        prioridad, 
        estado, 
        sentTo: recipients.length,
        successCount: messageSids.length 
      }
    });

    if (!messageSids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No messages sent', results: sendResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSids, 
        sentTo: recipients 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in notify-incident-status function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
