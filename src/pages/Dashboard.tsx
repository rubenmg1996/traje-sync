import { DashboardCard } from "@/components/DashboardCard";
import { Users, AlertCircle, Package, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu tienda de trajes de flamenca</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Empleados Activos"
          value="12"
          icon={Users}
          description="5 fichados ahora"
          trend={{ value: "2.1%", isPositive: true }}
        />
        <DashboardCard
          title="Incidencias Abiertas"
          value="3"
          icon={AlertCircle}
          description="1 urgente"
          variant="warning"
        />
        <DashboardCard
          title="Stock Bajo"
          value="8"
          icon={Package}
          description="Requieren reposición"
          variant="destructive"
        />
        <DashboardCard
          title="Encargos Activos"
          value="24"
          icon={ShoppingCart}
          description="6 para esta semana"
          trend={{ value: "12.5%", isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Facturación Reciente</CardTitle>
            <CardDescription>Últimas facturas emitidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "F-2024-001", cliente: "María García", importe: "€450.00", estado: "Pagada" },
                { id: "F-2024-002", cliente: "Carmen López", importe: "€680.00", estado: "Pendiente" },
                { id: "F-2024-003", cliente: "Ana Martínez", importe: "€320.00", estado: "Pagada" },
                { id: "F-2024-004", cliente: "Isabel Ruiz", importe: "€890.00", estado: "Pagada" },
              ].map((factura) => (
                <div key={factura.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{factura.id}</p>
                    <p className="text-sm text-muted-foreground">{factura.cliente}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{factura.importe}</span>
                    <Badge variant={factura.estado === "Pagada" ? "default" : "secondary"}>
                      {factura.estado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Fichajes de Hoy</CardTitle>
            <CardDescription>Empleados en la tienda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { nombre: "Laura Sánchez", hora: "09:00", estado: "En tienda" },
                { nombre: "Pedro Jiménez", hora: "09:15", estado: "En tienda" },
                { nombre: "Rosa Moreno", hora: "10:00", estado: "En tienda" },
                { nombre: "Miguel Torres", hora: "09:30", estado: "Salió 13:00" },
                { nombre: "Elena Vega", hora: "10:30", estado: "En tienda" },
              ].map((empleado, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{empleado.nombre}</p>
                      <p className="text-xs text-muted-foreground">Entrada: {empleado.hora}</p>
                    </div>
                  </div>
                  <Badge variant={empleado.estado.includes("En") ? "default" : "secondary"}>
                    {empleado.estado}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 de este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { nombre: "Traje Rojo Volantes", cantidad: 28, tendencia: "+15%" },
                { nombre: "Traje Negro Encajes", cantidad: 24, tendencia: "+8%" },
                { nombre: "Mantón Bordado Oro", cantidad: 18, tendencia: "+22%" },
                { nombre: "Zapatos Flamenca 38", cantidad: 16, tendencia: "+5%" },
                { nombre: "Peineta Carey Grande", cantidad: 14, tendencia: "+12%" },
              ].map((producto, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{index + 1}</span>
                    <p className="text-sm font-medium">{producto.nombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{producto.cantidad}</span>
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">{producto.tendencia}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encargos Próximos</CardTitle>
            <CardDescription>Entregas esta semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { cliente: "Sara Fernández", producto: "Traje personalizado rojo", fecha: "Mañana", urgente: true },
                { cliente: "Julia Romero", producto: "Traje talla especial negro", fecha: "Viernes", urgente: false },
                { cliente: "Lucía Navarro", producto: "Conjunto completo niña", fecha: "Sábado", urgente: false },
                { cliente: "Patricia Gil", producto: "Arreglo traje + accesorios", fecha: "Domingo", urgente: true },
              ].map((encargo, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{encargo.cliente}</p>
                    <p className="text-xs text-muted-foreground">{encargo.producto}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={encargo.urgente ? "destructive" : "secondary"}>
                      {encargo.fecha}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
