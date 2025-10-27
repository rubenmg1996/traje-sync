import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { useEncargos, useDeleteEncargo, type Encargo } from "@/hooks/useEncargos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface EncargosTableProps {
  search?: string;
  estadoFilter?: string;
  onEdit: (encargo: Encargo) => void;
}

const estadoConfig = {
  pendiente: { label: "Pendiente", color: "bg-yellow-500" },
  en_produccion: { label: "En Producción", color: "bg-blue-500" },
  listo_recoger: { label: "Listo", color: "bg-green-500" },
  entregado: { label: "Entregado", color: "bg-gray-500" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
};

const EncargosTable = ({ search, estadoFilter, onEdit }: EncargosTableProps) => {
  const { data: encargos, isLoading } = useEncargos(search, estadoFilter);
  const deleteEncargo = useDeleteEncargo();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDelete = () => {
    if (deleteId) {
      deleteEncargo.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando encargos...</div>;
  }

  if (!encargos || encargos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron encargos
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden xl:table-cell">Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden xl:table-cell">Contacto</TableHead>
              <TableHead className="hidden xl:table-cell">Fecha Creación</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {encargos.map((encargo) => (
              <TableRow key={encargo.id}>
                <TableCell className="font-medium hidden xl:table-cell">
                  {encargo.numero_encargo}
                </TableCell>
                <TableCell>{encargo.cliente_nombre}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">
                  {encargo.cliente_telefono || encargo.cliente_email || "-"}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {format(new Date(encargo.fecha_creacion), "dd MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  {encargo.fecha_entrega
                    ? format(new Date(encargo.fecha_entrega), "dd MMM yyyy", { locale: es })
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge className={estadoConfig[encargo.estado].color}>
                    {estadoConfig[encargo.estado].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {parseFloat(encargo.precio_total.toString()).toFixed(2)}€
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/encargos/${encargo.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(encargo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(encargo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar encargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El encargo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EncargosTable;
