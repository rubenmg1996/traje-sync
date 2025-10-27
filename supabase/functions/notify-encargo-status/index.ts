import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  clienteNombre: string;
  clienteTelefono?: string;
  numeroEncargo: string;
  estado: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Notify encargo status function invoked');
    const { clienteNombre, clienteTelefono, numeroEncargo, estado }: NotificationRequest = await req.json();
    console.log('Request data:', { clienteNombre, clienteTelefono, numeroEncargo, estado });

    // Si no hay teléfono, no podemos enviar WhatsApp
    if (!clienteTelefono) {
      console.log('No phone number provided, skipping WhatsApp notification');
      return new Response(
        JSON.stringify({ success: true, message: 'No phone number to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

    console.log('Twilio config:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasFrom: !!twilioWhatsappFrom,
      from: twilioWhatsappFrom
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
      console.error('Twilio credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Formatear número de teléfono para WhatsApp (debe incluir código de país)
    let formattedPhone = clienteTelefono.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+34' + formattedPhone; // Asume España si no tiene código
    }
    const twilioWhatsappTo = `whatsapp:${formattedPhone}`;

    let message = '';
    if (estado === 'entregado') {
      message = `Hola ${clienteNombre}! 🎉\n\nTu encargo ${numeroEncargo} está listo y ha sido entregado.\n\n¡Gracias por tu confianza!`;
    } else if (estado === 'listo_recoger') {
      message = `Hola ${clienteNombre}! ✅\n\nTu encargo ${numeroEncargo} está listo para recoger.\n\nPuedes pasar a buscarlo cuando quieras.`;
    } else {
      message = `Hola ${clienteNombre}!\n\nTu encargo ${numeroEncargo} ha cambiado de estado: ${estado}.\n\nGracias por tu paciencia.`;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsappFrom);
    formData.append('To', twilioWhatsappTo);
    formData.append('Body', message);

    console.log('Sending to Twilio:', twilioUrl);
    console.log('Message to:', twilioWhatsappTo);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('Twilio response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Twilio:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Twilio error: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    console.log('WhatsApp notification sent successfully:', data.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: data.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in notify-encargo-status function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
