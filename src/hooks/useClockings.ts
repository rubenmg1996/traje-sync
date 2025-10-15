import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Clocking {
  id: string;
  employee_id: string;
  tipo: "entrada" | "salida";
  fecha_hora: string;
  created_at: string;
  employees?: {
    nombre: string;
    apellido: string;
  };
}

export const useClockings = (limit?: number) => {
  return useQuery({
    queryKey: ["clockings", limit],
    queryFn: async () => {
      let query = supabase
        .from("clockings")
        .select("*, employees(nombre, apellido)")
        .order("fecha_hora", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Clocking[];
    },
  });
};

export const useCreateClocking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employee_id,
      tipo,
    }: {
      employee_id: string;
      tipo: "entrada" | "salida";
    }) => {
      const { data, error } = await supabase
        .from("clockings")
        .insert([{ employee_id, tipo }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clockings"] });
      toast.success(
        `Fichaje de ${variables.tipo} registrado correctamente`
      );
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar fichaje: ${error.message}`);
    },
  });
};

export const useCurrentEmployee = () => {
  return useQuery({
    queryKey: ["current-employee"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
};
