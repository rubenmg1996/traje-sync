import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import { useCreateClocking, useCurrentEmployee } from "@/hooks/useClockings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function ClockInButton() {
  const [open, setOpen] = useState(false);
  const { data: currentEmployee, isLoading } = useCurrentEmployee();
  const createClocking = useCreateClocking();

  const handleClocking = async (tipo: "entrada" | "salida") => {
    if (!currentEmployee) {
      toast.error("No tienes un perfil de empleado asociado");
      return;
    }

    await createClocking.mutateAsync({
      employee_id: currentEmployee.id,
      tipo,
    });
    setOpen(false);
  };

  if (isLoading) {
    return (
      <Button disabled>
        <Clock className="mr-2 h-4 w-4" />
        Cargando...
      </Button>
    );
  }

  if (!currentEmployee) {
    return (
      <Button disabled variant="outline">
        <Clock className="mr-2 h-4 w-4" />
        Sin perfil de empleado
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Clock className="mr-2 h-4 w-4" />
          Fichar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Registro de Fichaje</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de fichaje que deseas registrar
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            size="lg"
            onClick={() => handleClocking("entrada")}
            disabled={createClocking.isPending}
          >
            <LogIn className="mr-2 h-5 w-5" />
            Fichar Entrada
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => handleClocking("salida")}
            disabled={createClocking.isPending}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Fichar Salida
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
