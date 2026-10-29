-- Bento | SEED DE DESENVOLVIMENTO LOCAL (executado apenas por `supabase db reset` no ambiente local)
-- NUNCA executar em produção. Todos os registros são marcados is_demo = true ("Dados ilustrativos").
-- Usuários de teste: senha local documentada em docs/operacao.md (válida somente no Supabase local).

do $$
declare
  v_org uuid := (select id from public.organizations where slug = 'entomo-agro-360');
  v_org_b uuid;
  v_farm uuid := (select id from public.farms where nome = 'Fazenda Meraki' limit 1);
  v_area uuid;
  v_pesq_person uuid;
  v_pesq2_person uuid;
  v_exp1 uuid;
  v_exp2 uuid;
  v_visit uuid;
  u record;
  v_pwd text := extensions.crypt('bento-local-123', extensions.gen_salt('bf'));
begin
  if current_setting('bento.allow_seed', true) is distinct from 'on' and exists (
    select 1 from public.experiments where is_demo = false
  ) then
    raise exception 'Seed bloqueado: existem dados reais neste banco';
  end if;

  -- usuários de teste (somente local)
  for u in select * from (values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@bento.local', 'Admin Teste'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'coordenacao@bento.local', 'Coordenação Teste'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'pesquisador@bento.local', 'Pesquisador Teste A'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'pesquisador2@bento.local', 'Pesquisador Teste B'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'estudante@bento.local', 'Estudante Teste 1'),
    ('00000000-0000-4000-a000-000000000006'::uuid, 'estudante2@bento.local', 'Estudante Teste 2'),
    ('00000000-0000-4000-a000-000000000007'::uuid, 'editor@bento.local', 'Editor Teste'),
    ('00000000-0000-4000-a000-000000000008'::uuid, 'leitor@bento.local', 'Leitor Teste'),
    ('00000000-0000-4000-a000-000000000009'::uuid, 'outraorg@bento.local', 'Admin Outra Organização')
  ) as t(id, email, nome) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, v_pwd, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', u.nome), now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now())
    on conflict do nothing;
  end loop;

  insert into public.memberships (organization_id, user_id, role) values
    (v_org, '00000000-0000-4000-a000-000000000001', 'admin'),
    (v_org, '00000000-0000-4000-a000-000000000002', 'coordenacao'),
    (v_org, '00000000-0000-4000-a000-000000000003', 'pesquisador'),
    (v_org, '00000000-0000-4000-a000-000000000004', 'pesquisador'),
    (v_org, '00000000-0000-4000-a000-000000000005', 'estudante'),
    (v_org, '00000000-0000-4000-a000-000000000006', 'estudante'),
    (v_org, '00000000-0000-4000-a000-000000000007', 'editor'),
    (v_org, '00000000-0000-4000-a000-000000000008', 'leitor')
  on conflict do nothing;

  update public.project_settings set piloto_inicio = date_trunc('month', current_date)::date where organization_id = v_org;

  insert into public.farm_areas (organization_id, farm_id, nome, tipo, descricao)
  values (v_org, v_farm, 'Talhão demonstrativo A', 'talhao', 'Área fictícia para demonstração')
  returning id into v_area;

  insert into public.people (organization_id, nome, tipo, instituicao, user_id, situacao, is_demo)
  values (v_org, 'Pesquisador Teste A', 'pesquisador', 'Instituição fictícia', '00000000-0000-4000-a000-000000000003', 'confirmado', true)
  returning id into v_pesq_person;
  insert into public.people (organization_id, nome, tipo, instituicao, user_id, situacao, is_demo)
  values (v_org, 'Pesquisador Teste B', 'pesquisador', 'Instituição fictícia', '00000000-0000-4000-a000-000000000004', 'confirmado', true)
  returning id into v_pesq2_person;

  insert into public.experiments (organization_id, titulo, titulo_curto, area_tematica, culturas, organismos, palavras_chave,
    descricao, objetivo_geral, fonte_cadastro, informante, data_informacao, pesquisador_principal_id, farm_id, farm_area_id,
    resumo_metodologico, data_inicio, data_termino_prevista, fase, disponibilidade, nivel_acesso, acompanhamento_ativo, is_demo, created_by)
  values (v_org, '[DEMONSTRAÇÃO] Manejo de insetos-praga na soja', 'Demo soja', 'Entomologia agrícola',
    '{soja}', '{insetos-praga}', '{demonstração,soja}',
    'Dado fictício de demonstração. Não representa pesquisa real.', 'Objetivo fictício para demonstrar o cadastro.',
    'Seed local', 'Seed local', current_date, v_pesq_person, v_farm, v_area,
    'Resumo metodológico fictício.', current_date - 30, current_date + 150, 'andamento', 'fornecido', 'colaboradores', true, true,
    '00000000-0000-4000-a000-000000000005')
  returning id into v_exp1;

  insert into public.experiments (organization_id, titulo, area_tematica, culturas, descricao, objetivo_geral,
    pesquisador_principal_id, farm_id, data_inicio, fase, nivel_acesso, acompanhamento_ativo, is_demo, created_by)
  values (v_org, '[DEMONSTRAÇÃO] Estudo restrito de milho', 'Fitotecnia', '{milho}',
    'Dado fictício de demonstração com acesso restrito.', 'Objetivo fictício.',
    v_pesq2_person, v_farm, current_date - 10, 'implantacao', 'privado_equipe', true, true,
    '00000000-0000-4000-a000-000000000002')
  returning id into v_exp2;

  insert into public.experiment_members (organization_id, experiment_id, user_id, person_id, acesso, funcao) values
    (v_org, v_exp1, '00000000-0000-4000-a000-000000000003', v_pesq_person, 'proprietario', 'pesquisador_principal'),
    (v_org, v_exp1, '00000000-0000-4000-a000-000000000005', null, 'colaborador', 'estudante'),
    (v_org, v_exp1, '00000000-0000-4000-a000-000000000008', null, 'visualizador', 'outro'),
    (v_org, v_exp2, '00000000-0000-4000-a000-000000000004', v_pesq2_person, 'proprietario', 'pesquisador_principal'),
    (v_org, v_exp2, '00000000-0000-4000-a000-000000000002', null, 'colaborador', 'orientador')
  on conflict do nothing;

  insert into public.visit_schedules (organization_id, titulo, data_hora, local, farm_id, interlocutores, status, is_demo, created_by)
  values (v_org, '[DEMONSTRAÇÃO] Visita mensal', date_trunc('day', now()) + interval '3 days' + interval '9 hours',
    'Fazenda Meraki', v_farm, 'Pesquisador Teste A', 'planejada', true, '00000000-0000-4000-a000-000000000005')
  returning id into v_visit;
  insert into public.visit_schedule_experiments (visit_id, experiment_id, organization_id) values (v_visit, v_exp1, v_org);

  insert into public.tasks (organization_id, titulo, descricao, categoria, prioridade, responsavel_id, prazo, experiment_id, is_demo, created_by)
  values (v_org, '[DEMONSTRAÇÃO] Confirmar calendário de avaliações', 'Pendência fictícia de demonstração.', 'articulacao', 'media',
    '00000000-0000-4000-a000-000000000005', current_date + 7, v_exp1, true, '00000000-0000-4000-a000-000000000002');

  insert into public.editorial_items (organization_id, tipo, titulo, descricao, canais, requer_validacao_cientifica,
    revisor_cientifico, revisor_final, draft, is_demo, created_by)
  values (v_org, 'pauta', '[DEMONSTRAÇÃO] Pauta de teste sobre monitoramento', 'Pauta fictícia de demonstração.', '{instagram}', true,
    '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000002',
    '{"blocks":[{"tipo":"paragrafo","texto":"Texto fictício de demonstração."}]}', true, '00000000-0000-4000-a000-000000000005');

  -- organização B para testes de isolamento
  insert into public.organizations (nome, slug) values ('Organização de Teste B', 'org-teste-b') returning id into v_org_b;
  insert into public.project_settings (organization_id, nome_projeto, codigo_prefixo) values (v_org_b, 'Projeto Teste B', 'TSTB');
  insert into public.memberships (organization_id, user_id, role) values (v_org_b, '00000000-0000-4000-a000-000000000009', 'admin');
  insert into public.experiments (organization_id, titulo, descricao, is_demo, created_by)
  values (v_org_b, '[DEMONSTRAÇÃO] Experimento da organização B', 'Não deve ser visível para a organização A.', true,
    '00000000-0000-4000-a000-000000000009');
  insert into public.memberships (organization_id, user_id, role) values (v_org_b, '00000000-0000-4000-a000-000000000009', 'coordenacao');
end $$;
