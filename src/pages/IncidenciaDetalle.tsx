import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar, User, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidencia, useUpdateIncidencia } from "@/hooks/useIncidencias";
import { useCurrentEmployee } from "@/hooks/useClockings";
import { useEmployees } from "@/hooks/useEmployees";
import { useState } from "react";

const estadoColors = {
  pendiente: "default",
  en_curso: "secondary",
  resuelta: "outline",
} as const;

const prioridadColors = {
  baja: "outline",
  media: "secondary",
  alta: "destructive",
} as const;

const IncidenciaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: incidencia, isLoading } = useIncidencia(id!);
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: employees } = useEmployees();
  const updateIncidencia = useUpdateIncidencia();

  const [comentarios, setComentarios] = useState("");

  const isAdmin = currentEmployee?.rol === "administrador";

  const handleEstadoChange = (nuevoEstado: "pendiente" | "en_curso" | "resuelta") => {
    const updates: any = { 
      id: id!, 
      estado: nuevoEstado,
      previousPrioridad: incidencia.prioridad
    };
    
    if (nuevoEstado === "resuelta") {
      updates.fecha_resolucion = new Date().toISOString();
    }

    updateIncidencia.mutate(updates);
  };

  const handlePrioridadChange = (nuevaPrioridad: "baja" | "media" | "alta") => {
    updateIncidencia.mutate({
      id: id!,
      prioridad: nuevaPrioridad,
      previousPrioridad: incidencia.prioridad
    });
  };

  const handleAsignar = (employeeId: string) => {
    updateIncidencia.mutate({
      id: id!,
      asignado_a: employeeId === "sin_asignar" ? null : employeeId,
      previousPrioridad: incidencia.prioridad
    });
  };

  const handleAddComentario = () => {
    if (!comentarios.trim()) return;

    const nuevosComentarios = incidencia?.comentarios
      ? `${incidencia.comentarios}\n\n[${format(new Date(), "PPp", { locale: es })}] ${currentEmployee?.nombre}: ${comentarios}`
      : `[${format(new Date(), "PPp", { locale: es })}] ${currentEmployee?.nombre}: ${comentarios}`;

    updateIncidencia.mutate(
      {
        id: id!,
        comentarios: nuevosComentarios,
        previousPrioridad: incidencia.prioridad
      },
      {
        onSuccess: () => {
          setComentarios("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!incidencia) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Incidencia no encontrada</p>
        <Button onClick={() => navigate("/incidencias")} className="mt-4">
          Volver a Incidencias
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
          onClick={() => navigate("/incidencias")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{incidencia.titulo}</h1>
          <p className="text-muted-foreground">Detalles de la incidencia</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={estadoColors[incidencia.estado]}>
            {incidencia.estado === "en_curso" ? "En Curso" : incidencia.estado.charAt(0).toUpperCase() + incidencia.estado.slice(1)}
          </Badge>
          <Badge variant={prioridadColors[incidencia.prioridad]}>
            Prioridad {incidencia.prioridad.charAt(0).toUpperCase() + incidencia.prioridad.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Descripción</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{incidencia.descripcion}</p>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de creación</p>
                <p className="font-medium">
                  {format(new Date(incidencia.fecha_creacion), "PPp", { locale: es })}
                </p>
              </div>
            </div>

            {incidencia.fecha_resolucion && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de resolución</p>
                  <p className="font-medium">
                    {format(new Date(incidencia.fecha_resolucion), "PPp", { locale: es })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Creado por</p>
                <p className="font-medium">
                  {incidencia.creador
                    ? `${incidencia.creador.nombre} ${incidencia.creador.apellido}`
                    : "Desconocido"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Asignado a</p>
                <p className="font-medium">
                  {incidencia.asignado
                    ? `${incidencia.asignado.nombre} ${incidencia.asignado.apellido}`
                    : "Sin asignar"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={incidencia.estado}
                onValueChange={handleEstadoChange}
                disabled={!isAdmin && currentEmployee?.id !== incidencia.creado_por}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_curso">En Curso</SelectItem>
                  <SelectItem value="resuelta">Resuelta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={incidencia.prioridad}
                    onValueChange={handlePrioridadChange}
                  >
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

                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    value={incidencia.asignado_a || "sin_asignar"}
                    onValueChange={handleAsignar}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Añadir comentario</Label>
              <Textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={3}
              />
              <Button onClick={handleAddComentario} className="w-full">
                Actualizar incidencia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {incidencia.comentarios && (
        <Card>
          <CardHeader>
            <CardTitle>Comentarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{incidencia.comentarios}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IncidenciaDetalle;
