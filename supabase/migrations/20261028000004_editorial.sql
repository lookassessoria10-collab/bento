-- Bento | Editorial, versões, aprovações, boletins, dossiês, publicações, portal e piloto

create table public.editorial_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  tipo public.editorial_kind not null,
  titulo text not null check (char_length(titulo) between 3 and 300),
  descricao text,
  objetivo text,
  publico text,
  area_tematica text,
  canais public.channel[] not null default '{}',
  formato text, -- instagram: feed, carrossel, reels, stories
  data_sugerida date,
  prazo date,
  responsavel_redacao uuid references public.profiles (id),
  revisor_cientifico uuid references public.profiles (id),
  revisor_final uuid references public.profiles (id),
  pesquisador_person_id uuid,
  requer_validacao_cientifica boolean not null default true,
  labels text[] not null default '{}',
  -- rascunho editável (blocos estruturados, sem HTML)
  draft jsonb not null default '{"blocks": []}' check (jsonb_typeof(draft) = 'object'),
  status public.workflow_status not null default 'rascunho',
  current_version_id uuid,
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (pesquisador_person_id, organization_id) references public.people (id, organization_id)
);
create index editorial_org_idx on public.editorial_items (organization_id, tipo, status);

-- fontes vinculadas ao item (experimentos, resultados, arquivos, referências)
create table public.editorial_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  experiment_id uuid,
  result_id uuid,
  file_id uuid,
  referencia text,
  created_at timestamptz not null default now(),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id) on delete cascade,
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id),
  foreign key (result_id, organization_id) references public.result_summaries (id, organization_id),
  foreign key (file_id, organization_id) references public.files (id, organization_id),
  check (num_nonnulls(experiment_id, result_id, file_id, referencia) >= 1)
);
create index editorial_sources_item_idx on public.editorial_sources (item_id);

-- snapshots imutáveis
create table public.editorial_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  numero int not null,
  content jsonb not null,
  content_hash text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (item_id, numero),
  unique (id, organization_id),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id) on delete restrict
);

alter table public.editorial_items
  add constraint editorial_items_current_version_fk foreign key (current_version_id) references public.editorial_versions (id);

alter table public.files
  add constraint files_editorial_fk foreign key (editorial_item_id, organization_id)
  references public.editorial_items (id, organization_id);
alter table public.tasks
  add constraint tasks_editorial_fk foreign key (editorial_item_id, organization_id)
  references public.editorial_items (id, organization_id);

create or replace function private.immutable_row()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro imutável: crie uma nova versão' using errcode = '42501';
end $$;
create trigger t_versions_immutable before update or delete on public.editorial_versions
  for each row execute function private.immutable_row();

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  version_id uuid not null,
  etapa public.approval_stage not null,
  revisor_id uuid references public.profiles (id),
  revisor_person_id uuid,
  prazo date,
  status text not null default 'aberta' check (status in ('aberta', 'concluida', 'cancelada')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  concluida_em timestamptz,
  unique (id, organization_id),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id),
  foreign key (version_id, organization_id) references public.editorial_versions (id, organization_id)
);
create index approval_requests_revisor_idx on public.approval_requests (revisor_id, status);
create index approval_requests_item_idx on public.approval_requests (item_id, status);

create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  version_id uuid not null,
  request_id uuid,
  etapa public.approval_stage not null,
  decisao public.approval_decision not null,
  motivo text,
  escopo_canais public.channel[] not null default '{}',
  decidido_por uuid not null references public.profiles (id),
  papel text not null,
  -- validação externa documentada (pesquisador sem conta)
  externo boolean not null default false,
  pessoa_externa_id uuid,
  comprovante_file_id uuid,
  metodo_confirmacao text,
  data_confirmacao date,
  version_hash text not null,
  created_at timestamptz not null default now(),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id),
  foreign key (version_id, organization_id) references public.editorial_versions (id, organization_id),
  foreign key (pessoa_externa_id, organization_id) references public.people (id, organization_id),
  foreign key (comprovante_file_id, organization_id) references public.files (id, organization_id),
  check (decisao = 'aprovado' or coalesce(trim(motivo), '') <> ''),
  check (not externo or (pessoa_externa_id is not null and comprovante_file_id is not null and metodo_confirmacao is not null and data_confirmacao is not null))
);
create trigger t_decisions_immutable before update or delete on public.approval_decisions
  for each row execute function private.immutable_row();

create table public.release_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  version_id uuid not null,
  canal public.channel not null,
  decision_id uuid not null references public.approval_decisions (id),
  revogado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (version_id, canal),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id),
  foreign key (version_id, organization_id) references public.editorial_versions (id, organization_id)
);

-- ---------------------------------------------------------------------------
-- Boletins
-- ---------------------------------------------------------------------------
create table public.bulletin_editions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  editorial_item_id uuid not null unique,
  numero int not null check (numero > 0),
  volume text,
  periodo_inicio date,
  periodo_fim date,
  data_prevista date,
  data_fechamento date,
  equipe_editorial text,
  apresentacao text,
  capa_file_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, numero),
  unique (id, organization_id),
  foreign key (editorial_item_id, organization_id) references public.editorial_items (id, organization_id) on delete cascade,
  foreign key (capa_file_id, organization_id) references public.files (id, organization_id)
);

create table public.bulletin_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  bulletin_id uuid not null,
  ordem int not null default 0,
  tipo text not null check (tipo in ('apresentacao', 'panorama', 'destaque', 'resultados', 'entomologia', 'agenda', 'creditos', 'livre')),
  titulo text not null,
  corpo text not null default '',
  experiment_id uuid,
  result_ids uuid[] not null default '{}',
  file_ids uuid[] not null default '{}',
  referencias text,
  updated_at timestamptz not null default now(),
  foreign key (bulletin_id, organization_id) references public.bulletin_editions (id, organization_id) on delete cascade,
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id)
);
create index bulletin_sections_idx on public.bulletin_sections (bulletin_id, ordem);

-- ---------------------------------------------------------------------------
-- Dossiês
-- ---------------------------------------------------------------------------
create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  editorial_item_id uuid not null unique,
  periodo_inicio date,
  periodo_fim date,
  finalidade text not null default 'interno' check (finalidade in ('interno', 'divulgacao')),
  apresentacao text,
  escopo text,
  criterios_inclusao text,
  metodo_coleta text,
  sintese text,
  referencias text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (editorial_item_id, organization_id) references public.editorial_items (id, organization_id) on delete cascade
);

create table public.dossier_experiments (
  dossier_id uuid not null,
  experiment_id uuid not null,
  organization_id uuid not null,
  incluir_resultados boolean not null default true,
  ordem int not null default 0,
  primary key (dossier_id, experiment_id),
  foreign key (dossier_id, organization_id) references public.dossiers (id, organization_id) on delete cascade,
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id)
);

-- ---------------------------------------------------------------------------
-- Documentos gerados, publicações e portal
-- ---------------------------------------------------------------------------
create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid,
  version_id uuid,
  tipo text not null check (tipo in ('boletim', 'dossie', 'relatorio_piloto', 'ficha_visita', 'ficha_experimento', 'outro')),
  rascunho boolean not null default true,
  storage_path text not null unique,
  sha256 text not null,
  tamanho_bytes bigint not null,
  gerado_por uuid references public.profiles (id),
  gerado_em timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id),
  foreign key (version_id, organization_id) references public.editorial_versions (id, organization_id),
  -- PDF final só a partir de versão fixada
  check (rascunho or version_id is not null)
);
create trigger t_gendocs_immutable before update or delete on public.generated_documents
  for each row execute function private.immutable_row();

create table public.publication_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  version_id uuid not null,
  canal public.channel not null,
  data_publicacao date not null,
  url text check (url is null or url ~* '^https?://'),
  responsavel_id uuid not null references public.profiles (id),
  document_id uuid,
  status text not null default 'ativa' check (status in ('ativa', 'revogada', 'substituida')),
  errata text,
  revogado_em timestamptz,
  revogado_por uuid references public.profiles (id),
  motivo_revogacao text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (item_id, organization_id) references public.editorial_items (id, organization_id),
  foreign key (version_id, organization_id) references public.editorial_versions (id, organization_id),
  foreign key (document_id, organization_id) references public.generated_documents (id, organization_id)
);

-- snapshot público: única fonte lida pelo portal
create table public.public_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  publication_id uuid not null unique references public.publication_records (id),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  tipo public.editorial_kind not null,
  titulo text not null,
  resumo text,
  content jsonb not null,
  pdf_storage_path text,
  versao int not null,
  published_at timestamptz not null default now(),
  revoked_at timestamptz,
  errata text
);

-- métricas do Instagram registradas manualmente
create table public.instagram_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  publication_id uuid not null,
  data_referencia date not null,
  alcance int check (alcance >= 0),
  impressoes int check (impressoes >= 0),
  curtidas int check (curtidas >= 0),
  comentarios int check (comentarios >= 0),
  salvamentos int check (salvamentos >= 0),
  compartilhamentos int check (compartilhamentos >= 0),
  observacoes text,
  registrado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (publication_id, organization_id) references public.publication_records (id, organization_id) on delete cascade
);

create table public.audience_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  origem text not null default 'instagram' check (origem in ('instagram', 'portal', 'evento', 'outro')),
  pergunta text not null check (char_length(pergunta) between 3 and 2000),
  status text not null default 'nova' check (status in ('nova', 'em_pauta', 'respondida', 'descartada')),
  editorial_item_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (editorial_item_id, organization_id) references public.editorial_items (id, organization_id)
);

create table public.audience_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  public_publication_id uuid references public.public_publications (id) on delete set null,
  clareza int check (clareza between 1 and 5),
  utilidade int check (utilidade between 1 and 5),
  comentario text check (char_length(comentario) <= 2000),
  sugestao_pauta text check (char_length(sugestao_pauta) <= 1000),
  perfil text check (perfil in ('produtor', 'estudante', 'pesquisador', 'tecnico', 'outro')),
  consentimento boolean not null check (consentimento),
  moderacao text not null default 'pendente' check (moderacao in ('pendente', 'aprovado', 'descartado')),
  origem_hash text,
  created_at timestamptz not null default now()
);
create index audience_feedback_rate_idx on public.audience_feedback (origem_hash, created_at);

-- ---------------------------------------------------------------------------
-- Piloto, frentes de trabalho, importações e auditoria
-- ---------------------------------------------------------------------------
create table public.pilot_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  mes int not null check (mes between 1 and 36),
  titulo text not null,
  descricao text,
  status text not null default 'previsto' check (status in ('previsto', 'em_andamento', 'concluido', 'replanejado')),
  concluido_em date,
  observacao text,
  updated_at timestamptz not null default now(),
  unique (organization_id, mes, titulo)
);

create table public.pilot_report (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  editorial_item_id uuid unique,
  updated_at timestamptz not null default now()
);

create table public.work_fronts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  frente text not null check (frente in ('articulacao', 'registros', 'comunicacao')),
  person_id uuid not null,
  inicio date not null,
  fim date,
  observacao text,
  created_at timestamptz not null default now(),
  foreign key (person_id, organization_id) references public.people (id, organization_id),
  check (fim is null or fim >= inicio)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entidade text not null default 'experiments',
  arquivo_nome text not null,
  total_linhas int not null default 0,
  importadas int not null default 0,
  invalidas int not null default 0,
  duplicadas int not null default 0,
  relatorio jsonb not null default '[]',
  criado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  desfeito_em timestamptz
);
alter table public.experiments add constraint experiments_import_fk foreign key (import_batch_id) references public.import_batches (id);

create table public.activity_log (
  id bigint generated always as identity primary key,
  organization_id uuid,
  user_id uuid,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  detalhes jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_log_org_idx on public.activity_log (organization_id, created_at desc);
create index activity_log_entity_idx on public.activity_log (entidade, entidade_id, created_at desc);

-- auditoria minimizada: registra apenas nomes dos campos alterados e situações
create or replace function private.audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}'::jsonb end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}'::jsonb end;
  v_changed text[];
  v_details jsonb := '{}';
  v_status_keys text[] := array['status', 'fase', 'validacao_status', 'conferencia_status', 'nivel_acesso', 'role', 'archived_at', 'deleted_at', 'acompanhamento_ativo'];
  k text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key) into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from v_old -> n.key
      and n.key not in ('updated_at', 'updated_by', 'search');
    if v_changed is null then
      return new;
    end if;
    v_details := jsonb_build_object('campos', to_jsonb(v_changed));
    foreach k in array v_status_keys loop
      if k = any (v_changed) then
        v_details := v_details || jsonb_build_object(k, jsonb_build_object('de', v_old -> k, 'para', v_new -> k));
      end if;
    end loop;
  end if;
  insert into public.activity_log (organization_id, user_id, entidade, entidade_id, acao, detalhes)
  values (
    coalesce((v_new ->> 'organization_id')::uuid, (v_old ->> 'organization_id')::uuid),
    auth.uid(), tg_table_name,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    lower(tg_op), v_details
  );
  return coalesce(new, old);
end $$;

create trigger t_audit after insert or update or delete on public.experiments for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.visit_schedules for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.visit_records for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.result_summaries for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.files for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.tasks for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.editorial_items for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.memberships for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.invitations for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.project_settings for each row execute function private.audit();
create trigger t_audit after insert or update or delete on public.experiment_members for each row execute function private.audit();

-- ---------------------------------------------------------------------------
-- Gatilhos de proteção do fluxo editorial
-- ---------------------------------------------------------------------------
create or replace function private.guard_editorial_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.is_api_client() then
      new.status := 'rascunho';
      new.current_version_id := null;
    end if;
    return new;
  end if;
  if private.is_api_client() then
    if new.status is distinct from old.status or new.current_version_id is distinct from old.current_version_id
       or new.organization_id is distinct from old.organization_id or new.tipo is distinct from old.tipo then
      raise exception 'A situação do conteúdo só muda pelo fluxo de revisão' using errcode = '42501';
    end if;
    -- alteração relevante após envio para revisão invalida o ciclo: volta a rascunho
    if old.status not in ('rascunho', 'devolvido')
       and (new.draft, new.titulo, new.requer_validacao_cientifica)
           is distinct from (old.draft, old.titulo, old.requer_validacao_cientifica) then
      new.status := 'rascunho';
    end if;
  end if;
  return new;
end $$;
create trigger t_editorial_guard before insert or update on public.editorial_items
  for each row execute function private.guard_editorial_item();
create trigger t_editorial_created before insert on public.editorial_items for each row execute function private.set_created_by();
create trigger t_editorial_updated before update on public.editorial_items for each row execute function private.touch_updated();

-- editar seções/fontes de boletim, dossiê ou item invalida o ciclo em andamento
create or replace function private.invalidate_item_cycle(p_item uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.editorial_items
     set status = 'rascunho', updated_at = now()
   where id = p_item and status not in ('rascunho', 'devolvido');
  if found then
    update public.approval_requests set status = 'cancelada', concluida_em = now()
     where item_id = p_item and status = 'aberta';
    insert into public.activity_log (organization_id, user_id, entidade, entidade_id, acao, detalhes)
    select organization_id, auth.uid(), 'editorial_items', id, 'ciclo_invalidado',
           '{"motivo": "conteúdo alterado após envio para revisão"}'::jsonb
      from public.editorial_items where id = p_item;
  end if;
end $$;

-- executa como o invocador: só reage a alterações feitas diretamente por clientes da API
create or replace function private.on_bulletin_change()
returns trigger language plpgsql set search_path = '' as $$
declare v_item uuid;
begin
  if not private.is_api_client() then return coalesce(new, old); end if;
  if tg_table_name = 'bulletin_sections' then
    select b.editorial_item_id into v_item from public.bulletin_editions b where b.id = coalesce(new.bulletin_id, old.bulletin_id);
  elsif tg_table_name = 'bulletin_editions' then
    v_item := coalesce(new.editorial_item_id, old.editorial_item_id);
  elsif tg_table_name = 'dossiers' then
    v_item := coalesce(new.editorial_item_id, old.editorial_item_id);
  elsif tg_table_name = 'dossier_experiments' then
    select d.editorial_item_id into v_item from public.dossiers d where d.id = coalesce(new.dossier_id, old.dossier_id);
  elsif tg_table_name = 'editorial_sources' then
    v_item := coalesce(new.item_id, old.item_id);
  end if;
  if v_item is not null then
    perform private.invalidate_item_cycle(v_item);
  end if;
  return coalesce(new, old);
end $$;
create trigger t_inv after insert or update or delete on public.bulletin_sections for each row execute function private.on_bulletin_change();
create trigger t_inv after update on public.bulletin_editions for each row execute function private.on_bulletin_change();
create trigger t_inv after update on public.dossiers for each row execute function private.on_bulletin_change();
create trigger t_inv after insert or update or delete on public.dossier_experiments for each row execute function private.on_bulletin_change();
create trigger t_inv after insert or update or delete on public.editorial_sources for each row execute function private.on_bulletin_change();

create or replace function private.can_read_item(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.editorial_items i
    where i.id = p_item and (
      private.is_team(i.organization_id)
      or (private.is_member(i.organization_id) and (
        i.revisor_cientifico = (select auth.uid()) or i.revisor_final = (select auth.uid())
        or exists (select 1 from public.approval_requests r where r.item_id = i.id and r.revisor_id = (select auth.uid()))
      ))
    )
  );
$$;
grant execute on all functions in schema private to authenticated, anon, service_role;
revoke execute on function private.notify(uuid, uuid, text, text, text, text) from anon, authenticated;
