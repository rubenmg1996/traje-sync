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
    const { productId, operation = 'sync' } = await req.json();
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const woocommerceUrl = Deno.env.get('WOOCOMMERCE_URL')!;
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY')!;
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Si es operación de eliminación, solo necesitamos el woocommerce_id
    if (operation === 'delete') {
      const { data: producto, error: fetchError } = await supabase
        .from('productos')
        .select('woocommerce_id')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!producto.woocommerce_id) {
        return new Response(
          JSON.stringify({ success: true, message: 'Product has no WooCommerce ID' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Eliminar de WooCommerce usando batch endpoint
      const baseUrl = woocommerceUrl.replace(/\/$/, '');
      const apiBase = `${baseUrl}/wp-json/wc/v3/products`;
      const authQuery = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
      const deleteUrl = `${apiBase}/batch?${authQuery}`;
      
      const batchPayload = { 
        delete: [Number(producto.woocommerce_id)]
      };
      
      const deleteResponse = await fetch(deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('WooCommerce delete error:', errorText);
        throw new Error(`WooCommerce delete failed: ${deleteResponse.status} - ${errorText}`);
      }

      const deleteData = await deleteResponse.json();
      console.log('WooCommerce delete response:', deleteData);

      return new Response(
        JSON.stringify({ success: true, message: 'Product deleted from WooCommerce' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener producto de la base de datos para crear/actualizar
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

    // Para actualizaciones: solo incluir imágenes si son de Supabase (no de WooCommerce, evita 403)
    const isSupabaseImage = producto.imagen_url && producto.imagen_url.includes('supabase.co/storage');
    const wooUpdateProduct = {
      id: Number(producto.woocommerce_id),
      name: wooProduct.name,
      description: wooProduct.description,
      regular_price: wooProduct.regular_price,
      stock_quantity: wooProduct.stock_quantity,
      manage_stock: wooProduct.manage_stock,
      status: wooProduct.status,
      ...(isSupabaseImage && { images: wooProduct.images }),
    };

    const baseUrl = woocommerceUrl.replace(/\/$/, '');
    const apiBase = `${baseUrl}/wp-json/wc/v3/products`;
    const authQuery = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
    
    let wooResponse;
    
    if (producto.woocommerce_id) {
      // Actualizar producto existente (usar auth por query params por compatibilidad)
      // Actualizar producto existente usando endpoint batch (evita bloqueos de PUT)
      const url = `${apiBase}/batch?${authQuery}`;
      const batchPayload = { update: [wooUpdateProduct] };
      wooResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });
    } else {
      // Crear nuevo producto
      const url = `${apiBase}?${authQuery}`;
      wooResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wooProduct),
      });
    }

    if (!wooResponse.ok) {
      const errorText = await wooResponse.text();
      console.error('WooCommerce error:', errorText);
      throw new Error(`WooCommerce sync failed: ${wooResponse.status} - ${errorText}`);
    }

    const wooData = await wooResponse.json();
    console.log('WooCommerce response payload:', wooData);

    // Validar respuesta por operación
    if (producto.woocommerce_id) {
      const updatedItem = wooData?.update?.[0];
      if (!updatedItem) {
        console.error('WooCommerce batch update returned no items', wooData);
        throw new Error('WooCommerce batch update returned no items');
      }
      if ((updatedItem as any)?.error) {
        console.error('WooCommerce update error:', (updatedItem as any).error);
        throw new Error(`WooCommerce update failed: ${(updatedItem as any).error?.message || 'unknown error'}`);
      }
    } else {
      if (!wooData?.id) {
        console.error('WooCommerce create error payload:', wooData);
        throw new Error('WooCommerce create failed: missing id in response');
      }
    }

    // Determinar el ID de WooCommerce según la operación (batch update vs create)
    const syncedId = producto.woocommerce_id
      ? (wooData?.update?.[0]?.id ?? Number(producto.woocommerce_id))
      : wooData.id;

    // Actualizar el woocommerce_id solo si no existía previamente
    if (!producto.woocommerce_id && syncedId) {
      const { error: updateError } = await supabase
        .from('productos')
        .update({ woocommerce_id: syncedId.toString() })
        .eq('id', productId);
      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, woocommerce_id: syncedId }),
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
