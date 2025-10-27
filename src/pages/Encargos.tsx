import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import EncargosStats from "@/components/encargos/EncargosStats";
import EncargosTable from "@/components/encargos/EncargosTable";
import EncargoFormDialog from "@/components/encargos/EncargoFormDialog";
import { type Encargo } from "@/hooks/useEncargos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Encargos = () => {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEncargo, setSelectedEncargo] = useState<Encargo | undefined>();

  const handleEdit = (encargo: Encargo) => {
    setSelectedEncargo(encargo);
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setSelectedEncargo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encargos</h1>
          <p className="text-muted-foreground">
            Gestión de pedidos y encargos personalizados
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Encargo
        </Button>
      </div>

      <EncargosStats />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o número de encargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_produccion">En Producción</SelectItem>
            <SelectItem value="listo_recoger">Listo para Recoger</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <EncargosTable
        search={search}
        estadoFilter={estadoFilter}
        onEdit={handleEdit}
      />

      <EncargoFormDialog
        encargo={selectedEncargo}
        open={showCreateDialog}
        onOpenChange={handleCloseDialog}
      />
    </div>
  );
};

export default Encargos;
