import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

export function DashboardCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
}: DashboardCardProps) {
  const variantStyles = {
    default: "bg-card",
    primary: "bg-gradient-primary text-primary-foreground shadow-primary",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <Card className={cn("transition-all hover:shadow-lg", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 opacity-70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs opacity-70 mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive",
                variant !== "default" && "opacity-90"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
            <span className="text-xs opacity-70">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
