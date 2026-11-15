-- Bento | Agenda de compromissos dos ensaios e compartilhamento externo de painéis por link
-- Somente acréscimos (tabelas, funções, gatilhos e políticas). Nenhum dado existente é alterado.
--
-- Agenda: visitas continuam em visit_schedules (sem duplicação). calendar_events guarda os demais
-- compromissos (avaliação, reunião de revisão, coleta, prazo de entrega, marco, outro), com data prevista
-- separada da data de realização e histórico de reagendamentos.
--
-- Compartilhamento: cada link guarda SOMENTE o hash SHA-256 de um token aleatório de 256 bits. Nada é
-- liberado a anon: a página pública valida o token no servidor (service role) e monta projeções mínimas.
-- Criar, substituir e revogar acontecem por funções transacionais que conferem o papel de gestão.
--
-- Reversão (manual): drop function public.share_link_create, public.share_link_revoke,
--   public.share_link_touch, public.share_link_password_result;
--   drop table public.dashboard_share_access, public.dashboard_share_audit, public.dashboard_share_links,
--   public.calendar_events;  (e recriar demo_purge_organization da migração 14)

-- ---------------------------------------------------------------------------
-- 1. Compromissos da agenda
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  experiment_id uuid,
  visit_id uuid,
  tipo text not null check (tipo in ('avaliacao', 'reuniao_revisao', 'coleta', 'prazo_entrega', 'marco_encerramento', 'outro')),
  titulo text not null check (char_length(titulo) between 3 and 200),
  -- dia previsto como data local (sem deslocamento de fuso); horário opcional
  data_prevista date not null,
  dia_inteiro boolean not null default true,
  inicio timestamptz,
  fim timestamptz,
  status text not null default 'planejado' check (status in ('planejado', 'confirmado', 'realizado', 'reagendado', 'cancelado')),
  realizado_em date,
  motivo_status text check (char_length(motivo_status) <= 500),
  responsavel_id uuid references public.profiles (id),
  responsavel_descricao text check (char_length(responsavel_descricao) <= 200),
  local_geral text check (char_length(local_geral) <= 200),
  observacoes text check (char_length(observacoes) <= 2000),
  historico jsonb not null default '[]' check (jsonb_typeof(historico) = 'array'),
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade,
  foreign key (visit_id, organization_id) references public.visit_schedules (id, organization_id) on delete set null (visit_id),
  check ((status = 'realizado') = (realizado_em is not null)),
  check (status <> 'cancelado' or coalesce(trim(motivo_status), '') <> ''),
  check (dia_inteiro or inicio is not null),
  check (fim is null or inicio is null or fim >= inicio)
);
create index calendar_events_org_idx on public.calendar_events (organization_id, data_prevista);
create index calendar_events_exp_idx on public.calendar_events (experiment_id, data_prevista);

-- regras de tempo e histórico de reagendamentos/estados (quem, quando, de → para)
create or replace function private.guard_calendar_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Bahia')::date;
begin
  if new.status = 'realizado' and new.realizado_em > v_today then
    raise exception 'Um compromisso não pode ser registrado como realizado em data futura' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and (new.data_prevista is distinct from old.data_prevista or new.status is distinct from old.status or new.inicio is distinct from old.inicio) then
    new.historico := old.historico || jsonb_build_array(jsonb_build_object(
      'em', now(), 'por', auth.uid(),
      'data_de', old.data_prevista, 'data_para', new.data_prevista,
      'status_de', old.status, 'status_para', new.status,
      'motivo', new.motivo_status));
  end if;
  return new;
end $$;
create trigger t_calendar_guard before insert or update on public.calendar_events
  for each row execute function private.guard_calendar_event();
create trigger t_calendar_created before insert on public.calendar_events for each row execute function private.set_created_by();
create trigger t_calendar_updated before update on public.calendar_events for each row execute function private.touch_updated();
create trigger t_calendar_events_demo_flag before insert or update on public.calendar_events
  for each row execute function private.force_demo_flag();
create trigger t_audit after insert or update or delete on public.calendar_events for each row execute function private.audit();

create or replace function private.notify_calendar_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.responsavel_id is not null and (tg_op = 'INSERT' or new.responsavel_id is distinct from old.responsavel_id) then
    perform private.notify(new.organization_id, new.responsavel_id, 'atribuicao', 'Novo compromisso na agenda',
      new.titulo || ' — ' || to_char(new.data_prevista, 'DD/MM/YYYY'), '/app/calendario?evento=' || new.id);
  end if;
  return new;
end $$;
create trigger t_calendar_notify after insert or update of responsavel_id on public.calendar_events
  for each row execute function private.notify_calendar_event();

alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon;
create policy calendar_select on public.calendar_events for select to authenticated
  using (private.is_member(organization_id) and (experiment_id is null or private.can_read_experiment(experiment_id)));
create policy calendar_insert on public.calendar_events for insert to authenticated
  with check (private.is_team(organization_id) and (experiment_id is null or private.can_read_experiment(experiment_id)));
create policy calendar_update on public.calendar_events for update to authenticated
  using (private.is_team(organization_id))
  with check (private.is_team(organization_id) and (experiment_id is null or private.can_read_experiment(experiment_id)));
-- sem DELETE: compromissos são cancelados (com motivo), preservando o histórico

-- ---------------------------------------------------------------------------
-- 2. Links externos de painéis
-- ---------------------------------------------------------------------------
create table public.dashboard_share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (char_length(nome) between 3 and 200),
  publico text not null check (publico in ('gestor_fazenda', 'coordenador_pesquisa', 'instituicao_parceira', 'demonstracao_comercial')),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'ativo' check (status in ('ativo', 'revogado')),
  expira_em timestamptz not null,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  senha_hash text check (senha_hash is null or senha_hash ~ '^scrypt\$'),
  tentativas_falhas int not null default 0,
  bloqueado_ate timestamptz,
  substitui_id uuid references public.dashboard_share_links (id),
  revogado_em timestamptz,
  revogado_por uuid references public.profiles (id),
  motivo_revogacao text check (char_length(motivo_revogacao) <= 300),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'revogado') = (revogado_em is not null))
);
create unique index dashboard_share_links_hash_uq on public.dashboard_share_links (token_hash);
create index dashboard_share_links_org_idx on public.dashboard_share_links (organization_id, status, expira_em);

-- acessos agregados por dia (sem IP, sem identificação do visitante)
create table public.dashboard_share_access (
  link_id uuid not null references public.dashboard_share_links (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  dia date not null,
  acessos int not null default 0 check (acessos >= 0),
  primary key (link_id, dia)
);

-- trilha de configuração (nunca contém token nem senha)
create table public.dashboard_share_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  link_id uuid not null references public.dashboard_share_links (id) on delete cascade,
  acao text not null check (acao in ('criado', 'revogado', 'substituido', 'duplicado')),
  por uuid references public.profiles (id),
  em timestamptz not null default now(),
  detalhes jsonb not null default '{}'
);
create index dashboard_share_audit_link_idx on public.dashboard_share_audit (link_id, em);

alter table public.dashboard_share_links enable row level security;
alter table public.dashboard_share_access enable row level security;
alter table public.dashboard_share_audit enable row level security;
revoke all on public.dashboard_share_links, public.dashboard_share_access, public.dashboard_share_audit from anon;
revoke insert, update, delete on public.dashboard_share_links, public.dashboard_share_access, public.dashboard_share_audit from authenticated;
grant select on public.dashboard_share_links, public.dashboard_share_access, public.dashboard_share_audit to authenticated;
create policy share_links_select on public.dashboard_share_links for select to authenticated using (private.is_manager(organization_id));
create policy share_access_select on public.dashboard_share_access for select to authenticated using (private.is_manager(organization_id));
create policy share_audit_select on public.dashboard_share_audit for select to authenticated using (private.is_manager(organization_id));

-- Criação (e substituição atômica): o servidor gera o token e envia apenas o hash.
create or replace function public.share_link_create(
  p_org uuid, p_nome text, p_publico text, p_token_hash text, p_expira_em timestamptz,
  p_config jsonb, p_senha_hash text default null, p_substitui uuid default null, p_origem uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_old public.dashboard_share_links;
begin
  if not private.is_manager(p_org) then
    raise exception 'Sem permissão para compartilhar painéis desta organização' using errcode = '42501';
  end if;
  if p_publico = 'demonstracao_comercial' and not private.is_demo_org(p_org) then
    raise exception 'Links de demonstração comercial só podem usar a organização de demonstração' using errcode = '42501';
  end if;
  if p_expira_em <= now() or p_expira_em > now() + interval '366 days' then
    raise exception 'Validade inválida (de 1 dia a 1 ano)' using errcode = '22023';
  end if;
  if p_substitui is not null then
    select * into v_old from public.dashboard_share_links where id = p_substitui and organization_id = p_org for update;
    if not found then
      raise exception 'Link a substituir não encontrado' using errcode = '42501';
    end if;
    update public.dashboard_share_links
      set status = 'revogado', revogado_em = now(), revogado_por = auth.uid(), motivo_revogacao = 'Substituído por novo link', updated_at = now()
      where id = p_substitui and status = 'ativo';
  end if;
  insert into public.dashboard_share_links (organization_id, nome, publico, token_hash, expira_em, config, senha_hash, substitui_id, created_by)
  values (p_org, p_nome, p_publico, p_token_hash, p_expira_em, p_config, p_senha_hash, p_substitui, auth.uid())
  returning id into v_id;
  insert into public.dashboard_share_audit (organization_id, link_id, acao, por, detalhes)
  values (p_org, v_id, case when p_substitui is not null then 'substituido' when p_origem is not null then 'duplicado' else 'criado' end, auth.uid(),
          jsonb_build_object('publico', p_publico, 'expira_em', p_expira_em, 'config', p_config, 'com_senha', p_senha_hash is not null,
                             'substitui', p_substitui, 'origem', p_origem));
  if p_substitui is not null then
    insert into public.dashboard_share_audit (organization_id, link_id, acao, por, detalhes)
    values (p_org, p_substitui, 'revogado', auth.uid(), jsonb_build_object('motivo', 'Substituído', 'novo_link', v_id));
  end if;
  return v_id;
end $$;

create or replace function public.share_link_revoke(p_id uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.dashboard_share_links where id = p_id;
  if v_org is null or not private.is_manager(v_org) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  update public.dashboard_share_links
    set status = 'revogado', revogado_em = now(), revogado_por = auth.uid(), motivo_revogacao = left(coalesce(p_motivo, 'Revogado manualmente'), 300), updated_at = now()
    where id = p_id and status = 'ativo';
  if found then
    insert into public.dashboard_share_audit (organization_id, link_id, acao, por, detalhes)
    values (v_org, p_id, 'revogado', auth.uid(), jsonb_build_object('motivo', p_motivo));
  end if;
end $$;

-- Uso exclusivo do servidor (service role): contagem diária de acessos e controle de tentativas de senha.
create or replace function public.share_link_touch(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.dashboard_share_access (link_id, organization_id, dia, acessos)
  select l.id, l.organization_id, (now() at time zone 'America/Bahia')::date, 1 from public.dashboard_share_links l where l.id = p_id
  on conflict (link_id, dia) do update set acessos = public.dashboard_share_access.acessos + 1;
$$;

create or replace function public.share_link_password_result(p_id uuid, p_ok boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_ok then
    update public.dashboard_share_links set tentativas_falhas = 0, bloqueado_ate = null where id = p_id;
  else
    update public.dashboard_share_links
      set tentativas_falhas = tentativas_falhas + 1,
          bloqueado_ate = case when tentativas_falhas + 1 >= 5 then now() + interval '15 minutes' else bloqueado_ate end
      where id = p_id;
  end if;
end $$;

revoke all on function public.share_link_create(uuid, text, text, text, timestamptz, jsonb, text, uuid, uuid) from public, anon;
revoke all on function public.share_link_revoke(uuid, text) from public, anon;
revoke all on function public.share_link_touch(uuid) from public, anon, authenticated;
revoke all on function public.share_link_password_result(uuid, boolean) from public, anon, authenticated;
grant execute on function public.share_link_create(uuid, text, text, text, timestamptz, jsonb, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.share_link_revoke(uuid, text) to authenticated, service_role;
grant execute on function public.share_link_touch(uuid) to service_role;
grant execute on function public.share_link_password_result(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Remoção da demonstração passa a incluir as novas tabelas
-- ---------------------------------------------------------------------------
create or replace function public.demo_purge_organization(p_org uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t text;
  n int;
  v_counts jsonb := '{}';
  v_tables text[] := array[
    'dashboard_share_access', 'dashboard_share_audit', 'dashboard_share_links', 'calendar_events',
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

grant execute on function private.guard_calendar_event(), private.notify_calendar_event() to authenticated, service_role;
