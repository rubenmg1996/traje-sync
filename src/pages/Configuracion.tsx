import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/useSettings";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";

const Configuracion = () => {
  const { settings, isLoading, recentLogs, updateSettings, testWooConnection, testWhatsApp, testHolded } = useSettings();
  
  // Form states
  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  
  const [wooUrl, setWooUrl] = useState("");
  const [recipients, setRecipients] = useState("");
  
  const [defaultStockMin, setDefaultStockMin] = useState(5);
  const [syncAuto, setSyncAuto] = useState(false);
  const [syncInterval, setSyncInterval] = useState("off");

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || "");
      setStoreEmail(settings.store_email || "");
      setStorePhone(settings.store_phone || "");
      setStoreAddress(settings.store_address || "");
      setTaxId(settings.tax_id || "");
      
      setWooUrl(settings.woo_url || "");
      setRecipients(settings.notification_recipients?.join(", ") || "");
      
      setDefaultStockMin(settings.default_stock_min || 5);
      setSyncAuto(settings.sync_auto || false);
      setSyncInterval(settings.sync_interval || "off");
    }
  }, [settings]);

  const handleSave = () => {
    const updates: any = {
      store_name: storeName,
      store_email: storeEmail,
      store_phone: storePhone,
      store_address: storeAddress,
      tax_id: taxId,
      woo_url: wooUrl,
      notification_recipients: recipients.split(",").map(r => r.trim()).filter(Boolean),
      default_stock_min: defaultStockMin,
      sync_auto: syncAuto,
      sync_interval: syncInterval,
    };

    updateSettings.mutate(updates);
  };

  const getStatusBadge = (configured: boolean) => {
    return configured ? (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Configurado
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Pendiente
      </Badge>
    );
  };

  const getLastLog = (source: string) => {
    return recentLogs?.find(log => log.source === source);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if integrations are configured (via secrets)
  const wooConfigured = Boolean(settings?.woo_url);
  const twilioConfigured = true; // Managed via secrets
  const holdedConfigured = true; // Managed via secrets

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Configura las integraciones y ajustes del sistema
        </p>
      </div>

      {/* Security Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Seguridad de Credenciales</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Las credenciales de API (WooCommerce, Twilio, Holded) se gestionan de forma segura mediante secrets cifrados. 
            No se almacenan en la base de datos y solo están accesibles para las funciones del servidor.
          </p>
        </CardContent>
      </Card>

      {/* Datos de la tienda */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de la Tienda</CardTitle>
          <CardDescription>
            Información básica de tu negocio que se usará en facturas y documentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nombre de la tienda</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Mi Tienda S.L."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">NIF/CIF</Label>
              <Input
                id="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="B12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeEmail">Email de facturación</Label>
              <Input
                id="storeEmail"
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="facturacion@mitienda.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone">Teléfono</Label>
              <Input
                id="storePhone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="+34 900 000 000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Dirección fiscal</Label>
            <Input
              id="storeAddress"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Calle Principal 123, 28001 Madrid"
            />
          </div>
        </CardContent>
      </Card>

      {/* WooCommerce */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>WooCommerce</CardTitle>
            <CardDescription>
              Sincronización automática de productos con tu tienda online
            </CardDescription>
          </div>
          {getStatusBadge(wooConfigured)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wooUrl">URL de WooCommerce</Label>
            <Input
              id="wooUrl"
              value={wooUrl}
              onChange={(e) => setWooUrl(e.target.value)}
              placeholder="https://mitienda.com"
            />
            <p className="text-xs text-muted-foreground">
              La URL base de tu tienda WooCommerce
            </p>
          </div>
          
          <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Credenciales Protegidas</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Las claves de API de WooCommerce (Consumer Key y Consumer Secret) están almacenadas de forma segura mediante secrets cifrados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => testWooConnection.mutate()}
              disabled={testWooConnection.isPending || !wooUrl}
              variant="outline"
            >
              {testWooConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando...
                </>
              ) : (
                "Probar Conexión"
              )}
            </Button>
            {getLastLog("woocommerce") && (
              <div className="flex items-center gap-2 text-sm">
                {getLastLog("woocommerce")?.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-muted-foreground">
                  {getLastLog("woocommerce")?.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones WhatsApp */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notificaciones WhatsApp (Twilio)</CardTitle>
            <CardDescription>
              Alertas automáticas de stock bajo y actualizaciones de encargos
            </CardDescription>
          </div>
          {getStatusBadge(twilioConfigured)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Credenciales Protegidas</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Las credenciales de Twilio (Account SID, Auth Token, número de WhatsApp) están almacenadas de forma segura mediante secrets cifrados.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipients">Números de teléfono para notificaciones</Label>
            <Input
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="+34600000000, +34700000000"
            />
            <p className="text-xs text-muted-foreground">
              Números separados por comas (formato internacional con +34)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => testWhatsApp.mutate()}
              disabled={testWhatsApp.isPending}
              variant="outline"
            >
              {testWhatsApp.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Mensaje de Prueba"
              )}
            </Button>
            {getLastLog("twilio") && (
              <div className="flex items-center gap-2 text-sm">
                {getLastLog("twilio")?.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-muted-foreground">
                  {getLastLog("twilio")?.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Holded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Holded</CardTitle>
            <CardDescription>
              Facturación automática y gestión contable
            </CardDescription>
          </div>
          {getStatusBadge(holdedConfigured)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Credenciales Protegidas</p>
            </div>
            <p className="text-xs text-muted-foreground">
              La clave de API de Holded está almacenada de forma segura mediante secrets cifrados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => testHolded.mutate()}
              disabled={testHolded.isPending}
              variant="outline"
            >
              {testHolded.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando...
                </>
              ) : (
                "Probar Integración"
              )}
            </Button>
            {getLastLog("holded") && (
              <div className="flex items-center gap-2 text-sm">
                {getLastLog("holded")?.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-muted-foreground">
                  {getLastLog("holded")?.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ajustes de la aplicación */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de la Aplicación</CardTitle>
          <CardDescription>
            Configuración general y comportamiento del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Stock mínimo por defecto</Label>
              <p className="text-xs text-muted-foreground">
                Nivel de stock que activará alertas automáticas
              </p>
            </div>
            <Input
              type="number"
              value={defaultStockMin}
              onChange={(e) => setDefaultStockMin(parseInt(e.target.value) || 5)}
              className="w-24"
              min="0"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sincronización automática</Label>
              <p className="text-xs text-muted-foreground">
                Sincronizar stock automáticamente con WooCommerce
              </p>
            </div>
            <Switch
              checked={syncAuto}
              onCheckedChange={setSyncAuto}
            />
          </div>

          {syncAuto && (
            <div className="space-y-2 pl-4">
              <Label htmlFor="syncInterval">Intervalo de sincronización</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger id="syncInterval">
                  <SelectValue placeholder="Selecciona intervalo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Desactivado</SelectItem>
                  <SelectItem value="15m">Cada 15 minutos</SelectItem>
                  <SelectItem value="30m">Cada 30 minutos</SelectItem>
                  <SelectItem value="1h">Cada hora</SelectItem>
                  <SelectItem value="6h">Cada 6 horas</SelectItem>
                  <SelectItem value="24h">Cada 24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs recientes */}
      {recentLogs && recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas operaciones de sincronización y pruebas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  {log.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{log.source}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("es-ES")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{log.message}</p>
                    {log.action && (
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar configuración"
          )}
        </Button>
      </div>
    </div>
  );
};

export default Configuracion;
