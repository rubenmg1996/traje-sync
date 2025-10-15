import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Empleados = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
        <p className="text-muted-foreground">Gestión de empleados y fichajes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás registrar empleados, gestionar fichajes y controlar las horas trabajadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Empleados;
