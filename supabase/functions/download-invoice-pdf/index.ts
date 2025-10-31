import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { holdedId } = await req.json();
    
    if (!holdedId) {
      return new Response(
        JSON.stringify({ error: 'holdedId es requerido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Obtener API key desde settings o fallback a env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('holded_api_key')
      .eq('id', 'site')
      .single();

    const holdedApiKey = settings?.holded_api_key || Deno.env.get('HOLDED_API_KEY');
    
    if (!holdedApiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key de Holded no configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('Usando Holded API key de:', settings?.holded_api_key ? 'settings' : 'env');

    console.log('Descargando PDF de factura:', holdedId);

    // Delay inicial para dar tiempo a Holded a generar el PDF
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    console.log('Esperando 3 segundos antes del primer intento para que Holded genere el PDF...');
    await wait(3000);

    // Descargar el PDF desde Holded con reintentos (por si el PDF aún no está generado)
    const maxAttempts = 10; // Aumentado a 10 intentos
    let lastStatus = 0;
    let lastErrorText = '';
    let lastContentType = '';
    let lastHtmlPreview = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(
        `https://api.holded.com/api/invoicing/v1/documents/invoice/${holdedId}/pdf`,
        {
          headers: {
            'Key': holdedApiKey,
          },
        }
      );

      lastStatus = response.status;

      if (!response.ok) {
        lastErrorText = await response.text();
        console.warn(`Intento ${attempt}/${maxAttempts} - Holded error (status ${response.status}): ${lastErrorText.substring(0, 200)}`);
        if (attempt < maxAttempts) {
          await wait(1500 * attempt); // Aumentado de 800ms
          continue;
        }
        console.error('Error final de Holded API:', response.status, lastErrorText);
        return new Response(
          JSON.stringify({ 
            error: 'Error al descargar PDF de Holded después de varios intentos', 
            details: lastErrorText.substring(0, 500),
            status: response.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      // Validar cabeceras y tamaño mínimo
      const contentType = response.headers.get('content-type') || '';
      const contentLength = Number(response.headers.get('content-length') || '0');
      lastContentType = contentType;

      console.log(`Intento ${attempt}/${maxAttempts} - Content-Type: ${contentType}, Size: ${contentLength} bytes`);

      // CRÍTICO: Si no es PDF válido, NO descargar
      if (!contentType.includes('application/pdf') && !contentType.includes('pdf')) {
        // Capturar el HTML para ver qué está devolviendo Holded
        const htmlText = await response.text();
        lastHtmlPreview = htmlText.substring(0, 300);
        console.warn(`Intento ${attempt}/${maxAttempts} - Respuesta no es PDF (type=${contentType})`);
        console.warn(`HTML recibido (primeros 300 chars): ${lastHtmlPreview}`);
        
        if (attempt < maxAttempts) {
          await wait(3000 * attempt); // Espera progresiva más larga (3s, 6s, 9s...)
          continue;
        }
        // ÚLTIMO INTENTO: Si sigue sin ser PDF, devolver error
        console.error('Error final: Holded no devolvió un PDF válido después de todos los intentos');
        console.error('Último HTML recibido:', lastHtmlPreview);
        return new Response(
          JSON.stringify({ 
            error: 'Holded no devolvió un PDF válido. El documento puede no estar completamente procesado.', 
            details: `Content-Type recibido: ${contentType}`,
            htmlPreview: lastHtmlPreview,
            suggestion: 'El PDF puede tardar varios minutos en generarse en Holded. Espera un momento e intenta nuevamente.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      if (contentLength < 1000) {
        console.warn(`Intento ${attempt}/${maxAttempts} - PDF muy pequeño (${contentLength} bytes), puede estar incompleto`);
        if (attempt < maxAttempts) {
          await wait(3000 * attempt);
          continue;
        }
      }

      // Todo OK, descargar el PDF
      const pdfBlob = await response.blob();
      console.log(`PDF descargado exitosamente: ${contentLength} bytes`);

      return new Response(pdfBlob, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura-${holdedId}.pdf"`,
        },
      });
    }

    // Si llegó aquí, no se pudo obtener el PDF válido después de todos los intentos
    return new Response(
      JSON.stringify({ 
        error: 'No se pudo obtener un PDF válido de Holded después de múltiples intentos', 
        status: lastStatus, 
        details: lastErrorText || `Último Content-Type: ${lastContentType}`,
        htmlPreview: lastHtmlPreview,
        suggestion: 'El PDF puede tardar varios minutos en generarse en Holded. Espera un momento e intenta nuevamente.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
    );
  } catch (error: any) {
    console.error('Error en download-invoice-pdf:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
