import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeesTable } from "@/components/employees/EmployeesTable";
import { ClockInButton } from "@/components/employees/ClockInButton";
import { NotificationBell } from "@/components/employees/NotificationBell";
import { Skeleton } from "@/components/ui/skeleton";

const Empleados = () => {
  const { data: employees, isLoading } = useEmployees();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">Gestión de empleados y fichajes</p>
        </div>
        <div className="flex gap-3">
          <NotificationBell />
          <ClockInButton />
          <EmployeeFormDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <EmployeesTable employees={employees || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empleados;
