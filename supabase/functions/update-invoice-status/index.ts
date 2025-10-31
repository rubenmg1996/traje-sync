import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateStatusRequest {
  facturaId: string;
  nuevoEstado: 'emitida' | 'pagada' | 'cancelada';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Update invoice status function invoked');
    
    const { facturaId, nuevoEstado }: UpdateStatusRequest = await req.json();
    console.log('Request:', { facturaId, nuevoEstado });

    // Validar entrada
    if (!facturaId || !nuevoEstado) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parámetros inválidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener la factura y API key de Holded
    const { data: factura, error: facturaError } = await supabaseAdmin
      .from('facturas')
      .select('holded_id, numero_documento, total')
      .eq('id', facturaId)
      .single();

    if (facturaError || !factura) {
      console.error('Error al obtener factura:', facturaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Factura no encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!factura.holded_id) {
      console.warn('Factura sin holded_id:', facturaId);
      return new Response(
        JSON.stringify({ success: true, warning: 'Factura no sincronizada con Holded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Obtener API key de Holded
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('holded_api_key')
      .eq('id', 'site')
      .single();

    const holdedApiKey = settings?.holded_api_key || Deno.env.get('HOLDED_API_KEY');

    if (!holdedApiKey) {
      console.error('API key de Holded no configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'Holded no configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Actualizando factura ${factura.holded_id} a estado: ${nuevoEstado}`);

    let holdedResponse;
    let holdedResponseText;

    // Holded no permite editar facturas aprobadas directamente
    // Para marcar como pagada, usamos el endpoint payDocument
    if (nuevoEstado === 'pagada') {
      console.log('Registrando pago en Holded para marcar como pagada');
      
      holdedResponse = await fetch(
        `https://api.holded.com/api/invoicing/v1/documents/invoice/${factura.holded_id}/pay`,
        {
          method: 'POST',
          headers: {
            'Key': holdedApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: Math.floor(Date.now() / 1000), // Unix timestamp
            amount: factura.total,
          }),
        }
      );

      holdedResponseText = await holdedResponse.text();
      console.log('Holded payment response status:', holdedResponse.status);
      console.log('Holded payment response:', holdedResponseText);

      if (!holdedResponse.ok) {
        console.error('Error al registrar pago en Holded:', holdedResponseText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al marcar como pagada en Holded',
            details: holdedResponseText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`✅ Pago registrado en Holded: ${factura.numero_documento} -> pagada`);
    } else {
      // Para otros estados (emitida, cancelada) intentamos actualizar el estado
      // Nota: Holded puede rechazar cambios en facturas ya aprobadas
      const holdedStatusMap: Record<string, number> = {
        'emitida': 1,
        'cancelada': 3,
      };

      const holdedStatus = holdedStatusMap[nuevoEstado];

      if (holdedStatus === undefined) {
        return new Response(
          JSON.stringify({ success: false, error: 'Estado no válido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`Actualizando estado en Holded a: ${holdedStatus}`);

      holdedResponse = await fetch(
        `https://api.holded.com/api/invoicing/v1/documents/invoice/${factura.holded_id}`,
        {
          method: 'PUT',
          headers: {
            'Key': holdedApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: holdedStatus,
          }),
        }
      );

      holdedResponseText = await holdedResponse.text();
      console.log('Holded update response status:', holdedResponse.status);
      console.log('Holded update response:', holdedResponseText);

      if (!holdedResponse.ok) {
        console.error('Error al actualizar estado en Holded:', holdedResponseText);
        
        // Si es error de documento aprobado, devolvemos un warning en lugar de error
        if (holdedResponseText.includes('Approved documents cannot be edited')) {
          console.warn('⚠️ Factura ya aprobada en Holded, no se puede cambiar el estado directamente');
          return new Response(
            JSON.stringify({ 
              success: true, 
              warning: 'La factura ya está aprobada en Holded y no puede modificarse. Los cambios se guardaron localmente.',
              holdedId: factura.holded_id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error al sincronizar con Holded',
            details: holdedResponseText 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`✅ Estado actualizado en Holded: ${factura.numero_documento} -> ${nuevoEstado}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estado sincronizado con Holded',
        holdedId: factura.holded_id,
        nuevoEstado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
