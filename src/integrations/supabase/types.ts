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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          condominium_id: string
          created_at: string
          entry_time: string
          exit_time: string | null
          id: string
          logged_by: string | null
          service_company: string | null
          service_type: string | null
          unit_id: string | null
          visitor_document: string
          visitor_name: string
          visitor_type: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          entry_time?: string
          exit_time?: string | null
          id?: string
          logged_by?: string | null
          service_company?: string | null
          service_type?: string | null
          unit_id?: string | null
          visitor_document: string
          visitor_name: string
          visitor_type: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          entry_time?: string
          exit_time?: string | null
          id?: string
          logged_by?: string | null
          service_company?: string | null
          service_type?: string | null
          unit_id?: string | null
          visitor_document?: string
          visitor_name?: string
          visitor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_diagnostics: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis: string
          feedback_at: string | null
          feedback_comment: string | null
          feedback_resolved: boolean | null
          id: string
          impact: string | null
          log_id: string | null
          prevention: string | null
          related_logs: string[] | null
          root_cause: string | null
          solution: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis: string
          feedback_at?: string | null
          feedback_comment?: string | null
          feedback_resolved?: boolean | null
          id?: string
          impact?: string | null
          log_id?: string | null
          prevention?: string | null
          related_logs?: string[] | null
          root_cause?: string | null
          solution?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string
          feedback_at?: string | null
          feedback_comment?: string | null
          feedback_resolved?: boolean | null
          id?: string
          impact?: string | null
          log_id?: string | null
          prevention?: string | null
          related_logs?: string[] | null
          root_cause?: string | null
          solution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_diagnostics_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "system_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          answer: string
          category: string | null
          condominium_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          question: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          condominium_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          question?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          condominium_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          question?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_stats: {
        Row: {
          condominium_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          question: string
          question_category: string | null
          response_time_ms: number | null
          tools_used: string[] | null
          user_id: string
          was_resolved: boolean | null
        }
        Insert: {
          condominium_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          question: string
          question_category?: string | null
          response_time_ms?: number | null
          tools_used?: string[] | null
          user_id: string
          was_resolved?: boolean | null
        }
        Update: {
          condominium_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          question?: string
          question_category?: string | null
          response_time_ms?: number | null
          tools_used?: string[] | null
          user_id?: string
          was_resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_stats_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_stats_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      block_group_condominiums: {
        Row: {
          block_group_id: string
          condominium_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          block_group_id: string
          condominium_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          block_group_id?: string
          condominium_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_group_condominiums_block_group_id_fkey"
            columns: ["block_group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_group_condominiums_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      block_group_members: {
        Row: {
          block_group_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          block_group_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          block_group_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_group_members_block_group_id_fkey"
            columns: ["block_group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      block_groups: {
        Row: {
          block: string | null
          condominium_id: string
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          message_permission: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          block?: string | null
          condominium_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          message_permission?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          block?: string | null
          condominium_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          message_permission?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_groups_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      common_areas: {
        Row: {
          available_days: Json | null
          cancellation_policy: string | null
          capacity: number | null
          closing_time: string | null
          condominium_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          image_urls: Json | null
          name: string
          opening_time: string | null
          requires_approval: boolean | null
          rules: string | null
          updated_at: string | null
        }
        Insert: {
          available_days?: Json | null
          cancellation_policy?: string | null
          capacity?: number | null
          closing_time?: string | null
          condominium_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          name: string
          opening_time?: string | null
          requires_approval?: boolean | null
          rules?: string | null
          updated_at?: string | null
        }
        Update: {
          available_days?: Json | null
          cancellation_policy?: string | null
          capacity?: number | null
          closing_time?: string | null
          condominium_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          name?: string
          opening_time?: string | null
          requires_approval?: boolean | null
          rules?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "common_areas_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominium_expenses: {
        Row: {
          category: string
          condominium_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_month: number
          expense_year: number
          id: string
          invoice_number: string | null
          invoice_url: string | null
          is_apportioned: boolean
          supplier_name: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          category: string
          condominium_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_month: number
          expense_year: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_apportioned?: boolean
          supplier_name?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          category?: string
          condominium_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_month?: number
          expense_year?: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_apportioned?: boolean
          supplier_name?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominium_expenses_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condominium_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          total_units: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          total_units?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          total_units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominiums_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          condominium_id: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category: string
          condominium_id: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          condominium_id?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_readings: {
        Row: {
          calculated_amount: number | null
          condominium_id: string
          consumption_kwh: number | null
          created_at: string
          created_by: string | null
          current_reading: number
          financial_charge_id: string | null
          garage_identifier: string
          id: string
          meter_serial: string | null
          previous_reading: number
          rate_per_kwh: number
          reading_month: number
          reading_year: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          calculated_amount?: number | null
          condominium_id: string
          consumption_kwh?: number | null
          created_at?: string
          created_by?: string | null
          current_reading: number
          financial_charge_id?: string | null
          garage_identifier: string
          id?: string
          meter_serial?: string | null
          previous_reading?: number
          rate_per_kwh: number
          reading_month: number
          reading_year: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          calculated_amount?: number | null
          condominium_id?: string
          consumption_kwh?: number | null
          created_at?: string
          created_by?: string | null
          current_reading?: number
          financial_charge_id?: string | null
          garage_identifier?: string
          id?: string
          meter_serial?: string | null
          previous_reading?: number
          rate_per_kwh?: number
          reading_month?: number
          reading_year?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "electricity_readings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_financial_charge_id_fkey"
            columns: ["financial_charge_id"]
            isOneToOne: false
            referencedRelation: "financial_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          condominium_id: string
          contact: string | null
          created_at: string
          id: string
          name: string
          position: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          position: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      error_solutions: {
        Row: {
          created_at: string
          created_by: string | null
          effectiveness_score: number | null
          error_category: string
          error_pattern: string
          id: string
          last_applied_at: string | null
          prevention: string | null
          service: string | null
          solution: string
          times_applied: number | null
          times_resolved: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effectiveness_score?: number | null
          error_category: string
          error_pattern: string
          id?: string
          last_applied_at?: string | null
          prevention?: string | null
          service?: string | null
          solution: string
          times_applied?: number | null
          times_resolved?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effectiveness_score?: number | null
          error_category?: string
          error_pattern?: string
          id?: string
          last_applied_at?: string | null
          prevention?: string | null
          service?: string | null
          solution?: string
          times_applied?: number | null
          times_resolved?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_apportionments: {
        Row: {
          apportioned_amount: number
          created_at: string
          expense_id: string
          financial_charge_id: string | null
          id: string
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          apportioned_amount: number
          created_at?: string
          expense_id: string
          financial_charge_id?: string | null
          id?: string
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          apportioned_amount?: number
          created_at?: string
          expense_id?: string
          financial_charge_id?: string | null
          id?: string
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_apportionments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "condominium_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_apportionments_financial_charge_id_fkey"
            columns: ["financial_charge_id"]
            isOneToOne: false
            referencedRelation: "financial_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_apportionments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          message_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          message_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "feed_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_messages: {
        Row: {
          author_id: string
          condominium_id: string
          content: string
          created_at: string | null
          expires_at: string
          group_id: string | null
          id: string
          is_global: boolean | null
          media_type: string | null
          media_url: string | null
          reactions: Json | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          condominium_id: string
          content: string
          created_at?: string | null
          expires_at: string
          group_id?: string | null
          id?: string
          is_global?: boolean | null
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          condominium_id?: string
          content?: string
          created_at?: string | null
          expires_at?: string
          group_id?: string | null
          id?: string
          is_global?: boolean | null
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_messages_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_charges: {
        Row: {
          amount: number
          breakdown_details: Json | null
          charge_type: string
          condominium_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          breakdown_details?: Json | null
          charge_type: string
          condominium_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          breakdown_details?: Json | null
          charge_type?: string
          condominium_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_charges_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_readings: {
        Row: {
          created_at: string
          id: string
          reading_month: number
          reading_value: number
          reading_year: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reading_month: number
          reading_value: number
          reading_year: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reading_month?: number
          reading_value?: number
          reading_year?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gas_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_reads: {
        Row: {
          group_id: string
          id: string
          last_read_at: string | null
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_message_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          group_id: string
          id: string
          media_type: string | null
          media_url: string | null
          reply_to_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_request_updates: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          new_status: string | null
          old_status: string | null
          request_id: string
          updated_by: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          request_id: string
          updated_by?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          request_id?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_updates_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_updates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_updates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          category: string
          completed_at: string | null
          condominium_id: string
          created_at: string | null
          description: string
          id: string
          is_public: boolean | null
          location: string | null
          priority: string | null
          resident_id: string | null
          status: string | null
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          completed_at?: string | null
          condominium_id: string
          created_at?: string | null
          description: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          priority?: string | null
          resident_id?: string | null
          status?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          condominium_id?: string
          created_at?: string | null
          description?: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          priority?: string | null
          resident_id?: string | null
          status?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_maintenance_residents"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      mediation_responses: {
        Row: {
          created_at: string | null
          id: string
          mediation_id: string
          responder_resident_id: string
          response_content: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mediation_id: string
          responder_resident_id: string
          response_content: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mediation_id?: string
          responder_resident_id?: string
          response_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediation_responses_mediation_id_fkey"
            columns: ["mediation_id"]
            isOneToOne: false
            referencedRelation: "neighbor_mediations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediation_responses_responder_resident_id_fkey"
            columns: ["responder_resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbor_mediations: {
        Row: {
          complaint_reason: string
          condominium_id: string
          created_at: string | null
          id: string
          mediation_available_at: string
          occurrence_datetime: string
          requested_action: string
          requester_resident_id: string
          resolved_at: string | null
          response_deadline: string
          status: string | null
          syndic_intervention_requested: boolean | null
          syndic_notes: string | null
          target_unit_id: string
          updated_at: string | null
        }
        Insert: {
          complaint_reason: string
          condominium_id: string
          created_at?: string | null
          id?: string
          mediation_available_at: string
          occurrence_datetime: string
          requested_action: string
          requester_resident_id: string
          resolved_at?: string | null
          response_deadline: string
          status?: string | null
          syndic_intervention_requested?: boolean | null
          syndic_notes?: string | null
          target_unit_id: string
          updated_at?: string | null
        }
        Update: {
          complaint_reason?: string
          condominium_id?: string
          created_at?: string | null
          id?: string
          mediation_available_at?: string
          occurrence_datetime?: string
          requested_action?: string
          requester_resident_id?: string
          resolved_at?: string | null
          response_deadline?: string
          status?: string | null
          syndic_intervention_requested?: boolean | null
          syndic_notes?: string | null
          target_unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neighbor_mediations_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_mediations_requester_resident_id_fkey"
            columns: ["requester_resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neighbor_mediations_target_unit_id_fkey"
            columns: ["target_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_steps: Json
          created_at: string
          dismissed_at: string | null
          id: string
          tour_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: Json
          created_at?: string
          dismissed_at?: string | null
          id?: string
          tour_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: Json
          created_at?: string
          dismissed_at?: string | null
          id?: string
          tour_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_ai_config: {
        Row: {
          ai_api_key_encrypted: string | null
          ai_model: string | null
          ai_provider: string | null
          created_at: string | null
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          ai_api_key_encrypted?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          ai_api_key_encrypted?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          max_condominiums: number | null
          name: string
          owner_id: string | null
          plan: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_condominiums?: number | null
          name: string
          owner_id?: string | null
          plan?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_condominiums?: number | null
          name?: string
          owner_id?: string | null
          plan?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          collected_at: string | null
          created_at: string | null
          description: string | null
          id: string
          logged_by: string | null
          notes: string | null
          received_at: string | null
          sender: string | null
          status: string | null
          tracking_code: string | null
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          collected_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          received_at?: string | null
          sender?: string | null
          status?: string | null
          tracking_code?: string | null
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          collected_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logged_by?: string | null
          notes?: string | null
          received_at?: string | null
          sender?: string | null
          status?: string | null
          tracking_code?: string | null
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_packages_logged_by"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks: {
        Row: {
          charge_id: string | null
          created_at: string
          id: string
          processed: boolean
          webhook_data: Json
          webhook_event: string
        }
        Insert: {
          charge_id?: string | null
          created_at?: string
          id?: string
          processed?: boolean
          webhook_data: Json
          webhook_event: string
        }
        Update: {
          charge_id?: string | null
          created_at?: string
          id?: string
          processed?: boolean
          webhook_data?: Json
          webhook_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhooks_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "financial_charges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          last_seen_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reservation_checklist: {
        Row: {
          checked_at: string | null
          created_at: string | null
          id: string
          is_checked: boolean | null
          item_description: string
          notes: string | null
          reservation_id: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          item_description: string
          notes?: string | null
          reservation_id: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          item_description?: string
          notes?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_checklist_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_guests: {
        Row: {
          companion_count: number | null
          created_at: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          reservation_id: string
        }
        Insert: {
          companion_count?: number | null
          created_at?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          reservation_id: string
        }
        Update: {
          companion_count?: number | null
          created_at?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          common_area_id: string
          created_at: string | null
          end_time: string
          guests_count: number | null
          id: string
          notes: string | null
          reservation_date: string
          resident_id: string
          start_time: string
          status: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          common_area_id: string
          created_at?: string | null
          end_time: string
          guests_count?: number | null
          id?: string
          notes?: string | null
          reservation_date: string
          resident_id: string
          start_time: string
          status?: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          common_area_id?: string
          created_at?: string | null
          end_time?: string
          guests_count?: number | null
          id?: string
          notes?: string | null
          reservation_date?: string
          resident_id?: string
          start_time?: string
          status?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_residents"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_common_area_id_fkey"
            columns: ["common_area_id"]
            isOneToOne: false
            referencedRelation: "common_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          id: string
          is_active: boolean
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          resident_type: Database["public"]["Enums"]["resident_type"]
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          resident_type?: Database["public"]["Enums"]["resident_type"]
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_residents_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_credentials: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login_at: string | null
          must_change_password: boolean | null
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean | null
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean | null
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_service: string | null
          alert_type: string
          created_at: string
          description: string | null
          error_count: number | null
          first_occurrence: string
          id: string
          is_active: boolean | null
          last_occurrence: string
          metadata: Json | null
          related_log_ids: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_service?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          error_count?: number | null
          first_occurrence?: string
          id?: string
          is_active?: boolean | null
          last_occurrence?: string
          metadata?: Json | null
          related_log_ids?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_service?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          error_count?: number | null
          first_occurrence?: string
          id?: string
          is_active?: boolean | null
          last_occurrence?: string
          metadata?: Json | null
          related_log_ids?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          error_category: string | null
          first_seen_at: string | null
          function_name: string | null
          id: string
          ip_address: string | null
          level: string
          message: string
          metadata: Json | null
          request_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          service: string
          similar_count: number | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_category?: string | null
          first_seen_at?: string | null
          function_name?: string | null
          id?: string
          ip_address?: string | null
          level: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          service: string
          similar_count?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_category?: string | null
          first_seen_at?: string | null
          function_name?: string | null
          id?: string
          ip_address?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          service?: string
          similar_count?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_usage_stats: {
        Row: {
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_usage_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_members: {
        Row: {
          created_at: string
          full_name: string
          id: string
          nickname: string | null
          phone: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          nickname?: string | null
          phone?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          nickname?: string | null
          phone?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_users: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          nickname: string | null
          unit_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          nickname?: string | null
          unit_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          nickname?: string | null
          unit_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_users_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          block: string | null
          block_group_id: string | null
          condominium_id: string
          created_at: string
          floor: string | null
          id: string
          max_vehicles: number | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          block?: string | null
          block_group_id?: string | null
          condominium_id: string
          created_at?: string
          floor?: string | null
          id?: string
          max_vehicles?: number | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          block?: string | null
          block_group_id?: string | null
          condominium_id?: string
          created_at?: string
          floor?: string | null
          id?: string
          max_vehicles?: number | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_block_group_id_fkey"
            columns: ["block_group_id"]
            isOneToOne: false
            referencedRelation: "block_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_rates: {
        Row: {
          condominium_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean
          rate_per_unit: number
          unit_label: string
          updated_at: string
          utility_type: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          rate_per_unit: number
          unit_label?: string
          updated_at?: string
          utility_type: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          rate_per_unit?: number
          unit_label?: string
          updated_at?: string
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_rates_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          model: string
          plate: string
          resident_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          model: string
          plate: string
          resident_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          model?: string
          plate?: string
          resident_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_authorizations: {
        Row: {
          authorization_date: string
          created_at: string | null
          document_url: string | null
          id: string
          notes: string | null
          resident_id: string
          service_type: string | null
          status: string | null
          unit_id: string
          updated_at: string | null
          valid_from: string
          valid_until: string
          visitor_document: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          authorization_date: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          resident_id: string
          service_type?: string | null
          status?: string | null
          unit_id: string
          updated_at?: string | null
          valid_from: string
          valid_until: string
          visitor_document: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          authorization_date?: string
          created_at?: string | null
          document_url?: string | null
          id?: string
          notes?: string | null
          resident_id?: string
          service_type?: string | null
          status?: string | null
          unit_id?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
          visitor_document?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_visitor_auth_residents"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_authorizations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_authorizations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      water_readings: {
        Row: {
          calculated_amount: number | null
          condominium_id: string
          consumption_m3: number | null
          created_at: string
          created_by: string | null
          current_reading: number
          financial_charge_id: string | null
          id: string
          previous_reading: number
          rate_per_m3: number
          reading_month: number
          reading_year: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          calculated_amount?: number | null
          condominium_id: string
          consumption_m3?: number | null
          created_at?: string
          created_by?: string | null
          current_reading: number
          financial_charge_id?: string | null
          id?: string
          previous_reading?: number
          rate_per_m3: number
          reading_month: number
          reading_year: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          calculated_amount?: number | null
          condominium_id?: string
          consumption_m3?: number | null
          created_at?: string
          created_by?: string | null
          current_reading?: number
          financial_charge_id?: string | null
          id?: string
          previous_reading?: number
          rate_per_m3?: number
          reading_month?: number
          reading_year?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_readings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_readings_financial_charge_id_fkey"
            columns: ["financial_charge_id"]
            isOneToOne: false
            referencedRelation: "financial_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      categorize_error: {
        Args: { message: string; service: string }
        Returns: string
      }
      get_cron_schedule: { Args: never; Returns: Json }
      get_user_organization_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_organization_access: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_organization_owner: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_resident_of_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      schedule_monthly_charges: {
        Args: {
          auth_token: string
          cron_expression: string
          function_url: string
        }
        Returns: undefined
      }
      unschedule_monthly_charges: { Args: never; Returns: undefined }
      update_overdue_charges: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "sindico" | "administrador" | "morador" | "porteiro" | "owner"
      resident_type: "proprietario" | "inquilino"
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
      app_role: ["sindico", "administrador", "morador", "porteiro", "owner"],
      resident_type: ["proprietario", "inquilino"],
    },
  },
} as const
