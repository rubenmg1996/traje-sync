import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Mail, Phone, User, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditClockingDialog } from "@/components/employees/EditClockingDialog";
import { useDeleteClocking, useCurrentEmployee } from "@/hooks/useClockings";
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
  const deleteClocking = useDeleteClocking();
  const { data: currentEmployee } = useCurrentEmployee();

  const currentDate = new Date();
  const currentMonth = startOfMonth(currentDate);
  const lastMonth = startOfMonth(subMonths(currentDate, 1));
  const twoMonthsAgo = startOfMonth(subMonths(currentDate, 2));

  const isAdmin = currentEmployee?.rol === "administrador";

  const calculateWorkedHours = (clockings: any[]) => {
    let totalMinutes = 0;
    const sortedClockings = [...clockings].sort(
      (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    for (let i = 0; i < sortedClockings.length - 1; i++) {
      if (
        sortedClockings[i].tipo === "entrada" &&
        sortedClockings[i + 1].tipo === "salida"
      ) {
        const entrada = new Date(sortedClockings[i].fecha_hora);
        const salida = new Date(sortedClockings[i + 1].fecha_hora);
        const diffMinutes = (salida.getTime() - entrada.getTime()) / (1000 * 60);
        totalMinutes += diffMinutes;
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const filterClockingsByMonth = (clockings: any[], monthStart: Date) => {
    const monthEnd = endOfMonth(monthStart);
    return clockings.filter((clocking) =>
      isWithinInterval(new Date(clocking.fecha_hora), {
        start: monthStart,
        end: monthEnd,
      })
    );
  };

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
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="current">
                  {format(currentMonth, "MMMM yyyy", { locale: es })}
                </TabsTrigger>
                <TabsTrigger value="last">
                  {format(lastMonth, "MMMM yyyy", { locale: es })}
                </TabsTrigger>
                <TabsTrigger value="twoMonths">
                  {format(twoMonthsAgo, "MMMM yyyy", { locale: es })}
                </TabsTrigger>
              </TabsList>

              {[
                { value: "current", month: currentMonth },
                { value: "last", month: lastMonth },
                { value: "twoMonths", month: twoMonthsAgo },
              ].map(({ value, month }) => {
                const monthClockings = filterClockingsByMonth(clockings, month);
                const workedHours = calculateWorkedHours(monthClockings);

                return (
                  <TabsContent key={value} value={value} className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-lg border bg-muted/50">
                      <span className="text-sm font-medium">Horas trabajadas</span>
                      <span className="text-2xl font-bold">{workedHours}</span>
                    </div>

                    {monthClockings.length > 0 ? (
                      <div className="rounded-md border">
                        <ScrollArea className="w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {isAdmin && <TableHead className="min-w-[100px]">Acciones</TableHead>}
                                <TableHead className="min-w-[200px]">
                                  Fecha y Hora
                                </TableHead>
                                <TableHead className="min-w-[120px]">Tipo</TableHead>
                                <TableHead className="min-w-[100px]">Día</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {monthClockings.map((clocking) => (
                                <TableRow key={clocking.id}>
                                  {isAdmin && (
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <EditClockingDialog
                                          clocking={clocking}
                                          trigger={
                                            <Button variant="ghost" size="icon">
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          }
                                        />
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                ¿Estás seguro?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Esta acción eliminará permanentemente este fichaje.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteClocking.mutate(clocking.id)}
                                              >
                                                Eliminar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium">
                                    {format(new Date(clocking.fecha_hora), "PPp", {
                                      locale: es,
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        clocking.tipo === "entrada"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {clocking.tipo === "entrada"
                                        ? "Entrada"
                                        : "Salida"}
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
                        No hay fichajes registrados en este mes
                      </p>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
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
