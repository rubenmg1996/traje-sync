import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidencias, useDeleteIncidencia } from "@/hooks/useIncidencias";
import { useCurrentEmployee } from "@/hooks/useClockings";

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

export const IncidenciasTable = () => {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos");

  const { data: incidencias, isLoading } = useIncidencias(
    filtroEstado !== "todos" ? filtroEstado : undefined,
    filtroPrioridad !== "todos" ? filtroPrioridad : undefined
  );
  const deleteIncidencia = useDeleteIncidencia();
  const { data: currentEmployee } = useCurrentEmployee();

  const isAdmin = currentEmployee?.rol === "administrador";

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="resuelta">Resuelta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las prioridades</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidencias && incidencias.length > 0 ? (
              incidencias.map((incidencia) => (
                <TableRow key={incidencia.id}>
                  <TableCell className="font-medium">{incidencia.titulo}</TableCell>
                  <TableCell>
                    <Badge variant={estadoColors[incidencia.estado]}>
                      {incidencia.estado === "en_curso" ? "En Curso" : incidencia.estado.charAt(0).toUpperCase() + incidencia.estado.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prioridadColors[incidencia.prioridad]}>
                      {incidencia.prioridad.charAt(0).toUpperCase() + incidencia.prioridad.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {incidencia.asignado
                      ? `${incidencia.asignado.nombre} ${incidencia.asignado.apellido}`
                      : "Sin asignar"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(incidencia.fecha_creacion), "PP", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/incidencias/${incidencia.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente esta incidencia.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteIncidencia.mutate(incidencia.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay incidencias registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
