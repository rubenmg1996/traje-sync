import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Stock = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock</h1>
        <p className="text-muted-foreground">Gestión de inventario y productos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>Esta funcionalidad estará disponible próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás gestionar el inventario, añadir productos, subir imágenes y sincronizar con WooCommerce.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stock;
