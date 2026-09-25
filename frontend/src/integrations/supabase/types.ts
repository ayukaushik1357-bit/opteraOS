export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_action_logs: {
        Row: {
          action_type: string;
          created_at: string;
          error_message: string | null;
          id: string;
          input: Json;
          org_id: string;
          output: Json;
          status: string;
          user_id: string;
        };
        Insert: {
          action_type: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          input?: Json;
          org_id: string;
          output?: Json;
          status?: string;
          user_id: string;
        };
        Update: {
          action_type?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          input?: Json;
          org_id?: string;
          output?: Json;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_action_logs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          action_recommended: string | null;
          created_at: string;
          description: string;
          id: string;
          metadata: Json;
          org_id: string;
          title: string;
          type: string;
        };
        Insert: {
          action_recommended?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          metadata?: Json;
          org_id: string;
          title: string;
          type: string;
        };
        Update: {
          action_recommended?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json;
          org_id?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_insights_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          org_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          org_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          org_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          company: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          org_id: string;
          phone: string | null;
          status: Database["public"]["Enums"]["customer_status"];
          updated_at: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          org_id: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["customer_status"];
          updated_at?: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          org_id?: string;
          phone?: string | null;
          status?: Database["public"]["Enums"]["customer_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          expected_close: string | null;
          id: string;
          org_id: string;
          stage: Database["public"]["Enums"]["deal_stage"];
          title: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          expected_close?: string | null;
          id?: string;
          org_id: string;
          stage?: Database["public"]["Enums"]["deal_stage"];
          title: string;
          updated_at?: string;
          value?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          expected_close?: string | null;
          id?: string;
          org_id?: string;
          stage?: Database["public"]["Enums"]["deal_stage"];
          title?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      // SYNC NOTE: Columns below (line_items, tax_rate, invoice_number) were added by
      // migration 20260814130000_add_invoice_line_items.sql. Types are manually
      // synchronized because Docker is unavailable for local type generation and
      // SUPABASE_ACCESS_TOKEN is not configured for remote generation.
      // After applying the migration to remote and configuring the access token, run:
      //   npx supabase gen types typescript --project-id zoyhmqerdehetsveyrjz > src/integrations/supabase/types.ts
      invoices: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          due_date: string | null;
          id: string;
          issue_date: string;
          /** Generated column: always equals `number`. Read-only. */
          invoice_number: string;
          /** JSON array of line items: [{description, quantity, unit_price}] */
          line_items: Json | null;
          number: string;
          org_id: string;
          paid_at: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          /** Tax percentage (0-100). 18 = 18% GST. 0 = no tax. */
          tax_rate: number;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          due_date?: string | null;
          id?: string;
          issue_date?: string;
          /** invoice_number is GENERATED ALWAYS — do not insert. */
          /** line_items is optional jsonb */
          line_items?: Json | null;
          number: string;
          org_id: string;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          tax_rate?: number;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          due_date?: string | null;
          id?: string;
          issue_date?: string;
          /** invoice_number is GENERATED ALWAYS — do not update. */
          line_items?: Json | null;
          number?: string;
          org_id?: string;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          tax_rate?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          company: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          org_id: string;
          owner_id: string | null;
          phone: string | null;
          score: number;
          source: string | null;
          stage: Database["public"]["Enums"]["lead_stage"];
          updated_at: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          org_id: string;
          owner_id?: string | null;
          phone?: string | null;
          score?: number;
          source?: string | null;
          stage?: Database["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          org_id?: string;
          owner_id?: string | null;
          phone?: string | null;
          score?: number;
          source?: string | null;
          stage?: Database["public"]["Enums"]["lead_stage"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invites: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: Database["public"]["Enums"]["invite_status"];
          token: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: Database["public"]["Enums"]["invite_status"];
          token?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: Database["public"]["Enums"]["invite_status"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invites_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          name: string;
          owner_id: string;
          plan: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          name: string;
          owner_id: string;
          plan?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          plan?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          description: string | null;
          assignee_id: string | null;
          priority: "Low" | "Medium" | "High" | "Urgent";
          due_date: string | null;
          status: "Todo" | "In Progress" | "Completed" | "Cancelled";
          customer_id: string | null;
          deal_id: string | null;
          work_type: "task" | "lead_follow_up" | "customer_follow_up" | "invoice_follow_up" | "approval" | "escalation" | "report_generation" | "ai_action" | "communication";
          work_group_id: string | null;
          lead_id: string | null;
          invoice_id: string | null;
          customer_group_id: string | null;
          source: "manual" | "autopilot" | "ai_command" | "escalation" | "scheduled";
          autopilot_id: string | null;
          outcome_notes: string | null;
          completed_by: string | null;
          completed_at: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          priority?: "Low" | "Medium" | "High" | "Urgent";
          due_date?: string | null;
          status?: "Todo" | "In Progress" | "Completed" | "Cancelled";
          customer_id?: string | null;
          deal_id?: string | null;
          work_type?: "task" | "lead_follow_up" | "customer_follow_up" | "invoice_follow_up" | "approval" | "escalation" | "report_generation" | "ai_action" | "communication";
          work_group_id?: string | null;
          lead_id?: string | null;
          invoice_id?: string | null;
          customer_group_id?: string | null;
          source?: "manual" | "autopilot" | "ai_command" | "escalation" | "scheduled";
          autopilot_id?: string | null;
          outcome_notes?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          title?: string;
          description?: string | null;
          assignee_id?: string | null;
          priority?: "Low" | "Medium" | "High" | "Urgent";
          due_date?: string | null;
          status?: "Todo" | "In Progress" | "Completed" | "Cancelled";
          customer_id?: string | null;
          deal_id?: string | null;
          work_type?: "task" | "lead_follow_up" | "customer_follow_up" | "invoice_follow_up" | "approval" | "escalation" | "report_generation" | "ai_action" | "communication";
          work_group_id?: string | null;
          lead_id?: string | null;
          invoice_id?: string | null;
          customer_group_id?: string | null;
          source?: "manual" | "autopilot" | "ai_command" | "escalation" | "scheduled";
          autopilot_id?: string | null;
          outcome_notes?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          org_id: string;
          type: "call" | "meeting" | "email" | "note" | "follow_up" | "status_change";
          title: string;
          description: string | null;
          customer_id: string | null;
          deal_id: string | null;
          lead_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          type: "call" | "meeting" | "email" | "note" | "follow_up" | "status_change";
          title: string;
          description?: string | null;
          customer_id?: string | null;
          deal_id?: string | null;
          lead_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          type?: "call" | "meeting" | "email" | "note" | "follow_up" | "status_change";
          title?: string;
          description?: string | null;
          customer_id?: string | null;
          deal_id?: string | null;
          lead_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          title: string;
          message: string;
          type: "task_assigned" | "task_overdue" | "lead_new" | "deal_update" | "invoice_overdue" | "automation_failure" | "ai_action_required" | "system_alert" | "info";
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          title: string;
          message: string;
          type?: "task_assigned" | "task_overdue" | "lead_new" | "deal_update" | "invoice_overdue" | "automation_failure" | "ai_action_required" | "system_alert" | "info";
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: "task_assigned" | "task_overdue" | "lead_new" | "deal_update" | "invoice_overdue" | "automation_failure" | "ai_action_required" | "system_alert" | "info";
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          file_type: string;
          file_size: number;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          file_type?: string;
          file_size?: number;
          content: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          file_type?: string;
          file_size?: number;
          content?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      document_chunks: {
        Row: {
          id: string;
          org_id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          document_id: string;
          chunk_index?: number;
          content: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_chunks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          org_id: string;
          invoice_id: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount: number;
          currency: string;
          status: string;
          method: string | null;
          error_code: string | null;
          error_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          invoice_id: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          invoice_id?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      processed_webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      // SYNC NOTE: customer_registration_tokens added by migration 20260816100000.
      // Manually added here; regenerate types once Supabase CLI auth is available.
      customer_registration_tokens: {
        Row: {
          id: string;
          org_id: string;
          token: string;
          label: string | null;
          created_by: string;
          is_active: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          token?: string;
          label?: string | null;
          created_by: string;
          is_active?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          token?: string;
          label?: string | null;
          created_by?: string;
          is_active?: boolean;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_registration_tokens_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      // SYNC NOTE: organization_invite_links added by migration 20260816110000.
      // Manually added here; regenerate types once Supabase CLI auth is available.
      organization_invite_links: {
        Row: {
          id: string;
          org_id: string;
          token: string;
          role: Database["public"]["Enums"]["org_role"];
          invited_by: string;
          max_uses: number | null;
          used_count: number;
          status: Database["public"]["Enums"]["invite_status"];
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          token?: string;
          role?: Database["public"]["Enums"]["org_role"];
          invited_by: string;
          max_uses?: number | null;
          used_count?: number;
          status?: Database["public"]["Enums"]["invite_status"];
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          token?: string;
          role?: Database["public"]["Enums"]["org_role"];
          invited_by?: string;
          max_uses?: number | null;
          used_count?: number;
          status?: Database["public"]["Enums"]["invite_status"];
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invite_links_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workflows: {
        Row: {
          activated_at: string | null;
          active: boolean;
          assignment_strategy: string | null;
          conditions: Json;
          actions: Json;
          created_at: string;
          created_by: string | null;
          description: string | null;
          edges: Json;
          id: string;
          name: string;
          nodes: Json;
          org_id: string;
          target_department_id: string | null;
          target_team_id: string | null;
          category: "sales" | "customer_success" | "finance" | "management" | "marketing" | "operations" | "custom";
          is_autopilot: boolean;
          customer_group_id: string | null;
          target_work_group_id: string | null;
          human_summary: string | null;
          goal_prompt: string | null;
          schedule: string | null;
          config: Json;
          execution_stats: Json;
          trigger_config: Json;
          trigger_type: string;
          updated_at: string;
          version: number;
          webhook_url: string | null;
        };
        Insert: {
          activated_at?: string | null;
          active?: boolean;
          assignment_strategy?: string | null;
          conditions?: Json;
          actions?: Json;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          edges?: Json;
          id?: string;
          name: string;
          nodes?: Json;
          org_id: string;
          target_department_id?: string | null;
          target_team_id?: string | null;
          category?: "sales" | "customer_success" | "finance" | "management" | "marketing" | "operations" | "custom";
          is_autopilot?: boolean;
          customer_group_id?: string | null;
          target_work_group_id?: string | null;
          human_summary?: string | null;
          goal_prompt?: string | null;
          schedule?: string | null;
          config?: Json;
          execution_stats?: Json;
          trigger_config?: Json;
          trigger_type: string;
          updated_at?: string;
          version?: number;
          webhook_url?: string | null;
        };
        Update: {
          activated_at?: string | null;
          active?: boolean;
          assignment_strategy?: string | null;
          conditions?: Json;
          actions?: Json;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          edges?: Json;
          id?: string;
          name?: string;
          nodes?: Json;
          org_id?: string;
          target_department_id?: string | null;
          target_team_id?: string | null;
          category?: "sales" | "customer_success" | "finance" | "management" | "marketing" | "operations" | "custom";
          is_autopilot?: boolean;
          customer_group_id?: string | null;
          target_work_group_id?: string | null;
          human_summary?: string | null;
          goal_prompt?: string | null;
          schedule?: string | null;
          config?: Json;
          execution_stats?: Json;
          trigger_config?: Json;
          trigger_type?: string;
          updated_at?: string;
          version?: number;
          webhook_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workflows_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_executions: {
        Row: {
          completed_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          id: string;
          input_payload: Json | null;
          org_id: string;
          output_payload: Json | null;
          started_at: string;
          status: string;
          trigger_event: string;
          workflow_id: string;
        };
        Insert: {
          completed_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          input_payload?: Json | null;
          org_id: string;
          output_payload?: Json | null;
          started_at?: string;
          status?: string;
          trigger_event: string;
          workflow_id: string;
        };
        Update: {
          completed_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          input_payload?: Json | null;
          org_id?: string;
          output_payload?: Json | null;
          started_at?: string;
          status?: string;
          trigger_event?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_executions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_execution_logs: {
        Row: {
          completed_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          execution_id: string;
          id: string;
          input: Json | null;
          node_id: string;
          node_label: string | null;
          node_type: string;
          org_id: string;
          output: Json | null;
          started_at: string;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          execution_id: string;
          id?: string;
          input?: Json | null;
          node_id: string;
          node_label?: string | null;
          node_type: string;
          org_id: string;
          output?: Json | null;
          started_at?: string;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          execution_id?: string;
          id?: string;
          input?: Json | null;
          node_id?: string;
          node_label?: string | null;
          node_type?: string;
          org_id?: string;
          output?: Json | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "workflow_executions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_execution_logs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_groups: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          criteria: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string;
          criteria?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          criteria?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_groups_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_group_members: {
        Row: {
          id: string;
          org_id: string;
          group_id: string;
          customer_id: string;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          group_id: string;
          customer_id: string;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          group_id?: string;
          customer_id?: string;
          added_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "customer_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_group_members_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      work_groups: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          department_id: string | null;
          assignment_strategy: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          skills: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string;
          department_id?: string | null;
          assignment_strategy?: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          skills?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          department_id?: string | null;
          assignment_strategy?: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          skills?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_groups_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      work_group_members: {
        Row: {
          id: string;
          org_id: string;
          group_id: string;
          user_id: string;
          member_id: string | null;
          role: "lead" | "senior" | "member" | "specialist";
          skills: string[];
          max_workload: number;
          status: "active" | "away" | "offline" | "busy";
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          group_id: string;
          user_id: string;
          member_id?: string | null;
          role?: "lead" | "senior" | "member" | "specialist";
          skills?: string[];
          max_workload?: number;
          status?: "active" | "away" | "offline" | "busy";
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          group_id?: string;
          user_id?: string;
          member_id?: string | null;
          role?: "lead" | "senior" | "member" | "specialist";
          skills?: string[];
          max_workload?: number;
          status?: "active" | "away" | "offline" | "busy";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "work_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_rules: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          event_type: "new_lead" | "new_customer" | "overdue_invoice" | "at_risk_customer" | "task_escalation" | "deal_stage_change" | "custom_event";
          customer_group_id: string | null;
          target_work_group_id: string | null;
          target_user_id: string | null;
          strategy: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          conditions: Json;
          actions: Json;
          active: boolean;
          priority: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          event_type: "new_lead" | "new_customer" | "overdue_invoice" | "at_risk_customer" | "task_escalation" | "deal_stage_change" | "custom_event";
          customer_group_id?: string | null;
          target_work_group_id?: string | null;
          target_user_id?: string | null;
          strategy?: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          conditions?: Json;
          actions?: Json;
          active?: boolean;
          priority?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          event_type?: "new_lead" | "new_customer" | "overdue_invoice" | "at_risk_customer" | "task_escalation" | "deal_stage_change" | "custom_event";
          customer_group_id?: string | null;
          target_work_group_id?: string | null;
          target_user_id?: string | null;
          strategy?: "round_robin" | "lowest_workload" | "skill_based" | "ai_assignment" | "direct" | "all_members";
          conditions?: Json;
          actions?: Json;
          active?: boolean;
          priority?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_rules_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_org_role: {
        Args: {
          _org_id: string;
          _roles: Database["public"]["Enums"]["org_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_org_member: {
        Args: { _org_id: string; _user_id: string };
        Returns: boolean;
      };
      // SYNC NOTE: match_document_chunks was added by migration 20260814110000.
      // Manually added here; regenerate types once Supabase CLI auth is available.
      match_document_chunks: {
        Args: {
          query_embedding: string;   // pgvector serialized as '[x1,x2,...]'
          match_threshold: number;
          match_count: number;
          p_org_id: string;
        };
        Returns: {
          id: string;
          document_id: string;
          content: string;
          metadata: Json | null;
          similarity: number;
        }[];
      };
    };
    Enums: {
      customer_status: "active" | "prospect" | "churned";
      deal_stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
      invite_status: "pending" | "accepted" | "revoked";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void";
      lead_stage: "new" | "contacted" | "qualified" | "unqualified";
      org_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      customer_status: ["active", "prospect", "churned"],
      deal_stage: ["lead", "qualified", "proposal", "negotiation", "won", "lost"],
      invite_status: ["pending", "accepted", "revoked"],
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      lead_stage: ["new", "contacted", "qualified", "unqualified"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const;
