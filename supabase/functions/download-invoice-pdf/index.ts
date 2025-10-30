import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    const holdedApiKey = Deno.env.get('HOLDED_API_KEY');
    
    if (!holdedApiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key de Holded no configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Descargando PDF de factura:', holdedId);

    // Descargar el PDF desde Holded con reintentos (por si el PDF aún no está generado)
    const maxAttempts = 5;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let lastStatus = 0;
    let lastErrorText = '';

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
        console.warn(`Intento ${attempt}/${maxAttempts} - Holded aún no listo para PDF (status ${response.status})`);
        if (attempt < maxAttempts) {
          await wait(800 * attempt);
          continue;
        }
        console.error('Error de Holded API:', response.status, lastErrorText);
        return new Response(
          JSON.stringify({ error: 'Error al descargar PDF de Holded', details: lastErrorText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      // Validar cabeceras y tamaño mínimo
      const contentType = response.headers.get('content-type') || '';
      const contentLength = Number(response.headers.get('content-length') || '0');

      if (!contentType.includes('pdf') || contentLength < 1000) {
        console.warn(`Intento ${attempt}/${maxAttempts} - PDF aún no generado (type=${contentType}, length=${contentLength})`);
        if (attempt < maxAttempts) {
          await wait(800 * attempt);
          continue;
        }
      }

      const pdfBlob = await response.blob();
      console.log('PDF descargado exitosamente');

      return new Response(pdfBlob, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura-${holdedId}.pdf"`,
        },
      });
    }

    // Si llegó aquí, no se pudo obtener el PDF válido
    return new Response(
      JSON.stringify({ error: 'No se pudo obtener un PDF válido de Holded', status: lastStatus, details: lastErrorText }),
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
