import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ExternalLink, Trash2 } from "lucide-react";
import { useFacturas, useDeleteFactura, Factura } from "@/hooks/useFacturas";
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

interface FacturasTableProps {
  search?: string;
  estadoFilter?: string;
}

const FacturasTable = ({ search, estadoFilter }: FacturasTableProps) => {
  const navigate = useNavigate();
  const { data: facturas, isLoading } = useFacturas(search, estadoFilter);
  const deleteFactura = useDeleteFactura();
  const [facturaToDelete, setFacturaToDelete] = useState<string | null>(null);

  const estadoBadgeVariant = (estado: Factura["estado"]) => {
    switch (estado) {
      case "emitida":
        return "default";
      case "pagada":
        return "outline";
      case "cancelada":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const estadoLabel = (estado: Factura["estado"]) => {
    switch (estado) {
      case "emitida":
        return "🕓 Emitida";
      case "pagada":
        return "🟢 Pagada";
      case "cancelada":
        return "🔴 Cancelada";
      default:
        return estado;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handleDelete = (id: string) => {
    deleteFactura.mutate(id);
    setFacturaToDelete(null);
  };

  if (isLoading) {
    return <div>Cargando facturas...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas && facturas.length > 0 ? (
              facturas.map((factura) => (
                <TableRow
                  key={factura.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/factura/${factura.id}`)}
                >
                  <TableCell className="font-medium">
                    {factura.numero_documento || "N/A"}
                  </TableCell>
                  <TableCell>{factura.nombre_cliente}</TableCell>
                  <TableCell>
                    {format(new Date(factura.fecha_emision), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>{formatCurrency(factura.total)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant(factura.estado)}>
                      {estadoLabel(factura.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {factura.holded_id && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://app.holded.com/documents/${factura.holded_id}`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver en Holded
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFacturaToDelete(factura.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No se encontraron facturas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!facturaToDelete} onOpenChange={() => setFacturaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La factura se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => facturaToDelete && handleDelete(facturaToDelete)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FacturasTable;
