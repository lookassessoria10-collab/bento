
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "acao": string,"created_at": string,"detalhes": NonNullable<Json>,"entidade": string,"entidade_id": string | null,"id": number,"organization_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"created_at"?: string,"detalhes"?: NonNullable<Json>,"entidade": string,"entidade_id"?: string | null,"id"?: never,"organization_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"created_at"?: string,"detalhes"?: NonNullable<Json>,"entidade"?: string,"entidade_id"?: string | null,"id"?: never,"organization_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"approval_decisions": {
                  Row: {
                    "comprovante_file_id": string | null,"created_at": string,"data_confirmacao": string | null,"decidido_por": string,"decisao": Database["public"]['Enums']["approval_decision"],"escopo_canais": (Database["public"]['Enums']["channel"])[],"etapa": Database["public"]['Enums']["approval_stage"],"externo": boolean,"id": string,"item_id": string,"metodo_confirmacao": string | null,"motivo": string | null,"organization_id": string,"papel": string,"pessoa_externa_id": string | null,"request_id": string | null,"version_hash": string,"version_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comprovante_file_id"?: string | null,"created_at"?: string,"data_confirmacao"?: string | null,"decidido_por": string,"decisao": Database["public"]['Enums']["approval_decision"],"escopo_canais"?: (Database["public"]['Enums']["channel"])[],"etapa": Database["public"]['Enums']["approval_stage"],"externo"?: boolean,"id"?: string,"item_id": string,"metodo_confirmacao"?: string | null,"motivo"?: string | null,"organization_id": string,"papel": string,"pessoa_externa_id"?: string | null,"request_id"?: string | null,"version_hash": string,"version_id": string
                  }
                  Update: {
                    "comprovante_file_id"?: string | null,"created_at"?: string,"data_confirmacao"?: string | null,"decidido_por"?: string,"decisao"?: Database["public"]['Enums']["approval_decision"],"escopo_canais"?: (Database["public"]['Enums']["channel"])[],"etapa"?: Database["public"]['Enums']["approval_stage"],"externo"?: boolean,"id"?: string,"item_id"?: string,"metodo_confirmacao"?: string | null,"motivo"?: string | null,"organization_id"?: string,"papel"?: string,"pessoa_externa_id"?: string | null,"request_id"?: string | null,"version_hash"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_decisions_comprovante_file_id_organization_id_fkey"
      columns: ["comprovante_file_id","organization_id"]
isOneToOne: false
      referencedRelation: "files"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "approval_decisions_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_decisions_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "approval_decisions_pessoa_externa_id_organization_id_fkey"
      columns: ["pessoa_externa_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "approval_decisions_version_id_organization_id_fkey"
      columns: ["version_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"approval_requests": {
                  Row: {
                    "concluida_em": string | null,"created_at": string,"created_by": string | null,"etapa": Database["public"]['Enums']["approval_stage"],"id": string,"item_id": string,"organization_id": string,"prazo": string | null,"revisor_id": string | null,"revisor_person_id": string | null,"status": string,"version_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concluida_em"?: string | null,"created_at"?: string,"created_by"?: string | null,"etapa": Database["public"]['Enums']["approval_stage"],"id"?: string,"item_id": string,"organization_id": string,"prazo"?: string | null,"revisor_id"?: string | null,"revisor_person_id"?: string | null,"status"?: string,"version_id": string
                  }
                  Update: {
                    "concluida_em"?: string | null,"created_at"?: string,"created_by"?: string | null,"etapa"?: Database["public"]['Enums']["approval_stage"],"id"?: string,"item_id"?: string,"organization_id"?: string,"prazo"?: string | null,"revisor_id"?: string | null,"revisor_person_id"?: string | null,"status"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_requests_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "approval_requests_revisor_id_fkey"
      columns: ["revisor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_requests_version_id_organization_id_fkey"
      columns: ["version_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"audience_feedback": {
                  Row: {
                    "clareza": number | null,"comentario": string | null,"consentimento": boolean,"created_at": string,"id": string,"moderacao": string,"organization_id": string,"origem_hash": string | null,"perfil": string | null,"public_publication_id": string | null,"sugestao_pauta": string | null,"utilidade": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "clareza"?: number | null,"comentario"?: string | null,"consentimento": boolean,"created_at"?: string,"id"?: string,"moderacao"?: string,"organization_id": string,"origem_hash"?: string | null,"perfil"?: string | null,"public_publication_id"?: string | null,"sugestao_pauta"?: string | null,"utilidade"?: number | null
                  }
                  Update: {
                    "clareza"?: number | null,"comentario"?: string | null,"consentimento"?: boolean,"created_at"?: string,"id"?: string,"moderacao"?: string,"organization_id"?: string,"origem_hash"?: string | null,"perfil"?: string | null,"public_publication_id"?: string | null,"sugestao_pauta"?: string | null,"utilidade"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audience_feedback_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audience_feedback_public_publication_id_fkey"
      columns: ["public_publication_id"]
isOneToOne: false
      referencedRelation: "public_publications"
      referencedColumns: ["id"]
    }
                  ]
                },"audience_questions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"editorial_item_id": string | null,"id": string,"organization_id": string,"origem": string,"pergunta": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"editorial_item_id"?: string | null,"id"?: string,"organization_id": string,"origem"?: string,"pergunta": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"editorial_item_id"?: string | null,"id"?: string,"organization_id"?: string,"origem"?: string,"pergunta"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audience_questions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audience_questions_editorial_item_id_organization_id_fkey"
      columns: ["editorial_item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "audience_questions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"bulletin_editions": {
                  Row: {
                    "apresentacao": string | null,"capa_file_id": string | null,"created_at": string,"data_fechamento": string | null,"data_prevista": string | null,"editorial_item_id": string,"equipe_editorial": string | null,"id": string,"is_demo": boolean,"numero": number,"organization_id": string,"periodo_fim": string | null,"periodo_inicio": string | null,"updated_at": string,"volume": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "apresentacao"?: string | null,"capa_file_id"?: string | null,"created_at"?: string,"data_fechamento"?: string | null,"data_prevista"?: string | null,"editorial_item_id": string,"equipe_editorial"?: string | null,"id"?: string,"is_demo"?: boolean,"numero": number,"organization_id": string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"updated_at"?: string,"volume"?: string | null
                  }
                  Update: {
                    "apresentacao"?: string | null,"capa_file_id"?: string | null,"created_at"?: string,"data_fechamento"?: string | null,"data_prevista"?: string | null,"editorial_item_id"?: string,"equipe_editorial"?: string | null,"id"?: string,"is_demo"?: boolean,"numero"?: number,"organization_id"?: string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"updated_at"?: string,"volume"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bulletin_editions_capa_file_id_organization_id_fkey"
      columns: ["capa_file_id","organization_id"]
isOneToOne: false
      referencedRelation: "files"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "bulletin_editions_editorial_item_id_organization_id_fkey"
      columns: ["editorial_item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"bulletin_sections": {
                  Row: {
                    "bulletin_id": string,"corpo": string,"experiment_id": string | null,"file_ids": (string)[],"id": string,"ordem": number,"organization_id": string,"referencias": string | null,"result_ids": (string)[],"tipo": string,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bulletin_id": string,"corpo"?: string,"experiment_id"?: string | null,"file_ids"?: (string)[],"id"?: string,"ordem"?: number,"organization_id": string,"referencias"?: string | null,"result_ids"?: (string)[],"tipo": string,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "bulletin_id"?: string,"corpo"?: string,"experiment_id"?: string | null,"file_ids"?: (string)[],"id"?: string,"ordem"?: number,"organization_id"?: string,"referencias"?: string | null,"result_ids"?: (string)[],"tipo"?: string,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bulletin_sections_bulletin_id_organization_id_fkey"
      columns: ["bulletin_id","organization_id"]
isOneToOne: false
      referencedRelation: "bulletin_editions"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "bulletin_sections_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"dossier_experiments": {
                  Row: {
                    "dossier_id": string,"experiment_id": string,"incluir_resultados": boolean,"ordem": number,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dossier_id": string,"experiment_id": string,"incluir_resultados"?: boolean,"ordem"?: number,"organization_id": string
                  }
                  Update: {
                    "dossier_id"?: string,"experiment_id"?: string,"incluir_resultados"?: boolean,"ordem"?: number,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dossier_experiments_dossier_id_organization_id_fkey"
      columns: ["dossier_id","organization_id"]
isOneToOne: false
      referencedRelation: "dossiers"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "dossier_experiments_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"dossiers": {
                  Row: {
                    "apresentacao": string | null,"created_at": string,"criterios_inclusao": string | null,"editorial_item_id": string,"escopo": string | null,"finalidade": string,"id": string,"is_demo": boolean,"metodo_coleta": string | null,"organization_id": string,"periodo_fim": string | null,"periodo_inicio": string | null,"referencias": string | null,"sintese": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "apresentacao"?: string | null,"created_at"?: string,"criterios_inclusao"?: string | null,"editorial_item_id": string,"escopo"?: string | null,"finalidade"?: string,"id"?: string,"is_demo"?: boolean,"metodo_coleta"?: string | null,"organization_id": string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"referencias"?: string | null,"sintese"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "apresentacao"?: string | null,"created_at"?: string,"criterios_inclusao"?: string | null,"editorial_item_id"?: string,"escopo"?: string | null,"finalidade"?: string,"id"?: string,"is_demo"?: boolean,"metodo_coleta"?: string | null,"organization_id"?: string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"referencias"?: string | null,"sintese"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dossiers_editorial_item_id_organization_id_fkey"
      columns: ["editorial_item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"editorial_items": {
                  Row: {
                    "archived_at": string | null,"area_tematica": string | null,"canais": (Database["public"]['Enums']["channel"])[],"created_at": string,"created_by": string | null,"current_version_id": string | null,"data_sugerida": string | null,"descricao": string | null,"draft": NonNullable<Json>,"formato": string | null,"id": string,"is_demo": boolean,"labels": (string)[],"objetivo": string | null,"organization_id": string,"pesquisador_person_id": string | null,"prazo": string | null,"publico": string | null,"requer_validacao_cientifica": boolean,"responsavel_redacao": string | null,"revisor_cientifico": string | null,"revisor_final": string | null,"status": Database["public"]['Enums']["workflow_status"],"tipo": Database["public"]['Enums']["editorial_kind"],"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"area_tematica"?: string | null,"canais"?: (Database["public"]['Enums']["channel"])[],"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"data_sugerida"?: string | null,"descricao"?: string | null,"draft"?: NonNullable<Json>,"formato"?: string | null,"id"?: string,"is_demo"?: boolean,"labels"?: (string)[],"objetivo"?: string | null,"organization_id": string,"pesquisador_person_id"?: string | null,"prazo"?: string | null,"publico"?: string | null,"requer_validacao_cientifica"?: boolean,"responsavel_redacao"?: string | null,"revisor_cientifico"?: string | null,"revisor_final"?: string | null,"status"?: Database["public"]['Enums']["workflow_status"],"tipo": Database["public"]['Enums']["editorial_kind"],"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"area_tematica"?: string | null,"canais"?: (Database["public"]['Enums']["channel"])[],"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"data_sugerida"?: string | null,"descricao"?: string | null,"draft"?: NonNullable<Json>,"formato"?: string | null,"id"?: string,"is_demo"?: boolean,"labels"?: (string)[],"objetivo"?: string | null,"organization_id"?: string,"pesquisador_person_id"?: string | null,"prazo"?: string | null,"publico"?: string | null,"requer_validacao_cientifica"?: boolean,"responsavel_redacao"?: string | null,"revisor_cientifico"?: string | null,"revisor_final"?: string | null,"status"?: Database["public"]['Enums']["workflow_status"],"tipo"?: Database["public"]['Enums']["editorial_kind"],"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "editorial_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_current_version_fk"
      columns: ["current_version_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_pesquisador_person_id_organization_id_fkey"
      columns: ["pesquisador_person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "editorial_items_responsavel_redacao_fkey"
      columns: ["responsavel_redacao"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_revisor_cientifico_fkey"
      columns: ["revisor_cientifico"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_revisor_final_fkey"
      columns: ["revisor_final"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_items_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"editorial_sources": {
                  Row: {
                    "created_at": string,"experiment_id": string | null,"file_id": string | null,"id": string,"item_id": string,"organization_id": string,"referencia": string | null,"result_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"experiment_id"?: string | null,"file_id"?: string | null,"id"?: string,"item_id": string,"organization_id": string,"referencia"?: string | null,"result_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"experiment_id"?: string | null,"file_id"?: string | null,"id"?: string,"item_id"?: string,"organization_id"?: string,"referencia"?: string | null,"result_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "editorial_sources_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "editorial_sources_file_id_organization_id_fkey"
      columns: ["file_id","organization_id"]
isOneToOne: false
      referencedRelation: "files"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "editorial_sources_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "editorial_sources_result_id_organization_id_fkey"
      columns: ["result_id","organization_id"]
isOneToOne: false
      referencedRelation: "result_summaries"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"editorial_versions": {
                  Row: {
                    "content": NonNullable<Json>,"content_hash": string,"created_at": string,"created_by": string | null,"id": string,"item_id": string,"numero": number,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"content_hash": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"item_id": string,"numero": number,"organization_id": string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"content_hash"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"item_id"?: string,"numero"?: number,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "editorial_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "editorial_versions_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"experiment_code_counters": {
                  Row: {
                    "organization_id": string,"ultimo_valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "organization_id": string,"ultimo_valor"?: number
                  }
                  Update: {
                    "organization_id"?: string,"ultimo_valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiment_code_counters_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"experiment_members": {
                  Row: {
                    "acesso": Database["public"]['Enums']["experiment_access"],"ativo": boolean,"created_at": string,"created_by": string | null,"experiment_id": string,"funcao": string | null,"id": string,"organization_id": string,"person_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acesso"?: Database["public"]['Enums']["experiment_access"],"ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"experiment_id": string,"funcao"?: string | null,"id"?: string,"organization_id": string,"person_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "acesso"?: Database["public"]['Enums']["experiment_access"],"ativo"?: boolean,"created_at"?: string,"created_by"?: string | null,"experiment_id"?: string,"funcao"?: string | null,"id"?: string,"organization_id"?: string,"person_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiment_members_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "experiment_members_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "experiment_members_person_id_organization_id_fkey"
      columns: ["person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "experiment_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"experiment_milestones": {
                  Row: {
                    "created_at": string,"data_prevista": string | null,"data_realizada": string | null,"experiment_id": string,"id": string,"observacao": string | null,"organization_id": string,"status": string,"tipo": string,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data_prevista"?: string | null,"data_realizada"?: string | null,"experiment_id": string,"id"?: string,"observacao"?: string | null,"organization_id": string,"status"?: string,"tipo"?: string,"titulo": string
                  }
                  Update: {
                    "created_at"?: string,"data_prevista"?: string | null,"data_realizada"?: string | null,"experiment_id"?: string,"id"?: string,"observacao"?: string | null,"organization_id"?: string,"status"?: string,"tipo"?: string,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiment_milestones_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"experiment_treatments": {
                  Row: {
                    "codigo": string | null,"created_at": string,"descricao": string,"experiment_id": string,"fonte": string | null,"id": string,"ordem": number,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo"?: string | null,"created_at"?: string,"descricao": string,"experiment_id": string,"fonte"?: string | null,"id"?: string,"ordem"?: number,"organization_id": string
                  }
                  Update: {
                    "codigo"?: string | null,"created_at"?: string,"descricao"?: string,"experiment_id"?: string,"fonte"?: string | null,"id"?: string,"ordem"?: number,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiment_treatments_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"experiments": {
                  Row: {
                    "acompanhamento_ativo": boolean,"alvos_biologicos": (string)[],"archived_at": string | null,"archived_by": string | null,"area_tematica": string | null,"calendario_avaliacoes": string | null,"codigo": string,"codigo_institucional": string | null,"codigo_seq": number,"created_at": string,"created_by": string | null,"culturas": (string)[],"data_conferencia": string | null,"data_informacao": string | null,"data_inicio": string | null,"data_termino_efetiva": string | null,"data_termino_prevista": string | null,"delineamento": string | null,"descricao": string | null,"disponibilidade": Database["public"]['Enums']["info_status"],"farm_area_id": string | null,"farm_id": string | null,"fase": Database["public"]['Enums']["experiment_phase"],"fonte_cadastro": string | null,"id": string,"import_batch_id": string | null,"informante": string | null,"is_demo": boolean,"justificativa": string | null,"linhas_pesquisa": (string)[],"local_descricao": string | null,"motivo_interrupcao": string | null,"nivel_acesso": Database["public"]['Enums']["access_level"],"num_repeticoes": number | null,"objetivo_geral": string | null,"objetivos_especificos": string | null,"observacoes_escopo": string | null,"organismos": (string)[],"organization_id": string,"palavras_chave": (string)[],"periodicidade_acompanhamento": string,"pesquisador_principal_id": string | null,"protocolo_referencia": string | null,"resumo_metodologico": string | null,"search": unknown,"titulo": string,"titulo_curto": string | null,"unidades_experimentais": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acompanhamento_ativo"?: boolean,"alvos_biologicos"?: (string)[],"archived_at"?: string | null,"archived_by"?: string | null,"area_tematica"?: string | null,"calendario_avaliacoes"?: string | null,"codigo": string,"codigo_institucional"?: string | null,"codigo_seq": number,"created_at"?: string,"created_by"?: string | null,"culturas"?: (string)[],"data_conferencia"?: string | null,"data_informacao"?: string | null,"data_inicio"?: string | null,"data_termino_efetiva"?: string | null,"data_termino_prevista"?: string | null,"delineamento"?: string | null,"descricao"?: string | null,"disponibilidade"?: Database["public"]['Enums']["info_status"],"farm_area_id"?: string | null,"farm_id"?: string | null,"fase"?: Database["public"]['Enums']["experiment_phase"],"fonte_cadastro"?: string | null,"id"?: string,"import_batch_id"?: string | null,"informante"?: string | null,"is_demo"?: boolean,"justificativa"?: string | null,"linhas_pesquisa"?: (string)[],"local_descricao"?: string | null,"motivo_interrupcao"?: string | null,"nivel_acesso"?: Database["public"]['Enums']["access_level"],"num_repeticoes"?: number | null,"objetivo_geral"?: string | null,"objetivos_especificos"?: string | null,"observacoes_escopo"?: string | null,"organismos"?: (string)[],"organization_id": string,"palavras_chave"?: (string)[],"periodicidade_acompanhamento"?: string,"pesquisador_principal_id"?: string | null,"protocolo_referencia"?: string | null,"resumo_metodologico"?: string | null,"search"?: never,"titulo": string,"titulo_curto"?: string | null,"unidades_experimentais"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "acompanhamento_ativo"?: boolean,"alvos_biologicos"?: (string)[],"archived_at"?: string | null,"archived_by"?: string | null,"area_tematica"?: string | null,"calendario_avaliacoes"?: string | null,"codigo"?: string,"codigo_institucional"?: string | null,"codigo_seq"?: number,"created_at"?: string,"created_by"?: string | null,"culturas"?: (string)[],"data_conferencia"?: string | null,"data_informacao"?: string | null,"data_inicio"?: string | null,"data_termino_efetiva"?: string | null,"data_termino_prevista"?: string | null,"delineamento"?: string | null,"descricao"?: string | null,"disponibilidade"?: Database["public"]['Enums']["info_status"],"farm_area_id"?: string | null,"farm_id"?: string | null,"fase"?: Database["public"]['Enums']["experiment_phase"],"fonte_cadastro"?: string | null,"id"?: string,"import_batch_id"?: string | null,"informante"?: string | null,"is_demo"?: boolean,"justificativa"?: string | null,"linhas_pesquisa"?: (string)[],"local_descricao"?: string | null,"motivo_interrupcao"?: string | null,"nivel_acesso"?: Database["public"]['Enums']["access_level"],"num_repeticoes"?: number | null,"objetivo_geral"?: string | null,"objetivos_especificos"?: string | null,"observacoes_escopo"?: string | null,"organismos"?: (string)[],"organization_id"?: string,"palavras_chave"?: (string)[],"periodicidade_acompanhamento"?: string,"pesquisador_principal_id"?: string | null,"protocolo_referencia"?: string | null,"resumo_metodologico"?: string | null,"search"?: never,"titulo"?: string,"titulo_curto"?: string | null,"unidades_experimentais"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiments_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "experiments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "experiments_farm_area_id_organization_id_fkey"
      columns: ["farm_area_id","organization_id"]
isOneToOne: false
      referencedRelation: "farm_areas"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "experiments_farm_id_organization_id_fkey"
      columns: ["farm_id","organization_id"]
isOneToOne: false
      referencedRelation: "farms"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "experiments_import_fk"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "experiments_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "experiments_pesquisador_principal_id_organization_id_fkey"
      columns: ["pesquisador_principal_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "experiments_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"farm_areas": {
                  Row: {
                    "coordenadas_autorizadas": boolean,"created_at": string,"descricao": string | null,"farm_id": string,"id": string,"latitude": number | null,"longitude": number | null,"nome": string,"organization_id": string,"tipo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coordenadas_autorizadas"?: boolean,"created_at"?: string,"descricao"?: string | null,"farm_id": string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"nome": string,"organization_id": string,"tipo"?: string,"updated_at"?: string
                  }
                  Update: {
                    "coordenadas_autorizadas"?: boolean,"created_at"?: string,"descricao"?: string | null,"farm_id"?: string,"id"?: string,"latitude"?: number | null,"longitude"?: number | null,"nome"?: string,"organization_id"?: string,"tipo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "farm_areas_farm_id_organization_id_fkey"
      columns: ["farm_id","organization_id"]
isOneToOne: false
      referencedRelation: "farms"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"farms": {
                  Row: {
                    "adesao_formal": boolean,"created_at": string,"created_by": string | null,"descricao": string | null,"id": string,"municipio": string | null,"nome": string,"organization_id": string,"uf": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adesao_formal"?: boolean,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"id"?: string,"municipio"?: string | null,"nome": string,"organization_id": string,"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "adesao_formal"?: boolean,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"id"?: string,"municipio"?: string | null,"nome"?: string,"organization_id"?: string,"uf"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "farms_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "farms_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "farms_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"files": {
                  Row: {
                    "autoria": string | null,"autorizacao_canais": (Database["public"]['Enums']["channel"])[],"autorizacao_uso": Database["public"]['Enums']["use_authorization"],"created_at": string,"created_by": string | null,"data_arquivo": string | null,"deleted_at": string | null,"deleted_by": string | null,"editorial_item_id": string | null,"experiment_id": string | null,"external_url": string | null,"id": string,"is_demo": boolean,"legenda": string | null,"licenca": string | null,"mime_type": string | null,"motivo_substituicao": string | null,"nome_amigavel": string,"nome_original": string | null,"nome_sugerido": string | null,"organization_id": string,"origem": string | null,"previous_version_id": string | null,"result_id": string | null,"revisao_status": string,"storage_path": string | null,"substituido_por": string | null,"tamanho_bytes": number | null,"tipo": Database["public"]['Enums']["file_kind"],"updated_at": string,"updated_by": string | null,"versao": number,"visit_record_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "autoria"?: string | null,"autorizacao_canais"?: (Database["public"]['Enums']["channel"])[],"autorizacao_uso"?: Database["public"]['Enums']["use_authorization"],"created_at"?: string,"created_by"?: string | null,"data_arquivo"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"editorial_item_id"?: string | null,"experiment_id"?: string | null,"external_url"?: string | null,"id"?: string,"is_demo"?: boolean,"legenda"?: string | null,"licenca"?: string | null,"mime_type"?: string | null,"motivo_substituicao"?: string | null,"nome_amigavel": string,"nome_original"?: string | null,"nome_sugerido"?: string | null,"organization_id": string,"origem"?: string | null,"previous_version_id"?: string | null,"result_id"?: string | null,"revisao_status"?: string,"storage_path"?: string | null,"substituido_por"?: string | null,"tamanho_bytes"?: number | null,"tipo": Database["public"]['Enums']["file_kind"],"updated_at"?: string,"updated_by"?: string | null,"versao"?: number,"visit_record_id"?: string | null
                  }
                  Update: {
                    "autoria"?: string | null,"autorizacao_canais"?: (Database["public"]['Enums']["channel"])[],"autorizacao_uso"?: Database["public"]['Enums']["use_authorization"],"created_at"?: string,"created_by"?: string | null,"data_arquivo"?: string | null,"deleted_at"?: string | null,"deleted_by"?: string | null,"editorial_item_id"?: string | null,"experiment_id"?: string | null,"external_url"?: string | null,"id"?: string,"is_demo"?: boolean,"legenda"?: string | null,"licenca"?: string | null,"mime_type"?: string | null,"motivo_substituicao"?: string | null,"nome_amigavel"?: string,"nome_original"?: string | null,"nome_sugerido"?: string | null,"organization_id"?: string,"origem"?: string | null,"previous_version_id"?: string | null,"result_id"?: string | null,"revisao_status"?: string,"storage_path"?: string | null,"substituido_por"?: string | null,"tamanho_bytes"?: number | null,"tipo"?: Database["public"]['Enums']["file_kind"],"updated_at"?: string,"updated_by"?: string | null,"versao"?: number,"visit_record_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "files_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_editorial_fk"
      columns: ["editorial_item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "files_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "files_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_previous_version_id_fkey"
      columns: ["previous_version_id"]
isOneToOne: false
      referencedRelation: "files"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_result_id_organization_id_fkey"
      columns: ["result_id","organization_id"]
isOneToOne: false
      referencedRelation: "result_summaries"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "files_substituido_por_fkey"
      columns: ["substituido_por"]
isOneToOne: false
      referencedRelation: "files"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "files_visit_record_id_organization_id_fkey"
      columns: ["visit_record_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_records"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"generated_documents": {
                  Row: {
                    "gerado_em": string,"gerado_por": string | null,"id": string,"item_id": string | null,"organization_id": string,"rascunho": boolean,"sha256": string,"storage_path": string,"tamanho_bytes": number,"tipo": string,"version_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "gerado_em"?: string,"gerado_por"?: string | null,"id"?: string,"item_id"?: string | null,"organization_id": string,"rascunho"?: boolean,"sha256": string,"storage_path": string,"tamanho_bytes": number,"tipo": string,"version_id"?: string | null
                  }
                  Update: {
                    "gerado_em"?: string,"gerado_por"?: string | null,"id"?: string,"item_id"?: string | null,"organization_id"?: string,"rascunho"?: boolean,"sha256"?: string,"storage_path"?: string,"tamanho_bytes"?: number,"tipo"?: string,"version_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "generated_documents_gerado_por_fkey"
      columns: ["gerado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generated_documents_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "generated_documents_version_id_organization_id_fkey"
      columns: ["version_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"import_batches": {
                  Row: {
                    "arquivo_nome": string,"created_at": string,"criado_por": string | null,"desfeito_em": string | null,"duplicadas": number,"entidade": string,"id": string,"importadas": number,"invalidas": number,"organization_id": string,"relatorio": NonNullable<Json>,"total_linhas": number
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivo_nome": string,"created_at"?: string,"criado_por"?: string | null,"desfeito_em"?: string | null,"duplicadas"?: number,"entidade"?: string,"id"?: string,"importadas"?: number,"invalidas"?: number,"organization_id": string,"relatorio"?: NonNullable<Json>,"total_linhas"?: number
                  }
                  Update: {
                    "arquivo_nome"?: string,"created_at"?: string,"criado_por"?: string | null,"desfeito_em"?: string | null,"duplicadas"?: number,"entidade"?: string,"id"?: string,"importadas"?: number,"invalidas"?: number,"organization_id"?: string,"relatorio"?: NonNullable<Json>,"total_linhas"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_batches_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"instagram_metrics": {
                  Row: {
                    "alcance": number | null,"comentarios": number | null,"compartilhamentos": number | null,"created_at": string,"curtidas": number | null,"data_referencia": string,"id": string,"impressoes": number | null,"observacoes": string | null,"organization_id": string,"publication_id": string,"registrado_por": string | null,"salvamentos": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alcance"?: number | null,"comentarios"?: number | null,"compartilhamentos"?: number | null,"created_at"?: string,"curtidas"?: number | null,"data_referencia": string,"id"?: string,"impressoes"?: number | null,"observacoes"?: string | null,"organization_id": string,"publication_id": string,"registrado_por"?: string | null,"salvamentos"?: number | null
                  }
                  Update: {
                    "alcance"?: number | null,"comentarios"?: number | null,"compartilhamentos"?: number | null,"created_at"?: string,"curtidas"?: number | null,"data_referencia"?: string,"id"?: string,"impressoes"?: number | null,"observacoes"?: string | null,"organization_id"?: string,"publication_id"?: string,"registrado_por"?: string | null,"salvamentos"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "instagram_metrics_publication_id_organization_id_fkey"
      columns: ["publication_id","organization_id"]
isOneToOne: false
      referencedRelation: "publication_records"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "instagram_metrics_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"institutional_authorizations": {
                  Row: {
                    "concedido_por": string | null,"created_at": string,"created_by": string | null,"data_decisao": string | null,"descricao": string | null,"documento_file_id": string | null,"id": string,"observacoes": string | null,"organization_id": string,"status": string,"tipo": string,"updated_at": string,"updated_by": string | null,"validade": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "concedido_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_decisao"?: string | null,"descricao"?: string | null,"documento_file_id"?: string | null,"id"?: string,"observacoes"?: string | null,"organization_id": string,"status"?: string,"tipo": string,"updated_at"?: string,"updated_by"?: string | null,"validade"?: string | null
                  }
                  Update: {
                    "concedido_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_decisao"?: string | null,"descricao"?: string | null,"documento_file_id"?: string | null,"id"?: string,"observacoes"?: string | null,"organization_id"?: string,"status"?: string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null,"validade"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "institutional_authorizations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "institutional_authorizations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "institutional_authorizations_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"organization_id": string,"reenvios": number,"revoked_at": string | null,"role": Database["public"]['Enums']["org_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by"?: string | null,"organization_id": string,"reenvios"?: number,"revoked_at"?: string | null,"role": Database["public"]['Enums']["org_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"organization_id"?: string,"reenvios"?: number,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["org_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"delegacao_revisao_final": boolean,"fim": string | null,"id": string,"inicio": string,"invited_by": string | null,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"status": Database["public"]['Enums']["member_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delegacao_revisao_final"?: boolean,"fim"?: string | null,"id"?: string,"inicio"?: string,"invited_by"?: string | null,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delegacao_revisao_final"?: boolean,"fim"?: string | null,"id"?: string,"inicio"?: string,"invited_by"?: string | null,"organization_id"?: string,"role"?: Database["public"]['Enums']["org_role"],"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"lida_em": string | null,"link": string | null,"mensagem": string | null,"organization_id": string,"tipo": string,"titulo": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lida_em"?: string | null,"link"?: string | null,"mensagem"?: string | null,"organization_id": string,"tipo": string,"titulo": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lida_em"?: string | null,"link"?: string | null,"mensagem"?: string | null,"organization_id"?: string,"tipo"?: string,"titulo"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"nome": string,"slug": string,"status_institucional": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nome": string,"slug": string,"status_institucional"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nome"?: string,"slug"?: string,"status_institucional"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"people": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"instituicao": string | null,"is_demo": boolean,"nome": string,"observacoes": string | null,"organization_id": string,"situacao": string,"tipo": string,"updated_at": string,"updated_by": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"instituicao"?: string | null,"is_demo"?: boolean,"nome": string,"observacoes"?: string | null,"organization_id": string,"situacao"?: string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"instituicao"?: string | null,"is_demo"?: boolean,"nome"?: string,"observacoes"?: string | null,"organization_id"?: string,"situacao"?: string,"tipo"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "people_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "people_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "people_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "people_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"people_contacts": {
                  Row: {
                    "email": string | null,"organization_id": string,"person_id": string,"preferencia_contato": string | null,"telefone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: string | null,"organization_id": string,"person_id": string,"preferencia_contato"?: string | null,"telefone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "email"?: string | null,"organization_id"?: string,"person_id"?: string,"preferencia_contato"?: string | null,"telefone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "people_contacts_person_id_organization_id_fkey"
      columns: ["person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"pilot_milestones": {
                  Row: {
                    "concluido_em": string | null,"descricao": string | null,"id": string,"mes": number,"observacao": string | null,"organization_id": string,"status": string,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concluido_em"?: string | null,"descricao"?: string | null,"id"?: string,"mes": number,"observacao"?: string | null,"organization_id": string,"status"?: string,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "concluido_em"?: string | null,"descricao"?: string | null,"id"?: string,"mes"?: number,"observacao"?: string | null,"organization_id"?: string,"status"?: string,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pilot_milestones_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"pilot_report": {
                  Row: {
                    "editorial_item_id": string | null,"organization_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "editorial_item_id"?: string | null,"organization_id": string,"updated_at"?: string
                  }
                  Update: {
                    "editorial_item_id"?: string | null,"organization_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pilot_report_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"nome": string,"situacao": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"nome"?: string,"situacao"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"nome"?: string,"situacao"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"project_settings": {
                  Row: {
                    "assinatura": string,"codigo_prefixo": string,"contato_institucional": string | null,"exibir_marcas_institucionais": boolean,"feedback_publico_ativo": boolean,"limite_upload_mb": number,"meta_boletins": number,"nome_projeto": string,"onboarding_concluido": boolean,"organization_id": string,"piloto_inicio": string | null,"piloto_meses": number,"piloto_prorrogacao_meses": number,"politica_editorial": string | null,"portal_publico_ativo": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assinatura"?: string,"codigo_prefixo"?: string,"contato_institucional"?: string | null,"exibir_marcas_institucionais"?: boolean,"feedback_publico_ativo"?: boolean,"limite_upload_mb"?: number,"meta_boletins"?: number,"nome_projeto"?: string,"onboarding_concluido"?: boolean,"organization_id": string,"piloto_inicio"?: string | null,"piloto_meses"?: number,"piloto_prorrogacao_meses"?: number,"politica_editorial"?: string | null,"portal_publico_ativo"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "assinatura"?: string,"codigo_prefixo"?: string,"contato_institucional"?: string | null,"exibir_marcas_institucionais"?: boolean,"feedback_publico_ativo"?: boolean,"limite_upload_mb"?: number,"meta_boletins"?: number,"nome_projeto"?: string,"onboarding_concluido"?: boolean,"organization_id"?: string,"piloto_inicio"?: string | null,"piloto_meses"?: number,"piloto_prorrogacao_meses"?: number,"politica_editorial"?: string | null,"portal_publico_ativo"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_settings_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"public_publications": {
                  Row: {
                    "content": NonNullable<Json>,"errata": string | null,"id": string,"organization_id": string,"pdf_storage_path": string | null,"publication_id": string,"published_at": string,"resumo": string | null,"revoked_at": string | null,"slug": string,"tipo": Database["public"]['Enums']["editorial_kind"],"titulo": string,"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"errata"?: string | null,"id"?: string,"organization_id": string,"pdf_storage_path"?: string | null,"publication_id": string,"published_at"?: string,"resumo"?: string | null,"revoked_at"?: string | null,"slug": string,"tipo": Database["public"]['Enums']["editorial_kind"],"titulo": string,"versao": number
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"errata"?: string | null,"id"?: string,"organization_id"?: string,"pdf_storage_path"?: string | null,"publication_id"?: string,"published_at"?: string,"resumo"?: string | null,"revoked_at"?: string | null,"slug"?: string,"tipo"?: Database["public"]['Enums']["editorial_kind"],"titulo"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "public_publications_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_publications_publication_id_fkey"
      columns: ["publication_id"]
isOneToOne: true
      referencedRelation: "publication_records"
      referencedColumns: ["id"]
    }
                  ]
                },"publication_records": {
                  Row: {
                    "canal": Database["public"]['Enums']["channel"],"created_at": string,"data_publicacao": string,"document_id": string | null,"errata": string | null,"id": string,"item_id": string,"motivo_revogacao": string | null,"organization_id": string,"responsavel_id": string,"revogado_em": string | null,"revogado_por": string | null,"status": string,"url": string | null,"version_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canal": Database["public"]['Enums']["channel"],"created_at"?: string,"data_publicacao": string,"document_id"?: string | null,"errata"?: string | null,"id"?: string,"item_id": string,"motivo_revogacao"?: string | null,"organization_id": string,"responsavel_id": string,"revogado_em"?: string | null,"revogado_por"?: string | null,"status"?: string,"url"?: string | null,"version_id": string
                  }
                  Update: {
                    "canal"?: Database["public"]['Enums']["channel"],"created_at"?: string,"data_publicacao"?: string,"document_id"?: string | null,"errata"?: string | null,"id"?: string,"item_id"?: string,"motivo_revogacao"?: string | null,"organization_id"?: string,"responsavel_id"?: string,"revogado_em"?: string | null,"revogado_por"?: string | null,"status"?: string,"url"?: string | null,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "publication_records_document_id_organization_id_fkey"
      columns: ["document_id","organization_id"]
isOneToOne: false
      referencedRelation: "generated_documents"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "publication_records_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "publication_records_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "publication_records_revogado_por_fkey"
      columns: ["revogado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "publication_records_version_id_organization_id_fkey"
      columns: ["version_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"recurring_routines": {
                  Row: {
                    "ativo": boolean,"categoria": string,"created_at": string,"descricao": string | null,"dia_prazo": number,"id": string,"organization_id": string,"regra": string,"responsavel_id": string | null,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"categoria"?: string,"created_at"?: string,"descricao"?: string | null,"dia_prazo"?: number,"id"?: string,"organization_id": string,"regra"?: string,"responsavel_id"?: string | null,"titulo": string
                  }
                  Update: {
                    "ativo"?: boolean,"categoria"?: string,"created_at"?: string,"descricao"?: string | null,"dia_prazo"?: number,"id"?: string,"organization_id"?: string,"regra"?: string,"responsavel_id"?: string | null,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recurring_routines_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recurring_routines_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"release_permissions": {
                  Row: {
                    "canal": Database["public"]['Enums']["channel"],"created_at": string,"decision_id": string,"id": string,"item_id": string,"organization_id": string,"revogado_em": string | null,"version_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canal": Database["public"]['Enums']["channel"],"created_at"?: string,"decision_id": string,"id"?: string,"item_id": string,"organization_id": string,"revogado_em"?: string | null,"version_id": string
                  }
                  Update: {
                    "canal"?: Database["public"]['Enums']["channel"],"created_at"?: string,"decision_id"?: string,"id"?: string,"item_id"?: string,"organization_id"?: string,"revogado_em"?: string | null,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "release_permissions_decision_id_fkey"
      columns: ["decision_id"]
isOneToOne: false
      referencedRelation: "approval_decisions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "release_permissions_item_id_organization_id_fkey"
      columns: ["item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "release_permissions_version_id_organization_id_fkey"
      columns: ["version_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_versions"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"result_summaries": {
                  Row: {
                    "conferencia_status": string,"conferido_por": string | null,"created_at": string,"created_by": string | null,"data_fornecimento": string | null,"data_referencia": string | null,"escopo_divulgacao": (Database["public"]['Enums']["channel"])[],"experiment_id": string,"fonte_descricao": string | null,"fonte_person_id": string | null,"id": string,"is_demo": boolean,"limitacoes": string | null,"link_original": string | null,"organization_id": string,"periodo_fim": string | null,"periodo_inicio": string | null,"referencia": string | null,"sintese": string,"situacao_analise": Database["public"]['Enums']["analysis_status"],"unidade": string | null,"updated_at": string,"updated_by": string | null,"validacao_externa": boolean,"validacao_status": string,"validado_em": string | null,"validado_por": string | null,"variavel": string,"versao_interpretacao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "conferencia_status"?: string,"conferido_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_fornecimento"?: string | null,"data_referencia"?: string | null,"escopo_divulgacao"?: (Database["public"]['Enums']["channel"])[],"experiment_id": string,"fonte_descricao"?: string | null,"fonte_person_id"?: string | null,"id"?: string,"is_demo"?: boolean,"limitacoes"?: string | null,"link_original"?: string | null,"organization_id": string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"referencia"?: string | null,"sintese"?: string,"situacao_analise"?: Database["public"]['Enums']["analysis_status"],"unidade"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"validacao_externa"?: boolean,"validacao_status"?: string,"validado_em"?: string | null,"validado_por"?: string | null,"variavel": string,"versao_interpretacao"?: number
                  }
                  Update: {
                    "conferencia_status"?: string,"conferido_por"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_fornecimento"?: string | null,"data_referencia"?: string | null,"escopo_divulgacao"?: (Database["public"]['Enums']["channel"])[],"experiment_id"?: string,"fonte_descricao"?: string | null,"fonte_person_id"?: string | null,"id"?: string,"is_demo"?: boolean,"limitacoes"?: string | null,"link_original"?: string | null,"organization_id"?: string,"periodo_fim"?: string | null,"periodo_inicio"?: string | null,"referencia"?: string | null,"sintese"?: string,"situacao_analise"?: Database["public"]['Enums']["analysis_status"],"unidade"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"validacao_externa"?: boolean,"validacao_status"?: string,"validado_em"?: string | null,"validado_por"?: string | null,"variavel"?: string,"versao_interpretacao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "result_summaries_conferido_por_fkey"
      columns: ["conferido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "result_summaries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "result_summaries_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "result_summaries_fonte_person_id_organization_id_fkey"
      columns: ["fonte_person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "result_summaries_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "result_summaries_validado_por_fkey"
      columns: ["validado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_checklist_items": {
                  Row: {
                    "feito": boolean,"id": string,"ordem": number,"organization_id": string,"task_id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "feito"?: boolean,"id"?: string,"ordem"?: number,"organization_id": string,"task_id": string,"texto": string
                  }
                  Update: {
                    "feito"?: boolean,"id"?: string,"ordem"?: number,"organization_id"?: string,"task_id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_checklist_items_task_id_organization_id_fkey"
      columns: ["task_id","organization_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"task_comments": {
                  Row: {
                    "autor_id": string | null,"created_at": string,"id": string,"organization_id": string,"task_id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"created_at"?: string,"id"?: string,"organization_id": string,"task_id": string,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"created_at"?: string,"id"?: string,"organization_id"?: string,"task_id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_comments_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_comments_task_id_organization_id_fkey"
      columns: ["task_id","organization_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "categoria": string,"chave_recorrencia": string | null,"colaborador_id": string | null,"concluida_em": string | null,"created_at": string,"created_by": string | null,"descricao": string | null,"editorial_item_id": string | null,"experiment_id": string | null,"id": string,"inicio": string | null,"is_demo": boolean,"motivo_bloqueio": string | null,"ordem": number,"organization_id": string,"origem": string,"prazo": string | null,"prioridade": Database["public"]['Enums']["task_priority"],"responsavel_id": string | null,"status": Database["public"]['Enums']["task_status"],"titulo": string,"ultimo_contato": string | null,"updated_at": string,"updated_by": string | null,"visit_record_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria"?: string,"chave_recorrencia"?: string | null,"colaborador_id"?: string | null,"concluida_em"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"editorial_item_id"?: string | null,"experiment_id"?: string | null,"id"?: string,"inicio"?: string | null,"is_demo"?: boolean,"motivo_bloqueio"?: string | null,"ordem"?: number,"organization_id": string,"origem"?: string,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["task_priority"],"responsavel_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"titulo": string,"ultimo_contato"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"visit_record_id"?: string | null
                  }
                  Update: {
                    "categoria"?: string,"chave_recorrencia"?: string | null,"colaborador_id"?: string | null,"concluida_em"?: string | null,"created_at"?: string,"created_by"?: string | null,"descricao"?: string | null,"editorial_item_id"?: string | null,"experiment_id"?: string | null,"id"?: string,"inicio"?: string | null,"is_demo"?: boolean,"motivo_bloqueio"?: string | null,"ordem"?: number,"organization_id"?: string,"origem"?: string,"prazo"?: string | null,"prioridade"?: Database["public"]['Enums']["task_priority"],"responsavel_id"?: string | null,"status"?: Database["public"]['Enums']["task_status"],"titulo"?: string,"ultimo_contato"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"visit_record_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_colaborador_id_fkey"
      columns: ["colaborador_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_editorial_fk"
      columns: ["editorial_item_id","organization_id"]
isOneToOne: false
      referencedRelation: "editorial_items"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "tasks_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "tasks_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_visit_record_id_organization_id_fkey"
      columns: ["visit_record_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_records"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"visit_checklist_items": {
                  Row: {
                    "id": string,"item": string,"observacao": string | null,"ordem": number,"organization_id": string,"resposta": string,"visit_record_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item": string,"observacao"?: string | null,"ordem"?: number,"organization_id": string,"resposta"?: string,"visit_record_id": string
                  }
                  Update: {
                    "id"?: string,"item"?: string,"observacao"?: string | null,"ordem"?: number,"organization_id"?: string,"resposta"?: string,"visit_record_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_checklist_items_visit_record_id_organization_id_fkey"
      columns: ["visit_record_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_records"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"visit_checklist_templates": {
                  Row: {
                    "ativo": boolean,"created_at": string,"id": string,"itens": NonNullable<Json>,"nome": string,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"itens"?: NonNullable<Json>,"nome": string,"organization_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"itens"?: NonNullable<Json>,"nome"?: string,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_checklist_templates_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_participants": {
                  Row: {
                    "id": string,"organization_id": string,"papel": string,"person_id": string | null,"user_id": string | null,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"organization_id": string,"papel"?: string,"person_id"?: string | null,"user_id"?: string | null,"visit_id": string
                  }
                  Update: {
                    "id"?: string,"organization_id"?: string,"papel"?: string,"person_id"?: string | null,"user_id"?: string | null,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_participants_person_id_organization_id_fkey"
      columns: ["person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_participants_visit_id_organization_id_fkey"
      columns: ["visit_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_schedules"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"visit_records": {
                  Row: {
                    "atividades_desde_ultima": string | null,"avaliacoes_previstas": string | null,"avaliacoes_realizadas": string | null,"comentario_conferencia": string | null,"conferido_em": string | null,"conferido_por": string | null,"conteudo_potencial": string | null,"created_at": string,"created_by": string | null,"etapa_atual": string | null,"experiment_id": string,"finalizado_em": string | null,"fontes": string | null,"id": string,"informante_descricao": string | null,"informante_person_id": string | null,"is_demo": boolean,"objetivo": string | null,"observacoes_diretas": string | null,"ocorrencias_relatadas": string | null,"organization_id": string,"proxima_acao": string | null,"proxima_acao_prazo": string | null,"proxima_acao_responsavel": string | null,"resultados_disponibilizados": string | null,"situacao_analise": Database["public"]['Enums']["analysis_status"],"status": Database["public"]['Enums']["record_status"],"updated_at": string,"updated_by": string | null,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atividades_desde_ultima"?: string | null,"avaliacoes_previstas"?: string | null,"avaliacoes_realizadas"?: string | null,"comentario_conferencia"?: string | null,"conferido_em"?: string | null,"conferido_por"?: string | null,"conteudo_potencial"?: string | null,"created_at"?: string,"created_by"?: string | null,"etapa_atual"?: string | null,"experiment_id": string,"finalizado_em"?: string | null,"fontes"?: string | null,"id"?: string,"informante_descricao"?: string | null,"informante_person_id"?: string | null,"is_demo"?: boolean,"objetivo"?: string | null,"observacoes_diretas"?: string | null,"ocorrencias_relatadas"?: string | null,"organization_id": string,"proxima_acao"?: string | null,"proxima_acao_prazo"?: string | null,"proxima_acao_responsavel"?: string | null,"resultados_disponibilizados"?: string | null,"situacao_analise"?: Database["public"]['Enums']["analysis_status"],"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string,"updated_by"?: string | null,"visit_id": string
                  }
                  Update: {
                    "atividades_desde_ultima"?: string | null,"avaliacoes_previstas"?: string | null,"avaliacoes_realizadas"?: string | null,"comentario_conferencia"?: string | null,"conferido_em"?: string | null,"conferido_por"?: string | null,"conteudo_potencial"?: string | null,"created_at"?: string,"created_by"?: string | null,"etapa_atual"?: string | null,"experiment_id"?: string,"finalizado_em"?: string | null,"fontes"?: string | null,"id"?: string,"informante_descricao"?: string | null,"informante_person_id"?: string | null,"is_demo"?: boolean,"objetivo"?: string | null,"observacoes_diretas"?: string | null,"ocorrencias_relatadas"?: string | null,"organization_id"?: string,"proxima_acao"?: string | null,"proxima_acao_prazo"?: string | null,"proxima_acao_responsavel"?: string | null,"resultados_disponibilizados"?: string | null,"situacao_analise"?: Database["public"]['Enums']["analysis_status"],"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string,"updated_by"?: string | null,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_records_conferido_por_fkey"
      columns: ["conferido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_records_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_records_informante_person_id_organization_id_fkey"
      columns: ["informante_person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_records_proxima_acao_responsavel_fkey"
      columns: ["proxima_acao_responsavel"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_records_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_records_visit_fk"
      columns: ["visit_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_schedules"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_records_visit_id_experiment_id_fkey"
      columns: ["visit_id","experiment_id"]
isOneToOne: true
      referencedRelation: "visit_schedule_experiments"
      referencedColumns: ["visit_id","experiment_id"]
    }
                  ]
                },"visit_schedule_experiments": {
                  Row: {
                    "experiment_id": string,"organization_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "experiment_id": string,"organization_id": string,"visit_id": string
                  }
                  Update: {
                    "experiment_id"?: string,"organization_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_schedule_experiments_experiment_id_organization_id_fkey"
      columns: ["experiment_id","organization_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_schedule_experiments_visit_id_organization_id_fkey"
      columns: ["visit_id","organization_id"]
isOneToOne: false
      referencedRelation: "visit_schedules"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                },"visit_schedules": {
                  Row: {
                    "checklist_template_id": string | null,"created_at": string,"created_by": string | null,"data_hora": string,"farm_id": string | null,"id": string,"interlocutores": string | null,"is_demo": boolean,"lembrete": string | null,"local": string | null,"motivo_status": string | null,"organization_id": string,"status": Database["public"]['Enums']["visit_status"],"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checklist_template_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_hora": string,"farm_id"?: string | null,"id"?: string,"interlocutores"?: string | null,"is_demo"?: boolean,"lembrete"?: string | null,"local"?: string | null,"motivo_status"?: string | null,"organization_id": string,"status"?: Database["public"]['Enums']["visit_status"],"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "checklist_template_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"data_hora"?: string,"farm_id"?: string | null,"id"?: string,"interlocutores"?: string | null,"is_demo"?: boolean,"lembrete"?: string | null,"local"?: string | null,"motivo_status"?: string | null,"organization_id"?: string,"status"?: Database["public"]['Enums']["visit_status"],"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_schedules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_schedules_farm_id_organization_id_fkey"
      columns: ["farm_id","organization_id"]
isOneToOne: false
      referencedRelation: "farms"
      referencedColumns: ["id","organization_id"]
    },{
      foreignKeyName: "visit_schedules_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_schedules_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_fronts": {
                  Row: {
                    "created_at": string,"fim": string | null,"frente": string,"id": string,"inicio": string,"observacao": string | null,"organization_id": string,"person_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fim"?: string | null,"frente": string,"id"?: string,"inicio": string,"observacao"?: string | null,"organization_id": string,"person_id": string
                  }
                  Update: {
                    "created_at"?: string,"fim"?: string | null,"frente"?: string,"id"?: string,"inicio"?: string,"observacao"?: string | null,"organization_id"?: string,"person_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_fronts_person_id_organization_id_fkey"
      columns: ["person_id","organization_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id","organization_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"generate_recurring_tasks":
{ Args: { "p_mes": string,"p_org": string }; Returns: number
                           },
"log_file_download":
{ Args: { "p_file": string }; Returns: undefined
                           },
"preview_snapshot":
{ Args: { "p_item": string }; Returns: Json
                           },
"register_external_validation":
{ Args: { "p_comprovante": string,"p_data": string,"p_item": string,"p_metodo": string,"p_obs"?: string,"p_person": string }; Returns: string
                           },
"register_generated_document":
{ Args: { "p_item": string,"p_org": string,"p_path": string,"p_rascunho": boolean,"p_sha": string,"p_size": number,"p_tipo": string,"p_version": string }; Returns: string
                           },
"register_publication":
{ Args: { "p_canal": Database["public"]['Enums']["channel"],"p_data": string,"p_document"?: string,"p_item": string,"p_resumo"?: string,"p_slug"?: string,"p_url"?: string }; Returns: string
                           },
"release_blockers":
{ Args: { "p_channel": Database["public"]['Enums']["channel"],"p_version": string }; Returns: (string)[]
                           },
"result_external_validation":
{ Args: { "p_comprovante": string,"p_data": string,"p_escopo": (Database["public"]['Enums']["channel"])[],"p_metodo": string,"p_person": string,"p_result": string }; Returns: undefined
                           },
"result_transition":
{ Args: { "p_acao": string,"p_escopo"?: (Database["public"]['Enums']["channel"])[],"p_motivo"?: string,"p_result": string }; Returns: string
                           },
"revoke_publication":
{ Args: { "p_errata"?: string,"p_motivo": string,"p_publication": string }; Returns: undefined
                           },
"submit_feedback":
{ Args: { "p_clareza": number,"p_comentario": string,"p_consentimento": boolean,"p_org_slug": string,"p_origem_hash": string,"p_perfil": string,"p_publication": string,"p_sugestao": string,"p_utilidade": number }; Returns: undefined
                           },
"submit_for_review":
{ Args: { "p_item": string,"p_prazo"?: string }; Returns: string
                           },
"undo_import":
{ Args: { "p_batch": string }; Returns: number
                           },
"visit_record_transition":
{ Args: { "p_acao": string,"p_comentario"?: string,"p_record": string }; Returns: Database["public"]['Enums']["record_status"]
                           },
"workflow_decide":
{ Args: { "p_canais"?: (Database["public"]['Enums']["channel"])[],"p_decisao": Database["public"]['Enums']["approval_decision"],"p_item": string,"p_motivo"?: string,"p_prazo"?: string }; Returns: Database["public"]['Enums']["workflow_status"]
                           }
          }
          Enums: {
            "access_level": "privado_equipe"|"colaboradores"|"preparado_revisao","analysis_status": "nao_disponivel"|"em_analise"|"preliminar"|"final"|"nao_informada","approval_decision": "aprovado"|"ajustes"|"rejeitado"|"revogado","approval_stage": "conferencia"|"validacao_cientifica"|"revisao_final","channel": "interno"|"boletim"|"dossie"|"instagram"|"portal"|"outro","editorial_kind": "pauta"|"instagram"|"boletim"|"dossie"|"relatorio_piloto"|"institucional","experiment_access": "proprietario"|"colaborador"|"revisor"|"visualizador","experiment_phase": "implantacao"|"andamento"|"concluido"|"interrompido","file_kind": "foto"|"relatorio"|"planilha"|"protocolo"|"mapa"|"documento_institucional"|"autorizacao"|"material_editorial"|"pdf_boletim"|"dossie"|"referencia_externa","info_status": "fornecido"|"pendente_conferencia"|"nao_informado"|"a_confirmar","member_status": "ativo"|"suspenso"|"removido","org_role": "admin"|"coordenacao"|"pesquisador"|"estudante"|"editor"|"leitor","record_status": "rascunho"|"preenchida"|"conferida"|"devolvida"|"finalizada","task_priority": "baixa"|"media"|"alta"|"urgente","task_status": "a_fazer"|"em_andamento"|"aguardando_terceiro"|"concluida"|"cancelada","use_authorization": "nao_autorizado"|"uso_interno"|"divulgacao_autorizada","visit_status": "planejada"|"confirmada"|"realizada"|"adiada"|"cancelada","workflow_status": "rascunho"|"em_conferencia"|"aguardando_validacao"|"devolvido"|"validado"|"aguardando_revisao_final"|"liberado"|"publicado"|"revogado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "access_level": ["privado_equipe", "colaboradores", "preparado_revisao"],"analysis_status": ["nao_disponivel", "em_analise", "preliminar", "final", "nao_informada"],"approval_decision": ["aprovado", "ajustes", "rejeitado", "revogado"],"approval_stage": ["conferencia", "validacao_cientifica", "revisao_final"],"channel": ["interno", "boletim", "dossie", "instagram", "portal", "outro"],"editorial_kind": ["pauta", "instagram", "boletim", "dossie", "relatorio_piloto", "institucional"],"experiment_access": ["proprietario", "colaborador", "revisor", "visualizador"],"experiment_phase": ["implantacao", "andamento", "concluido", "interrompido"],"file_kind": ["foto", "relatorio", "planilha", "protocolo", "mapa", "documento_institucional", "autorizacao", "material_editorial", "pdf_boletim", "dossie", "referencia_externa"],"info_status": ["fornecido", "pendente_conferencia", "nao_informado", "a_confirmar"],"member_status": ["ativo", "suspenso", "removido"],"org_role": ["admin", "coordenacao", "pesquisador", "estudante", "editor", "leitor"],"record_status": ["rascunho", "preenchida", "conferida", "devolvida", "finalizada"],"task_priority": ["baixa", "media", "alta", "urgente"],"task_status": ["a_fazer", "em_andamento", "aguardando_terceiro", "concluida", "cancelada"],"use_authorization": ["nao_autorizado", "uso_interno", "divulgacao_autorizada"],"visit_status": ["planejada", "confirmada", "realizada", "adiada", "cancelada"],"workflow_status": ["rascunho", "em_conferencia", "aguardando_validacao", "devolvido", "validado", "aguardando_revisao_final", "liberado", "publicado", "revogado"]
          }
        }
} as const
