import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    productos?: {
      nombre: string;
      precio: number;
    };
  }>;
  notas?: string;
  fechaCreacion?: string;
  tipoEntrega?: string;
  direccionEnvio?: string;
  fechaEntregaEstimada?: string;
  encargoId?: string;
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
      productos = [],
      notas,
      fechaCreacion,
      tipoEntrega,
      direccionEnvio,
      fechaEntregaEstimada,
      encargoId
    }: NotificationRequest = await req.json();
    console.log('Request data:', { clienteNombre, clienteTelefono, clienteEmail, numeroEncargo, estado });

    // Obtener configuración de destinatarios desde settings
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

    // Helper para normalizar teléfonos españoles
    const normalizePhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '');
      
      // Si empieza con 0034, quitar y añadir +34
      if (digits.startsWith('0034')) {
        return `whatsapp:+34${digits.slice(4)}`;
      }
      
      // Si empieza con 34, añadir +
      if (digits.startsWith('34') && digits.length > 9) {
        return `whatsapp:+${digits}`;
      }
      
      // Si empieza con 0 o tiene 9 dígitos, asumir España y añadir +34
      if (digits.startsWith('0')) {
        return `whatsapp:+34${digits.slice(1)}`;
      }
      
      if (digits.length === 9 && !digits.startsWith('34')) {
        return `whatsapp:+34${digits}`;
      }
      
      // Si ya tiene prefijo internacional, usarlo
      if (digits.startsWith('+') || phone.startsWith('+')) {
        return `whatsapp:${phone.startsWith('+') ? phone : '+' + digits}`;
      }
      
      return `whatsapp:+34${digits}`;
    };

    // Preparar destinatarios: SOLO destinatarios administrativos (NO clientes)
    const recipientsSet = new Set<string>();
    
    // Añadir destinatarios administrativos desde settings
    if (settings?.notification_recipients && Array.isArray(settings.notification_recipients)) {
      settings.notification_recipients.forEach((phone: string) => {
        if (phone && phone.trim()) {
          // Limpiar cualquier prefijo "whatsapp:" que pudiera venir
          const cleanPhone = phone.replace(/^whatsapp:\s*/i, '').trim();
          if (cleanPhone) {
            recipientsSet.add(normalizePhone(cleanPhone));
          }
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

    // Mensajes SOLO para administradores
    let message = '';
    const tipoEntregaTexto = tipoEntrega === 'domicilio' ? '🚚 Envío a domicilio' : '📍 Recoger en tienda';
    const fechaEstimada = fechaEntregaEstimada ? `\nFecha estimada: ${new Date(fechaEntregaEstimada).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
    
    if (estado === 'pendiente') {
      let productosTexto = '';
      if (productos && productos.length > 0) {
        productosTexto = '\n\nProductos:\n' + productos.map(p => {
          const nombreProducto = p.productos?.nombre || 'Producto';
          return `• ${nombreProducto} (x${p.cantidad}) - €${(p.precio_unitario * p.cantidad).toFixed(2)}`;
        }).join('\n');
      }
      
      message = `📋 Nuevo encargo ${numeroEncargo}\n\nCliente: ${clienteNombre}\n${tipoEntregaTexto}${fechaEstimada}${direccionEnvio ? `\nDirección: ${direccionEnvio}` : ''}${productosTexto}\n\n💰 Total: €${precioTotal ? precioTotal.toFixed(2) : '0.00'}`;
    } else if (estado === 'entregado') {
      message = `✅ Encargo ${numeroEncargo} ENTREGADO\n\nCliente: ${clienteNombre}\n\n💰 Total: €${precioTotal ? precioTotal.toFixed(2) : '0.00'}`;
    } else if (estado === 'cancelado') {
      message = `❌ Encargo ${numeroEncargo} CANCELADO\n\nCliente: ${clienteNombre}`;
    } else if (estado === 'listo_recoger') {
      if (tipoEntrega === 'domicilio') {
        message = `📦 Encargo ${numeroEncargo} EN CAMINO\n\nCliente: ${clienteNombre}\n🚚 Dirección: ${direccionEnvio || 'No especificada'}`;
      } else {
        message = `✅ Encargo ${numeroEncargo} LISTO PARA RECOGER\n\nCliente: ${clienteNombre}\n📍 Recoger en tienda`;
      }
    } else {
      message = `📝 Encargo ${numeroEncargo} actualizado\n\nCliente: ${clienteNombre}\nEstado: ${estado}`;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const sendResults: Array<{ to: string; sid?: string; status: number; ok: boolean }> = [];
    const messageSids: string[] = [];

    console.log('Sending to Twilio:', twilioUrl);
    for (const to of recipients) {
      const formData = new URLSearchParams();
      formData.append('From', twilioWhatsappFrom);
      formData.append('To', to);
      formData.append('Body', message);

      console.log('Message to:', to);

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
        console.log('WhatsApp notification sent successfully:', data.sid, 'to', to);
        messageSids.push(data.sid);
        sendResults.push({ to, sid: data.sid, status: response.status, ok: true });
      } else {
        const errorText = await response.text();
        console.error('Error de Twilio:', errorText, 'for', to);
        sendResults.push({ to, status: response.status, ok: false });
      }
    }

    if (!messageSids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio error: no messages sent', results: sendResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Crear factura en Holded si el estado es "entregado"
    let holdedInvoiceId = null;
    if (estado === 'entregado' && encargoId) {
      try {
        const holdedApiKey = Deno.env.get('HOLDED_API_KEY');
        
        if (holdedApiKey) {
            console.log('Creating invoice in Holded...');
            
            // Preparar items para Holded
            const holdedItems = productos?.map(item => ({
              name: item.productos?.nombre || 'Producto',
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
              
              // Guardar factura en la base de datos usando el mismo cliente admin
              const { error: insertError } = await supabaseAdmin
                .from('facturas')
                .insert({
                  holded_id: holdedData.id,
                  encargo_id: encargoId,
                  tipo: 'factura',
                  numero_documento: holdedData.docNumber || numeroEncargo,
                  nombre_cliente: clienteNombre,
                  correo_cliente: clienteEmail,
                  telefono_cliente: clienteTelefono,
                  total: precioTotal || 0,
                  estado: 'emitida',
                  pdf_url: holdedData.pdfUrl,
                });

              if (insertError) {
                console.error('Error saving invoice to database:', insertError);
              } else {
                console.log('Invoice saved to database successfully');
              }
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
        messageSids,
        sentTo: recipients,
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