// ============================================================================
// Generated-style Database type for @supabase/supabase-js / @supabase/ssr
// Hand-written from supabase/schema.sql + supabase/schema-patch-v4.sql since
// this project has no live Supabase project to run `supabase gen types` from
// in this environment. Keep in sync with the SQL files when the schema
// changes — there is no automated drift check.
//
// This is deliberately separate from src/types/database.ts, which holds the
// hand-written app-facing interfaces (Profile, Restaurant, Order, ...) used
// throughout the app. That file stays as-is; this one exists only to give
// createServerClient<Database>/createBrowserClient<Database> a real generic
// so Supabase query results are checked against the schema instead of being
// effectively `any`.
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: Database['public']['Enums']['user_role'];
          full_name: string | null;
          phone: string | null;
          default_address: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          phone?: string | null;
          default_address?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          phone: string;
          address: string;
          city: Database['public']['Enums']['city_enum'];
          image_url: string | null;
          cover_image_url: string | null;
          cuisine_tags: string[];
          delivery_fee: number;
          min_delivery_time: number;
          max_delivery_time: number;
          commission_rate: number;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_name: string | null;
          is_open: boolean;
          is_active: boolean;
          total_orders: number;
          total_revenue: number;
          average_rating: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          phone: string;
          address: string;
          city: Database['public']['Enums']['city_enum'];
          image_url?: string | null;
          cover_image_url?: string | null;
          cuisine_tags?: string[];
          delivery_fee?: number;
          min_delivery_time?: number;
          max_delivery_time?: number;
          commission_rate?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          is_open?: boolean;
          is_active?: boolean;
          total_orders?: number;
          total_revenue?: number;
          average_rating?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category: string;
          is_available: boolean;
          is_popular: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          category: string;
          is_available?: boolean;
          is_popular?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>;
        Relationships: [];
      };
      riders: {
        Row: {
          id: string;
          restaurant_id: string;
          profile_id: string | null;
          name: string;
          phone: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          profile_id?: string | null;
          name: string;
          phone: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['riders']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string | null;
          customer_id: string;
          restaurant_id: string;
          rider_id: string | null;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          delivery_fee: number;
          commission_rate: number;
          commission_amount: number;
          total: number;
          delivery_address: string;
          delivery_landmark: string | null;
          customer_phone: string;
          customer_name: string;
          payment_method: Database['public']['Enums']['payment_method'];
          payment_reference: string | null;
          payment_confirmed_by: string | null;
          payment_confirmed_at: string | null;
          notes: string | null;
          rating: number | null;
          rating_comment: string | null;
          confirmed_at: string | null;
          preparing_at: string | null;
          out_for_delivery_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string | null;
          customer_id: string;
          restaurant_id: string;
          rider_id?: string | null;
          status?: Database['public']['Enums']['order_status'];
          subtotal: number;
          delivery_fee?: number;
          commission_rate: number;
          commission_amount?: number;
          total?: number;
          delivery_address: string;
          delivery_landmark?: string | null;
          customer_phone: string;
          customer_name: string;
          payment_method?: Database['public']['Enums']['payment_method'];
          payment_reference?: string | null;
          payment_confirmed_by?: string | null;
          payment_confirmed_at?: string | null;
          notes?: string | null;
          rating?: number | null;
          rating_comment?: string | null;
          confirmed_at?: string | null;
          preparing_at?: string | null;
          out_for_delivery_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity: number;
          subtotal: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          quantity: number;
          subtotal: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      settlements: {
        Row: {
          id: string;
          restaurant_id: string;
          period_start: string;
          period_end: string;
          order_count: number;
          total_gmv: number;
          total_commission: number;
          total_delivery_fees: number;
          net_payout: number;
          status: Database['public']['Enums']['settlement_status'];
          paid_at: string | null;
          payment_reference: string | null;
          paid_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          period_start: string;
          period_end: string;
          order_count?: number;
          total_gmv?: number;
          total_commission?: number;
          total_delivery_fees?: number;
          net_payout?: number;
          status?: Database['public']['Enums']['settlement_status'];
          paid_at?: string | null;
          payment_reference?: string | null;
          paid_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settlements']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'settlements_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          action: string;
          actor_id: string | null;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          actor_id?: string | null;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
        Relationships: [];
      };
      restaurant_applications: {
        Row: {
          id: string;
          applicant_id: string;
          name: string;
          description: string | null;
          phone: string;
          address: string;
          city: Database['public']['Enums']['city_enum'];
          cuisine_tags: string[];
          delivery_fee: number;
          min_delivery_time: number;
          max_delivery_time: number;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_name: string | null;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          restaurant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          applicant_id: string;
          name: string;
          description?: string | null;
          phone: string;
          address: string;
          city: Database['public']['Enums']['city_enum'];
          cuisine_tags?: string[];
          delivery_fee?: number;
          min_delivery_time?: number;
          max_delivery_time?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_name?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          restaurant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurant_applications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'restaurant_applications_applicant_id_fkey';
            columns: ['applicant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'restaurant_applications_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      restaurants_public: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          phone: string;
          address: string;
          city: Database['public']['Enums']['city_enum'];
          image_url: string | null;
          cover_image_url: string | null;
          cuisine_tags: string[];
          delivery_fee: number;
          min_delivery_time: number;
          max_delivery_time: number;
          is_open: boolean;
          is_active: boolean;
          total_orders: number;
          average_rating: number;
          rating_count: number;
          created_at: string;
        };
        Relationships: [];
      };
      orders_for_restaurants: {
        Row: {
          id: string;
          order_number: string | null;
          restaurant_id: string;
          rider_id: string | null;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          delivery_fee: number;
          total: number;
          delivery_address: string;
          delivery_landmark: string | null;
          customer_name: string;
          customer_phone: string | null;
          notes: string | null;
          rating: number | null;
          rating_comment: string | null;
          confirmed_at: string | null;
          preparing_at: string | null;
          out_for_delivery_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      log_audit: {
        Args: {
          p_action: string;
          p_actor_id?: string | null;
          p_target_type?: string | null;
          p_target_id?: string | null;
          p_metadata?: Json;
          p_ip_address?: string | null;
        };
        Returns: string;
      };
      create_order_secure: {
        Args: {
          p_restaurant_id: string;
          p_items: Json;
          p_delivery_address: string;
          p_delivery_landmark?: string | null;
          p_customer_phone?: string | null;
          p_customer_name?: string | null;
          p_notes?: string | null;
        };
        Returns: { order_id: string; order_number: string; total: number }[];
      };
      set_restaurant_open_status: {
        Args: {
          p_restaurant_id: string;
          p_is_open: boolean;
        };
        Returns: boolean;
      };
      update_order_status_restaurant: {
        Args: {
          p_order_id: string;
          p_status: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'customer' | 'restaurant_owner' | 'rider' | 'admin';
      order_status:
        | 'awaiting_payment'
        | 'confirmed'
        | 'preparing'
        | 'out_for_delivery'
        | 'delivered'
        | 'cancelled';
      payment_method: 'opay_transfer' | 'paystack';
      settlement_status: 'pending' | 'paid';
      city_enum: 'aba' | 'umuahia';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
