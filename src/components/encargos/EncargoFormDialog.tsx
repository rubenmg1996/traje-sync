import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEncargo, useUpdateEncargo, type Encargo, type EncargoProducto } from "@/hooks/useEncargos";
import { useProductos } from "@/hooks/useProductos";
import { Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const encargoSchema = z.object({
  cliente_nombre: z.string().min(1, "El nombre es requerido"),
  cliente_telefono: z.string().optional(),
  cliente_email: z.string().email("Email inválido").optional().or(z.literal("")),
  fecha_entrega: z.string().optional(),
  estado: z.enum(["pendiente", "en_produccion", "listo_recoger", "entregado", "cancelado"]),
  notas: z.string().optional(),
});

type EncargoFormData = z.infer<typeof encargoSchema>;

interface EncargoFormDialogProps {
  encargo?: Encargo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EncargoFormDialog = ({ encargo, open, onOpenChange }: EncargoFormDialogProps) => {
  const createEncargo = useCreateEncargo();
  const updateEncargo = useUpdateEncargo();
  const { data: productos } = useProductos();
  const [selectedProducts, setSelectedProducts] = useState<EncargoProducto[]>([]);

  const form = useForm<EncargoFormData>({
    resolver: zodResolver(encargoSchema),
    defaultValues: {
      cliente_nombre: "",
      cliente_telefono: "",
      cliente_email: "",
      fecha_entrega: "",
      estado: "pendiente",
      notas: "",
    },
  });

  useEffect(() => {
    if (encargo) {
      form.reset({
        cliente_nombre: encargo.cliente_nombre,
        cliente_telefono: encargo.cliente_telefono || "",
        cliente_email: encargo.cliente_email || "",
        fecha_entrega: encargo.fecha_entrega
          ? new Date(encargo.fecha_entrega).toISOString().split("T")[0]
          : "",
        estado: encargo.estado,
        notas: encargo.notas || "",
      });
      setSelectedProducts(encargo.productos || []);
    } else {
      form.reset();
      setSelectedProducts([]);
    }
  }, [encargo, form]);

  const addProduct = () => {
    if (!productos || productos.length === 0) {
      return;
    }
    setSelectedProducts([
      ...selectedProducts,
      {
        producto_id: productos[0].id,
        cantidad: 1,
        precio_unitario: parseFloat(productos[0].precio.toString()),
        observaciones: "",
      },
    ]);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof EncargoProducto, value: any) => {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, p) => sum + (p.cantidad * p.precio_unitario),
      0
    );
  };

  const onSubmit = async (data: EncargoFormData) => {
    const encargoData = {
      cliente_nombre: data.cliente_nombre,
      cliente_telefono: data.cliente_telefono,
      cliente_email: data.cliente_email,
      fecha_entrega: data.fecha_entrega,
      estado: data.estado,
      notas: data.notas,
      precio_total: calculateTotal(),
      productos: selectedProducts,
      fecha_creacion: new Date().toISOString(),
    };

    if (encargo) {
      await updateEncargo.mutateAsync({
        id: encargo.id,
        encargo: encargoData,
      });
    } else {
      await createEncargo.mutateAsync(encargoData as any);
    }

    onOpenChange(false);
  };

  const isLoading = createEncargo.isPending || updateEncargo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {encargo ? "Editar Encargo" : "Nuevo Encargo"}
          </DialogTitle>
          <DialogDescription>
            {encargo
              ? "Modifica los datos del encargo"
              : "Registra un nuevo encargo personalizado"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cliente_nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: María García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente_telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 676138583" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="cliente@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_entrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Estimada de Entrega</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_produccion">En Producción</SelectItem>
                        <SelectItem value="listo_recoger">Listo para Recoger</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Productos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Productos</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Producto
                </Button>
              </div>

              {selectedProducts.map((product, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <FormLabel>Producto</FormLabel>
                        <Select
                          value={product.producto_id}
                          onValueChange={(value) => {
                            updateProduct(index, "producto_id", value);
                            const selectedProd = productos?.find(p => p.id === value);
                            if (selectedProd) {
                              updateProduct(index, "precio_unitario", parseFloat(selectedProd.precio.toString()));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {product.producto_id 
                                ? productos?.find(p => p.id === product.producto_id)?.nombre || "Selecciona producto"
                                : "Selecciona producto"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {productos?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} - {p.precio}€
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <FormLabel>Cantidad</FormLabel>
                        <Input
                          type="number"
                          min="1"
                          value={product.cantidad || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? 1 : parseInt(e.target.value);
                            updateProduct(index, "cantidad", isNaN(value) ? 1 : value);
                          }}
                        />
                      </div>

                      <div>
                        <FormLabel>Precio Unit.</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.precio_unitario || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateProduct(index, "precio_unitario", isNaN(value) ? 0 : value);
                          }}
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="md:col-span-5">
                        <FormLabel>Observaciones</FormLabel>
                        <Input
                          placeholder="Ej: talla personalizada, color especial..."
                          value={product.observaciones || ""}
                          onChange={(e) =>
                            updateProduct(index, "observaciones", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {selectedProducts.length > 0 && (
                <div className="flex justify-end text-lg font-semibold">
                  Total: {calculateTotal().toFixed(2)}€
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Internas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el encargo..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : encargo ? "Actualizar" : "Crear Encargo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EncargoFormDialog;
