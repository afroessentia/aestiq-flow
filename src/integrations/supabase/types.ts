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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anamnesis: {
        Row: {
          allergies: string | null
          chronic_diseases: string | null
          client_id: string
          consent_at: string | null
          consent_lgpd: boolean
          created_at: string
          id: string
          keloid_history: boolean
          medications: string | null
          pregnancy_breastfeeding: boolean
          procedure_history: string | null
          skin_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          chronic_diseases?: string | null
          client_id: string
          consent_at?: string | null
          consent_lgpd?: boolean
          created_at?: string
          id?: string
          keloid_history?: boolean
          medications?: string | null
          pregnancy_breastfeeding?: boolean
          procedure_history?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          chronic_diseases?: string | null
          client_id?: string
          consent_at?: string | null
          consent_lgpd?: boolean
          created_at?: string
          id?: string
          keloid_history?: boolean
          medications?: string | null
          pregnancy_breastfeeding?: boolean
          procedure_history?: string | null
          skin_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          date: string
          deposit_amount: number | null
          id: string
          notes: string | null
          pix_status: string
          procedure: string
          return_date: string | null
          status: string
          time: string
          total_amount: number | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          date: string
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          pix_status?: string
          procedure: string
          return_date?: string | null
          status?: string
          time: string
          total_amount?: number | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          date?: string
          deposit_amount?: number | null
          id?: string
          notes?: string | null
          pix_status?: string
          procedure?: string
          return_date?: string | null
          status?: string
          time?: string
          total_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          id: string
          lgpd_consent: boolean
          lgpd_consent_at: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lgpd_consent?: boolean
          lgpd_consent_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lgpd_consent?: boolean
          lgpd_consent_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinic_procedures: {
        Row: {
          created_at: string
          default_price: number | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_price?: number | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_price?: number | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          address: string | null
          clinic_name: string | null
          cnpj: string | null
          created_at: string
          logo_url: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          clinic_name?: string | null
          cnpj?: string | null
          created_at?: string
          logo_url?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          clinic_name?: string | null
          cnpj?: string | null
          created_at?: string
          logo_url?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      facial_markers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note: string | null
          number: number
          region: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note?: string | null
          number: number
          region?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string | null
          number?: number
          region?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          appointment_id: string | null
          client_name: string
          created_at: string
          entry_date: string
          id: string
          payment_method: string | null
          procedure: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          client_name: string
          created_at?: string
          entry_date: string
          id?: string
          payment_method?: string | null
          procedure: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_name?: string
          created_at?: string
          entry_date?: string
          id?: string
          payment_method?: string | null
          procedure?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          after_photo: string | null
          application_zone: string | null
          before_photo: string | null
          client_id: string
          created_at: string
          date: string
          days_until_return: number
          expiration_date: string | null
          id: string
          notes: string | null
          procedure: string
          product: string | null
          product_lot: string | null
          return_date: string | null
          return_done: boolean
          units: number | null
          user_id: string
        }
        Insert: {
          after_photo?: string | null
          application_zone?: string | null
          before_photo?: string | null
          client_id: string
          created_at?: string
          date: string
          days_until_return?: number
          expiration_date?: string | null
          id?: string
          notes?: string | null
          procedure: string
          product?: string | null
          product_lot?: string | null
          return_date?: string | null
          return_done?: boolean
          units?: number | null
          user_id: string
        }
        Update: {
          after_photo?: string | null
          application_zone?: string | null
          before_photo?: string | null
          client_id?: string
          created_at?: string
          date?: string
          days_until_return?: number
          expiration_date?: string | null
          id?: string
          notes?: string | null
          procedure?: string
          product?: string | null
          product_lot?: string | null
          return_date?: string | null
          return_done?: boolean
          units?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_settings: {
        Row: {
          created_at: string
          full_name: string | null
          photo_url: string | null
          registration_number: string | null
          registration_type: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          photo_url?: string | null
          registration_number?: string | null
          registration_type?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          photo_url?: string | null
          registration_number?: string | null
          registration_type?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          price_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string | null
          event_type: string | null
          id: string
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      work_hours: {
        Row: {
          enabled: boolean
          end_time: string | null
          id: string
          start_time: string | null
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          enabled?: boolean
          end_time?: string | null
          id?: string
          start_time?: string | null
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          enabled?: boolean
          end_time?: string | null
          id?: string
          start_time?: string | null
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
