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
      account_transactions: {
        Row: {
          conta_destino_id: string | null
          conta_origem_id: string | null
          created_at: string
          descricao: string
          expense_id: string | null
          id: string
          payment_id: string | null
          referencia: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          valor: number
        }
        Insert: {
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          descricao: string
          expense_id?: string | null
          id?: string
          payment_id?: string | null
          referencia?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          valor?: number
        }
        Update: {
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          descricao?: string
          expense_id?: string | null
          id?: string
          payment_id?: string | null
          referencia?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          entitlement_id: string | null
          fim_em: string
          id: string
          inicio_em: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["appointment_origin"]
          profissional_id: string
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          entitlement_id?: string | null
          fim_em: string
          id?: string
          inicio_em: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["appointment_origin"]
          profissional_id: string
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          entitlement_id?: string | null
          fim_em?: string
          id?: string
          inicio_em?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["appointment_origin"]
          profissional_id?: string
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          ativo: boolean
          banco: string | null
          created_at: string
          id: string
          nome: string
          saldo_atual: number
          saldo_inicial: number
          tipo: Database["public"]["Enums"]["bank_account_type"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          id?: string
          nome: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo: Database["public"]["Enums"]["bank_account_type"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: Database["public"]["Enums"]["bank_account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_entitlements: {
        Row: {
          client_id: string
          created_at: string
          expira_em: string | null
          id: string
          inicio_em: string
          observacoes: string | null
          product_plan_id: string
          saldo_creditos: number | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expira_em?: string | null
          id?: string
          inicio_em?: string
          observacoes?: string | null
          product_plan_id: string
          saldo_creditos?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expira_em?: string | null
          id?: string
          inicio_em?: string
          observacoes?: string | null
          product_plan_id?: string
          saldo_creditos?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_entitlements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_entitlements_product_plan_id_fkey"
            columns: ["product_plan_id"]
            isOneToOne: false
            referencedRelation: "product_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_records: {
        Row: {
          appointment_id: string | null
          client_id: string
          conteudo: string
          created_at: string
          data_registro: string
          id: string
          profissional_id: string
          tipo: Database["public"]["Enums"]["clinical_record_type"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          conteudo: string
          created_at?: string
          data_registro?: string
          id?: string
          profissional_id: string
          tipo?: Database["public"]["Enums"]["clinical_record_type"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          conteudo?: string
          created_at?: string
          data_registro?: string
          id?: string
          profissional_id?: string
          tipo?: Database["public"]["Enums"]["clinical_record_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_records_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          categoria: string
          created_at: string
          id: string
          percentual: number
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          percentual?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          categoria: Database["public"]["Enums"]["expense_category"]
          conta_origem_id: string | null
          created_at: string
          data_vencimento: string
          descricao: string
          id: string
          pago: boolean
          pago_em: string | null
          recorrente: boolean
          tipo: Database["public"]["Enums"]["expense_type"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["expense_category"]
          conta_origem_id?: string | null
          created_at?: string
          data_vencimento: string
          descricao: string
          id?: string
          pago?: boolean
          pago_em?: string | null
          recorrente?: boolean
          tipo: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["expense_category"]
          conta_origem_id?: string | null
          created_at?: string
          data_vencimento?: string
          descricao?: string
          id?: string
          pago?: boolean
          pago_em?: string | null
          recorrente?: boolean
          tipo?: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_config: {
        Row: {
          banner_url: string | null
          cor_fundo: string | null
          cor_primaria: string | null
          cor_texto: string | null
          created_at: string
          horario_funcionamento: string | null
          id: string
          link_instagram: string | null
          logo_url: string | null
          mensagem_boas_vindas: string | null
          nome_clinica: string
          subtitulo: string | null
          telefone_whatsapp: string | null
          updated_at: string
          whatsapp_mensagem: string | null
        }
        Insert: {
          banner_url?: string | null
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_texto?: string | null
          created_at?: string
          horario_funcionamento?: string | null
          id?: string
          link_instagram?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          nome_clinica?: string
          subtitulo?: string | null
          telefone_whatsapp?: string | null
          updated_at?: string
          whatsapp_mensagem?: string | null
        }
        Update: {
          banner_url?: string | null
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_texto?: string | null
          created_at?: string
          horario_funcionamento?: string | null
          id?: string
          link_instagram?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          nome_clinica?: string
          subtitulo?: string | null
          telefone_whatsapp?: string | null
          updated_at?: string
          whatsapp_mensagem?: string | null
        }
        Relationships: []
      }
      landing_testimonials: {
        Row: {
          ativo: boolean
          avaliacao: number
          created_at: string
          depoimento: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avaliacao?: number
          created_at?: string
          depoimento: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avaliacao?: number
          created_at?: string
          depoimento?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      makeup_classes: {
        Row: {
          client_id: string
          created_at: string
          entitlement_id: string
          id: string
          makeup_appointment_id: string | null
          original_appointment_id: string
          prazo_limite: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          entitlement_id: string
          id?: string
          makeup_appointment_id?: string | null
          original_appointment_id: string
          prazo_limite: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          entitlement_id?: string
          id?: string
          makeup_appointment_id?: string | null
          original_appointment_id?: string
          prazo_limite?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "makeup_classes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_makeup_appointment_id_fkey"
            columns: ["makeup_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_classes_original_appointment_id_fkey"
            columns: ["original_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          appointment_id: string | null
          client_id: string
          conta_destino_id: string | null
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["payment_method"]
          pago_em: string | null
          referencia: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          conta_destino_id?: string | null
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["payment_method"]
          pago_em?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          conta_destino_id?: string | null
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["payment_method"]
          pago_em?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_plans: {
        Row: {
          ativo: boolean
          aulas_por_mes: number | null
          categoria: Database["public"]["Enums"]["categoria"]
          created_at: string
          creditos_total: number | null
          desconto_familiar_pct: number | null
          desconto_indicacao_pct: number | null
          frequencia_pilates: string | null
          id: string
          ilimitado: boolean
          itens_combo: Json | null
          multa_cancelamento: number | null
          nome: string
          preco: number
          termo_fidelizacao: string | null
          tipo: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          validade_dias: number | null
          vigencia_meses: number | null
        }
        Insert: {
          ativo?: boolean
          aulas_por_mes?: number | null
          categoria: Database["public"]["Enums"]["categoria"]
          created_at?: string
          creditos_total?: number | null
          desconto_familiar_pct?: number | null
          desconto_indicacao_pct?: number | null
          frequencia_pilates?: string | null
          id?: string
          ilimitado?: boolean
          itens_combo?: Json | null
          multa_cancelamento?: number | null
          nome: string
          preco?: number
          termo_fidelizacao?: string | null
          tipo: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          validade_dias?: number | null
          vigencia_meses?: number | null
        }
        Update: {
          ativo?: boolean
          aulas_por_mes?: number | null
          categoria?: Database["public"]["Enums"]["categoria"]
          created_at?: string
          creditos_total?: number | null
          desconto_familiar_pct?: number | null
          desconto_indicacao_pct?: number | null
          frequencia_pilates?: string | null
          id?: string
          ilimitado?: boolean
          itens_combo?: Json | null
          multa_cancelamento?: number | null
          nome?: string
          preco?: number
          termo_fidelizacao?: string | null
          tipo?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          validade_dias?: number | null
          vigencia_meses?: number | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          ativo: boolean
          created_at: string
          especialidades: Database["public"]["Enums"]["categoria"][]
          id: string
          nome_exibicao: string
          updated_at: string
          user_id: string | null
          ve_todas_comissoes: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          especialidades?: Database["public"]["Enums"]["categoria"][]
          id?: string
          nome_exibicao: string
          updated_at?: string
          user_id?: string | null
          ve_todas_comissoes?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          especialidades?: Database["public"]["Enums"]["categoria"][]
          id?: string
          nome_exibicao?: string
          updated_at?: string
          user_id?: string | null
          ve_todas_comissoes?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
          ve_todas_vendas: boolean
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
          ve_todas_vendas?: boolean
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
          ve_todas_vendas?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          categoria: string
          client_id: string
          created_at: string
          entitlement_id: string | null
          id: string
          pago: boolean
          pago_em: string | null
          payment_id: string | null
          percentual_comissao: number
          seller_id: string
          seller_type: string
          updated_at: string
          valor_comissao: number
          valor_venda: number
        }
        Insert: {
          categoria: string
          client_id: string
          created_at?: string
          entitlement_id?: string | null
          id?: string
          pago?: boolean
          pago_em?: string | null
          payment_id?: string | null
          percentual_comissao?: number
          seller_id: string
          seller_type: string
          updated_at?: string
          valor_comissao?: number
          valor_venda?: number
        }
        Update: {
          categoria?: string
          client_id?: string
          created_at?: string
          entitlement_id?: string | null
          id?: string
          pago?: boolean
          pago_em?: string | null
          payment_id?: string | null
          percentual_comissao?: number
          seller_id?: string
          seller_type?: string
          updated_at?: string
          valor_comissao?: number
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "client_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["categoria"]
          created_at: string
          duracao_min: number
          id: string
          max_alunos: number | null
          nome: string
          permite_pacote: boolean
          preco_base: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: Database["public"]["Enums"]["categoria"]
          created_at?: string
          duracao_min?: number
          id?: string
          max_alunos?: number | null
          nome: string
          permite_pacote?: boolean
          preco_base?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria"]
          created_at?: string
          duracao_min?: number
          id?: string
          max_alunos?: number | null
          nome?: string
          permite_pacote?: boolean
          preco_base?: number
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      waitlist: {
        Row: {
          client_id: string
          created_at: string
          dia_semana: string | null
          horario_preferido: string | null
          id: string
          notificado_em: string | null
          observacoes: string | null
          profissional_id: string | null
          service_id: string
          status: Database["public"]["Enums"]["waitlist_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          dia_semana?: string | null
          horario_preferido?: string | null
          id?: string
          notificado_em?: string | null
          observacoes?: string | null
          profissional_id?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          dia_semana?: string | null
          horario_preferido?: string | null
          id?: string
          notificado_em?: string | null
          observacoes?: string | null
          profissional_id?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_lines: {
        Row: {
          access_token: string
          categorias: string[]
          confirm_enabled: boolean
          created_at: string
          id: string
          label: string
          phone_number_id: string
          receipt_enabled: boolean
          reminder_enabled: boolean
          updated_at: string
        }
        Insert: {
          access_token: string
          categorias?: string[]
          confirm_enabled?: boolean
          created_at?: string
          id?: string
          label: string
          phone_number_id: string
          receipt_enabled?: boolean
          reminder_enabled?: boolean
          updated_at?: string
        }
        Update: {
          access_token?: string
          categorias?: string[]
          confirm_enabled?: boolean
          created_at?: string
          id?: string
          label?: string
          phone_number_id?: string
          receipt_enabled?: boolean
          reminder_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_log: {
        Row: {
          appointment_id: string | null
          created_at: string
          destinatario: string
          erro: string | null
          id: string
          line_id: string | null
          meta_message_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          destinatario: string
          erro?: string | null
          id?: string
          line_id?: string | null
          meta_message_id?: string | null
          status?: string
          tipo: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          destinatario?: string
          erro?: string | null
          id?: string
          line_id?: string | null
          meta_message_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_log_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "recepcao" | "profissional" | "cliente"
      appointment_origin: "recepcao" | "cliente" | "profissional"
      appointment_status:
        | "reservado"
        | "confirmado"
        | "em_atendimento"
        | "concluido"
        | "faltou"
        | "cancelado"
      bank_account_type: "corrente" | "caixa" | "digital" | "maquininha"
      categoria: "pilates" | "fisioterapia" | "estetica"
      clinical_record_type: "anamnese" | "evolucao" | "observacao" | "alta"
      expense_category:
        | "aluguel"
        | "salarios"
        | "materiais"
        | "equipamentos"
        | "marketing"
        | "manutencao"
        | "impostos"
        | "outros"
      expense_type: "fixa" | "variavel"
      payment_method: "pix" | "cartao" | "dinheiro" | "transferencia" | "outro"
      payment_status: "pendente" | "pago" | "parcial" | "estornado" | "isento"
      plan_type:
        | "mensal_recorrente"
        | "pacote_creditos"
        | "combo_itens"
        | "creditos_estetica"
      transaction_type: "entrada" | "saida" | "transferencia"
      waitlist_status:
        | "aguardando"
        | "notificado"
        | "agendado"
        | "expirado"
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
      app_role: ["admin", "recepcao", "profissional", "cliente"],
      appointment_origin: ["recepcao", "cliente", "profissional"],
      appointment_status: [
        "reservado",
        "confirmado",
        "em_atendimento",
        "concluido",
        "faltou",
        "cancelado",
      ],
      bank_account_type: ["corrente", "caixa", "digital", "maquininha"],
      categoria: ["pilates", "fisioterapia", "estetica"],
      clinical_record_type: ["anamnese", "evolucao", "observacao", "alta"],
      expense_category: [
        "aluguel",
        "salarios",
        "materiais",
        "equipamentos",
        "marketing",
        "manutencao",
        "impostos",
        "outros",
      ],
      expense_type: ["fixa", "variavel"],
      payment_method: ["pix", "cartao", "dinheiro", "transferencia", "outro"],
      payment_status: ["pendente", "pago", "parcial", "estornado", "isento"],
      plan_type: [
        "mensal_recorrente",
        "pacote_creditos",
        "combo_itens",
        "creditos_estetica",
      ],
      transaction_type: ["entrada", "saida", "transferencia"],
      waitlist_status: [
        "aguardando",
        "notificado",
        "agendado",
        "expirado",
        "cancelado",
      ],
    },
  },
} as const
