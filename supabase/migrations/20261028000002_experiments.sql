-- Bento | Fazendas, pessoas, experimentos e vínculos

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 200),
  municipio text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  descricao text,
  adesao_formal boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.farm_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  farm_id uuid not null,
  nome text not null check (char_length(nome) between 1 and 200),
  tipo text not null default 'talhao' check (tipo in ('talhao', 'setor', 'campo', 'estufa', 'laboratorio', 'outro')),
  descricao text,
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  -- coordenadas são privadas por padrão; nunca seguem para o portal
  coordenadas_autorizadas boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (farm_id, organization_id) references public.farms (id, organization_id) on delete cascade
);

-- pesquisadores, orientadores, estudantes e contatos externos (com ou sem conta)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 200),
  tipo text not null default 'pesquisador'
    check (tipo in ('pesquisador', 'orientador', 'estudante', 'tecnico', 'contato_externo', 'outro')),
  instituicao text,
  user_id uuid references public.profiles (id) on delete set null,
  situacao text not null default 'pendente_confirmacao'
    check (situacao in ('pendente_confirmacao', 'confirmado', 'inativo')),
  observacoes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index people_org_idx on public.people (organization_id, nome);

-- contatos ficam em tabela própria com acesso mais restrito (nunca vão ao portal)
create table public.people_contacts (
  person_id uuid primary key,
  organization_id uuid not null,
  email text,
  telefone text,
  preferencia_contato text,
  updated_at timestamptz not null default now(),
  foreign key (person_id, organization_id) references public.people (id, organization_id) on delete cascade
);

-- sequência de códigos legíveis por organização (nunca reutilizados)
create table public.experiment_code_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  ultimo_valor int not null default 0
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  codigo text not null,
  codigo_seq int not null,
  codigo_institucional text,
  -- identificação
  titulo text not null check (char_length(titulo) between 3 and 400),
  titulo_curto text check (char_length(titulo_curto) <= 120),
  area_tematica text,
  linhas_pesquisa text[] not null default '{}',
  culturas text[] not null default '{}',
  organismos text[] not null default '{}',
  alvos_biologicos text[] not null default '{}',
  descricao text,
  justificativa text,
  objetivo_geral text,
  objetivos_especificos text,
  palavras_chave text[] not null default '{}',
  fonte_cadastro text,
  informante text,
  data_informacao date,
  data_conferencia date,
  -- responsáveis e local
  pesquisador_principal_id uuid,
  farm_id uuid,
  farm_area_id uuid,
  local_descricao text,
  -- metodologia
  resumo_metodologico text,
  protocolo_referencia text,
  delineamento text,
  num_repeticoes int check (num_repeticoes is null or num_repeticoes between 0 and 10000),
  unidades_experimentais text,
  data_inicio date,
  data_termino_prevista date,
  data_termino_efetiva date,
  calendario_avaliacoes text,
  periodicidade_acompanhamento text not null default 'mensal'
    check (periodicidade_acompanhamento in ('quinzenal', 'mensal', 'bimestral', 'trimestral', 'sob_demanda')),
  observacoes_escopo text default 'Acompanhamento informacional; não substitui o caderno de campo nem a coleta experimental.',
  -- situações
  fase public.experiment_phase not null default 'implantacao',
  motivo_interrupcao text,
  disponibilidade public.info_status not null default 'pendente_conferencia',
  nivel_acesso public.access_level not null default 'colaboradores',
  acompanhamento_ativo boolean not null default false,
  import_batch_id uuid,
  is_demo boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('portuguese',
      coalesce(codigo, '') || ' ' || coalesce(codigo_institucional, '') || ' ' || coalesce(titulo, '') || ' ' ||
      coalesce(titulo_curto, '') || ' ' || coalesce(area_tematica, '') || ' ' || coalesce(descricao, ''))
  ) stored,
  unique (organization_id, codigo),
  unique (organization_id, codigo_seq),
  unique (id, organization_id),
  foreign key (pesquisador_principal_id, organization_id) references public.people (id, organization_id),
  foreign key (farm_id, organization_id) references public.farms (id, organization_id),
  foreign key (farm_area_id, organization_id) references public.farm_areas (id, organization_id),
  check (data_termino_prevista is null or data_inicio is null or data_termino_prevista >= data_inicio),
  check (data_termino_efetiva is null or data_inicio is null or data_termino_efetiva >= data_inicio),
  check (fase <> 'interrompido' or coalesce(trim(motivo_interrupcao), '') <> ''),
  -- campos essenciais exigidos apenas ao ativar o acompanhamento (rascunho parcial é permitido)
  check (not acompanhamento_ativo or (
    pesquisador_principal_id is not null and data_inicio is not null and coalesce(trim(objetivo_geral), '') <> ''
  ))
);
create index experiments_org_idx on public.experiments (organization_id, archived_at, fase);
create index experiments_updated_idx on public.experiments (organization_id, updated_at desc);
create index experiments_search_idx on public.experiments using gin (search);
create index experiments_culturas_idx on public.experiments using gin (culturas);
create index experiments_inst_idx on public.experiments (organization_id, codigo_institucional);
create index experiments_pi_idx on public.experiments (pesquisador_principal_id);

-- código EA360-001 gerado de forma transacional no banco
create or replace function private.assign_experiment_code()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_prefix text;
  v_next int;
begin
  select codigo_prefixo into v_prefix from public.project_settings where organization_id = new.organization_id;
  insert into public.experiment_code_counters (organization_id, ultimo_valor)
  values (new.organization_id, 1)
  on conflict (organization_id) do update set ultimo_valor = public.experiment_code_counters.ultimo_valor + 1
  returning ultimo_valor into v_next;
  new.codigo_seq := v_next;
  new.codigo := coalesce(v_prefix, 'EA360') || '-' || lpad(v_next::text, 3, '0');
  return new;
end $$;

create trigger t_experiments_code before insert on public.experiments
  for each row execute function private.assign_experiment_code();

-- campos protegidos: código, organização e autoria não mudam após a criação
create or replace function private.guard_experiment_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.codigo is distinct from old.codigo or new.codigo_seq is distinct from old.codigo_seq
     or new.organization_id is distinct from old.organization_id
     or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Campos de identificação do experimento não podem ser alterados' using errcode = '42501';
  end if;
  if new.archived_at is not null and old.archived_at is null then
    new.archived_by := auth.uid();
  end if;
  return new;
end $$;

create trigger t_experiments_guard before update on public.experiments
  for each row execute function private.guard_experiment_update();
create trigger t_experiments_created before insert on public.experiments
  for each row execute function private.set_created_by();
create trigger t_experiments_updated before update on public.experiments
  for each row execute function private.touch_updated();

create table public.experiment_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  user_id uuid references public.profiles (id) on delete cascade,
  person_id uuid,
  acesso public.experiment_access not null default 'visualizador',
  funcao text check (funcao in ('pesquisador_principal', 'colaborador', 'equipe_tecnica', 'estudante', 'orientador', 'outro')),
  ativo boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade,
  foreign key (person_id, organization_id) references public.people (id, organization_id) on delete cascade,
  check (user_id is not null or person_id is not null)
);
create unique index experiment_members_user_uq on public.experiment_members (experiment_id, user_id) where user_id is not null;
create unique index experiment_members_person_uq on public.experiment_members (experiment_id, person_id) where person_id is not null and user_id is null;
create index experiment_members_user_idx on public.experiment_members (user_id) where ativo;

create trigger t_expmembers_created before insert on public.experiment_members
  for each row execute function private.set_created_by();

-- quem cadastra o experimento passa a colaborar nele (garante acesso mesmo em nível restrito)
create or replace function private.add_creator_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.experiment_members (organization_id, experiment_id, user_id, acesso, funcao)
    values (new.organization_id, new.id, new.created_by, 'colaborador', 'colaborador')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger t_experiments_creator after insert on public.experiments
  for each row execute function private.add_creator_member();

-- nível de acesso do usuário atual em um experimento
create or replace function private.experiment_access_of(exp uuid)
returns public.experiment_access language sql stable security definer set search_path = '' as $$
  select em.acesso
  from public.experiment_members em
  join public.experiments e on e.id = em.experiment_id
  where em.experiment_id = exp and em.user_id = (select auth.uid()) and em.ativo
    and private.is_member(e.organization_id)
  order by case em.acesso when 'proprietario' then 1 when 'revisor' then 2 when 'colaborador' then 3 else 4 end
  limit 1;
$$;

create or replace function private.can_read_experiment(exp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.experiments e
    where e.id = exp and (
      private.is_manager(e.organization_id)
      or (e.nivel_acesso <> 'privado_equipe' and private.has_role(e.organization_id, array['estudante','editor']::public.org_role[]))
      or private.experiment_access_of(e.id) is not null
    )
  );
$$;

create or replace function private.can_write_experiment(exp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.experiments e
    where e.id = exp and (
      private.has_role(e.organization_id, array['coordenacao']::public.org_role[])
      or (e.nivel_acesso <> 'privado_equipe' and private.has_role(e.organization_id, array['estudante']::public.org_role[]))
      or private.experiment_access_of(e.id) in ('proprietario', 'colaborador')
    )
  );
$$;

-- validação científica: somente proprietário do estudo ou revisor delegado no experimento
create or replace function private.can_validate_experiment(exp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.experiment_access_of(exp) in ('proprietario', 'revisor');
$$;

grant execute on all functions in schema private to authenticated, anon, service_role;

create table public.experiment_treatments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  codigo text,
  descricao text not null,
  fonte text,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade
);

create table public.experiment_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  experiment_id uuid not null,
  titulo text not null,
  tipo text not null default 'etapa' check (tipo in ('etapa', 'avaliacao', 'marco')),
  data_prevista date,
  data_realizada date,
  status text not null default 'prevista' check (status in ('prevista', 'realizada', 'adiada', 'cancelada')),
  observacao text,
  created_at timestamptz not null default now(),
  foreign key (experiment_id, organization_id) references public.experiments (id, organization_id) on delete cascade
);
create index milestones_exp_idx on public.experiment_milestones (experiment_id, data_prevista);

create trigger t_farms_created before insert on public.farms for each row execute function private.set_created_by();
create trigger t_farms_updated before update on public.farms for each row execute function private.touch_updated();
create trigger t_areas_updated before update on public.farm_areas for each row execute function private.touch_updated_noby();
create trigger t_people_created before insert on public.people for each row execute function private.set_created_by();
create trigger t_people_updated before update on public.people for each row execute function private.touch_updated();
