import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateIncidencia } from "@/hooks/useIncidencias";
import { useCurrentEmployee } from "@/hooks/useClockings";

export const CreateIncidenciaDialog = () => {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<"baja" | "media" | "alta">("media");

  const createIncidencia = useCreateIncidencia();
  const { data: currentEmployee } = useCurrentEmployee();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee) {
      return;
    }

    if (!titulo.trim() || !descripcion.trim()) {
      return;
    }

    createIncidencia.mutate(
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        prioridad,
        creado_por: currentEmployee.id,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setTitulo("");
          setDescripcion("");
          setPrioridad("media");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Incidencia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Incidencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Describe brevemente la incidencia"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Proporciona detalles sobre la incidencia"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select value={prioridad} onValueChange={(v) => setPrioridad(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createIncidencia.isPending}>
              {createIncidencia.isPending ? "Creando..." : "Crear Incidencia"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
