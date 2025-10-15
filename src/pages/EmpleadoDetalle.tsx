import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Mail, Phone, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EmpleadoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: clockings, isLoading: isLoadingClockings } = useQuery({
    queryKey: ["employee-clockings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clockings")
        .select("*")
        .eq("employee_id", id)
        .order("fecha_hora", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoadingEmployee) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Empleado no encontrado</p>
        <Button onClick={() => navigate("/empleados")} className="mt-4">
          Volver a Empleados
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
          onClick={() => navigate("/empleados")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.nombre} {employee.apellido}
          </h1>
          <p className="text-muted-foreground">Perfil del empleado</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{employee.telefono || "No especificado"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rol</p>
                <Badge
                  variant={
                    employee.rol === "administrador" ? "default" : "secondary"
                  }
                >
                  {employee.rol}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Alta</p>
                <p className="font-medium">
                  {format(new Date(employee.fecha_alta), "PP", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4" />
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={employee.activo ? "default" : "secondary"}>
                  {employee.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas de Fichajes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Total fichajes</span>
              <span className="text-2xl font-bold">{clockings?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Entradas</span>
              <span className="text-2xl font-bold">
                {clockings?.filter((c) => c.tipo === "entrada").length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Salidas</span>
              <span className="text-2xl font-bold">
                {clockings?.filter((c) => c.tipo === "salida").length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Fichajes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingClockings ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : clockings && clockings.length > 0 ? (
            <div className="rounded-md border">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Fecha y Hora</TableHead>
                      <TableHead className="min-w-[120px]">Tipo</TableHead>
                      <TableHead className="min-w-[100px]">Día</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clockings.map((clocking) => (
                      <TableRow key={clocking.id}>
                        <TableCell className="font-medium">
                          {format(new Date(clocking.fecha_hora), "PPp", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              clocking.tipo === "entrada" ? "default" : "secondary"
                            }
                          >
                            {clocking.tipo === "entrada" ? "Entrada" : "Salida"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(clocking.fecha_hora), "EEEE", {
                            locale: es,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay fichajes registrados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpleadoDetalle;
