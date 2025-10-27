// Create Encargo Edge Function
// - Bypasses RLS using service role for a safe, transactional-like flow
// - Validates stock, creates encargo, inserts items, updates stock
// - Triggers WhatsApp notification via existing notify-encargo-status function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Build service-role client (required to bypass RLS for this controlled workflow)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface ProductoItem {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  observaciones?: string | null;
}

interface EncargoPayload {
  cliente_nombre: string;
  cliente_telefono?: string | null;
  cliente_email?: string | null;
  fecha_entrega?: string | null;
  fecha_entrega_estimada?: string | null;
  tipo_entrega?: "recoger" | "domicilio" | null;
  direccion_envio?: string | null;
  estado: "pendiente" | "en_produccion" | "listo_recoger" | "entregado" | "cancelado";
  precio_total: number;
  notas?: string | null;
  fecha_creacion?: string | null;
  productos?: ProductoItem[];
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await req.json()) as EncargoPayload;
    const {
      productos = [],
      ...encargoData
    } = body;

    // Basic validation
    if (!encargoData.cliente_nombre || typeof encargoData.precio_total !== "number") {
      return new Response(JSON.stringify({ error: "Datos de encargo inválidos" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1) Verify stock before creating the encargo
    if (productos.length > 0) {
      const { data: productosActuales, error: stockError } = await supabaseAdmin
        .from("productos")
        .select("id, nombre, stock_actual")
        .in("id", productos.map((p) => p.producto_id));

      if (stockError) throw stockError;

      const insuficiente: Array<{ nombre: string; solicitado: number; disponible: number }> = [];
      for (const p of productos) {
        const actual = productosActuales?.find((x) => x.id === p.producto_id);
        if (actual && actual.stock_actual < p.cantidad) {
          insuficiente.push({ nombre: actual.nombre, solicitado: p.cantidad, disponible: actual.stock_actual });
        }
      }

      if (insuficiente.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Stock insuficiente",
            detalle: insuficiente.map((p) => `${p.nombre}: solicitado ${p.solicitado}, disponible ${p.disponible}`).join("; "),
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // 2) Create encargo
    const { data: newEncargo, error: encargoError } = await supabaseAdmin
      .from("encargos")
      .insert([{ ...encargoData }])
      .select()
      .single();

    if (encargoError) throw encargoError;

    // 3) Insert items
    if (productos.length > 0) {
      const productosData = productos.map((p) => ({
        encargo_id: newEncargo.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        observaciones: p.observaciones ?? null,
      }));

      const { error: productosError } = await supabaseAdmin
        .from("encargo_productos")
        .insert(productosData);

      if (productosError) throw productosError;

      // 4) Update stock for each product
      for (const p of productos) {
        const { data: prodActual, error: fetchError } = await supabaseAdmin
          .from("productos")
          .select("stock_actual")
          .eq("id", p.producto_id)
          .single();

        if (fetchError) throw fetchError;

        const nuevoStock = (prodActual?.stock_actual ?? 0) - p.cantidad;
        const { error: updError } = await supabaseAdmin
          .from("productos")
          .update({ stock_actual: nuevoStock })
          .eq("id", p.producto_id);

        if (updError) throw updError;
      }
    }

    // 5) Notify via WhatsApp (reuse existing function)
    try {
      await supabaseAdmin.functions.invoke("notify-encargo-status", {
        body: {
          clienteNombre: newEncargo.cliente_nombre,
          clienteTelefono: newEncargo.cliente_telefono,
          clienteEmail: newEncargo.cliente_email,
          numeroEncargo: newEncargo.numero_encargo,
          estado: "pendiente",
          precioTotal: newEncargo.precio_total,
          productos,
          notas: newEncargo.notas,
          fechaCreacion: newEncargo.fecha_creacion,
          tipoEntrega: newEncargo.tipo_entrega,
          direccionEnvio: newEncargo.direccion_envio,
          fechaEntregaEstimada: newEncargo.fecha_entrega_estimada,
        },
      });
    } catch (notifError) {
      console.error("Error notifying WhatsApp:", notifError);
      // Non-blocking
    }

    return new Response(JSON.stringify({ encargo: newEncargo }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e: any) {
    console.error("create-encargo error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

Deno.serve(handler);
