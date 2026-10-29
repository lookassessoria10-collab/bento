-- Bento | Fundação: tipos, organizações, perfis, participação, convites, configurações
-- Convenções:
--   * UUID interno em todas as tabelas; códigos legíveis separados.
--   * organization_id em toda entidade operacional; FKs compostas (id, organization_id)
--     impedem apontar registros entre organizações.
--   * Funções auxiliares de autorização ficam no schema "private" (não exposto pela API).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.org_role as enum ('admin', 'coordenacao', 'pesquisador', 'estudante', 'editor', 'leitor');
create type public.member_status as enum ('ativo', 'suspenso', 'removido');
create type public.experiment_access as enum ('proprietario', 'colaborador', 'revisor', 'visualizador');
create type public.experiment_phase as enum ('implantacao', 'andamento', 'concluido', 'interrompido');
create type public.info_status as enum ('fornecido', 'pendente_conferencia', 'nao_informado', 'a_confirmar');
create type public.access_level as enum ('privado_equipe', 'colaboradores', 'preparado_revisao');
create type public.visit_status as enum ('planejada', 'confirmada', 'realizada', 'adiada', 'cancelada');
create type public.record_status as enum ('rascunho', 'preenchida', 'conferida', 'devolvida', 'finalizada');
create type public.analysis_status as enum ('nao_disponivel', 'em_analise', 'preliminar', 'final', 'nao_informada');
create type public.task_status as enum ('a_fazer', 'em_andamento', 'aguardando_terceiro', 'concluida', 'cancelada');
create type public.task_priority as enum ('baixa', 'media', 'alta', 'urgente');
create type public.workflow_status as enum (
  'rascunho', 'em_conferencia', 'aguardando_validacao', 'devolvido', 'validado',
  'aguardando_revisao_final', 'liberado', 'publicado', 'revogado'
);
create type public.editorial_kind as enum ('pauta', 'instagram', 'boletim', 'dossie', 'relatorio_piloto', 'institucional');
create type public.channel as enum ('interno', 'boletim', 'dossie', 'instagram', 'portal', 'outro');
create type public.approval_stage as enum ('conferencia', 'validacao_cientifica', 'revisao_final');
create type public.approval_decision as enum ('aprovado', 'ajustes', 'rejeitado', 'revogado');
create type public.file_kind as enum (
  'foto', 'relatorio', 'planilha', 'protocolo', 'mapa', 'documento_institucional', 'autorizacao',
  'material_editorial', 'pdf_boletim', 'dossie', 'referencia_externa'
);
create type public.use_authorization as enum ('nao_autorizado', 'uso_interno', 'divulgacao_autorizada');

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

create or replace function private.touch_updated_noby()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.set_created_by()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- autoria é sempre definida pelo servidor, nunca pelo cliente
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  new.created_at := now();
  return new;
end $$;

-- verdadeiro quando a instrução vem diretamente de um cliente da API (não de RPC SECURITY DEFINER)
create or replace function private.is_api_client()
returns boolean language sql stable set search_path = '' as $$
  select current_user in ('authenticated', 'anon');
$$;

-- ---------------------------------------------------------------------------
-- Organizações e perfis
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  timezone text not null default 'America/Bahia',
  status_institucional text not null default 'em_alinhamento'
    check (status_institucional in ('em_alinhamento', 'parcialmente_autorizado', 'autorizado', 'suspenso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 200),
  email text,
  situacao text not null default 'ativa' check (situacao in ('ativa', 'suspensa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  status public.member_status not null default 'ativo',
  -- delegação explícita para exercer a etapa final de revisão (editor/revisor)
  delegacao_revisao_final boolean not null default false,
  invited_by uuid references public.profiles (id),
  inicio date not null default current_date,
  fim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);
create index memberships_user_idx on public.memberships (user_id, status);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.org_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references public.profiles (id),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  revoked_at timestamptz,
  reenvios int not null default 0,
  created_at timestamptz not null default now()
);
create index invitations_org_idx on public.invitations (organization_id, email);

-- ---------------------------------------------------------------------------
-- Funções de autorização (SECURITY DEFINER, search_path vazio, sem escalonamento)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(org uuid, roles public.org_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'ativo'
      and p.situacao = 'ativa'
      and (m.fim is null or m.fim >= current_date)
      and m.role = any (roles)
  );
$$;

create or replace function private.is_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(org, array['admin','coordenacao','pesquisador','estudante','editor','leitor']::public.org_role[]);
$$;

-- gestão: administração do sistema e coordenação
create or replace function private.is_manager(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(org, array['admin','coordenacao']::public.org_role[]);
$$;

-- equipe executora/gestão: quem opera o dia a dia do projeto
create or replace function private.is_team(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(org, array['admin','coordenacao','estudante','editor']::public.org_role[]);
$$;

-- membros internos com capacidade de contribuir (exclui leitor)
create or replace function private.is_internal(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(org, array['admin','coordenacao','estudante','editor','pesquisador']::public.org_role[]);
$$;

create or replace function private.can_final_review(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(org, array['coordenacao']::public.org_role[])
    or exists (
      select 1 from public.memberships m
      where m.organization_id = org and m.user_id = (select auth.uid())
        and m.status = 'ativo' and m.role = 'editor' and m.delegacao_revisao_final
    );
$$;

grant execute on all functions in schema private to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Configurações do projeto e situação institucional
-- ---------------------------------------------------------------------------
create table public.project_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  nome_projeto text not null default 'Entomo Agro 360',
  assinatura text not null default 'Gestão científica | Entomo Agro 360',
  codigo_prefixo text not null default 'EA360' check (codigo_prefixo ~ '^[A-Z0-9]{2,10}$'),
  piloto_inicio date,
  piloto_meses int not null default 6 check (piloto_meses between 1 and 36),
  piloto_prorrogacao_meses int not null default 0 check (piloto_prorrogacao_meses between 0 and 36),
  meta_boletins int not null default 2,
  portal_publico_ativo boolean not null default false,
  feedback_publico_ativo boolean not null default false,
  exibir_marcas_institucionais boolean not null default false,
  contato_institucional text,
  politica_editorial text,
  limite_upload_mb int not null default 25 check (limite_upload_mb between 1 and 50),
  onboarding_concluido boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.institutional_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tipo text not null check (tipo in (
    'adesao_fazenda', 'uso_marca_fazenda', 'uso_marca_instituicao', 'credenciamento_extensao',
    'autorizacao_publicacao', 'acesso_base_original', 'outro')),
  descricao text,
  status text not null default 'em_alinhamento' check (status in ('em_alinhamento', 'autorizado', 'negado', 'expirado')),
  concedido_por text,
  data_decisao date,
  validade date,
  documento_file_id uuid,
  observacoes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create trigger t_org_updated before update on public.organizations
  for each row execute function private.touch_updated_noby();
create trigger t_profiles_updated before update on public.profiles
  for each row execute function private.touch_updated_noby();
create trigger t_memberships_updated before update on public.memberships
  for each row execute function private.touch_updated_noby();
create trigger t_settings_updated before update on public.project_settings
  for each row execute function private.touch_updated();
create trigger t_auth_updated before update on public.institutional_authorizations
  for each row execute function private.touch_updated();
create trigger t_auth_created before insert on public.institutional_authorizations
  for each row execute function private.set_created_by();
