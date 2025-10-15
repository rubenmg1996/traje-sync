import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Facturacion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">Facturas, albaranes y gestión de cobros</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás generar facturas, albaranes y gestionar cobros con integración a Holded.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Facturacion;
