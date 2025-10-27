export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clockings: {
        Row: {
          created_at: string
          employee_id: string
          fecha_hora: string
          id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          fecha_hora?: string
          id?: string
          tipo: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          fecha_hora?: string
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "clockings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          email: string
          fecha_alta: string
          id: string
          nombre: string
          rol: string
          telefono: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          email: string
          fecha_alta?: string
          id?: string
          nombre: string
          rol: string
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string
          fecha_alta?: string
          id?: string
          nombre?: string
          rol?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      encargo_productos: {
        Row: {
          cantidad: number
          created_at: string
          encargo_id: string
          id: string
          observaciones: string | null
          precio_unitario: number
          producto_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          encargo_id: string
          id?: string
          observaciones?: string | null
          precio_unitario: number
          producto_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          encargo_id?: string
          id?: string
          observaciones?: string | null
          precio_unitario?: number
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encargo_productos_encargo_id_fkey"
            columns: ["encargo_id"]
            isOneToOne: false
            referencedRelation: "encargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encargo_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      encargos: {
        Row: {
          actualizado_por: string | null
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_encargo"]
          fecha_actualizacion: string | null
          fecha_creacion: string
          fecha_entrega: string | null
          id: string
          notas: string | null
          numero_encargo: string
          precio_total: number
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_encargo"]
          fecha_actualizacion?: string | null
          fecha_creacion?: string
          fecha_entrega?: string | null
          id?: string
          notas?: string | null
          numero_encargo?: string
          precio_total?: number
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_encargo"]
          fecha_actualizacion?: string | null
          fecha_creacion?: string
          fecha_entrega?: string | null
          id?: string
          notas?: string | null
          numero_encargo?: string
          precio_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encargos_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias: {
        Row: {
          asignado_a: string | null
          comentarios: string | null
          creado_por: string
          created_at: string
          descripcion: string
          estado: string
          fecha_creacion: string
          fecha_resolucion: string | null
          id: string
          prioridad: string
          titulo: string
          updated_at: string
        }
        Insert: {
          asignado_a?: string | null
          comentarios?: string | null
          creado_por: string
          created_at?: string
          descripcion: string
          estado?: string
          fecha_creacion?: string
          fecha_resolucion?: string | null
          id?: string
          prioridad?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          asignado_a?: string | null
          comentarios?: string | null
          creado_por?: string
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_creacion?: string
          fecha_resolucion?: string | null
          id?: string
          prioridad?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          clocking_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          leida: boolean | null
          mensaje: string
          tipo: string
        }
        Insert: {
          clocking_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          leida?: boolean | null
          mensaje: string
          tipo: string
        }
        Update: {
          clocking_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          leida?: boolean | null
          mensaje?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_clocking_id_fkey"
            columns: ["clocking_id"]
            isOneToOne: false
            referencedRelation: "clockings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria: string | null
          color: string | null
          created_at: string
          descripcion: string | null
          fecha_creacion: string
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
          stock_actual: number
          stock_minimo: number
          talla: string | null
          updated_at: string
          woocommerce_id: string | null
        }
        Insert: {
          activo?: boolean
          categoria?: string | null
          color?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_creacion?: string
          id?: string
          imagen_url?: string | null
          nombre: string
          precio: number
          stock_actual?: number
          stock_minimo?: number
          talla?: string | null
          updated_at?: string
          woocommerce_id?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string | null
          color?: string | null
          created_at?: string
          descripcion?: string | null
          fecha_creacion?: string
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
          stock_actual?: number
          stock_minimo?: number
          talla?: string | null
          updated_at?: string
          woocommerce_id?: string | null
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          created_at: string | null
          dia_semana: number
          employee_id: string | null
          hora_entrada: string
          hora_salida: string
          id: string
          tolerancia_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dia_semana: number
          employee_id?: string | null
          hora_entrada: string
          hora_salida: string
          id?: string
          tolerancia_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dia_semana?: number
          employee_id?: string | null
          hora_entrada?: string
          hora_salida?: string
          id?: string
          tolerancia_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_encargo:
        | "pendiente"
        | "en_produccion"
        | "listo_recoger"
        | "entregado"
        | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_encargo: [
        "pendiente",
        "en_produccion",
        "listo_recoger",
        "entregado",
        "cancelado",
      ],
    },
  },
} as const
