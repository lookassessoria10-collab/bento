-- Bento | Visitas, fichas, resultados, arquivos, tarefas e notificações

-- ---------------------------------------------------------------------------
-- Visitas
-- ---------------------------------------------------------------------------
create table public.visit_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 200),
  data_hora timestamptz not null,
  local text,
  farm_id uuid,
  interlocutores text,
  status public.visit_status not null default 'planejada',
  motivo_status text,
  lembrete text,
  checklist_template_id uuid,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (farm_id, organization_id) references public.farms (id, organization_id),
  check (status not in ('adiada', 'cancelada') or coalesce(trim(motivo_status), '') <> '')
);
create index visits_org_date_idx on public.visit_schedules (organization_id, data_hora);

create table public.visit_schedule_experiments (
  visit_id uuid not null,
  experiment_id uuid not null,
  organization_id uuid not null,
  primary key (visit_id, experiment_id),
  foreign key (visit_id, organization_id) references public.visit_schedules (id, organization_id) on delete cascade,
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade
);
create index vse_exp_idx on public.visit_schedule_experiments (experiment_id);

create table public.visit_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  visit_id uuid not null,
  person_id uuid,
  user_id uuid references public.profiles (id),
  papel text not null default 'participante' check (papel in ('estudante', 'interlocutor', 'pesquisador', 'participante')),
  foreign key (visit_id, organization_id) references public.visit_schedules (id, organization_id) on delete cascade,
  foreign key (person_id, organization_id) references public.people (id, organization_id),
  check (person_id is not null or user_id is not null)
);

create table public.visit_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null,
  itens jsonb not null default '[]' check (jsonb_typeof(itens) = 'array'),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

-- ficha de acompanhamento: uma por experimento por visita
create table public.visit_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  visit_id uuid not null,
  experiment_id uuid not null,
  objetivo text,
  etapa_atual text,
  atividades_desde_ultima text,
  avaliacoes_previstas text,
  avaliacoes_realizadas text,
  -- relato do pesquisador e observação direta das estudantes ficam em campos distintos
  ocorrencias_relatadas text,
  informante_person_id uuid,
  informante_descricao text,
  observacoes_diretas text,
  resultados_disponibilizados text,
  situacao_analise public.analysis_status not null default 'nao_informada',
  fontes text,
  conteudo_potencial text,
  proxima_acao text,
  proxima_acao_responsavel uuid references public.profiles (id),
  proxima_acao_prazo date,
  status public.record_status not null default 'rascunho',
  conferido_por uuid references public.profiles (id),
  conferido_em timestamptz,
  comentario_conferencia text,
  finalizado_em timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (visit_id, experiment_id),
  unique (id, organization_id),
  foreign key (visit_id, experiment_id) references public.visit_schedule_experiments (visit_id, experiment_id) on delete restrict,
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id),
  foreign key (informante_person_id, organization_id) references public.people (id, organization_id)
);
create index visit_records_exp_idx on public.visit_records (experiment_id, status);

create table public.visit_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  visit_record_id uuid not null,
  item text not null,
  resposta text not null default 'pendente' check (resposta in ('sim', 'nao', 'nao_se_aplica', 'pendente')),
  observacao text,
  ordem int not null default 0,
  foreign key (visit_record_id, organization_id) references public.visit_records (id, organization_id) on delete cascade
);

-- status da ficha só muda por RPC (fluxo planejar → realizar → preencher → conferir → finalizar)
create or replace function private.guard_visit_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.is_api_client() then
      new.status := 'rascunho';
      new.conferido_por := null; new.conferido_em := null; new.finalizado_em := null; new.comentario_conferencia := null;
    end if;
    return new;
  end if;
  if private.is_api_client() then
    if new.status is distinct from old.status or new.conferido_por is distinct from old.conferido_por
       or new.conferido_em is distinct from old.conferido_em or new.finalizado_em is distinct from old.finalizado_em
       or new.comentario_conferencia is distinct from old.comentario_conferencia
       or new.visit_id is distinct from old.visit_id or new.experiment_id is distinct from old.experiment_id then
      raise exception 'A situação da ficha só pode ser alterada pelo fluxo de conferência' using errcode = '42501';
    end if;
    if old.status = 'finalizada' then
      raise exception 'Ficha finalizada não pode ser editada' using errcode = '42501';
    end if;
    if old.status = 'conferida' then
      raise exception 'Ficha conferida: devolva-a pelo fluxo antes de editar' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger t_visit_records_guard before insert or update on public.visit_records
  for each row execute function private.guard_visit_record();

-- ---------------------------------------------------------------------------
-- Resultados recebidos (descritivos e rastreáveis)
-- ---------------------------------------------------------------------------
create table public.result_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  variavel text not null check (char_length(variavel) between 1 and 200),
  unidade text,
  periodo_inicio date,
  periodo_fim date,
  data_referencia date,
  sintese text not null default '',
  situacao_analise public.analysis_status not null default 'nao_informada',
  fonte_person_id uuid,
  fonte_descricao text,
  data_fornecimento date,
  referencia text,
  link_original text check (link_original is null or link_original ~* '^https?://'),
  limitacoes text,
  versao_interpretacao int not null default 1,
  conferencia_status text not null default 'pendente' check (conferencia_status in ('pendente', 'conferido', 'devolvido')),
  conferido_por uuid references public.profiles (id),
  validacao_status text not null default 'nao_validado' check (validacao_status in ('nao_validado', 'validado', 'devolvido', 'revogado')),
  validado_por uuid references public.profiles (id),
  validado_em timestamptz,
  validacao_externa boolean not null default false,
  escopo_divulgacao public.channel[] not null default '{interno}',
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id),
  foreign key (fonte_person_id, organization_id) references public.people (id, organization_id),
  check (periodo_fim is null or periodo_inicio is null or periodo_fim >= periodo_inicio)
);
create index results_exp_idx on public.result_summaries (experiment_id, validacao_status);

-- alterar a interpretação após validação invalida a validação e cria nova versão
create or replace function private.guard_result()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.is_api_client() then
      new.conferencia_status := 'pendente'; new.conferido_por := null;
      new.validacao_status := 'nao_validado'; new.validado_por := null; new.validado_em := null;
      new.validacao_externa := false; new.escopo_divulgacao := '{interno}'; new.versao_interpretacao := 1;
    end if;
    return new;
  end if;
  if private.is_api_client() then
    if new.conferencia_status is distinct from old.conferencia_status or new.conferido_por is distinct from old.conferido_por
       or new.validacao_status is distinct from old.validacao_status or new.validado_por is distinct from old.validado_por
       or new.validado_em is distinct from old.validado_em or new.validacao_externa is distinct from old.validacao_externa
       or new.escopo_divulgacao is distinct from old.escopo_divulgacao
       or new.versao_interpretacao is distinct from old.versao_interpretacao
       or new.experiment_id is distinct from old.experiment_id then
      raise exception 'Situação de validação só pode ser alterada pelo fluxo de revisão' using errcode = '42501';
    end if;
    if (new.sintese, new.limitacoes, new.variavel, new.unidade, new.situacao_analise, new.periodo_inicio, new.periodo_fim)
       is distinct from (old.sintese, old.limitacoes, old.variavel, old.unidade, old.situacao_analise, old.periodo_inicio, old.periodo_fim) then
      new.versao_interpretacao := old.versao_interpretacao + 1;
      if old.validacao_status = 'validado' or old.conferencia_status = 'conferido' then
        new.validacao_status := 'nao_validado'; new.validado_por := null; new.validado_em := null;
        new.validacao_externa := false; new.escopo_divulgacao := '{interno}';
        new.conferencia_status := 'pendente'; new.conferido_por := null;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger t_results_guard before insert or update on public.result_summaries
  for each row execute function private.guard_result();

-- ---------------------------------------------------------------------------
-- Arquivos (metadados) — Storage privado por padrão
-- ---------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  storage_path text unique,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  nome_amigavel text not null check (char_length(nome_amigavel) between 1 and 200),
  nome_sugerido text,
  nome_original text,
  mime_type text,
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  tipo public.file_kind not null,
  autoria text,
  origem text,
  data_arquivo date,
  legenda text,
  licenca text,
  autorizacao_uso public.use_authorization not null default 'uso_interno',
  autorizacao_canais public.channel[] not null default '{}',
  revisao_status text not null default 'pendente' check (revisao_status in ('pendente', 'conferido', 'devolvido')),
  versao int not null default 1,
  previous_version_id uuid references public.files (id),
  motivo_substituicao text,
  substituido_por uuid references public.files (id),
  experiment_id uuid,
  visit_record_id uuid,
  result_id uuid,
  editorial_item_id uuid,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id),
  foreign key (visit_record_id, organization_id) references public.visit_records (id, organization_id),
  foreign key (result_id, organization_id) references public.result_summaries (id, organization_id),
  check (storage_path is not null or external_url is not null),
  -- fotografia científica exige legenda, autoria e data
  check (tipo <> 'foto' or (coalesce(trim(legenda), '') <> '' and coalesce(trim(autoria), '') <> '' and data_arquivo is not null)),
  -- sair da área interna exige autorização de divulgação
  check (autorizacao_canais <@ '{interno}'::public.channel[] or autorizacao_uso = 'divulgacao_autorizada'),
  check (previous_version_id is null or coalesce(trim(motivo_substituicao), '') <> '')
);
create index files_org_idx on public.files (organization_id, tipo, created_at desc) where deleted_at is null;
create index files_exp_idx on public.files (experiment_id) where deleted_at is null;

create or replace function private.guard_file()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and private.is_api_client() then
    if new.storage_path is distinct from old.storage_path or new.organization_id is distinct from old.organization_id
       or new.versao is distinct from old.versao or new.created_by is distinct from old.created_by then
      raise exception 'Arquivos originais não podem ser sobrescritos; envie uma nova versão' using errcode = '42501';
    end if;
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_by := auth.uid();
    end if;
  end if;
  return new;
end $$;
create trigger t_files_guard before update on public.files for each row execute function private.guard_file();

-- ---------------------------------------------------------------------------
-- Atividades e pendências
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 300),
  descricao text,
  categoria text not null default 'geral'
    check (categoria in ('geral', 'articulacao', 'registros', 'comunicacao', 'visita', 'revisao', 'editorial')),
  prioridade public.task_priority not null default 'media',
  status public.task_status not null default 'a_fazer',
  responsavel_id uuid references public.profiles (id),
  colaborador_id uuid references public.profiles (id),
  inicio date,
  prazo date,
  concluida_em timestamptz,
  motivo_bloqueio text,
  ultimo_contato date,
  experiment_id uuid,
  visit_record_id uuid,
  editorial_item_id uuid,
  origem text not null default 'manual' check (origem in ('manual', 'pendencia_visita', 'rotina', 'revisao')),
  chave_recorrencia text,
  ordem double precision not null default 0,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, chave_recorrencia),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id),
  foreign key (visit_record_id, organization_id) references public.visit_records (id, organization_id),
  check (status <> 'aguardando_terceiro' or coalesce(trim(motivo_bloqueio), '') <> '')
);
create index tasks_org_status_idx on public.tasks (organization_id, status, prazo);
create index tasks_resp_idx on public.tasks (responsavel_id, status);

create or replace function private.task_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status <> 'concluida') then
    new.concluida_em := now();
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
  end if;
  return new;
end $$;
create trigger t_tasks_completion before insert or update on public.tasks for each row execute function private.task_completion();

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  task_id uuid not null,
  autor_id uuid references public.profiles (id),
  texto text not null check (char_length(texto) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete cascade
);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  task_id uuid not null,
  texto text not null check (char_length(texto) between 1 and 300),
  feito boolean not null default false,
  ordem int not null default 0,
  foreign key (task_id, organization_id) references public.tasks (id, organization_id) on delete cascade
);

create table public.recurring_routines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  titulo text not null,
  descricao text,
  regra text not null default 'mensal_por_experimento' check (regra in ('mensal_por_experimento', 'mensal_unica')),
  dia_prazo int not null default 25 check (dia_prazo between 1 and 28),
  categoria text not null default 'visita',
  responsavel_id uuid references public.profiles (id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notificações internas (criadas apenas por gatilhos/RPC)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text,
  link text check (link is null or link like '/app/%'),
  lida_em timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, lida_em, created_at desc);

create or replace function private.notify(p_org uuid, p_user uuid, p_tipo text, p_titulo text, p_msg text, p_link text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (organization_id, user_id, tipo, titulo, mensagem, link)
  values (p_org, p_user, p_tipo, p_titulo, p_msg, p_link);
end $$;
revoke execute on function private.notify(uuid, uuid, text, text, text, text) from anon, authenticated;

create or replace function private.notify_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.responsavel_id is not null and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    perform private.notify(new.organization_id, new.responsavel_id, 'atribuicao', 'Nova atividade atribuída',
      new.titulo, '/app/atividades?tarefa=' || new.id);
  end if;
  return new;
end $$;
create trigger t_tasks_notify after insert or update of responsavel_id on public.tasks
  for each row execute function private.notify_task();

-- ---------------------------------------------------------------------------
-- Gatilhos comuns de autoria/atualização
-- ---------------------------------------------------------------------------
create trigger t_visits_created before insert on public.visit_schedules for each row execute function private.set_created_by();
create trigger t_visits_updated before update on public.visit_schedules for each row execute function private.touch_updated();
create trigger t_vrec_created before insert on public.visit_records for each row execute function private.set_created_by();
create trigger t_vrec_updated before update on public.visit_records for each row execute function private.touch_updated();
create trigger t_results_created before insert on public.result_summaries for each row execute function private.set_created_by();
create trigger t_results_updated before update on public.result_summaries for each row execute function private.touch_updated();
create trigger t_files_created before insert on public.files for each row execute function private.set_created_by();
create trigger t_files_updated before update on public.files for each row execute function private.touch_updated();
create trigger t_tasks_created before insert on public.tasks for each row execute function private.set_created_by();
create trigger t_tasks_updated before update on public.tasks for each row execute function private.touch_updated();

create or replace function private.set_comment_author()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.autor_id := coalesce(auth.uid(), new.autor_id);
  new.created_at := now();
  return new;
end $$;
create trigger t_task_comments_author before insert on public.task_comments for each row execute function private.set_comment_author();
