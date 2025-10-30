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
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [showWooKey, setShowWooKey] = useState(false);
  const [showWooSecret, setShowWooSecret] = useState(false);
  
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("");
  const [recipients, setRecipients] = useState("");
  const [showTwilioSid, setShowTwilioSid] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  
  const [holdedKey, setHoldedKey] = useState("");
  const [showHoldedKey, setShowHoldedKey] = useState(false);
  
  const [defaultStockMin, setDefaultStockMin] = useState(5);
  const [syncAuto, setSyncAuto] = useState(false);
  const [syncInterval, setSyncInterval] = useState("off");

  // Track which secret fields have been modified
  const [wooKeyModified, setWooKeyModified] = useState(false);
  const [wooSecretModified, setWooSecretModified] = useState(false);
  const [twilioSidModified, setTwilioSidModified] = useState(false);
  const [twilioTokenModified, setTwilioTokenModified] = useState(false);
  const [holdedKeyModified, setHoldedKeyModified] = useState(false);

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || "");
      setStoreEmail(settings.store_email || "");
      setStorePhone(settings.store_phone || "");
      setStoreAddress(settings.store_address || "");
      setTaxId(settings.tax_id || "");
      
      setWooUrl(settings.woo_url || "");
      setWooKey(settings.woo_consumer_key ? "********" : "");
      setWooSecret(settings.woo_consumer_secret ? "********" : "");
      
      setTwilioSid(settings.twilio_account_sid ? "********" : "");
      setTwilioToken(settings.twilio_auth_token ? "********" : "");
      setTwilioFrom(settings.twilio_whatsapp_from || "");
      setRecipients(settings.notification_recipients?.join(", ") || "");
      
      setHoldedKey(settings.holded_api_key ? "********" : "");
      
      setDefaultStockMin(settings.default_stock_min || 5);
      setSyncAuto(settings.sync_auto || false);
      setSyncInterval(settings.sync_interval || "off");

      // Reset modification flags when settings load
      setWooKeyModified(false);
      setWooSecretModified(false);
      setTwilioSidModified(false);
      setTwilioTokenModified(false);
      setHoldedKeyModified(false);
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
      twilio_whatsapp_from: twilioFrom,
      notification_recipients: recipients.split(",").map(r => r.trim()).filter(Boolean),
      default_stock_min: defaultStockMin,
      sync_auto: syncAuto,
      sync_interval: syncInterval,
    };

    // Actualizar secretos solo si fueron modificados; si se dejan vacíos, se limpian (null)
    if (wooKeyModified) {
      updates.woo_consumer_key = (!wooKey || wooKey === "********") ? null : wooKey;
    }
    if (wooSecretModified) {
      updates.woo_consumer_secret = (!wooSecret || wooSecret === "********") ? null : wooSecret;
    }
    if (twilioSidModified) {
      updates.twilio_account_sid = (!twilioSid || twilioSid === "********") ? null : twilioSid;
    }
    if (twilioTokenModified) {
      updates.twilio_auth_token = (!twilioToken || twilioToken === "********") ? null : twilioToken;
    }
    if (holdedKeyModified) {
      updates.holded_api_key = (!holdedKey || holdedKey === "********") ? null : holdedKey;
    }

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

  const wooConfigured = Boolean(settings?.woo_url && settings?.woo_consumer_key && settings?.woo_consumer_secret);
  const twilioConfigured = Boolean(settings?.twilio_account_sid && settings?.twilio_auth_token && settings?.twilio_whatsapp_from);
  const holdedConfigured = Boolean(settings?.holded_api_key);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Configura las integraciones y ajustes del sistema
        </p>
      </div>

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
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wooKey">Consumer Key</Label>
              <div className="flex gap-2">
                <Input
                  id="wooKey"
                  type={showWooKey ? "text" : "password"}
                  value={wooKey}
                  onFocus={(e) => {
                    if (e.target.value === "********") {
                      setWooKey("");
                    }
                  }}
                  onChange={(e) => {
                    setWooKey(e.target.value);
                    setWooKeyModified(true);
                  }}
                  placeholder="ck_..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWooKey(!showWooKey)}
                >
                  {showWooKey ? "Ocultar" : "Ver"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wooSecret">Consumer Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="wooSecret"
                  type={showWooSecret ? "text" : "password"}
                  value={wooSecret}
                  onFocus={(e) => {
                    if (e.target.value === "********") {
                      setWooSecret("");
                    }
                  }}
                  onChange={(e) => {
                    setWooSecret(e.target.value);
                    setWooSecretModified(true);
                  }}
                  placeholder="cs_..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWooSecret(!showWooSecret)}
                >
                  {showWooSecret ? "Ocultar" : "Ver"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">¿Cómo obtener las claves API?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ve a WooCommerce → Ajustes → Avanzado → API REST</li>
              <li>Haz clic en "Añadir clave" y genera nuevas credenciales</li>
              <li>Copia el Consumer Key y Consumer Secret aquí</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => testWooConnection.mutate()}
              disabled={!wooConfigured || testWooConnection.isPending}
            >
              {testWooConnection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Probar conexión
            </Button>
          </div>

          {getLastLog("woocommerce") && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              getLastLog("woocommerce")?.success ? "bg-green-500/10" : "bg-destructive/10"
            }`}>
              {getLastLog("woocommerce")?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">Última prueba</p>
                <p className="text-muted-foreground">{getLastLog("woocommerce")?.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(getLastLog("woocommerce")!.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Twilio WhatsApp */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notificaciones WhatsApp (Twilio)</CardTitle>
            <CardDescription>
              Alertas automáticas por WhatsApp para stock bajo y cambios de encargos
            </CardDescription>
          </div>
          {getStatusBadge(twilioConfigured)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twilioSid">Account SID</Label>
              <div className="flex gap-2">
                <Input
                  id="twilioSid"
                  type={showTwilioSid ? "text" : "password"}
                  value={twilioSid}
                  onFocus={(e) => {
                    if (e.target.value === "********") {
                      setTwilioSid("");
                    }
                  }}
                  onChange={(e) => {
                    setTwilioSid(e.target.value);
                    setTwilioSidModified(true);
                  }}
                  placeholder="AC..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTwilioSid(!showTwilioSid)}
                >
                  {showTwilioSid ? "Ocultar" : "Ver"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilioToken">Auth Token</Label>
              <div className="flex gap-2">
                <Input
                  id="twilioToken"
                  type={showTwilioToken ? "text" : "password"}
                  value={twilioToken}
                  onFocus={(e) => {
                    if (e.target.value === "********") {
                      setTwilioToken("");
                    }
                  }}
                  onChange={(e) => {
                    setTwilioToken(e.target.value);
                    setTwilioTokenModified(true);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTwilioToken(!showTwilioToken)}
                >
                  {showTwilioToken ? "Ocultar" : "Ver"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilioFrom">WhatsApp From</Label>
            <Input
              id="twilioFrom"
              value={twilioFrom}
              onChange={(e) => setTwilioFrom(e.target.value)}
              placeholder="whatsapp:+34600000000"
            />
            <p className="text-xs text-muted-foreground">
              Número de WhatsApp de Twilio (incluir prefijo "whatsapp:")
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipients">Destinatarios de alertas</Label>
            <Input
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="+34600000000, +34611111111"
            />
            <p className="text-xs text-muted-foreground">
              Números separados por comas (incluir prefijo internacional)
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Configuración de Twilio</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Crea una cuenta en Twilio.com</li>
              <li>Configura WhatsApp Business API en tu cuenta</li>
              <li>Copia tu Account SID y Auth Token desde el dashboard</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => testWhatsApp.mutate()}
              disabled={!twilioConfigured || testWhatsApp.isPending}
            >
              {testWhatsApp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar mensaje de prueba
            </Button>
          </div>

          {getLastLog("twilio") && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              getLastLog("twilio")?.success ? "bg-green-500/10" : "bg-destructive/10"
            }`}>
              {getLastLog("twilio")?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">Última prueba</p>
                <p className="text-muted-foreground">{getLastLog("twilio")?.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(getLastLog("twilio")!.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Holded</CardTitle>
            <CardDescription>
              Integración con Holded para generación automática de facturas
            </CardDescription>
          </div>
          {getStatusBadge(holdedConfigured)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holdedKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="holdedKey"
                type={showHoldedKey ? "text" : "password"}
                value={holdedKey}
                onFocus={(e) => {
                  if (e.target.value === "********") {
                    setHoldedKey("");
                  }
                }}
                onChange={(e) => {
                  setHoldedKey(e.target.value);
                  setHoldedKeyModified(true);
                }}
                placeholder="Ingresa tu API key de Holded"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowHoldedKey(!showHoldedKey)}
              >
                {showHoldedKey ? "Ocultar" : "Ver"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">¿Cómo obtener la API Key?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Accede a tu cuenta de Holded</li>
              <li>Ve a Configuración → Más → Desarrolladores</li>
              <li>Genera una nueva API Key y cópiala aquí</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => testHolded.mutate()}
              disabled={!holdedConfigured || testHolded.isPending}
            >
              {testHolded.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Probar integración
            </Button>
          </div>

          {getLastLog("holded") && (
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              getLastLog("holded")?.success ? "bg-green-500/10" : "bg-destructive/10"
            }`}>
              {getLastLog("holded")?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">Última prueba</p>
                <p className="text-muted-foreground">{getLastLog("holded")?.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(getLastLog("holded")!.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajustes de la app */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de la Aplicación</CardTitle>
          <CardDescription>
            Configuración general del comportamiento del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultStockMin">Stock mínimo por defecto</Label>
            <Input
              id="defaultStockMin"
              type="number"
              min="0"
              value={defaultStockMin}
              onChange={(e) => setDefaultStockMin(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Cantidad mínima de stock para alertar en nuevos productos
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sincronización automática</Label>
              <p className="text-sm text-muted-foreground">
                Sincronizar productos de WooCommerce automáticamente
              </p>
            </div>
            <Switch
              checked={syncAuto}
              onCheckedChange={setSyncAuto}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="syncInterval">Intervalo de sincronización</Label>
            <Select value={syncInterval} onValueChange={setSyncInterval}>
              <SelectTrigger id="syncInterval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Desactivado</SelectItem>
                <SelectItem value="6h">Cada 6 horas</SelectItem>
                <SelectItem value="12h">Cada 12 horas</SelectItem>
                <SelectItem value="24h">Cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Frecuencia de sincronización automática (requiere sincronización activada)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
};

export default Configuracion;
