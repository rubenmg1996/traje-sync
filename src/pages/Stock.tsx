import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, Search } from "lucide-react";
import { ProductosStats } from "@/components/productos/ProductosStats";
import { ProductosTable } from "@/components/productos/ProductosTable";
import { ProductFormDialog } from "@/components/productos/ProductFormDialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Stock = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [categoria, setCategoria] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-woocommerce');

      if (error) throw error;

      toast({
        title: "Sincronización completa",
        description: "Todos los productos han sido sincronizados con WooCommerce",
      });
    } catch (error: any) {
      toast({
        title: "Error de sincronización",
        description: error.message || "No se pudo sincronizar el catálogo completo",
        variant: "destructive",
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock</h1>
          <p className="text-muted-foreground">Gestión de inventario y productos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            Sincronizar Catálogo
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <ProductosStats />

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            <SelectItem value="Vestidos de Flamenca">Vestidos de Flamenca</SelectItem>
            <SelectItem value="Complementos">Complementos</SelectItem>
            <SelectItem value="Zapatos">Zapatos</SelectItem>
            <SelectItem value="Mantones">Mantones</SelectItem>
            <SelectItem value="Peinetas">Peinetas</SelectItem>
            <SelectItem value="Pendientes">Pendientes</SelectItem>
            <SelectItem value="Flores">Flores</SelectItem>
            <SelectItem value="Otros">Otros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ProductosTable categoria={categoria} search={search} />

      <ProductFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};

export default Stock;
