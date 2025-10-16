import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const woocommerceUrl = Deno.env.get('WOOCOMMERCE_URL')!;
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY')!;
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener producto de la base de datos
    const { data: producto, error: fetchError } = await supabase
      .from('productos')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    // Preparar datos para WooCommerce
    const wooProduct = {
      name: producto.nombre,
      description: producto.descripcion || '',
      regular_price: producto.precio.toString(),
      stock_quantity: producto.stock_actual,
      manage_stock: true,
      categories: producto.categoria ? [{ name: producto.categoria }] : [],
      status: producto.activo ? 'publish' : 'draft',
      images: producto.imagen_url ? [{ src: producto.imagen_url }] : [],
    };

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const baseUrl = woocommerceUrl.replace(/\/$/, '');
    
    let wooResponse;
    
    if (producto.woocommerce_id) {
      // Actualizar producto existente
      wooResponse = await fetch(
        `${baseUrl}/wp-json/wc/v3/products/${producto.woocommerce_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(wooProduct),
        }
      );
    } else {
      // Crear nuevo producto
      wooResponse = await fetch(
        `${baseUrl}/wp-json/wc/v3/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(wooProduct),
        }
      );
    }

    if (!wooResponse.ok) {
      const errorText = await wooResponse.text();
      console.error('WooCommerce error:', errorText);
      throw new Error(`WooCommerce sync failed: ${wooResponse.status} - ${errorText}`);
    }

    const wooData = await wooResponse.json();

    // Actualizar el woocommerce_id en la base de datos
    const { error: updateError } = await supabase
      .from('productos')
      .update({ woocommerce_id: wooData.id.toString() })
      .eq('id', productId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, woocommerce_id: wooData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
