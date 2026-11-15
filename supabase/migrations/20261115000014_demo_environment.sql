-- Bento | Ambiente de demonstração isolado e séries de acompanhamento dos ensaios
-- Somente acréscimos: colunas opcionais, tabelas novas, gatilhos e funções. Nenhum dado existente é alterado.
--
-- Isolamento: os dados demonstrativos vivem em uma organização própria (organizations.is_demo = true).
-- A RLS existente já separa organizações; aqui o marcador fica persistido em todos os registros
-- (forçado por gatilho) e só o SQL administrativo (service role) pode criar/remover a demonstração.
--
-- Reversão (manual, apenas se nenhuma organização de demonstração existir):
--   select public.demo_purge_organization(id) from public.organizations where is_demo;
--   drop table public.demo_time_assumptions, public.experiment_plot_readings,
--     public.experiment_incidents, public.experiment_measurements;
--   drop trigger t_org_demo_guard on public.organizations; (e os gatilhos t_*_demo_flag)
--   alter table public.experiments drop column demo_meta; alter table public.organizations drop column is_demo;
--   (o valor 'planejado' do enum experiment_phase permanece; é inofensivo sem uso)

-- ---------------------------------------------------------------------------
-- 1. Organização de demonstração
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists is_demo boolean not null default false;

create or replace function private.guard_org_demo_flag()
returns trigger language plpgsql set search_path = '' as $$
begin
  if private.is_api_client() and new.is_demo is distinct from old.is_demo then
    raise exception 'O marcador de demonstração da organização só pode ser alterado administrativamente' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger t_org_demo_guard before update on public.organizations
  for each row execute function private.guard_org_demo_flag();

create or replace function private.is_demo_org(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select o.is_demo from public.organizations o where o.id = org), false);
$$;

-- Em organização de demonstração, todo registro é demonstrativo (inclusive o que for criado pela interface).
create or replace function private.force_demo_flag()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_demo_org(new.organization_id) then
    new.is_demo := true;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['people', 'experiments', 'visit_schedules', 'visit_records', 'tasks', 'result_summaries', 'files', 'editorial_items'] loop
    execute format('create trigger t_%s_demo_flag before insert or update on public.%I for each row execute function private.force_demo_flag()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Experimentos: fase "planejado" e metadados exclusivos da demonstração
-- ---------------------------------------------------------------------------
alter type public.experiment_phase add value if not exists 'planejado' before 'implantacao';

alter table public.experiments add column if not exists demo_meta jsonb
  check (demo_meta is null or (is_demo and jsonb_typeof(demo_meta) = 'object'));

-- Organizações de demonstração mantêm os códigos DEMO-<PREFIXO>-NNN fornecidos pelo importador.
-- Para qualquer outra organização o comportamento é idêntico ao anterior.
create or replace function private.assign_experiment_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_prefix text;
  v_next int;
begin
  if new.codigo ~ '^DEMO-[A-Z0-9]{2,10}-[0-9]{3,6}$' and private.is_demo_org(new.organization_id) then
    v_next := (regexp_match(new.codigo, '([0-9]+)$'))[1]::int;
    insert into public.experiment_code_counters (organization_id, ultimo_valor)
    values (new.organization_id, v_next)
    on conflict (organization_id) do update
      set ultimo_valor = greatest(public.experiment_code_counters.ultimo_valor, excluded.ultimo_valor);
    new.codigo_seq := v_next;
    return new;
  end if;
  select codigo_prefixo into v_prefix from public.project_settings where organization_id = new.organization_id;
  insert into public.experiment_code_counters (organization_id, ultimo_valor)
  values (new.organization_id, 1)
  on conflict (organization_id) do update set ultimo_valor = public.experiment_code_counters.ultimo_valor + 1
  returning ultimo_valor into v_next;
  new.codigo_seq := v_next;
  new.codigo := coalesce(v_prefix, 'EA360') || '-' || lpad(v_next::text, 3, '0');
  return new;
end $$;

-- Atividades importadas administrativamente preservam a data de conclusão informada.
-- Pela aplicação (authenticated) a data continua sendo sempre a do momento da conclusão.
create or replace function private.task_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status <> 'concluida') then
    if private.is_api_client() or new.concluida_em is null then
      new.concluida_em := now();
    end if;
  elsif new.status <> 'concluida' then
    new.concluida_em := null;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Séries de acompanhamento (servem a qualquer organização; escrita só administrativa por ora)
-- ---------------------------------------------------------------------------
create table public.experiment_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  visit_record_id uuid,
  data_medicao date not null,
  variavel text not null check (char_length(variavel) between 1 and 200),
  valor numeric,
  unidade text check (char_length(unidade) <= 60),
  fonte text check (char_length(fonte) <= 300),
  motivo_ausencia text check (char_length(motivo_ausencia) <= 500),
  ordem int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade,
  foreign key (visit_record_id, organization_id) references public.visit_records (id, organization_id) on delete cascade,
  -- valor ausente exige justificativa e nunca é tratado como zero
  check (valor is not null or coalesce(trim(motivo_ausencia), '') <> '')
);
create index experiment_measurements_exp_idx on public.experiment_measurements (experiment_id, variavel, data_medicao);
create index experiment_measurements_org_idx on public.experiment_measurements (organization_id);

create table public.experiment_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  visit_record_id uuid,
  titulo text not null check (char_length(titulo) between 3 and 300),
  gravidade text not null check (gravidade in ('baixa', 'media', 'alta', 'critica')),
  detectada_em date not null,
  descricao text,
  consequencia text,
  providencia text,
  responsavel_descricao text check (char_length(responsavel_descricao) <= 200),
  proxima_verificacao date,
  status text not null default 'aberta' check (status in ('aberta', 'em_acompanhamento', 'resolvida', 'encerrada')),
  resolvida_em date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade,
  foreign key (visit_record_id, organization_id) references public.visit_records (id, organization_id) on delete set null (visit_record_id),
  check (status not in ('resolvida', 'encerrada') or resolvida_em is not null),
  check (resolvida_em is null or resolvida_em >= detectada_em)
);
create index experiment_incidents_exp_idx on public.experiment_incidents (experiment_id, detectada_em);
create index experiment_incidents_org_idx on public.experiment_incidents (organization_id, status);

create table public.experiment_plot_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  parcela text not null check (char_length(parcela) between 1 and 120),
  tratamento text check (char_length(tratamento) <= 300),
  bloco int check (bloco is null or bloco between 0 and 1000),
  variavel text not null check (char_length(variavel) between 1 and 200),
  valor numeric,
  unidade text check (char_length(unidade) <= 60),
  data_leitura date,
  natureza text not null default 'registrada' check (natureza in ('registrada', 'sintetico_sem_teste_estatistico')),
  motivo_ausencia text check (char_length(motivo_ausencia) <= 500),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade,
  check (valor is not null or coalesce(trim(motivo_ausencia), '') <> '')
);
create index experiment_plot_readings_exp_idx on public.experiment_plot_readings (experiment_id);
create index experiment_plot_readings_org_idx on public.experiment_plot_readings (organization_id);

do $$
declare t text;
begin
  foreach t in array array['experiment_measurements', 'experiment_incidents', 'experiment_plot_readings'] loop
    execute format('create trigger t_%s_demo_flag before insert or update on public.%I for each row execute function private.force_demo_flag()', t, t);
  end loop;
end $$;
create trigger t_measurements_updated before update on public.experiment_measurements
  for each row execute function private.touch_updated_noby();
create trigger t_incidents_updated before update on public.experiment_incidents
  for each row execute function private.touch_updated_noby();

-- ---------------------------------------------------------------------------
-- 4. Premissas da estimativa de tempo administrativo — SOMENTE em organização de demonstração
-- ---------------------------------------------------------------------------
create table public.demo_time_assumptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ordem int not null default 0,
  atividade text not null check (char_length(atividade) between 2 and 200),
  eventos_mes numeric(8, 2) not null check (eventos_mes between 0 and 10000),
  minutos_antes numeric(8, 2) not null check (minutos_antes between 0 and 10000),
  minutos_bento numeric(8, 2) not null check (minutos_bento between 0 and 10000),
  premissa text check (char_length(premissa) <= 500),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, atividade)
);

create or replace function private.guard_demo_only()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_demo_org(new.organization_id) then
    raise exception 'Premissas de tempo simuladas só existem em organização de demonstração' using errcode = '42501';
  end if;
  if private.is_api_client() then
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger t_time_assumptions_demo before insert or update on public.demo_time_assumptions
  for each row execute function private.guard_demo_only();

-- ---------------------------------------------------------------------------
-- 5. RLS (deny-by-default; escrita das séries apenas pelo importador administrativo)
-- ---------------------------------------------------------------------------
alter table public.experiment_measurements enable row level security;
alter table public.experiment_incidents enable row level security;
alter table public.experiment_plot_readings enable row level security;
alter table public.demo_time_assumptions enable row level security;
revoke all on public.experiment_measurements, public.experiment_incidents, public.experiment_plot_readings, public.demo_time_assumptions from anon;
revoke insert, update, delete on public.experiment_measurements, public.experiment_incidents, public.experiment_plot_readings from authenticated;
revoke insert, update, delete on public.demo_time_assumptions from authenticated;
grant select on public.experiment_measurements, public.experiment_incidents, public.experiment_plot_readings, public.demo_time_assumptions to authenticated;
-- só os números das premissas podem ser editados (nunca organização, atividade ou autoria)
grant update (eventos_mes, minutos_antes, minutos_bento) on public.demo_time_assumptions to authenticated;

create policy measurements_select on public.experiment_measurements for select to authenticated
  using (private.can_read_experiment(experiment_id));
create policy incidents_select on public.experiment_incidents for select to authenticated
  using (private.can_read_experiment(experiment_id));
create policy plot_readings_select on public.experiment_plot_readings for select to authenticated
  using (private.can_read_experiment(experiment_id));
create policy time_assumptions_select on public.demo_time_assumptions for select to authenticated
  using (private.is_member(organization_id) and private.is_demo_org(organization_id));
create policy time_assumptions_update on public.demo_time_assumptions for update to authenticated
  using (private.is_manager(organization_id) and private.is_demo_org(organization_id))
  with check (private.is_manager(organization_id) and private.is_demo_org(organization_id));

-- ---------------------------------------------------------------------------
-- 6. Remoção exclusiva da demonstração (uma transação; só service role)
-- ---------------------------------------------------------------------------
create or replace function public.demo_purge_organization(p_org uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t text;
  n int;
  v_counts jsonb := '{}';
  v_tables text[] := array[
    'experiment_measurements', 'experiment_plot_readings', 'experiment_incidents', 'demo_time_assumptions',
    'notifications', 'task_checklist_items', 'task_comments', 'tasks', 'files', 'generated_documents',
    'editorial_sources', 'bulletin_sections', 'bulletin_editions', 'editorial_items', 'result_summaries',
    'visit_participants', 'visit_checklist_items', 'visit_records', 'visit_schedule_experiments', 'visit_schedules',
    'experiment_milestones', 'experiment_members', 'experiment_treatments', 'experiments', 'experiment_code_counters',
    'farm_areas', 'farms', 'people_contacts', 'people', 'import_batches', 'recurring_routines', 'work_fronts',
    'pilot_milestones', 'project_settings', 'invitations', 'memberships', 'organizations', 'activity_log'
  ];
begin
  if not exists (select 1 from public.organizations where id = p_org and is_demo) then
    raise exception 'Remoção recusada: a organização % não é de demonstração', p_org using errcode = '42501';
  end if;
  if exists (select 1 from public.experiments where organization_id = p_org and not is_demo) then
    raise exception 'Remoção recusada: há experimentos sem marcador de demonstração' using errcode = '42501';
  end if;
  foreach t in array v_tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = case when t = 'organizations' then 'id' else 'organization_id' end
    ) then
      execute format('delete from public.%I where %I = $1', t, case when t = 'organizations' then 'id' else 'organization_id' end) using p_org;
      get diagnostics n = row_count;
      if n > 0 then v_counts := v_counts || jsonb_build_object(t, n); end if;
    end if;
  end loop;
  return v_counts;
end $$;
revoke all on function public.demo_purge_organization(uuid) from public, anon, authenticated;
grant execute on function public.demo_purge_organization(uuid) to service_role;

grant execute on function private.is_demo_org(uuid) to authenticated, service_role;
grant execute on function private.force_demo_flag(), private.guard_demo_only(), private.guard_org_demo_flag() to authenticated, service_role;
