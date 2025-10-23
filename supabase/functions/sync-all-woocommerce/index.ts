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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const woocommerceUrl = Deno.env.get('WOOCOMMERCE_URL')!;
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY')!;
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET')!;

    console.log('WooCommerce URL:', woocommerceUrl);
    console.log('Consumer Key length:', consumerKey?.length || 0);
    console.log('Consumer Secret length:', consumerSecret?.length || 0);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = woocommerceUrl.replace(/\/$/, '');
    
    // Construir URL con parámetros de autenticación
    const productsUrl = `${baseUrl}/wp-json/wc/v3/products?per_page=100&consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;

    console.log('Fetching from:', baseUrl + '/wp-json/wc/v3/products');

    // Obtener productos de WooCommerce
    const wooResponse = await fetch(productsUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('WooCommerce response status:', wooResponse.status);

    if (!wooResponse.ok) {
      const errorText = await wooResponse.text();
      console.error('WooCommerce error:', errorText);
      throw new Error(`Failed to fetch WooCommerce products: ${wooResponse.status}`);
    }

    const wooProducts = await wooResponse.json();
    console.log(`Fetched ${wooProducts.length} products from WooCommerce`);

    let importedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const wooProduct of wooProducts) {
      // Buscar si el producto ya existe por woocommerce_id
      const { data: existing } = await supabase
        .from('productos')
        .select('id')
        .eq('woocommerce_id', wooProduct.id.toString())
        .maybeSingle();

      const categoria = wooProduct.categories?.[0]?.name || 'Otros';
      let imagenUrl = wooProduct.images?.[0]?.src || null;

      // Mirror WooCommerce image into Storage to avoid hotlink/CORS/webp issues
      let finalImageUrl = imagenUrl;
      if (imagenUrl) {
        try {
          const resImg = await fetch(imagenUrl);
          if (resImg.ok) {
            const contentType = resImg.headers.get('content-type') || 'application/octet-stream';
            const arrayBuffer = await resImg.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const extFromType = contentType.includes('webp') ? 'webp'
              : contentType.includes('jpeg') ? 'jpg'
              : contentType.includes('png') ? 'png'
              : (imagenUrl.split('.').pop()?.split('?')[0] || 'img');
            const fileName = `wc-${wooProduct.id}-${Date.now()}.${extFromType}`;
            const { error: uploadError } = await supabase.storage
              .from('productos')
              .upload(fileName, bytes, { contentType, upsert: true });
            if (!uploadError) {
              const { data: pub } = supabase.storage.from('productos').getPublicUrl(fileName);
              finalImageUrl = pub.publicUrl;
            } else {
              console.error('Error uploading mirrored image:', uploadError);
            }
          } else {
            console.warn('Remote image not reachable:', imagenUrl, resImg.status);
          }
        } catch (e) {
          console.error('Mirror image error:', e);
        }
      }

      const productoData = {
        nombre: wooProduct.name,
        descripcion: wooProduct.description || wooProduct.short_description || '',
        categoria,
        precio: parseFloat(wooProduct.regular_price || wooProduct.price || '0'),
        stock_actual: wooProduct.stock_quantity || 0,
        stock_minimo: 5,
        activo: wooProduct.status === 'publish',
        imagen_url: finalImageUrl,
        woocommerce_id: wooProduct.id.toString(),
      };

      if (existing) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('productos')
          .update(productoData)
          .eq('id', existing.id);

        if (error) {
          console.error(`Error updating product ${wooProduct.id}:`, error);
        } else {
          updatedCount++;
        }
      } else {
        // Crear nuevo producto
        const { error } = await supabase
          .from('productos')
          .insert(productoData);

        if (error) {
          console.error(`Error creating product ${wooProduct.id}:`, error);
        } else {
          importedCount++;
        }
      }
    }

    // Eliminar localmente los productos que ya no existen en WooCommerce
    try {
      const wooIdsSet = new Set<string>(wooProducts.map((p: any) => p.id?.toString()));
      const { data: localProducts, error: fetchLocalError } = await supabase
        .from('productos')
        .select('id, woocommerce_id');

      if (fetchLocalError) {
        console.error('Error fetching local products for diff:', fetchLocalError);
      } else if (localProducts) {
        const toDeleteIds = localProducts
          .filter((p: any) => p.woocommerce_id && !wooIdsSet.has(p.woocommerce_id))
          .map((p: any) => p.id);

        if (toDeleteIds.length > 0) {
          console.log(`Deleting ${toDeleteIds.length} local products missing in WooCommerce`);
          const { error: deleteError } = await supabase
            .from('productos')
            .delete()
            .in('id', toDeleteIds);
          if (deleteError) {
            console.error('Error deleting local products not in WooCommerce:', deleteError);
          } else {
            deletedCount = toDeleteIds.length;
          }
        } else {
          console.log('No local products to delete (all present in WooCommerce)');
        }
      }
    } catch (e) {
      console.error('Exception while deleting local products:', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedCount,
        updated: updatedCount,
        deleted: deletedCount,
        total: wooProducts.length 
      }),
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
