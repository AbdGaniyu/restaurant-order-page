export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_option_groups: {
        Row: {
          item_id: string
          option_group_id: string
          restaurant_id: string
        }
        Insert: {
          item_id: string
          option_group_id: string
          restaurant_id: string
        }
        Update: {
          item_id?: string
          option_group_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_option_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_option_groups_restaurant_id_item_id_fkey"
            columns: ["restaurant_id", "item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["restaurant_id", "id"]
          },
          {
            foreignKeyName: "item_option_groups_restaurant_id_option_group_id_fkey"
            columns: ["restaurant_id", "option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["restaurant_id", "id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          photo_url: string | null
          pos_name: string | null
          price_kobo: number
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          photo_url?: string | null
          pos_name?: string | null
          price_kobo: number
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          photo_url?: string | null
          pos_name?: string | null
          price_kobo?: number
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_restaurant_id_category_id_fkey"
            columns: ["restaurant_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["restaurant_id", "id"]
          },
          {
            foreignKeyName: "items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          id: string
          is_required: boolean
          max_select: number | null
          min_select: number
          name: string
          restaurant_id: string
          selection_type: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_required?: boolean
          max_select?: number | null
          min_select?: number
          name: string
          restaurant_id: string
          selection_type: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_required?: boolean
          max_select?: number | null
          min_select?: number
          name?: string
          restaurant_id?: string
          selection_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          id: string
          is_available: boolean
          name: string
          option_group_id: string
          pos_name: string | null
          price_delta_kobo: number
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_available?: boolean
          name: string
          option_group_id: string
          pos_name?: string | null
          price_delta_kobo?: number
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_available?: boolean
          name?: string
          option_group_id?: string
          pos_name?: string | null
          price_delta_kobo?: number
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_restaurant_id_option_group_id_fkey"
            columns: ["restaurant_id", "option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["restaurant_id", "id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          landmark: string | null
          note: string | null
          order_type: string
          reference: string
          restaurant_id: string
          status: string
          total_kobo: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items: Json
          landmark?: string | null
          note?: string | null
          order_type: string
          reference: string
          restaurant_id: string
          status?: string
          total_kobo: number
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          landmark?: string | null
          note?: string | null
          order_type?: string
          reference?: string
          restaurant_id?: string
          status?: string
          total_kobo?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accent_hex: string
          accepts_delivery: boolean
          accepts_pickup: boolean
          address: string | null
          created_at: string
          delivery_fee_tiers_kobo: number[]
          delivery_hours: Json
          id: string
          is_open_override: boolean | null
          is_published: boolean
          logo_url: string | null
          maps_url: string | null
          name: string
          opening_hours: Json
          order_prefix: string
          owner_id: string | null
          packaging_kobo: Json
          slug: string
          whatsapp_number: string
        }
        Insert: {
          accent_hex?: string
          accepts_delivery?: boolean
          accepts_pickup?: boolean
          address?: string | null
          created_at?: string
          delivery_fee_tiers_kobo?: number[]
          delivery_hours?: Json
          id?: string
          is_open_override?: boolean | null
          is_published?: boolean
          logo_url?: string | null
          maps_url?: string | null
          name: string
          opening_hours?: Json
          order_prefix?: string
          owner_id?: string | null
          packaging_kobo?: Json
          slug: string
          whatsapp_number: string
        }
        Update: {
          accent_hex?: string
          accepts_delivery?: boolean
          accepts_pickup?: boolean
          address?: string | null
          created_at?: string
          delivery_fee_tiers_kobo?: number[]
          delivery_hours?: Json
          id?: string
          is_open_override?: boolean | null
          is_published?: boolean
          logo_url?: string | null
          maps_url?: string | null
          name?: string
          opening_hours?: Json
          order_prefix?: string
          owner_id?: string | null
          packaging_kobo?: Json
          slug?: string
          whatsapp_number?: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

