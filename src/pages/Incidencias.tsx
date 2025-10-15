import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Incidencias = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
        <p className="text-muted-foreground">Registro y seguimiento de incidencias</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás registrar incidencias, asignarlas a empleados y hacer seguimiento de su resolución.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidencias;
