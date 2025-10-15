import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Configuracion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Ajustes del sistema</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás configurar integraciones, notificaciones y otros ajustes del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracion;
