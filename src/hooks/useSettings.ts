import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Settings {
  id: string;
  store_name: string | null;
  store_email: string | null;
  store_phone: string | null;
  store_address: string | null;
  tax_id: string | null;
  woo_url: string | null;
  woo_consumer_key: string | null;
  woo_consumer_secret: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_whatsapp_from: string | null;
  notification_recipients: string[];
  holded_api_key: string | null;
  default_stock_min: number;
  sync_auto: boolean;
  sync_interval: string;
  templates: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  source: string;
  action: string;
  success: boolean;
  message: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "site")
        .single();

      if (error) throw error;
      return data as Settings;
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["sync_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as SyncLog[];
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const { data, error } = await supabase
        .from("settings")
        .update(updates)
        .eq("id", "site")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configuración guardada correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  const testWooConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-all-woocommerce");
      
      // Log the test
      await supabase.from("sync_logs").insert({
        source: "woocommerce",
        action: "test_connection",
        success: !error,
        message: error ? error.message : "Conexión exitosa",
        details: data || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sync_logs"] });
      toast.success(`Conexión WooCommerce exitosa. ${data?.imported || 0} productos importados.`);
    },
    onError: (error: Error) => {
      toast.error(`Error de conexión WooCommerce: ${error.message}`);
    },
  });

  const testWhatsApp = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("notify-low-stock-whatsapp", {
        body: {
          productName: "Producto de prueba",
          currentStock: 2,
          minStock: 5,
        },
      });

      await supabase.from("sync_logs").insert({
        source: "twilio",
        action: "test_whatsapp",
        success: !error,
        message: error ? error.message : "Mensaje de prueba enviado",
        details: data || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync_logs"] });
      toast.success("Mensaje de WhatsApp de prueba enviado correctamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al enviar WhatsApp: ${error.message}`);
    },
  });

  const testHolded = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("notify-encargo-status", {
        body: {
          cliente_nombre: "Cliente de prueba",
          cliente_telefono: "+34600000000",
          numero_encargo: "TEST-001",
          estado: "entregado",
          precio_total: 100,
          encargoId: null, // Test mode - no real invoice creation
        },
      });

      await supabase.from("sync_logs").insert({
        source: "holded",
        action: "test_invoice",
        success: !error,
        message: error ? error.message : "Prueba de integración Holded exitosa",
        details: data || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync_logs"] });
      toast.success("Prueba de integración Holded exitosa");
    },
    onError: (error: Error) => {
      toast.error(`Error en prueba Holded: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    recentLogs,
    updateSettings,
    testWooConnection,
    testWhatsApp,
    testHolded,
  };
};
