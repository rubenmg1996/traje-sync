import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import {
  useCreateEmployee,
  useUpdateEmployee,
  Employee,
  EmployeeFormData,
} from "@/hooks/useEmployees";

const employeeFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  rol: z.enum(["empleado", "administrador"]),
  activo: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDialogProps {
  employee?: Employee;
  trigger?: React.ReactNode;
}

export function EmployeeFormDialog({
  employee,
  trigger,
}: EmployeeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: employee
      ? {
          nombre: employee.nombre,
          apellido: employee.apellido,
          email: employee.email,
          telefono: employee.telefono || "",
          rol: employee.rol,
          activo: employee.activo,
        }
      : {
          nombre: "",
          apellido: "",
          email: "",
          telefono: "",
          rol: "empleado",
          activo: true,
        },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    const employeeData: EmployeeFormData = {
      nombre: values.nombre,
      apellido: values.apellido,
      email: values.email,
      telefono: values.telefono,
      rol: values.rol,
      activo: values.activo,
    };

    if (employee) {
      await updateEmployee.mutateAsync({
        id: employee.id,
        employee: employeeData,
      });
    } else {
      await createEmployee.mutateAsync(employeeData);
    }
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Añadir Empleado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Editar Empleado" : "Nuevo Empleado"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? "Modifica los datos del empleado"
              : "Completa el formulario para registrar un nuevo empleado"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="García" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="juan@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="600 123 456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="administrador">
                        Administrador
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Estado Activo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {employee ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
