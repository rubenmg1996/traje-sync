import { CreateIncidenciaDialog } from "@/components/incidencias/CreateIncidenciaDialog";
import { IncidenciasStats } from "@/components/incidencias/IncidenciasStats";
import { IncidenciasTable } from "@/components/incidencias/IncidenciasTable";

const Incidencias = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidencias</h1>
          <p className="text-muted-foreground">
            Gestión de incidencias y problemas internos
          </p>
        </div>
        <CreateIncidenciaDialog />
      </div>

      <IncidenciasStats />

      <IncidenciasTable />
    </div>
  );
};

export default Incidencias;
