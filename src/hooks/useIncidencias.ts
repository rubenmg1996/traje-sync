import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Incidencia {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "pendiente" | "en_curso" | "resuelta";
  prioridad: "baja" | "media" | "alta";
  creado_por: string;
  asignado_a: string | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  comentarios: string | null;
  created_at: string;
  updated_at: string;
  creador?: {
    nombre: string;
    apellido: string;
  };
  asignado?: {
    nombre: string;
    apellido: string;
  };
}

export const useIncidencias = (filtroEstado?: string, filtroPrioridad?: string) => {
  return useQuery({
    queryKey: ["incidencias", filtroEstado, filtroPrioridad],
    queryFn: async () => {
      let query = supabase
        .from("incidencias")
        .select(`
          *,
          creador:employees!creado_por(nombre, apellido),
          asignado:employees!asignado_a(nombre, apellido)
        `)
        .order("fecha_creacion", { ascending: false });

      if (filtroEstado && filtroEstado !== "todos") {
        query = query.eq("estado", filtroEstado);
      }

      if (filtroPrioridad && filtroPrioridad !== "todos") {
        query = query.eq("prioridad", filtroPrioridad);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any;
    },
  });
};

export const useIncidencia = (id: string) => {
  return useQuery({
    queryKey: ["incidencia", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select(`
          *,
          creador:employees!creado_por(nombre, apellido),
          asignado:employees!asignado_a(nombre, apellido)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as any;
    },
  });
};

export const useCreateIncidencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidencia: {
      titulo: string;
      descripcion: string;
      prioridad: "baja" | "media" | "alta";
      creado_por: string;
    }) => {
      const { data, error } = await supabase
        .from("incidencias")
        .insert([incidencia])
        .select(`
          *,
          creador:employees!creado_por(nombre, apellido)
        `)
        .single();

      if (error) throw error;
      
      // Enviar notificación si prioridad es alta
      if (incidencia.prioridad === 'alta') {
        try {
          await supabase.functions.invoke('notify-incident-status', {
            body: {
              incidenciaId: data.id,
              titulo: incidencia.titulo,
              descripcion: incidencia.descripcion,
              prioridad: incidencia.prioridad,
              estado: 'pendiente',
              creadoPorNombre: data.creador ? `${data.creador.nombre} ${data.creador.apellido}` : undefined
            }
          });
        } catch (notifError) {
          console.error('Error sending incident notification:', notifError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidencias"] });
      queryClient.invalidateQueries({ queryKey: ["incidencias-stats"] });
      toast.success("Incidencia creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear incidencia: ${error.message}`);
    },
  });
};

export const useUpdateIncidencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      previousPrioridad,
      ...updates
    }: {
      id: string;
      previousPrioridad?: "baja" | "media" | "alta";
      estado?: "pendiente" | "en_curso" | "resuelta";
      prioridad?: "baja" | "media" | "alta";
      asignado_a?: string | null;
      comentarios?: string;
      fecha_resolucion?: string;
    }) => {
      const { data, error } = await supabase
        .from("incidencias")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          creador:employees!creado_por(nombre, apellido)
        `)
        .single();

      if (error) throw error;
      
      // Enviar notificación si:
      // 1. La prioridad cambia a 'alta' desde otro valor
      // 2. El estado resultante NO es 'en_curso'
      const changedToHigh = updates.prioridad === 'alta' && previousPrioridad && previousPrioridad !== 'alta';
      const finalEstado = updates.estado || data.estado;
      
      if (changedToHigh && finalEstado !== 'en_curso') {
        try {
          await supabase.functions.invoke('notify-incident-status', {
            body: {
              incidenciaId: data.id,
              titulo: data.titulo,
              descripcion: data.descripcion,
              prioridad: data.prioridad,
              estado: finalEstado,
              creadoPorNombre: data.creador ? `${data.creador.nombre} ${data.creador.apellido}` : undefined
            }
          });
        } catch (notifError) {
          console.error('Error sending incident notification:', notifError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidencias"] });
      queryClient.invalidateQueries({ queryKey: ["incidencia"] });
      queryClient.invalidateQueries({ queryKey: ["incidencias-stats"] });
      toast.success("Incidencia actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar incidencia: ${error.message}`);
    },
  });
};

export const useDeleteIncidencia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incidencias").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidencias"] });
      toast.success("Incidencia eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar incidencia: ${error.message}`);
    },
  });
};

export const useIncidenciasStats = () => {
  return useQuery({
    queryKey: ["incidencias-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select("estado, prioridad");

      if (error) throw error;

      const total = data.length;
      const pendientes = data.filter((i) => i.estado === "pendiente").length;
      const enCurso = data.filter((i) => i.estado === "en_curso").length;
      const resueltas = data.filter((i) => i.estado === "resuelta").length;

      const porEstado = {
        pendiente: pendientes,
        en_curso: enCurso,
        resuelta: resueltas,
      };

      const porPrioridad = {
        alta: data.filter((i) => i.prioridad === "alta").length,
        media: data.filter((i) => i.prioridad === "media").length,
        baja: data.filter((i) => i.prioridad === "baja").length,
      };

      return { total, porEstado, porPrioridad };
    },
  });
};
