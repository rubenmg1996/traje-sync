import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFactura, useUpdateFactura, Factura } from "@/hooks/useFacturas";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const estadoConfig: Record<Factura["estado"], { label: string; variant: any }> = {
  emitida: { label: "🕓 Emitida", variant: "default" },
  pagada: { label: "🟢 Pagada", variant: "success" },
  cancelada: { label: "🔴 Cancelada", variant: "destructive" },
};

const FacturaDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: factura, isLoading } = useFactura(id!);
  const updateFactura = useUpdateFactura();
  const { settings } = useSettings();

  const handleEstadoChange = (newEstado: Factura["estado"]) => {
    if (factura && id) {
      updateFactura.mutate({ id, factura: { estado: newEstado } });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (isLoading) {
    return <div>Cargando factura...</div>;
  }

  if (!factura) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/facturacion")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Factura no encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/facturacion")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        {factura.holded_id && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                toast.info("Descargando factura...");
                
                // Llamar a la edge function para descargar el PDF
                const { data, error } = await supabase.functions.invoke('download-invoice-pdf', {
                  body: { holdedId: factura.holded_id }
                });

                if (error) {
                  throw error;
                }

                // Crear un blob desde la respuesta
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `factura-${factura.numero_documento}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Factura descargada correctamente");
              } catch (error) {
                console.error('Error descargando PDF:', error);
                toast.error("Error al descargar la factura");
              }
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Descargar Factura
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Número de Documento</p>
              <p className="text-lg font-semibold">{factura.numero_documento || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge variant="outline">{factura.tipo === "factura" ? "Factura" : "Albarán"}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
              <p className="font-medium">
                {format(new Date(factura.fecha_emision), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(factura.total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Estado</p>
              <Select value={factura.estado} onValueChange={handleEstadoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(estadoConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{factura.nombre_cliente}</p>
            </div>
            {factura.correo_cliente && (
              <div>
                <p className="text-sm text-muted-foreground">Correo Electrónico</p>
                <p className="font-medium">{factura.correo_cliente}</p>
              </div>
            )}
            {factura.telefono_cliente && (
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{factura.telefono_cliente}</p>
              </div>
            )}
            {factura.holded_id && (
              <div>
                <p className="text-sm text-muted-foreground">ID Holded</p>
                <p className="font-mono text-sm">{factura.holded_id}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default FacturaDetalle;
