import { DashboardCard } from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, Package, ShoppingCart, Clock, TrendingUp, Euro } from "lucide-react";
import { useClockings } from "@/hooks/useClockings";
import { useEmployees } from "@/hooks/useEmployees";
import { useIncidencias } from "@/hooks/useIncidencias";
import { useProductos } from "@/hooks/useProductos";
import { useEncargos } from "@/hooks/useEncargos";
import { useFacturas } from "@/hooks/useFacturas";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { data: recentClockings, isLoading: isLoadingClockings } = useClockings(5);
  const { data: employees, isLoading: isLoadingEmployees } = useEmployees();
  const { data: incidencias, isLoading: isLoadingIncidencias } = useIncidencias();
  const { data: productos, isLoading: isLoadingProductos } = useProductos();
  const { data: encargos, isLoading: isLoadingEncargos } = useEncargos();
  const { data: facturas, isLoading: isLoadingFacturas } = useFacturas();

  // Query para productos más vendidos
  const { data: topProductos, isLoading: isLoadingTopProductos } = useQuery({
    queryKey: ["top-productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encargo_productos")
        .select("producto_id, cantidad, productos(nombre)")
        .order("cantidad", { ascending: false });

      if (error) throw error;

      // Agrupar por producto y sumar cantidades
      const productosMap = new Map<string, { nombre: string; cantidad: number }>();
      data?.forEach((item: any) => {
        const nombre = item.productos?.nombre || "Desconocido";
        const existing = productosMap.get(nombre);
        if (existing) {
          existing.cantidad += item.cantidad;
        } else {
          productosMap.set(nombre, { nombre, cantidad: item.cantidad });
        }
      });

      return Array.from(productosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
    },
  });

  // Calcular stats
  const empleadosActivos = employees?.filter((e) => e.activo).length || 0;
  const incidenciasAbiertas = incidencias?.filter((i) => i.estado === "pendiente" || i.estado === "en_proceso").length || 0;
  const incidenciasUrgentes = incidencias?.filter((i) => i.prioridad === "alta" && i.estado !== "resuelta").length || 0;
  const stockBajo = productos?.filter((p) => p.stock_actual < p.stock_minimo).length || 0;
  const encargosActivos = encargos?.filter((e) => e.estado !== "entregado" && e.estado !== "cancelado").length || 0;
  const encargosEstaSemana = encargos?.filter((e) => {
    if (!e.fecha_entrega_estimada) return false;
    const entrega = new Date(e.fecha_entrega_estimada);
    const hoy = new Date();
    const finSemana = addDays(hoy, 7);
    return isAfter(entrega, hoy) && isBefore(entrega, finSemana);
  }).length || 0;

  // Fichados ahora (últimas 12 horas con entrada sin salida)
  const fichadosAhora = recentClockings?.filter((c) => {
    if (c.tipo !== "entrada") return false;
    const siguienteFichaje = recentClockings?.find(
      (f) => f.employee_id === c.employee_id && f.tipo === "salida" && new Date(f.fecha_hora) > new Date(c.fecha_hora)
    );
    return !siguienteFichaje;
  }).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu tienda de trajes de flamenca</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Empleados Activos"
          value={isLoadingEmployees ? "..." : empleadosActivos}
          icon={Users}
          description={`${fichadosAhora} fichados ahora`}
        />
        <DashboardCard
          title="Incidencias Abiertas"
          value={isLoadingIncidencias ? "..." : incidenciasAbiertas}
          icon={AlertCircle}
          description={`${incidenciasUrgentes} urgente${incidenciasUrgentes !== 1 ? 's' : ''}`}
          variant={incidenciasUrgentes > 0 ? "warning" : "default"}
        />
        <DashboardCard
          title="Stock Bajo"
          value={isLoadingProductos ? "..." : stockBajo}
          icon={Package}
          description="Requieren reposición"
          variant={stockBajo > 0 ? "destructive" : "default"}
        />
        <DashboardCard
          title="Encargos Activos"
          value={isLoadingEncargos ? "..." : encargosActivos}
          icon={ShoppingCart}
          description={`${encargosEstaSemana} para esta semana`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Últimos Fichajes */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Últimos Fichajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingClockings ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentClockings && recentClockings.length > 0 ? (
              <div className="space-y-3">
                {recentClockings.map((clocking) => (
                  <div
                    key={clocking.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">
                        {clocking.employees?.nombre} {clocking.employees?.apellido}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(clocking.fecha_hora), "PPp", { locale: es })}
                      </p>
                    </div>
                    <Badge
                      variant={clocking.tipo === "entrada" ? "default" : "secondary"}
                    >
                      {clocking.tipo === "entrada" ? "Entrada" : "Salida"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay fichajes registrados
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTopProductos ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : topProductos && topProductos.length > 0 ? (
              <div className="space-y-3">
                {topProductos.map((producto, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{index + 1}</span>
                      <p className="text-sm font-medium">{producto.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{producto.cantidad}</span>
                      <TrendingUp className="h-3 w-3 text-success" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de ventas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Facturación Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFacturas ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : facturas && facturas.length > 0 ? (
              <div className="space-y-4">
                {facturas.slice(0, 4).map((factura) => (
                  <div key={factura.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{factura.numero_documento || factura.holded_id || `#${factura.id.slice(0, 8)}`}</p>
                      <p className="text-sm text-muted-foreground">{factura.nombre_cliente}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">€{factura.total.toFixed(2)}</span>
                      <Badge variant={factura.estado === "pagada" ? "default" : factura.estado === "emitida" ? "secondary" : "destructive"}>
                        {factura.estado === "pagada" ? "Pagada" : factura.estado === "emitida" ? "Emitida" : "Cancelada"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay facturas registradas
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Encargos Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEncargos ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : encargos && encargos.length > 0 ? (
              <div className="space-y-3">
                {encargos
                  .filter((e) => e.fecha_entrega_estimada && e.estado !== "entregado" && e.estado !== "cancelado")
                  .sort((a, b) => new Date(a.fecha_entrega_estimada!).getTime() - new Date(b.fecha_entrega_estimada!).getTime())
                  .slice(0, 4)
                  .map((encargo) => {
                    const diasRestantes = Math.ceil(
                      (new Date(encargo.fecha_entrega_estimada!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const esUrgente = diasRestantes <= 2;
                    
                    return (
                      <div key={encargo.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{encargo.cliente_nombre}</p>
                          <p className="text-xs text-muted-foreground">{encargo.numero_encargo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={esUrgente ? "destructive" : "secondary"}>
                            {diasRestantes === 0 ? "Hoy" : diasRestantes === 1 ? "Mañana" : `${diasRestantes} días`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay encargos próximos
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
