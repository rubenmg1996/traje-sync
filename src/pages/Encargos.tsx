import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Encargos = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Encargos</h1>
        <p className="text-muted-foreground">Pedidos y encargos personalizados</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás registrar encargos personalizados, gestionar clientes y hacer seguimiento de entregas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Encargos;
