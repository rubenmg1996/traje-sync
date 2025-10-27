import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  numeroEncargo: string;
  estado: string;
  precioTotal?: number;
  productos?: Array<{
    cantidad: number;
    precio_unitario: number;
    observaciones?: string;
    productos: {
      nombre: string;
      precio: number;
    };
  }>;
  notas?: string;
  fechaCreacion?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Notify encargo status function invoked');
    const { 
      clienteNombre, 
      clienteTelefono, 
      clienteEmail,
      numeroEncargo, 
      estado,
      precioTotal,
      productos,
      notas,
      fechaCreacion
    }: NotificationRequest = await req.json();
    console.log('Request data:', { clienteNombre, clienteTelefono, clienteEmail, numeroEncargo, estado });

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
      message = `📦 Encargo ${numeroEncargo} ENTREGADO\n\nCliente: ${clienteNombre}\nTeléfono: ${formattedPhone}\n\n✅ El encargo ha sido entregado exitosamente.`;
    } else if (estado === 'cancelado') {
      message = `❌ Encargo ${numeroEncargo} CANCELADO\n\nCliente: ${clienteNombre}\nTeléfono: ${formattedPhone}\n\n⚠️ El encargo ha sido cancelado.`;
    } else if (estado === 'listo_recoger') {
      message = `✅ Encargo ${numeroEncargo} LISTO\n\nCliente: ${clienteNombre}\nTeléfono: ${formattedPhone}\n\n📍 El encargo está listo para recoger.`;
    } else {
      message = `🔔 Encargo ${numeroEncargo} - ${estado.toUpperCase()}\n\nCliente: ${clienteNombre}\nTeléfono: ${formattedPhone}\n\nCambio de estado registrado.`;
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

    // Crear factura en Holded si el estado es "entregado"
    let holdedInvoiceId = null;
    if (estado === 'entregado') {
      try {
        const holdedApiKey = Deno.env.get('HOLDED_API_KEY');
        
        if (holdedApiKey) {
          console.log('Creating invoice in Holded...');
          
          // Preparar items para Holded
          const holdedItems = productos?.map(item => ({
            name: item.productos.nombre,
            units: item.cantidad,
            subtotal: item.precio_unitario * item.cantidad,
            discount: 0,
            tax: 21, // IVA por defecto 21%
            desc: item.observaciones || ''
          })) || [];

          const holdedBody = {
            docType: 'invoice',
            contactName: clienteNombre,
            contactEmail: clienteEmail || '',
            date: Math.floor(new Date(fechaCreacion || Date.now()).getTime() / 1000),
            items: holdedItems,
            notes: notas || `Encargo ${numeroEncargo}`,
            invoiceNum: numeroEncargo
          };

          console.log('Holded request body:', JSON.stringify(holdedBody, null, 2));

          const holdedResponse = await fetch('https://api.holded.com/api/invoicing/v1/documents/invoice', {
            method: 'POST',
            headers: {
              'Key': holdedApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(holdedBody),
          });

          if (holdedResponse.ok) {
            const holdedData = await holdedResponse.json();
            holdedInvoiceId = holdedData.id;
            console.log('Holded invoice created successfully:', holdedInvoiceId);
          } else {
            const errorText = await holdedResponse.text();
            console.error('Error creating Holded invoice:', holdedResponse.status, errorText);
          }
        } else {
          console.log('Holded API key not configured, skipping invoice creation');
        }
      } catch (holdedError) {
        console.error('Error with Holded integration:', holdedError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: data.sid,
        holdedInvoiceId: holdedInvoiceId 
      }),
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
