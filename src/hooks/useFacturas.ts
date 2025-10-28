import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Factura {
  id: string;
  holded_id?: string;
  encargo_id?: string;
  tipo: "factura" | "albaran";
  numero_documento?: string;
  nombre_cliente: string;
  correo_cliente?: string;
  telefono_cliente?: string;
  fecha_emision: string;
  total: number;
  estado: "emitida" | "pagada" | "cancelada";
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export const useFacturas = (search?: string, estadoFilter?: string) => {
  return useQuery({
    queryKey: ["facturas", search, estadoFilter],
    queryFn: async () => {
      let query = supabase
        .from("facturas")
        .select("*")
        .order("fecha_emision", { ascending: false });

      if (search) {
        query = query.or(`nombre_cliente.ilike.%${search}%,numero_documento.ilike.%${search}%`);
      }

      if (estadoFilter && estadoFilter !== "todos") {
        query = query.eq("estado", estadoFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Factura[];
    },
  });
};

export const useFactura = (id: string) => {
  return useQuery({
    queryKey: ["factura", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Factura;
    },
    enabled: !!id,
  });
};

export const useUpdateFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, factura }: { id: string; factura: Partial<Factura> }) => {
      const { data, error } = await supabase
        .from("facturas")
        .update(factura)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["factura"] });
      queryClient.invalidateQueries({ queryKey: ["facturas-stats"] });
      toast({
        title: "Factura actualizada",
        description: "Los cambios se han guardado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error updating factura:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la factura",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("facturas")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["facturas-stats"] });
      toast({
        title: "Factura eliminada",
        description: "La factura se ha eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error deleting factura:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
        variant: "destructive",
      });
    },
  });
};

export const useFacturasStats = () => {
  return useQuery({
    queryKey: ["facturas-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas")
        .select("estado, total");

      if (error) throw error;

      const stats = {
        total: data.length,
        emitidas: data.filter(f => f.estado === "emitida").length,
        pagadas: data.filter(f => f.estado === "pagada").length,
        canceladas: data.filter(f => f.estado === "cancelada").length,
        valorTotal: data
          .filter(f => f.estado !== "cancelada")
          .reduce((sum, f) => sum + parseFloat(f.total.toString()), 0),
      };

      return stats;
    },
  });
};

export const useCreateFacturaManual = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (encargoId: string) => {
      const { data, error } = await supabase.functions.invoke("notify-encargo-status", {
        body: { encargoId, estado: "entregado" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["facturas-stats"] });
      toast({
        title: "Factura creada",
        description: "La factura se ha generado correctamente en Holded",
      });
    },
    onError: (error) => {
      console.error("Error creating manual factura:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la factura en Holded",
        variant: "destructive",
      });
    },
  });
};
