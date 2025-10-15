import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Employee {
  id: string;
  user_id: string | null;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  rol: "empleado" | "administrador";
  fecha_alta: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: "empleado" | "administrador";
  activo: boolean;
}

export const useEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: EmployeeFormData) => {
      const { data, error } = await supabase
        .from("employees")
        .insert([employee])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear empleado: ${error.message}`);
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      employee,
    }: {
      id: string;
      employee: EmployeeFormData;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(employee)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar empleado: ${error.message}`);
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar empleado: ${error.message}`);
    },
  });
};
