import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { useProductos, useDeleteProducto, type Producto } from "@/hooks/useProductos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductFormDialog } from "./ProductFormDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductosTableProps {
  search?: string;
}

export function ProductosTable({ search }: ProductosTableProps) {
  const { data: productos, isLoading } = useProductos(search);
  const deleteProducto = useDeleteProducto();
  const [productoToDelete, setProductoToDelete] = useState<string | null>(null);
  const [productoToEdit, setProductoToEdit] = useState<Producto | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleDelete = () => {
    if (productoToDelete) {
      deleteProducto.mutate(productoToDelete);
      setProductoToDelete(null);
    }
  };

  const handleSync = async (producto: Producto) => {
    setSyncingId(producto.id);
    try {
      const { data, error } = await supabase.functions.invoke('sync-woocommerce', {
        body: { productId: producto.id },
      });

      if (error) throw error;

      toast({
        title: "Sincronización exitosa",
        description: `Producto "${producto.nombre}" sincronizado con WooCommerce`,
      });
    } catch (error: any) {
      toast({
        title: "Error de sincronización",
        description: error.message || "No se pudo sincronizar con WooCommerce",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando productos...</div>;
  }

  if (!productos || productos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron productos
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => {
              const stockBajo = producto.stock_actual < producto.stock_minimo;
              
              return (
                <TableRow key={producto.id}>
                  <TableCell>
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell className="text-right">{producto.precio.toFixed(2)} €</TableCell>
                  <TableCell className="text-center">
                    <span className={stockBajo ? "text-destructive font-bold" : ""}>
                      {producto.stock_actual}
                    </span>
                    <span className="text-muted-foreground text-xs"> / {producto.stock_minimo}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={producto.activo ? "default" : "secondary"}>
                      {producto.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSync(producto)}
                        disabled={syncingId === producto.id}
                        title="Sincronizar con WooCommerce"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncingId === producto.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductoToEdit(producto)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductoToDelete(producto.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!productoToDelete} onOpenChange={() => setProductoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {productoToEdit && (
        <ProductFormDialog
          producto={productoToEdit}
          open={!!productoToEdit}
          onOpenChange={(open) => !open && setProductoToEdit(null)}
        />
      )}
    </>
  );
}
