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

      // Eliminar de WooCommerce usando batch endpoint con respaldo a "trash"
      const baseUrl = woocommerceUrl.replace(/\/$/, '');
      const apiBase = `${baseUrl}/wp-json/wc/v3/products`;
      const authQuery = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
      const deleteUrl = `${apiBase}/batch?${authQuery}`;

      const productNumericId = Number(producto.woocommerce_id);

      const batchPayload = {
        delete: [productNumericId],
      };

      const commonHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'LovableCloud/woocommerce-sync',
      };

      const attemptTrash = async () => {
        const trashPayload = { update: [{ id: productNumericId, status: 'trash' }] };
        const trashResp = await fetch(deleteUrl, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(trashPayload),
        });
        if (!trashResp.ok) {
          const t = await trashResp.text();
          console.error('WooCommerce move to trash error:', t);
          throw new Error(`WooCommerce move to trash failed: ${trashResp.status} - ${t}`);
        }
        const tData = await trashResp.json();
        const updatedItem = tData?.update?.[0];
        if ((updatedItem as any)?.error) {
          console.error('WooCommerce move to trash API error:', (updatedItem as any).error);
          throw new Error(`WooCommerce move to trash failed: ${(updatedItem as any).error?.message || 'unknown error'}`);
        }
        return tData;
      };

      try {
        const deleteResponse = await fetch(deleteUrl, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(batchPayload),
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('WooCommerce delete error (batch):', errorText);
          // Respaldo: mover a papelera si el borrado falla (p.ej. 405)
          const tData = await attemptTrash();
          console.log('WooCommerce move to trash response:', tData);
          return new Response(
            JSON.stringify({ success: true, message: 'Product moved to trash in WooCommerce' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const deleteData = await deleteResponse.json();
        console.log('WooCommerce delete response:', deleteData);
        const deletedItem = deleteData?.delete?.[0];
        if ((deletedItem as any)?.error) {
          console.error('WooCommerce delete API error (batch):', (deletedItem as any).error);
          // Respaldo: mover a papelera
          const tData = await attemptTrash();
          console.log('WooCommerce move to trash response:', tData);
          return new Response(
            JSON.stringify({ success: true, message: 'Product moved to trash in WooCommerce' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Product deleted from WooCommerce' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('WooCommerce delete exception, attempting trash:', err);
        const tData = await attemptTrash();
        console.log('WooCommerce move to trash response:', tData);
        return new Response(
          JSON.stringify({ success: true, message: 'Product moved to trash in WooCommerce' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Obtener producto de la base de datos para crear/actualizar
    const { data: producto, error: fetchError } = await supabase
      .from('productos')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) throw fetchError;

    // Obtener imagen desde WooCommerce y espejarla en nuestro Storage
    let finalImageUrl: string | null = producto.imagen_url || null;
    if (producto.woocommerce_id) {
      try {
        const baseWooUrl = woocommerceUrl.replace(/\/$/, '');
        const authQuery = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
        const getUrl = `${baseWooUrl}/wp-json/wc/v3/products/${Number(producto.woocommerce_id)}?${authQuery}`;

        const wcResp = await fetch(getUrl, { headers: { 'Accept': 'application/json' } });
        if (wcResp.ok) {
          const wcData = await wcResp.json();
          const wooSrc: string | null = wcData?.images?.[0]?.src || null;

          if (wooSrc) {
            const headers = {
              'Accept': 'image/*',
              'User-Agent': 'Mozilla/5.0 (compatible; LovableSync/1.0; +https://lovable.dev)',
              'Referer': baseWooUrl,
            } as const;

            let currentSrc: string = wooSrc;
            let resImg = await fetch(currentSrc, { headers });

            // Fallback: si es .webp y falla, probar jpg/jpeg/png
            if (!resImg.ok && currentSrc.endsWith('.webp')) {
              for (const ext of ['jpg', 'jpeg', 'png']) {
                const altCandidate = currentSrc.replace('.webp', `.${ext}`);
                try {
                  const tryResp = await fetch(altCandidate, { headers });
                  if (tryResp.ok) {
                    resImg = tryResp;
                    currentSrc = altCandidate;
                    break;
                  }
                } catch (_) { /* ignore */ }
              }
            }

            if (resImg.ok) {
              const contentType = resImg.headers.get('content-type') || 'application/octet-stream';
              const arrayBuffer = await resImg.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              const extFromType = contentType.includes('webp') ? 'webp'
                : contentType.includes('jpeg') ? 'jpg'
                : contentType.includes('png') ? 'png'
                : (currentSrc.split('.').pop()?.split('?')[0] || 'img');
              const fileName = `wc-${producto.woocommerce_id || producto.id}-${Date.now()}.${extFromType}`;
              const { error: uploadError } = await supabase.storage
                .from('productos')
                .upload(fileName, bytes, { contentType, upsert: true });
              if (!uploadError) {
                const { data: pub } = supabase.storage.from('productos').getPublicUrl(fileName);
                finalImageUrl = pub.publicUrl;
                const { error: imgUpdateErr } = await supabase
                  .from('productos')
                  .update({ imagen_url: finalImageUrl })
                  .eq('id', productId);
                if (imgUpdateErr) console.error('Error updating producto.imagen_url:', imgUpdateErr);
              } else {
                console.error('Error uploading mirrored image (single):', uploadError);
              }
            } else {
              console.warn('Remote image not reachable (single):', currentSrc, resImg.status);
            }
          }
        } else {
          console.warn('WooCommerce get product failed:', wcResp.status);
        }
      } catch (e) {
        console.error('Error fetching/mirroring image from WooCommerce (single):', e);
      }
    }

    // Preparar datos para WooCommerce (no enviamos imágenes para evitar errores de tipo)
    const wooProduct = {
      name: producto.nombre,
      description: producto.descripcion || '',
      regular_price: producto.precio.toString(),
      stock_quantity: producto.stock_actual,
      manage_stock: true,
      categories: producto.categoria ? [{ name: producto.categoria }] : [],
      status: producto.activo ? 'publish' : 'draft',
    };

    // Para actualizaciones no enviamos imágenes para evitar errores de tipo en WooCommerce
    const wooUpdateProduct = {
      id: Number(producto.woocommerce_id),
      name: wooProduct.name,
      description: wooProduct.description,
      regular_price: wooProduct.regular_price,
      stock_quantity: wooProduct.stock_quantity,
      manage_stock: wooProduct.manage_stock,
      status: wooProduct.status,
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
