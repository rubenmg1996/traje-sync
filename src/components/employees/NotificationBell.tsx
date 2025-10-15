import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const NotificationBell = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const unreadCount = notifications?.length || 0;

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "fichaje_tardio":
        return "⏰";
      case "fichaje_inconsistente":
        return "⚠️";
      case "fichaje_olvidado":
        return "❗";
      case "fichaje_corregido":
        return "✏️";
      default:
        return "📢";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificaciones</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
              >
                Marcar todas como leídas
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cargando...
              </p>
            ) : unreadCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay notificaciones nuevas
              </p>
            ) : (
              <div className="space-y-2">
                {notifications?.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                    onClick={() => markAsRead.mutate(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {getNotificationIcon(notification.tipo)}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {notification.mensaje}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
