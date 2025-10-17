import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  talla: string | null;
  color: string | null;
  stock_actual: number;
  stock_minimo: number;
  imagen_url: string | null;
  woocommerce_id: string | null;
  fecha_creacion: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export const useProductos = (search?: string) => {
  return useQuery({
    queryKey: ["productos", search],
    queryFn: async () => {
      let query = supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("nombre", `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Producto[];
    },
  });
};

export const useProducto = (id: string) => {
  return useQuery({
    queryKey: ["producto", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Producto no encontrado");
      return data as Producto;
    },
    enabled: !!id,
  });
};

export const useCreateProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (producto: Omit<Producto, "id" | "created_at" | "updated_at" | "fecha_creacion"> & Partial<Pick<Producto, "woocommerce_id">>) => {
      const { data, error } = await supabase
        .from("productos")
        .insert(producto)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No se pudo crear el producto");
      return data;
    },
    onSuccess: async (data) => {
      // Sincronizar con WooCommerce después de crear el producto
      if (data?.id) {
        try {
          await supabase.functions.invoke('sync-woocommerce', {
            body: { productId: data.id }
          });
          toast({
            title: "Producto creado y sincronizado",
            description: "El producto se ha creado y sincronizado con WooCommerce",
          });
        } catch (syncError) {
          console.error("Error al sincronizar con WooCommerce:", syncError);
          toast({
            title: "Producto creado",
            description: "El producto se creó pero hubo un error al sincronizar con WooCommerce",
            variant: "destructive",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el producto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...producto }: Partial<Producto> & { id: string }) => {
      const { data, error } = await supabase
        .from("productos")
        .update(producto)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No se pudo actualizar el producto");
      return data;
    },
    onSuccess: async (data, variables) => {
      // Sincronizar con WooCommerce después de actualizar
      if (variables.id) {
        try {
          const { data: fnRes, error: fnErr } = await supabase.functions.invoke('sync-woocommerce', {
            body: { productId: variables.id }
          });
          if (fnErr) throw fnErr as any;
          toast({
            title: 'Producto actualizado y sincronizado',
            description: 'El producto se ha actualizado y sincronizado con WooCommerce',
          });
        } catch (syncError) {
          console.error('Error al sincronizar con WooCommerce:', syncError);
          toast({
            title: 'Producto actualizado',
            description: 'El producto se actualizó pero hubo un error al sincronizar con WooCommerce',
            variant: 'destructive',
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['producto', variables.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el producto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primero intentar eliminar de WooCommerce si tiene woocommerce_id
      try {
        await supabase.functions.invoke('sync-woocommerce', {
          body: { productId: id, operation: 'delete' }
        });
      } catch (syncError) {
        console.error('Error al eliminar de WooCommerce:', syncError);
        // Continuamos con la eliminación local aunque falle en WooCommerce
      }

      // Luego eliminar de la base de datos local
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado de la aplicación y WooCommerce",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el producto: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useProductosStats = () => {
  return useQuery({
    queryKey: ["productos-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*");

      if (error) throw error;

      const productos = data as Producto[];
      const total = productos.length;
      const stockBajo = productos.filter(p => p.stock_actual < p.stock_minimo).length;

      return {
        total,
        stockBajo,
      };
    },
  });
};

export const useUploadProductImage = () => {
  return useMutation({
    mutationFn: async ({ file, productId }: { file: File; productId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo subir la imagen: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
