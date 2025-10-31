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
      .select('notification_recipients, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from, holded_api_key')
      .eq('id', 'site')
      .single();

    const twilioAccountSid = settings?.twilio_account_sid || Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = settings?.twilio_auth_token || Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappFrom = settings?.twilio_whatsapp_from || Deno.env.get('TWILIO_WHATSAPP_FROM');

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

    // Devolver stock si el encargo se cancela
    if (estado === 'cancelado' && encargoId) {
      try {
        console.log('Devolviendo stock para encargo cancelado:', encargoId);
        
        // Obtener productos del encargo
        const { data: encargoProductos, error: epError } = await supabaseAdmin
          .from('encargo_productos')
          .select('producto_id, cantidad')
          .eq('encargo_id', encargoId);

        if (epError) {
          console.error('Error obteniendo productos del encargo:', epError);
        } else if (encargoProductos && encargoProductos.length > 0) {
          console.log('Productos a devolver stock:', encargoProductos.length);

          for (const ep of encargoProductos) {
            // Obtener stock actual del producto
            const { data: producto, error: prodError } = await supabaseAdmin
              .from('productos')
              .select('id, nombre, stock_actual')
              .eq('id', ep.producto_id)
              .single();

            if (prodError) {
              console.error('Error obteniendo producto:', prodError);
              continue;
            }

            const stockAnterior = producto.stock_actual ?? 0;
            const nuevoStock = stockAnterior + ep.cantidad;

            console.log(`Devolviendo stock de ${producto.nombre}: ${stockAnterior} + ${ep.cantidad} = ${nuevoStock}`);

            // Devolver stock
            const { error: updateError } = await supabaseAdmin
              .from('productos')
              .update({ stock_actual: nuevoStock })
              .eq('id', ep.producto_id);

            if (updateError) {
              console.error('Error devolviendo stock:', updateError);
              continue;
            }
          }
        }
      } catch (stockError) {
        console.error('Error en devolución de stock:', stockError);
        // Non-blocking, continuamos con la notificación
      }
    }

    // Crear factura en Holded si el estado es "entregado" o "listo_recoger"
    let holdedInvoiceId: string | null = null;
    let holdedErrorMsg: string | null = null;
    if ((estado === 'entregado' || estado === 'listo_recoger') && encargoId) {
      try {
        const holdedApiKey = settings?.holded_api_key || Deno.env.get('HOLDED_API_KEY');
        
        if (holdedApiKey) {
          console.log('Creating invoice in Holded... (key source:', settings?.holded_api_key ? 'settings' : 'env', ')');

          // 1) Cargar datos completos del encargo si no vienen en el body
          let encargo:
            | {
                numero_encargo: string | null;
                cliente_nombre: string | null;
                cliente_email: string | null;
                cliente_telefono: string | null;
                fecha_creacion: string | null;
                precio_total: number | null;
                notas: string | null;
                encargo_productos: Array<{
                  cantidad: number;
                  precio_unitario: number | null;
                  observaciones: string | null;
                  productos: { nombre: string | null; precio: number | null } | null;
                }>;
              }
            | null = null;

          try {
            const { data: encargoDb, error: encargoErr } = await supabaseAdmin
              .from('encargos')
              .select(
                `numero_encargo, cliente_nombre, cliente_email, cliente_telefono, fecha_creacion, precio_total, notas,
                 encargo_productos ( cantidad, precio_unitario, observaciones, productos ( nombre, precio ) )`
              )
              .eq('id', encargoId)
              .single();

            if (encargoErr) {
              console.warn('No se pudo cargar encargo para factura Holded:', encargoErr.message);
            } else {
              encargo = encargoDb as any;
            }
          } catch (e) {
            console.warn('Excepción cargando encargo para factura Holded:', e);
          }

          // 2) Construir datos de factura usando body o fallback al encargo cargado
          const nombreCliente = clienteNombre || encargo?.cliente_nombre || 'Cliente';
          const emailCliente = clienteEmail || encargo?.cliente_email || '';
          const telCliente = clienteTelefono || encargo?.cliente_telefono || '';
          const numero = numeroEncargo || encargo?.numero_encargo || (encargoId?.slice(0, 8) ?? '');
          const fecha = fechaCreacion || encargo?.fecha_creacion || new Date().toISOString();
          const totalEsperado =
            typeof precioTotal === 'number' ? precioTotal : encargo?.precio_total ?? 0;
          const notasDoc = notas || encargo?.notas || `Encargo ${numero}`;

          // Siempre usar los productos del encargo en BD para evitar precios 0 del body
          type FuenteItem = { nombre: string; cantidad: number; precio_unitario: number; observaciones: string };
          let productosFuente: FuenteItem[] = [];

          if (encargo?.encargo_productos && encargo.encargo_productos.length > 0) {
            productosFuente = encargo.encargo_productos.map((ep) => {
              const cantidad = Number(ep.cantidad);
              const fromDb = Number(ep.precio_unitario ?? NaN);
              const fromProd = Number(ep.productos?.precio ?? NaN);
              const precioSeguro = Number.isFinite(fromDb) && fromDb > 0
                ? fromDb
                : (Number.isFinite(fromProd) && fromProd > 0 ? fromProd : NaN);
              return {
                nombre: ep.productos?.nombre || 'Producto',
                cantidad,
                precio_unitario: precioSeguro,
                observaciones: ep.observaciones || ''
              };
            });
          } else if (productos && productos.length > 0) {
            // Fallback solo si no se pudo cargar el encargo desde BD
            productosFuente = productos.map((p) => {
              const cantidad = Number(p.cantidad);
              const fromBody = Number(p.precio_unitario ?? NaN);
              const fromProd = Number(p.productos?.precio ?? NaN);
              const precioSeguro = Number.isFinite(fromBody) && fromBody > 0
                ? fromBody
                : (Number.isFinite(fromProd) && fromProd > 0 ? fromProd : NaN);
              return {
                nombre: p.productos?.nombre || 'Producto',
                cantidad,
                precio_unitario: precioSeguro,
                observaciones: p.observaciones || ''
              };
            });
          } else {
            console.warn('No hay productos para la factura: ni en BD ni en body');
          }

          // 3) Validar y mapear productos a items para Holded
          // En Holded, algunos entornos esperan precios en CÉNTIMOS y campos "quantity"/"unitPrice".
          // Calculamos en euros para totales internos y enviamos a Holded en céntimos.
          const invalids: string[] = [];
          const saneProducts = productosFuente.map((item, idx) => {
            const units = Number(item.cantidad);
            const unitPrice = Number(item.precio_unitario);
            if (!Number.isFinite(units) || units <= 0) {
              invalids.push(`Línea ${idx + 1}: cantidad inválida (${item.cantidad})`);
            }
            if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
              invalids.push(`Línea ${idx + 1}: precio inválido (${item.precio_unitario})`);
            }
            return { ...item, cantidad: units, precio_unitario: unitPrice };
          });

          if (invalids.length) {
            holdedErrorMsg = `Facturación detenida: ${invalids.join('; ')}`;
            throw new Error(holdedErrorMsg);
          }

          const holdedItems = saneProducts.map((item) => ({
            name: item.nombre,
            quantity: item.cantidad,
            unitPrice: item.precio_unitario, // Euros (para cálculo interno)
            tax: 0, // Sin IVA
            ...(item.observaciones && { desc: item.observaciones })
          }));

          // calcular total (sin IVA) para coherencia (euros)
          const totalCalculado = holdedItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);

          // Items para la petición a Holded (CRÍTICO: enviar AMBOS formatos - decimales en EUROS y enteros en CÉNTIMOS)
          const requestItems = holdedItems.map((it) => {
            const unitPriceEuros = Number(it.unitPrice); // Precio unitario en EUROS (decimal)
            const quantityInt = Math.floor(it.quantity); // Cantidad como entero
            const subtotalEuros = unitPriceEuros * quantityInt; // Subtotal en EUROS
            const unitPriceCents = Math.round(unitPriceEuros * 100); // Precio en CÉNTIMOS (entero)
            
            return {
              name: it.name,
              quantity: quantityInt,
              units: quantityInt,
              unitPrice: unitPriceEuros, // EUROS (decimal)
              price: unitPriceEuros, // EUROS (decimal)
              subtotal: subtotalEuros, // EUROS (decimal)
              unitPriceCents: unitPriceCents, // CÉNTIMOS (entero) - campo extra
              priceCents: unitPriceCents, // CÉNTIMOS (entero) - campo extra
              tax: it.tax,
              ...(it.desc ? { desc: it.desc } : {})
            };
          });

          console.log('Items para Holded (formato dual euros/céntimos):', JSON.stringify(requestItems, null, 2));

          // Validación final antes de enviar a Holded (verificar formato en EUROS)
          const invalidAfterMap = requestItems.some(
            (it) => !Number.isFinite(it.unitPrice) || it.unitPrice <= 0 || !Number.isFinite(it.quantity) || it.quantity <= 0
          );
          if (invalidAfterMap || requestItems.length === 0) {
            holdedErrorMsg = requestItems.length === 0
              ? 'Facturación detenida: sin items válidos para facturar'
              : 'Facturación detenida: items con precio (euros) o unidades inválidas';
            console.error('Validación de items falló:', holdedErrorMsg, 'Items:', requestItems);
            throw new Error(holdedErrorMsg);
          }

          const holdedBody = {
            docType: 'invoice',
            contactName: nombreCliente,
            contactEmail: emailCliente,
            contactPhone: telCliente,
            date: Math.floor(new Date(fecha).getTime() / 1000),
            currency: 'EUR',
            items: requestItems,
            notes: notasDoc,
            invoiceNum: String(numero),
            approveDoc: true,
          } as Record<string, unknown>;

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📤 HOLDED REQUEST - Encargo:', encargoId);
          console.log('Request Headers:', { 'Content-Type': 'application/json', 'Key': '***' });
          console.log('Request Body:', JSON.stringify(holdedBody, null, 2));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          const holdedResponse = await fetch('https://api.holded.com/api/invoicing/v1/documents/invoice', {
            method: 'POST',
            headers: {
              'Key': holdedApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(holdedBody),
          });

          // Leer respuesta cruda para diagnóstico
          const holdedResponseText = await holdedResponse.text();
          const holdedResponseHeaders: Record<string, string> = {};
          holdedResponse.headers.forEach((value, key) => {
            holdedResponseHeaders[key] = value;
          });
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📥 HOLDED RESPONSE');
          console.log('Response Status:', holdedResponse.status);
          console.log('Response Headers:', JSON.stringify(holdedResponseHeaders, null, 2));
          console.log('Response Body:', holdedResponseText);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          if (holdedResponse.ok) {
            // Intentar parsear JSON
            let holdedData;
            try {
              holdedData = JSON.parse(holdedResponseText);
              console.log('Holded response parsed:', holdedData);
            } catch (parseError) {
              console.error('Error parsing Holded response as JSON:', parseError);
              holdedErrorMsg = 'Holded respondió OK pero no se pudo parsear JSON';
              throw new Error(holdedErrorMsg);
            }

            if (!holdedData.id) {
              console.error('Holded response OK pero sin id:', holdedData);
              holdedErrorMsg = 'Holded respondió OK pero sin id de factura';
              throw new Error(holdedErrorMsg);
            }

            holdedInvoiceId = holdedData.id;
            console.log('Holded invoice created successfully:', holdedInvoiceId);
            
            // Determinar el estado de la factura según el estado del encargo
            // - entregado: factura pagada
            // - listo_recoger: factura emitida
            const estadoFactura = estado === 'entregado' ? 'pagada' : 'emitida';
            console.log(`Setting invoice status to: ${estadoFactura} (encargo estado: ${estado})`);
            
            // Guardar factura en la base de datos usando el mismo cliente admin
            const { data: facturaInsertada, error: insertError } = await supabaseAdmin
              .from('facturas')
              .insert({
                holded_id: holdedData.id,
                encargo_id: encargoId,
                tipo: 'factura',
                numero_documento: holdedData.docNumber || String(numero),
                nombre_cliente: nombreCliente,
                correo_cliente: emailCliente,
                telefono_cliente: telCliente,
                total: totalEsperado || totalCalculado || 0,
                estado: estadoFactura,
                pdf_url: holdedData.pdfUrl,
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error saving invoice to database:', insertError);
            } else {
              console.log('Invoice saved to database successfully with status:', estadoFactura);
              
              // Si el estado es "pagada", marcar la factura como pagada en Holded también
              if (estadoFactura === 'pagada' && facturaInsertada) {
                try {
                  console.log('Marking invoice as paid in Holded...');
                  const paymentDate = Math.floor(Date.now() / 1000);
                  const payResponse = await fetch(
                    `https://api.holded.com/api/invoicing/v1/documents/invoice/${holdedData.id}/pay`,
                    {
                      method: 'POST',
                      headers: {
                        'Key': holdedApiKey,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        amount: totalEsperado || totalCalculado || 0,
                        date: paymentDate,
                        paymentMethod: 'other'
                      })
                    }
                  );
                  
                  if (payResponse.ok) {
                    console.log('Invoice marked as paid in Holded successfully');
                  } else {
                    const payError = await payResponse.text();
                    console.error('Error marking invoice as paid in Holded:', payError);
                  }
                } catch (payError) {
                  console.error('Exception marking invoice as paid in Holded:', payError);
                }
              }
            }
          } else {
            // Error de Holded
            console.error('Error creating Holded invoice:', holdedResponse.status);
            console.error('Holded error response:', holdedResponseText);
            holdedErrorMsg = `Holded error ${holdedResponse.status}: ${holdedResponseText.substring(0, 200)}`;
          }
        } else {
          console.log('Holded API key not configured, skipping invoice creation');
        }
      } catch (holdedError) {
        holdedErrorMsg = holdedError instanceof Error ? holdedError.message : String(holdedError);
        console.error('Error with Holded integration:', holdedError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSids,
        sentTo: recipients,
        holdedInvoiceId,
        holdedErrorMsg
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