import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProducto, useUpdateProducto, useUploadProductImage, type Producto } from "@/hooks/useProductos";
import { Loader2, Upload } from "lucide-react";

const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  precio: z.coerce.number().min(0.01, "El precio debe ser mayor a 0"),
  talla: z.string().optional(),
  color: z.string().optional(),
  stock_actual: z.coerce.number().min(0, "El stock no puede ser negativo"),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
  activo: z.boolean(),
  imagen_url: z.string().optional(),
});

type ProductoFormData = z.infer<typeof productoSchema>;

interface ProductFormDialogProps {
  producto?: Producto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductFormDialog({ producto, open, onOpenChange }: ProductFormDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(producto?.imagen_url || null);
  
  const createProducto = useCreateProducto();
  const updateProducto = useUpdateProducto();
  const uploadImage = useUploadProductImage();

  const form = useForm<ProductoFormData>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: producto?.nombre || "",
      descripcion: producto?.descripcion || "",
      precio: producto?.precio || 0,
      talla: producto?.talla || "",
      color: producto?.color || "",
      stock_actual: producto?.stock_actual || 0,
      stock_minimo: producto?.stock_minimo || 5,
      activo: producto?.activo ?? true,
      imagen_url: producto?.imagen_url || "",
    },
  });

  useEffect(() => {
    if (producto) {
      form.reset({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: producto.precio,
        talla: producto.talla || "",
        color: producto.color || "",
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo,
        activo: producto.activo,
        imagen_url: producto.imagen_url || "",
      });
      setPreviewUrl(producto.imagen_url);
    }
  }, [producto, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProductoFormData) => {
    try {
      let imageUrl = data.imagen_url;

      // Si hay una imagen nueva, subirla primero
      if (selectedFile) {
        const tempId = producto?.id || crypto.randomUUID();
        imageUrl = await uploadImage.mutateAsync({ file: selectedFile, productId: tempId });
      }

      const productoData: any = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        categoria: null,
        precio: data.precio,
        talla: data.talla || null,
        color: data.color || null,
        stock_actual: data.stock_actual,
        stock_minimo: data.stock_minimo,
        activo: data.activo,
        imagen_url: imageUrl || null,
        woocommerce_id: producto?.woocommerce_id || null,
      };

      if (producto) {
        await updateProducto.mutateAsync({ id: producto.id, ...productoData });
      } else {
        await createProducto.mutateAsync(productoData);
      }

      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar producto:", error);
    }
  };

  const isLoading = createProducto.isPending || updateProducto.isPending || uploadImage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {producto ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Vestido de flamenca rojo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio (€) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="talla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talla</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="36, 38, XS, M..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rojo, Azul..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_minimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 space-y-2">
                <FormLabel>Imagen del Producto</FormLabel>
                <div className="flex items-center gap-4">
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos: JPG, PNG, WEBP (máx. 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Producto Activo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Los productos inactivos no se muestran en el catálogo
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {producto ? "Actualizar" : "Crear"} Producto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
