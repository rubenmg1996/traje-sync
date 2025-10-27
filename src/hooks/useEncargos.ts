import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EncargoProducto {
  id?: string;
  producto_id: string;
  producto?: {
    id: string;
    nombre: string;
    precio: number;
  };
  cantidad: number;
  precio_unitario: number;
  observaciones?: string;
}

export interface Encargo {
  id: string;
  numero_encargo: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_email?: string;
  fecha_creacion: string;
  fecha_entrega?: string;
  fecha_entrega_estimada?: string;
  tipo_entrega?: "recoger" | "domicilio";
  direccion_envio?: string;
  estado: "pendiente" | "en_produccion" | "listo_recoger" | "entregado" | "cancelado";
  precio_total: number;
  notas?: string;
  actualizado_por?: string;
  fecha_actualizacion?: string;
  productos?: EncargoProducto[];
}

export const useEncargos = (search?: string, estadoFilter?: string) => {
  return useQuery({
    queryKey: ["encargos", search, estadoFilter],
    queryFn: async () => {
      let query = supabase
        .from("encargos")
        .select(`
          *,
          encargo_productos (
            id,
            producto_id,
            cantidad,
            precio_unitario,
            observaciones,
            productos (
              id,
              nombre,
              precio
            )
          )
        `)
        .order("fecha_creacion", { ascending: false });

      if (search) {
        query = query.or(`cliente_nombre.ilike.%${search}%,numero_encargo.ilike.%${search}%`);
      }

      if (estadoFilter && estadoFilter !== "todos") {
        query = query.eq("estado", estadoFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data.map(encargo => ({
        ...encargo,
        productos: encargo.encargo_productos?.map(ep => ({
          id: ep.id,
          producto_id: ep.producto_id,
          cantidad: ep.cantidad,
          precio_unitario: ep.precio_unitario,
          observaciones: ep.observaciones,
          producto: ep.productos
        }))
      })) as Encargo[];
    },
  });
};

export const useEncargo = (id: string) => {
  return useQuery({
    queryKey: ["encargo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encargos")
        .select(`
          *,
          encargo_productos (
            id,
            producto_id,
            cantidad,
            precio_unitario,
            observaciones,
            productos (
              id,
              nombre,
              precio
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        productos: data.encargo_productos?.map(ep => ({
          id: ep.id,
          producto_id: ep.producto_id,
          cantidad: ep.cantidad,
          precio_unitario: ep.precio_unitario,
          observaciones: ep.observaciones,
          producto: ep.productos
        }))
      } as Encargo;
    },
    enabled: !!id,
  });
};

export const useCreateEncargo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (encargo: Omit<Encargo, "id" | "numero_encargo" | "fecha_actualizacion">) => {
      const { productos, ...encargoData } = encargo;

      // Verificar stock disponible antes de crear el encargo
      if (productos && productos.length > 0) {
        const { data: productosActuales, error: stockError } = await supabase
          .from("productos")
          .select("id, nombre, stock_actual")
          .in("id", productos.map(p => p.producto_id));

        if (stockError) throw stockError;

        const stockInsuficiente = [];
        for (const productoEncargo of productos) {
          const producto = productosActuales?.find(p => p.id === productoEncargo.producto_id);
          if (producto && producto.stock_actual < productoEncargo.cantidad) {
            stockInsuficiente.push({
              nombre: producto.nombre,
              solicitado: productoEncargo.cantidad,
              disponible: producto.stock_actual
            });
          }
        }

        if (stockInsuficiente.length > 0) {
          const mensaje = stockInsuficiente
            .map(p => `${p.nombre}: solicitado ${p.solicitado}, disponible ${p.disponible}`)
            .join("; ");
          throw new Error(`Stock insuficiente. ${mensaje}`);
        }
      }

      // Crear el encargo
      const { data: newEncargo, error: encargoError } = await supabase
        .from("encargos")
        .insert([encargoData])
        .select()
        .single();

      if (encargoError) throw encargoError;

      // Insertar productos
      if (productos && productos.length > 0) {
        const productosData = productos.map(p => ({
          encargo_id: newEncargo.id,
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          observaciones: p.observaciones,
        }));

        const { error: productosError } = await supabase
          .from("encargo_productos")
          .insert(productosData);

        if (productosError) throw productosError;

        // Actualizar stock de cada producto
        for (const producto of productos) {
          const { data: productoActual, error: fetchError } = await supabase
            .from("productos")
            .select("stock_actual")
            .eq("id", producto.producto_id)
            .single();

          if (fetchError) {
            console.error("Error al obtener producto:", fetchError);
            continue;
          }

          const nuevoStock = productoActual.stock_actual - producto.cantidad;

          const { error: updateError } = await supabase
            .from("productos")
            .update({ stock_actual: nuevoStock })
            .eq("id", producto.producto_id);

          if (updateError) {
            console.error("Error al actualizar stock:", updateError);
            continue;
          }

          // Sincronizar con WooCommerce
          try {
            await supabase.functions.invoke('sync-woocommerce', {
              body: { productId: producto.producto_id }
            });
          } catch (syncError) {
            console.error("Error al sincronizar con WooCommerce:", syncError);
          }
        }
      }

      // Enviar notificación de nuevo encargo al cliente
      try {
        await supabase.functions.invoke("notify-encargo-status", {
          body: {
            clienteNombre: newEncargo.cliente_nombre,
            clienteTelefono: newEncargo.cliente_telefono,
            clienteEmail: newEncargo.cliente_email,
            numeroEncargo: newEncargo.numero_encargo,
            estado: "pendiente",
            precioTotal: newEncargo.precio_total,
            productos: productos,
            notas: newEncargo.notas,
            fechaCreacion: newEncargo.fecha_creacion,
            tipoEntrega: newEncargo.tipo_entrega,
            direccionEnvio: newEncargo.direccion_envio,
            fechaEntregaEstimada: newEncargo.fecha_entrega_estimada
          }
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      return newEncargo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encargos"] });
      queryClient.invalidateQueries({ queryKey: ["encargos-stats"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["productos-stats"] });
      toast({
        title: "Encargo creado",
        description: "El encargo se ha registrado correctamente",
      });
    },
    onError: (error: any) => {
      console.error("Error creating encargo:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el encargo",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateEncargo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, encargo }: { id: string; encargo: Partial<Encargo> }) => {
      const { productos, ...encargoData } = encargo;

      // Actualizar encargo
      const { data: updatedEncargo, error: encargoError } = await supabase
        .from("encargos")
        .update(encargoData)
        .eq("id", id)
        .select()
        .single();

      if (encargoError) throw encargoError;

      // Si hay productos, eliminar los antiguos y añadir los nuevos
      if (productos) {
        // Eliminar productos anteriores
        const { error: deleteError } = await supabase
          .from("encargo_productos")
          .delete()
          .eq("encargo_id", id);

        if (deleteError) throw deleteError;

        // Insertar nuevos productos
        if (productos.length > 0) {
          const productosData = productos.map(p => ({
            encargo_id: id,
            producto_id: p.producto_id,
            cantidad: p.cantidad,
            precio_unitario: p.precio_unitario,
            observaciones: p.observaciones,
          }));

          const { error: insertError } = await supabase
            .from("encargo_productos")
            .insert(productosData);

          if (insertError) throw insertError;
        }
      }

      // Enviar notificación si cambia el estado a entregado, cancelado o listo_recoger
      if (encargo.estado && ["entregado", "cancelado", "listo_recoger"].includes(encargo.estado)) {
        try {
          // Obtener productos completos del encargo
          const { data: encargoConProductos } = await supabase
            .from("encargos")
            .select(`
              *,
              encargo_productos (
                id,
                producto_id,
                cantidad,
                precio_unitario,
                observaciones,
                productos (
                  id,
                  nombre,
                  precio
                )
              )
            `)
            .eq("id", id)
            .single();

          await supabase.functions.invoke("notify-encargo-status", {
            body: {
              clienteNombre: updatedEncargo.cliente_nombre,
              clienteTelefono: updatedEncargo.cliente_telefono,
              clienteEmail: updatedEncargo.cliente_email,
              numeroEncargo: updatedEncargo.numero_encargo,
              estado: encargo.estado,
              precioTotal: updatedEncargo.precio_total,
              productos: encargoConProductos?.encargo_productos || [],
              notas: updatedEncargo.notas,
              fechaCreacion: updatedEncargo.fecha_creacion,
              tipoEntrega: encargoConProductos?.tipo_entrega,
              direccionEnvio: encargoConProductos?.direccion_envio,
              fechaEntregaEstimada: encargoConProductos?.fecha_entrega_estimada
            }
          });
        } catch (notifError) {
          console.error("Error sending notification:", notifError);
        }
      }

      return updatedEncargo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encargos"] });
      queryClient.invalidateQueries({ queryKey: ["encargo"] });
      queryClient.invalidateQueries({ queryKey: ["encargos-stats"] });
      toast({
        title: "Encargo actualizado",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error updating encargo:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el encargo",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteEncargo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("encargos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encargos"] });
      queryClient.invalidateQueries({ queryKey: ["encargos-stats"] });
      toast({
        title: "Encargo eliminado",
        description: "El encargo se ha eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error deleting encargo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el encargo",
        variant: "destructive",
      });
    },
  });
};

export const useEncargosStats = () => {
  return useQuery({
    queryKey: ["encargos-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encargos")
        .select("estado, precio_total");

      if (error) throw error;

      const stats = {
        total: data.length,
        pendientes: data.filter(e => e.estado === "pendiente").length,
        enProduccion: data.filter(e => e.estado === "en_produccion").length,
        listos: data.filter(e => e.estado === "listo_recoger").length,
        entregados: data.filter(e => e.estado === "entregado").length,
        cancelados: data.filter(e => e.estado === "cancelado").length,
        valorTotal: data
          .filter(e => e.estado !== "cancelado")
          .reduce((sum, e) => sum + parseFloat(e.precio_total.toString()), 0),
      };

      return stats;
    },
  });
};
