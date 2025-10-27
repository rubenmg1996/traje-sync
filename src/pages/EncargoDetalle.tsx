import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar, User, Package, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEncargo, useUpdateEncargo } from "@/hooks/useEncargos";
import { useCurrentEmployee } from "@/hooks/useClockings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const estadoConfig = {
  pendiente: { label: "Pendiente", variant: "default" as const },
  en_produccion: { label: "En Producción", variant: "secondary" as const },
  listo_recoger: { label: "Listo", variant: "outline" as const },
  entregado: { label: "Entregado", variant: "outline" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const },
};

const EncargoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: encargo, isLoading } = useEncargo(id!);
  const { data: currentEmployee } = useCurrentEmployee();
  const updateEncargo = useUpdateEncargo();

  const isAdmin = currentEmployee?.rol === "administrador";

  const handleEstadoChange = (nuevoEstado: "pendiente" | "en_produccion" | "listo_recoger" | "entregado" | "cancelado") => {
    if (!encargo) return;
    
    updateEncargo.mutate({
      id: id!,
      encargo: {
        estado: nuevoEstado,
        cliente_nombre: encargo.cliente_nombre,
        cliente_telefono: encargo.cliente_telefono,
        cliente_email: encargo.cliente_email,
        fecha_entrega: encargo.fecha_entrega,
        notas: encargo.notas,
        productos: encargo.productos?.map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          observaciones: p.observaciones || "",
        })) || [],
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!encargo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Encargo no encontrado</p>
        <Button onClick={() => navigate("/encargos")} className="mt-4">
          Volver a Encargos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/encargos")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Encargo {encargo.numero_encargo}
          </h1>
          <p className="text-muted-foreground">Detalles del encargo</p>
        </div>
        <Badge variant={estadoConfig[encargo.estado].variant}>
          {estadoConfig[encargo.estado].label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Nombre</Label>
              <p className="mt-1 font-medium">{encargo.cliente_nombre}</p>
            </div>

            {encargo.cliente_telefono && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{encargo.cliente_telefono}</p>
                </div>
              </div>
            )}

            {encargo.cliente_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{encargo.cliente_email}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de creación</p>
                <p className="font-medium">
                  {format(new Date(encargo.fecha_creacion), "PPp", { locale: es })}
                </p>
              </div>
            </div>

            {encargo.fecha_entrega && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de entrega</p>
                  <p className="font-medium">
                    {format(new Date(encargo.fecha_entrega), "PPp", { locale: es })}
                  </p>
                </div>
              </div>
            )}

            {encargo.notas && (
              <div>
                <Label className="text-muted-foreground">Notas</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{encargo.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estado del Encargo</Label>
              <Select
                value={encargo.estado}
                onValueChange={handleEstadoChange}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_produccion">En Producción</SelectItem>
                  <SelectItem value="listo_recoger">Listo para Recoger</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Precio Total:</span>
                <span>{parseFloat(encargo.precio_total.toString()).toFixed(2)}€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {encargo.productos && encargo.productos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {encargo.productos.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.producto?.nombre || "Producto no encontrado"}
                      </TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(item.precio_unitario.toString()).toFixed(2)}€
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(item.cantidad * parseFloat(item.precio_unitario.toString())).toFixed(2)}€
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.observaciones || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No hay productos en este encargo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EncargoDetalle;
