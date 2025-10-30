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

    // Descargar el PDF desde Holded
    const response = await fetch(
      `https://api.holded.com/api/invoicing/v1/documents/invoice/${holdedId}/pdf`,
      {
        headers: {
          'Key': holdedApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Holded API:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Error al descargar PDF de Holded', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    // Obtener el PDF como blob
    const pdfBlob = await response.blob();
    
    console.log('PDF descargado exitosamente');

    // Retornar el PDF con los headers correctos
    return new Response(pdfBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${holdedId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error en download-invoice-pdf:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
