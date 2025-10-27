import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Notify WhatsApp function invoked');
    const { productName, currentStock, minStock }: NotificationRequest = await req.json();
    console.log('Request data:', { productName, currentStock, minStock });

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
    const twilioWhatsappTo = Deno.env.get('TWILIO_WHATSAPP_TO');

    console.log('Twilio config:', {
      hasSid: !!twilioAccountSid,
      hasToken: !!twilioAuthToken,
      hasFrom: !!twilioWhatsappFrom,
      hasTo: !!twilioWhatsappTo,
      from: twilioWhatsappFrom,
      to: twilioWhatsappTo
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom || !twilioWhatsappTo) {
      throw new Error('Credenciales de Twilio no configuradas');
    }

    const message = `⚠️ *ALERTA DE STOCK BAJO*\n\nProducto: ${productName}\nStock actual: ${currentStock} unidades\nStock mínimo: ${minStock} unidades\n\n¡Es necesario reabastecer!`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsappFrom);
    formData.append('To', twilioWhatsappTo);
    formData.append('Body', message);

    console.log('Sending to Twilio:', twilioUrl);
    console.log('Message body:', message);

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
      throw new Error(`Error al enviar WhatsApp: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('WhatsApp enviado exitosamente:', data.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: data.sid }),
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
