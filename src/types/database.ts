export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orgs']['Insert']>;
      };
      org_members: {
        Row: {
          org_id: string;
          user_id: string;
        };
        Insert: {
          org_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['org_members']['Insert']>;
      };
      uploads: {
        Row: {
          id: string;
          org_id: string;
          filename: string;
          storage_path: string;
          kind: 'opportunities' | 'activities';
          status: 'uploaded' | 'processing' | 'done' | 'failed';
          error_message: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          filename: string;
          storage_path: string;
          kind: 'opportunities' | 'activities';
          status?: 'uploaded' | 'processing' | 'done' | 'failed';
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['uploads']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          org_id: string;
          upload_id: string | null;
          crm_source: string;
          crm_hash: string;
          pipeline_name: string | null;
          stage_name: string | null;
          stage_timing_days: number | null;
          owner_email: string | null;
          owner_name: string | null;
          company_name: string | null;
          title: string | null;
          value: number | null;
          created_date: string | null;
          closed_date: string | null;
          status: 'open' | 'won' | 'lost' | null;
          tags: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          upload_id?: string | null;
          crm_source?: string;
          crm_hash: string;
          pipeline_name?: string | null;
          stage_name?: string | null;
          stage_timing_days?: number | null;
          owner_email?: string | null;
          owner_name?: string | null;
          company_name?: string | null;
          title?: string | null;
          value?: number | null;
          created_date?: string | null;
          closed_date?: string | null;
          status?: 'open' | 'won' | 'lost' | null;
          tags?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          org_id: string;
          upload_id: string | null;
          crm_activity_id: string | null;
          type: string | null;
          title: string | null;
          owner: string | null;
          start_at: string | null;
          due_at: string | null;
          done_at: string | null;
          created_at_crm: string | null;
          status: string | null;
          opportunity_id_crm: string | null;
          pipeline_name: string | null;
          stage_name: string | null;
          company_name: string | null;
          opportunity_title: string | null;
          opportunity_owner_name: string | null;
          linked_opportunity_hash: string | null;
          link_confidence: 'high' | 'medium' | 'low' | 'none';
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          upload_id?: string | null;
          crm_activity_id?: string | null;
          type?: string | null;
          title?: string | null;
          owner?: string | null;
          start_at?: string | null;
          due_at?: string | null;
          done_at?: string | null;
          created_at_crm?: string | null;
          status?: string | null;
          opportunity_id_crm?: string | null;
          pipeline_name?: string | null;
          stage_name?: string | null;
          company_name?: string | null;
          opportunity_title?: string | null;
          opportunity_owner_name?: string | null;
          linked_opportunity_hash?: string | null;
          link_confidence?: 'high' | 'medium' | 'low' | 'none';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          org_id: string;
          upload_id: string | null;
          generated_at: string;
          snapshot_json: Json;
          frictions_json: Json;
          pillar_scores_json: Json;
          impact_json: Json;
        };
        Insert: {
          id?: string;
          org_id: string;
          upload_id?: string | null;
          generated_at?: string;
          snapshot_json?: Json;
          frictions_json?: Json;
          pillar_scores_json?: Json;
          impact_json?: Json;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
      org_config: {
        Row: {
          org_id: string;
          org_display_name: string | null;
          dias_proposta_risco: number | null;
          dias_pipeline_abandonado: number | null;
          dias_aging_inflado: number | null;
          dias_aprovacao_travada: number | null;
          notificar_email: boolean | null;
          email_notificacoes: string | null;
          incluir_convite_calendario: boolean | null;
          top_deals_por_friccao: number | null;
          top_evidencias_por_friccao: number | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          org_id: string;
          org_display_name?: string | null;
          dias_proposta_risco?: number | null;
          dias_pipeline_abandonado?: number | null;
          dias_aging_inflado?: number | null;
          dias_aprovacao_travada?: number | null;
          notificar_email?: boolean | null;
          email_notificacoes?: string | null;
          incluir_convite_calendario?: boolean | null;
          top_deals_por_friccao?: number | null;
          top_evidencias_por_friccao?: number | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['org_config']['Insert']>;
      };
      crm_integrations: {
        Row: {
          id: string;
          org_id: string;
          provider: 'piperun' | 'pipedrive' | 'hubspot' | 'generic' | 'n8n_webhook';
          api_key_encrypted: string | null;
          api_url: string | null;
          webhook_secret: string | null;
          webhook_enabled: boolean | null;
          field_mapping_json: Json | null;
          last_sync_at: string | null;
          last_sync_status: string | null;
          last_sync_error: string | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider: 'piperun' | 'pipedrive' | 'hubspot' | 'generic' | 'n8n_webhook';
          api_key_encrypted?: string | null;
          api_url?: string | null;
          webhook_secret?: string | null;
          webhook_enabled?: boolean | null;
          field_mapping_json?: Json | null;
          last_sync_at?: string | null;
          last_sync_status?: string | null;
          last_sync_error?: string | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['crm_integrations']['Insert']>;
      };
    };
  };
}
