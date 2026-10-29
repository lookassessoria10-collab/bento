-- Bento | RPCs de fluxo (SECURITY DEFINER com search_path vazio e checagens explícitas)
-- Todas as transições de situação passam por estas funções; clientes não conseguem
-- alterar colunas de situação diretamente (ver gatilhos guard_*).

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Faça login para aceitar o convite' using errcode = '42501';
  end if;
  select * into v_inv from public.invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
   for update;
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'Convite inválido, expirado ou já utilizado' using errcode = 'P0002';
  end if;
  if v_inv.email <> v_email then
    raise exception 'Este convite foi emitido para outro e-mail' using errcode = '42501';
  end if;
  insert into public.memberships (organization_id, user_id, role, invited_by)
  values (v_inv.organization_id, auth.uid(), v_inv.role, v_inv.invited_by)
  on conflict (organization_id, user_id, role) do update set status = 'ativo', fim = null;
  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return v_inv.organization_id;
end $$;

-- ---------------------------------------------------------------------------
-- Montagem de snapshot (conteúdo imutável enviado à revisão)
-- ---------------------------------------------------------------------------
create or replace function private.experiment_public_card(p_exp uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  -- somente campos seguros: nunca contatos, coordenadas ou observações internas
  select jsonb_build_object(
    'id', e.id, 'codigo', e.codigo, 'codigo_institucional', e.codigo_institucional,
    'titulo', e.titulo, 'titulo_curto', e.titulo_curto, 'area_tematica', e.area_tematica,
    'culturas', e.culturas, 'organismos', e.organismos, 'objetivo_geral', e.objetivo_geral,
    'resumo_metodologico', e.resumo_metodologico, 'delineamento', e.delineamento,
    'data_inicio', e.data_inicio, 'data_termino_prevista', e.data_termino_prevista,
    'data_termino_efetiva', e.data_termino_efetiva, 'fase', e.fase,
    'pesquisador', p.nome, 'fazenda', f.nome, 'area', a.nome,
    'fonte_cadastro', e.fonte_cadastro, 'data_informacao', e.data_informacao,
    'disponibilidade', e.disponibilidade, 'is_demo', e.is_demo
  )
  from public.experiments e
  left join public.people p on p.id = e.pesquisador_principal_id
  left join public.farms f on f.id = e.farm_id
  left join public.farm_areas a on a.id = e.farm_area_id
  where e.id = p_exp;
$$;

create or replace function private.result_card(p_res uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'experiment_id', r.experiment_id, 'variavel', r.variavel, 'unidade', r.unidade,
    'periodo_inicio', r.periodo_inicio, 'periodo_fim', r.periodo_fim, 'data_referencia', r.data_referencia,
    'sintese', r.sintese, 'situacao_analise', r.situacao_analise, 'limitacoes', r.limitacoes,
    'fonte', coalesce(p.nome, r.fonte_descricao), 'referencia', r.referencia,
    'data_fornecimento', r.data_fornecimento, 'versao_interpretacao', r.versao_interpretacao,
    'validacao_status', r.validacao_status, 'escopo_divulgacao', r.escopo_divulgacao, 'is_demo', r.is_demo
  )
  from public.result_summaries r
  left join public.people p on p.id = r.fonte_person_id
  where r.id = p_res;
$$;

create or replace function private.file_card(p_file uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', f.id, 'nome', f.nome_amigavel, 'tipo', f.tipo, 'legenda', f.legenda, 'autoria', f.autoria,
    'data_arquivo', f.data_arquivo, 'licenca', f.licenca, 'autorizacao_uso', f.autorizacao_uso,
    'autorizacao_canais', f.autorizacao_canais, 'storage_path', f.storage_path, 'mime_type', f.mime_type,
    'external_url', f.external_url
  )
  from public.files f where f.id = p_file and f.deleted_at is null;
$$;

create or replace function private.build_snapshot(p_item uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_item public.editorial_items;
  v_content jsonb;
  v_sources jsonb;
  v_bulletin jsonb;
  v_dossier jsonb;
begin
  select * into v_item from public.editorial_items where id = p_item;

  select coalesce(jsonb_agg(jsonb_build_object(
           'experiment_id', s.experiment_id, 'result_id', s.result_id, 'file_id', s.file_id, 'referencia', s.referencia,
           'experiment', case when s.experiment_id is not null then private.experiment_public_card(s.experiment_id) end,
           'result', case when s.result_id is not null then private.result_card(s.result_id) end,
           'file', case when s.file_id is not null then private.file_card(s.file_id) end
         ) order by s.created_at), '[]'::jsonb)
    into v_sources
    from public.editorial_sources s where s.item_id = p_item;

  v_content := jsonb_build_object(
    'item_id', v_item.id, 'tipo', v_item.tipo, 'titulo', v_item.titulo, 'descricao', v_item.descricao,
    'objetivo', v_item.objetivo, 'publico', v_item.publico, 'area_tematica', v_item.area_tematica,
    'canais', v_item.canais, 'formato', v_item.formato,
    'requer_validacao_cientifica', v_item.requer_validacao_cientifica,
    'draft', v_item.draft, 'sources', v_sources, 'is_demo', v_item.is_demo
  );

  if v_item.tipo = 'boletim' then
    select jsonb_build_object(
      'numero', b.numero, 'volume', b.volume, 'periodo_inicio', b.periodo_inicio, 'periodo_fim', b.periodo_fim,
      'data_prevista', b.data_prevista, 'data_fechamento', b.data_fechamento, 'equipe_editorial', b.equipe_editorial,
      'apresentacao', b.apresentacao, 'capa', case when b.capa_file_id is not null then private.file_card(b.capa_file_id) end,
      'sections', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'ordem', s.ordem, 'tipo', s.tipo, 'titulo', s.titulo, 'corpo', s.corpo, 'referencias', s.referencias,
          'experiment', case when s.experiment_id is not null then private.experiment_public_card(s.experiment_id) end,
          'results', coalesce((select jsonb_agg(private.result_card(r)) from unnest(s.result_ids) r), '[]'::jsonb),
          'files', coalesce((select jsonb_agg(private.file_card(fi)) from unnest(s.file_ids) fi where private.file_card(fi) is not null), '[]'::jsonb)
        ) order by s.ordem)
        from public.bulletin_sections s where s.bulletin_id = b.id), '[]'::jsonb)
    ) into v_bulletin
    from public.bulletin_editions b where b.editorial_item_id = p_item;
    v_content := v_content || jsonb_build_object('bulletin', v_bulletin);
  elsif v_item.tipo = 'dossie' then
    select jsonb_build_object(
      'periodo_inicio', d.periodo_inicio, 'periodo_fim', d.periodo_fim, 'finalidade', d.finalidade,
      'apresentacao', d.apresentacao, 'escopo', d.escopo, 'criterios_inclusao', d.criterios_inclusao,
      'metodo_coleta', d.metodo_coleta, 'sintese', d.sintese, 'referencias', d.referencias,
      'experiments', coalesce((
        select jsonb_agg(private.experiment_public_card(de.experiment_id)
          || jsonb_build_object('results', case when de.incluir_resultados then coalesce((
               select jsonb_agg(private.result_card(r.id) order by r.data_referencia nulls last)
                 from public.result_summaries r
                where r.experiment_id = de.experiment_id
                  and (d.finalidade = 'interno' or (r.validacao_status = 'validado' and 'dossie' = any (r.escopo_divulgacao)))
             ), '[]'::jsonb) else '[]'::jsonb end,
             'files', coalesce((
               select jsonb_agg(private.file_card(f.id))
                 from public.files f
                where f.experiment_id = de.experiment_id and f.deleted_at is null
                  and (d.finalidade = 'interno' or (f.autorizacao_uso = 'divulgacao_autorizada' and 'dossie' = any (f.autorizacao_canais)))
             ), '[]'::jsonb))
          order by de.ordem)
        from public.dossier_experiments de where de.dossier_id = d.id), '[]'::jsonb)
    ) into v_dossier
    from public.dossiers d where d.editorial_item_id = p_item;
    v_content := v_content || jsonb_build_object('dossier', v_dossier);
  end if;
  return v_content;
end $$;

-- experimentos e resultados referenciados por uma versão (para checagens de validação/liberação)
create or replace function private.version_experiments(p_content jsonb)
returns uuid[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select (s ->> 'experiment_id')::uuid as x from jsonb_array_elements(coalesce(p_content -> 'sources', '[]')) s where s ->> 'experiment_id' is not null
    union select (s -> 'result' ->> 'experiment_id')::uuid from jsonb_array_elements(coalesce(p_content -> 'sources', '[]')) s where s -> 'result' ->> 'experiment_id' is not null
    union select (sec -> 'experiment' ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'bulletin' -> 'sections', '[]')) sec where sec -> 'experiment' ->> 'id' is not null
    union select (r ->> 'experiment_id')::uuid from jsonb_array_elements(coalesce(p_content -> 'bulletin' -> 'sections', '[]')) sec, jsonb_array_elements(coalesce(sec -> 'results', '[]')) r
    union select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'dossier' -> 'experiments', '[]')) e
  ) q where x is not null;
$$;

create or replace function private.version_results(p_content jsonb)
returns uuid[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select (s ->> 'result_id')::uuid as x from jsonb_array_elements(coalesce(p_content -> 'sources', '[]')) s where s ->> 'result_id' is not null
    union select (r ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'bulletin' -> 'sections', '[]')) sec, jsonb_array_elements(coalesce(sec -> 'results', '[]')) r
    union select (r ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'dossier' -> 'experiments', '[]')) e, jsonb_array_elements(coalesce(e -> 'results', '[]')) r
  ) q where x is not null;
$$;

create or replace function private.version_files(p_content jsonb)
returns uuid[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select (s ->> 'file_id')::uuid as x from jsonb_array_elements(coalesce(p_content -> 'sources', '[]')) s where s ->> 'file_id' is not null
    union select (p_content -> 'bulletin' -> 'capa' ->> 'id')::uuid
    union select (f ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'bulletin' -> 'sections', '[]')) sec, jsonb_array_elements(coalesce(sec -> 'files', '[]')) f
    union select (f ->> 'id')::uuid from jsonb_array_elements(coalesce(p_content -> 'dossier' -> 'experiments', '[]')) e, jsonb_array_elements(coalesce(e -> 'files', '[]')) f
  ) q where x is not null;
$$;

-- lacunas que impedem liberar a versão para um canal (lista vazia = liberável)
create or replace function public.release_blockers(p_version uuid, p_channel public.channel)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare
  v_ver public.editorial_versions;
  v_item public.editorial_items;
  v_out text[] := '{}';
  r record;
begin
  select * into v_ver from public.editorial_versions where id = p_version;
  if not found or not private.can_read_item(v_ver.item_id) then
    raise exception 'Versão não encontrada' using errcode = 'P0002';
  end if;
  select * into v_item from public.editorial_items where id = v_ver.item_id;

  if v_item.requer_validacao_cientifica and not exists (
    select 1 from public.approval_decisions d
     where d.version_id = p_version and d.etapa = 'validacao_cientifica' and d.decisao = 'aprovado') then
    v_out := v_out || 'Falta validação científica desta versão'::text;
  end if;

  if p_channel <> 'interno' then
    for r in
      select rs.codigo_var, rs.validacao_status, rs.escopo_divulgacao from (
        select res.variavel as codigo_var, res.validacao_status, res.escopo_divulgacao
          from public.result_summaries res where res.id = any (private.version_results(v_ver.content))
      ) rs
    loop
      if r.validacao_status <> 'validado' then
        v_out := v_out || format('Resultado "%s" não está validado pelo pesquisador', r.codigo_var);
      elsif not (p_channel = any (r.escopo_divulgacao)) then
        v_out := v_out || format('Resultado "%s" não autorizado para o canal %s', r.codigo_var, p_channel);
      end if;
    end loop;
    for r in
      select f.nome_amigavel, f.autorizacao_uso, f.autorizacao_canais, f.tipo, f.legenda, f.autoria
        from public.files f where f.id = any (private.version_files(v_ver.content))
    loop
      if r.autorizacao_uso <> 'divulgacao_autorizada' or not (p_channel = any (r.autorizacao_canais)) then
        v_out := v_out || format('Arquivo "%s" sem autorização de uso para o canal %s', r.nome_amigavel, p_channel);
      end if;
      if r.tipo = 'foto' and (coalesce(r.legenda, '') = '' or coalesce(r.autoria, '') = '') then
        v_out := v_out || format('Foto "%s" sem legenda ou autoria', r.nome_amigavel);
      end if;
    end loop;
  end if;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- Fluxo editorial
-- ---------------------------------------------------------------------------
create or replace function public.submit_for_review(p_item uuid, p_prazo date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_item public.editorial_items;
  v_content jsonb;
  v_num int;
  v_ver uuid;
begin
  select * into v_item from public.editorial_items where id = p_item for update;
  if not found or not private.has_role(v_item.organization_id, '{coordenacao,estudante,editor}') then
    raise exception 'Sem permissão para enviar este conteúdo' using errcode = '42501';
  end if;
  if v_item.status not in ('rascunho', 'devolvido') then
    raise exception 'Conteúdo já está em revisão (situação: %)', v_item.status using errcode = '22023';
  end if;
  v_content := private.build_snapshot(p_item);
  select coalesce(max(numero), 0) + 1 into v_num from public.editorial_versions where item_id = p_item;
  insert into public.editorial_versions (organization_id, item_id, numero, content, content_hash, created_by)
  values (v_item.organization_id, p_item, v_num, v_content,
          encode(extensions.digest(v_content::text, 'sha256'), 'hex'), auth.uid())
  returning id into v_ver;
  update public.approval_requests set status = 'cancelada', concluida_em = now() where item_id = p_item and status = 'aberta';
  update public.editorial_items set status = 'em_conferencia', current_version_id = v_ver where id = p_item;
  insert into public.approval_requests (organization_id, item_id, version_id, etapa, prazo, created_by)
  values (v_item.organization_id, p_item, v_ver, 'conferencia', p_prazo, auth.uid());
  return v_ver;
end $$;

create or replace function public.workflow_decide(
  p_item uuid, p_decisao public.approval_decision, p_motivo text default null,
  p_canais public.channel[] default '{}', p_prazo date default null
) returns public.workflow_status language plpgsql security definer set search_path = '' as $$
declare
  v_item public.editorial_items;
  v_ver public.editorial_versions;
  v_etapa public.approval_stage;
  v_papel text;
  v_next public.workflow_status;
  v_dec uuid;
  v_req uuid;
  v_exps uuid[];
  v_exp uuid;
  c public.channel;
  v_blockers text[];
begin
  select * into v_item from public.editorial_items where id = p_item for update;
  if not found then raise exception 'Conteúdo não encontrado' using errcode = 'P0002'; end if;
  select * into v_ver from public.editorial_versions where id = v_item.current_version_id;
  if v_ver.id is null then raise exception 'Não há versão enviada para revisão' using errcode = '22023'; end if;
  if p_decisao in ('ajustes', 'rejeitado', 'revogado') and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe a justificativa da decisão' using errcode = '22023';
  end if;

  case v_item.status
    when 'em_conferencia' then
      v_etapa := 'conferencia';
      if not private.is_team(v_item.organization_id) then
        raise exception 'Somente a equipe pode realizar a conferência interna' using errcode = '42501';
      end if;
      if v_ver.created_by = auth.uid() then
        raise exception 'A conferência deve ser feita por outra pessoa, não por quem enviou a versão' using errcode = '42501';
      end if;
      v_papel := 'conferencia_interna';
      v_next := case when p_decisao = 'aprovado' then
                  case when v_item.requer_validacao_cientifica then 'aguardando_validacao' else 'aguardando_revisao_final' end
                else 'devolvido' end;
    when 'aguardando_validacao' then
      v_etapa := 'validacao_cientifica';
      v_exps := private.version_experiments(v_ver.content);
      if array_length(v_exps, 1) is null then
        -- conteúdo educativo sem experimento: revisor científico designado (pesquisador/coordenação)
        -- comparação com NULL nunca pode liberar (ver migration 11: private.is_designated)
        if not (private.is_designated(v_item.revisor_cientifico)
                and private.has_role(v_item.organization_id, '{pesquisador,coordenacao}')) then
          raise exception 'Somente o revisor científico designado pode validar este conteúdo' using errcode = '42501';
        end if;
      else
        foreach v_exp in array v_exps loop
          if not private.can_validate_experiment(v_exp) then
            raise exception 'Validação científica exige ser responsável ou revisor delegado de todos os experimentos citados' using errcode = '42501';
          end if;
        end loop;
      end if;
      v_papel := 'validacao_cientifica';
      v_next := case when p_decisao = 'aprovado' then 'validado' else 'devolvido' end;
    when 'validado', 'aguardando_revisao_final' then
      v_etapa := 'revisao_final';
      if not private.can_final_review(v_item.organization_id) then
        raise exception 'Revisão final exige coordenação ou delegação explícita' using errcode = '42501';
      end if;
      if v_ver.created_by = auth.uid() then
        raise exception 'Quem redigiu a versão não pode liberá-la' using errcode = '42501';
      end if;
      v_papel := 'revisao_final';
      if p_decisao = 'aprovado' then
        if coalesce(array_length(p_canais, 1), 0) = 0 then
          raise exception 'Informe ao menos um canal autorizado' using errcode = '22023';
        end if;
        foreach c in array p_canais loop
          v_blockers := public.release_blockers(v_ver.id, c);
          if array_length(v_blockers, 1) is not null then
            raise exception 'Liberação bloqueada: %', array_to_string(v_blockers, '; ') using errcode = '22023';
          end if;
        end loop;
        v_next := 'liberado';
      else
        v_next := 'devolvido';
      end if;
    else
      raise exception 'Não há decisão possível na situação atual (%)', v_item.status using errcode = '22023';
  end case;

  select id into v_req from public.approval_requests
   where item_id = p_item and version_id = v_ver.id and etapa = v_etapa and status = 'aberta'
   order by created_at desc limit 1;

  insert into public.approval_decisions (organization_id, item_id, version_id, request_id, etapa, decisao, motivo,
                                         escopo_canais, decidido_por, papel, version_hash)
  values (v_item.organization_id, p_item, v_ver.id, v_req, v_etapa, p_decisao, p_motivo,
          case when v_etapa = 'revisao_final' and p_decisao = 'aprovado' then p_canais else '{}' end,
          auth.uid(), v_papel, v_ver.content_hash)
  returning id into v_dec;

  update public.approval_requests set status = 'concluida', concluida_em = now() where id = v_req;
  update public.editorial_items set status = v_next where id = p_item;

  if v_next = 'liberado' then
    foreach c in array p_canais loop
      insert into public.release_permissions (organization_id, item_id, version_id, canal, decision_id)
      values (v_item.organization_id, p_item, v_ver.id, c, v_dec)
      on conflict (version_id, canal) do update set revogado_em = null, decision_id = excluded.decision_id;
    end loop;
  elsif v_next = 'aguardando_validacao' then
    insert into public.approval_requests (organization_id, item_id, version_id, etapa, revisor_id, prazo, created_by)
    values (v_item.organization_id, p_item, v_ver.id, 'validacao_cientifica', v_item.revisor_cientifico, p_prazo, auth.uid());
    perform private.notify(v_item.organization_id, v_item.revisor_cientifico, 'revisao', 'Validação científica solicitada',
      v_item.titulo, '/app/aprovacoes/' || p_item);
  elsif v_next in ('validado', 'aguardando_revisao_final') then
    insert into public.approval_requests (organization_id, item_id, version_id, etapa, revisor_id, prazo, created_by)
    values (v_item.organization_id, p_item, v_ver.id, 'revisao_final', v_item.revisor_final, p_prazo, auth.uid());
    perform private.notify(v_item.organization_id, v_item.revisor_final, 'revisao', 'Revisão final solicitada',
      v_item.titulo, '/app/aprovacoes/' || p_item);
  elsif v_next = 'devolvido' then
    perform private.notify(v_item.organization_id, v_ver.created_by, 'devolucao', 'Conteúdo devolvido para ajustes',
      v_item.titulo || ': ' || p_motivo, '/app/aprovacoes/' || p_item);
  end if;
  return v_next;
end $$;

-- validação externa documentada (pesquisador sem conta): exige comprovante anexado
create or replace function public.register_external_validation(
  p_item uuid, p_person uuid, p_comprovante uuid, p_metodo text, p_data date, p_obs text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_item public.editorial_items;
  v_ver public.editorial_versions;
  v_exps uuid[];
  v_exp uuid;
  v_dec uuid;
begin
  select * into v_item from public.editorial_items where id = p_item for update;
  if not found or not private.has_role(v_item.organization_id, '{coordenacao,estudante,editor}') then
    raise exception 'Sem permissão para registrar validação externa' using errcode = '42501';
  end if;
  if v_item.status <> 'aguardando_validacao' then
    raise exception 'O conteúdo não está aguardando validação científica' using errcode = '22023';
  end if;
  select * into v_ver from public.editorial_versions where id = v_item.current_version_id;
  if not exists (select 1 from public.files f where f.id = p_comprovante and f.organization_id = v_item.organization_id and f.deleted_at is null) then
    raise exception 'Anexe o comprovante da validação externa' using errcode = '22023';
  end if;
  if coalesce(trim(p_metodo), '') = '' or p_data is null then
    raise exception 'Informe método e data da confirmação' using errcode = '22023';
  end if;
  v_exps := private.version_experiments(v_ver.content);
  foreach v_exp in array v_exps loop
    if not exists (
      select 1 from public.experiments e where e.id = v_exp and e.pesquisador_principal_id = p_person
      union all
      select 1 from public.experiment_members m where m.experiment_id = v_exp and m.person_id = p_person and m.acesso in ('proprietario', 'revisor') and m.ativo
    ) then
      raise exception 'A pessoa informada não é responsável por todos os experimentos citados' using errcode = '42501';
    end if;
  end loop;
  insert into public.approval_decisions (organization_id, item_id, version_id, etapa, decisao, motivo, decidido_por, papel,
                                         externo, pessoa_externa_id, comprovante_file_id, metodo_confirmacao, data_confirmacao, version_hash)
  values (v_item.organization_id, p_item, v_ver.id, 'validacao_cientifica', 'aprovado', p_obs, auth.uid(), 'registro_validacao_externa',
          true, p_person, p_comprovante, p_metodo, p_data, v_ver.content_hash)
  returning id into v_dec;
  update public.approval_requests set status = 'concluida', concluida_em = now()
   where item_id = p_item and version_id = v_ver.id and etapa = 'validacao_cientifica' and status = 'aberta';
  update public.editorial_items set status = 'validado' where id = p_item;
  insert into public.approval_requests (organization_id, item_id, version_id, etapa, revisor_id, created_by)
  values (v_item.organization_id, p_item, v_ver.id, 'revisao_final', v_item.revisor_final, auth.uid());
  return v_dec;
end $$;

-- registro de documento gerado (PDF); versão final exige versão liberada
create or replace function public.register_generated_document(
  p_org uuid, p_item uuid, p_version uuid, p_tipo text, p_path text, p_sha text, p_size bigint, p_rascunho boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.is_team(p_org) then
    raise exception 'Sem permissão para gerar documentos' using errcode = '42501';
  end if;
  if p_item is not null and not exists (select 1 from public.editorial_items where id = p_item and organization_id = p_org) then
    raise exception 'Conteúdo inválido' using errcode = '42501';
  end if;
  if p_path not like p_org::text || '/documentos/%' then
    raise exception 'Caminho de armazenamento inválido' using errcode = '42501';
  end if;
  if not p_rascunho and not exists (
    select 1 from public.release_permissions rp where rp.version_id = p_version and rp.item_id = p_item and rp.revogado_em is null) then
    raise exception 'PDF final só pode ser gerado a partir de versão liberada' using errcode = '42501';
  end if;
  insert into public.generated_documents (organization_id, item_id, version_id, tipo, rascunho, storage_path, sha256, tamanho_bytes, gerado_por)
  values (p_org, p_item, p_version, p_tipo, p_rascunho, p_path, p_sha, p_size, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.register_publication(
  p_item uuid, p_canal public.channel, p_data date, p_url text default null,
  p_document uuid default null, p_slug text default null, p_resumo text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_item public.editorial_items;
  v_ver public.editorial_versions;
  v_pub uuid;
  v_pdf text;
begin
  select * into v_item from public.editorial_items where id = p_item for update;
  if not found or not private.is_team(v_item.organization_id) then
    raise exception 'Sem permissão para registrar publicação' using errcode = '42501';
  end if;
  if v_item.status not in ('liberado', 'publicado') then
    raise exception 'Publicação bloqueada: o conteúdo não foi liberado (situação: %)', v_item.status using errcode = '42501';
  end if;
  select * into v_ver from public.editorial_versions where id = v_item.current_version_id;
  if not exists (select 1 from public.release_permissions rp
                  where rp.version_id = v_ver.id and rp.canal = p_canal and rp.revogado_em is null) then
    raise exception 'Publicação bloqueada: esta versão não foi liberada para o canal %', p_canal using errcode = '42501';
  end if;
  if p_data is null then
    raise exception 'Informe a data real da publicação' using errcode = '22023';
  end if;
  if p_document is not null then
    select storage_path into v_pdf from public.generated_documents
     where id = p_document and version_id = v_ver.id and not rascunho;
    if v_pdf is null then
      raise exception 'O PDF informado não corresponde à versão liberada' using errcode = '22023';
    end if;
  end if;
  insert into public.publication_records (organization_id, item_id, version_id, canal, data_publicacao, url, responsavel_id, document_id)
  values (v_item.organization_id, p_item, v_ver.id, p_canal, p_data, p_url, auth.uid(), p_document)
  returning id into v_pub;

  if p_canal = 'portal' then
    if coalesce(p_slug, '') !~ '^[a-z0-9-]{3,120}$' then
      raise exception 'Informe um endereço (slug) válido para o portal' using errcode = '22023';
    end if;
    -- versão anterior do mesmo conteúdo deixa de ser servida
    update public.public_publications pp set revoked_at = now(), errata = coalesce(pp.errata, 'Substituída por nova versão')
     where pp.revoked_at is null and pp.publication_id in (select id from public.publication_records where item_id = p_item and id <> v_pub);
    update public.publication_records set status = 'substituida'
     where item_id = p_item and canal = 'portal' and id <> v_pub and status = 'ativa';
    insert into public.public_publications (organization_id, publication_id, slug, tipo, titulo, resumo, content, pdf_storage_path, versao)
    values (v_item.organization_id, v_pub, p_slug, v_item.tipo, v_ver.content ->> 'titulo', p_resumo,
            -- o portal recebe somente o snapshot liberado, sem identificadores internos de arquivos
            v_ver.content - 'sources', v_pdf, v_ver.numero)
    on conflict (slug) do update set publication_id = excluded.publication_id, content = excluded.content,
      titulo = excluded.titulo, resumo = excluded.resumo, pdf_storage_path = excluded.pdf_storage_path,
      versao = excluded.versao, revoked_at = null, published_at = now();
  end if;
  update public.editorial_items set status = 'publicado' where id = p_item;
  return v_pub;
end $$;

create or replace function public.revoke_publication(p_publication uuid, p_motivo text, p_errata text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pub public.publication_records;
begin
  select * into v_pub from public.publication_records where id = p_publication for update;
  if not found or not private.can_final_review(v_pub.organization_id) then
    raise exception 'Sem permissão para revogar publicação' using errcode = '42501';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da revogação' using errcode = '22023';
  end if;
  update public.publication_records
     set status = 'revogada', revogado_em = now(), revogado_por = auth.uid(), motivo_revogacao = p_motivo, errata = p_errata
   where id = p_publication;
  update public.public_publications set revoked_at = now(), errata = p_errata where publication_id = p_publication;
  update public.release_permissions set revogado_em = now()
   where version_id = v_pub.version_id and canal = v_pub.canal;
  if not exists (select 1 from public.publication_records where item_id = v_pub.item_id and status = 'ativa') then
    update public.editorial_items set status = 'revogado' where id = v_pub.item_id;
  end if;
  insert into public.approval_decisions (organization_id, item_id, version_id, etapa, decisao, motivo, decidido_por, papel, version_hash)
  select v_pub.organization_id, v_pub.item_id, v_pub.version_id, 'revisao_final', 'revogado', p_motivo, auth.uid(), 'revogacao', v.content_hash
    from public.editorial_versions v where v.id = v_pub.version_id;
end $$;

-- ---------------------------------------------------------------------------
-- Fichas de visita
-- ---------------------------------------------------------------------------
create or replace function public.visit_record_transition(p_record uuid, p_acao text, p_comentario text default null)
returns public.record_status language plpgsql security definer set search_path = '' as $$
declare
  v_rec public.visit_records;
  v_visit public.visit_schedules;
  v_next public.record_status;
begin
  select * into v_rec from public.visit_records where id = p_record for update;
  if not found or not private.can_read_experiment(v_rec.experiment_id) then
    raise exception 'Ficha não encontrada' using errcode = 'P0002';
  end if;
  select * into v_visit from public.visit_schedules where id = v_rec.visit_id;
  case p_acao
    when 'enviar' then
      if v_rec.status not in ('rascunho', 'devolvida') then raise exception 'Ficha não está em preenchimento' using errcode = '22023'; end if;
      if v_visit.status <> 'realizada' then
        raise exception 'Marque a visita como realizada antes de enviar a ficha' using errcode = '22023';
      end if;
      if not (private.is_team(v_rec.organization_id) or private.can_write_experiment(v_rec.experiment_id)) then
        raise exception 'Sem permissão' using errcode = '42501';
      end if;
      if coalesce(trim(v_rec.ocorrencias_relatadas), '') <> '' and v_rec.informante_person_id is null and coalesce(trim(v_rec.informante_descricao), '') = '' then
        raise exception 'Identifique quem informou as ocorrências relatadas' using errcode = '22023';
      end if;
      v_next := 'preenchida';
    when 'conferir' then
      if v_rec.status <> 'preenchida' then raise exception 'Ficha não está aguardando conferência' using errcode = '22023'; end if;
      if v_rec.created_by = auth.uid() then
        raise exception 'A conferência deve ser feita por outra pessoa' using errcode = '42501';
      end if;
      if not (private.is_team(v_rec.organization_id) or private.can_validate_experiment(v_rec.experiment_id)) then
        raise exception 'Sem permissão para conferir' using errcode = '42501';
      end if;
      v_next := 'conferida';
    when 'devolver' then
      if v_rec.status not in ('preenchida', 'conferida') then raise exception 'Ficha não pode ser devolvida agora' using errcode = '22023'; end if;
      if coalesce(trim(p_comentario), '') = '' then raise exception 'Informe o motivo da devolução' using errcode = '22023'; end if;
      if not (private.is_team(v_rec.organization_id) or private.can_validate_experiment(v_rec.experiment_id)) then
        raise exception 'Sem permissão' using errcode = '42501';
      end if;
      v_next := 'devolvida';
    when 'finalizar' then
      if v_rec.status <> 'conferida' then raise exception 'Somente fichas conferidas podem ser finalizadas' using errcode = '22023'; end if;
      if not private.is_team(v_rec.organization_id) then raise exception 'Sem permissão' using errcode = '42501'; end if;
      v_next := 'finalizada';
    else
      raise exception 'Ação inválida' using errcode = '22023';
  end case;
  update public.visit_records set
    status = v_next,
    conferido_por = case when p_acao in ('conferir', 'devolver') then auth.uid() else conferido_por end,
    conferido_em = case when p_acao in ('conferir', 'devolver') then now() else conferido_em end,
    comentario_conferencia = case when p_acao in ('conferir', 'devolver') then p_comentario else comentario_conferencia end,
    finalizado_em = case when p_acao = 'finalizar' then now() else finalizado_em end
  where id = p_record;
  if p_acao = 'devolver' then
    perform private.notify(v_rec.organization_id, v_rec.created_by, 'devolucao', 'Ficha de visita devolvida', p_comentario,
      '/app/visitas/' || v_rec.visit_id);
  end if;
  return v_next;
end $$;

-- ---------------------------------------------------------------------------
-- Resultados: conferência e validação pelo responsável
-- ---------------------------------------------------------------------------
create or replace function public.result_transition(
  p_result uuid, p_acao text, p_motivo text default null, p_escopo public.channel[] default '{interno}'
) returns text language plpgsql security definer set search_path = '' as $$
declare v_res public.result_summaries;
begin
  select * into v_res from public.result_summaries where id = p_result for update;
  if not found or not private.can_read_experiment(v_res.experiment_id) then
    raise exception 'Resultado não encontrado' using errcode = 'P0002';
  end if;
  case p_acao
    when 'conferir' then
      if not private.is_team(v_res.organization_id) then raise exception 'Sem permissão' using errcode = '42501'; end if;
      if v_res.created_by = auth.uid() then raise exception 'A conferência deve ser feita por outra pessoa' using errcode = '42501'; end if;
      update public.result_summaries set conferencia_status = 'conferido', conferido_por = auth.uid() where id = p_result;
      return 'conferido';
    when 'devolver' then
      if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo' using errcode = '22023'; end if;
      if not (private.is_team(v_res.organization_id) or private.can_validate_experiment(v_res.experiment_id)) then
        raise exception 'Sem permissão' using errcode = '42501';
      end if;
      update public.result_summaries set conferencia_status = 'devolvido', validacao_status = 'devolvido' where id = p_result;
      perform private.notify(v_res.organization_id, v_res.created_by, 'devolucao', 'Resultado devolvido', p_motivo,
        '/app/resultados?resultado=' || p_result);
      return 'devolvido';
    when 'validar' then
      if not private.can_validate_experiment(v_res.experiment_id) then
        raise exception 'Somente o pesquisador responsável ou revisor delegado valida este resultado' using errcode = '42501';
      end if;
      if v_res.conferencia_status <> 'conferido' then
        raise exception 'O resultado precisa ser conferido pela equipe antes da validação' using errcode = '22023';
      end if;
      update public.result_summaries
         set validacao_status = 'validado', validado_por = auth.uid(), validado_em = now(),
             escopo_divulgacao = (select array_agg(distinct x) from unnest(p_escopo || '{interno}'::public.channel[]) x)
       where id = p_result;
      return 'validado';
    when 'revogar' then
      if not (private.can_validate_experiment(v_res.experiment_id) or private.can_final_review(v_res.organization_id)) then
        raise exception 'Sem permissão' using errcode = '42501';
      end if;
      if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo' using errcode = '22023'; end if;
      update public.result_summaries set validacao_status = 'revogado', escopo_divulgacao = '{interno}' where id = p_result;
      return 'revogado';
    else
      raise exception 'Ação inválida' using errcode = '22023';
  end case;
end $$;

create or replace function public.result_external_validation(
  p_result uuid, p_person uuid, p_comprovante uuid, p_metodo text, p_data date, p_escopo public.channel[]
) returns void language plpgsql security definer set search_path = '' as $$
declare v_res public.result_summaries;
begin
  select * into v_res from public.result_summaries where id = p_result for update;
  if not found or not private.has_role(v_res.organization_id, '{coordenacao,estudante,editor}') then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if v_res.conferencia_status <> 'conferido' then
    raise exception 'O resultado precisa ser conferido antes da validação' using errcode = '22023';
  end if;
  if not exists (select 1 from public.experiments e where e.id = v_res.experiment_id and e.pesquisador_principal_id = p_person)
     and not exists (select 1 from public.experiment_members m where m.experiment_id = v_res.experiment_id and m.person_id = p_person and m.acesso in ('proprietario', 'revisor') and m.ativo) then
    raise exception 'A pessoa informada não é responsável por este experimento' using errcode = '42501';
  end if;
  if not exists (select 1 from public.files f where f.id = p_comprovante and f.organization_id = v_res.organization_id and f.deleted_at is null) then
    raise exception 'Anexe o comprovante' using errcode = '22023';
  end if;
  if coalesce(trim(p_metodo), '') = '' or p_data is null then
    raise exception 'Informe método e data da confirmação' using errcode = '22023';
  end if;
  update public.result_summaries
     set validacao_status = 'validado', validado_por = auth.uid(), validado_em = now(), validacao_externa = true,
         escopo_divulgacao = (select array_agg(distinct x) from unnest(p_escopo || '{interno}'::public.channel[]) x)
   where id = p_result;
  insert into public.activity_log (organization_id, user_id, entidade, entidade_id, acao, detalhes)
  values (v_res.organization_id, auth.uid(), 'result_summaries', p_result, 'validacao_externa',
          jsonb_build_object('pessoa', p_person, 'comprovante', p_comprovante, 'metodo', p_metodo, 'data', p_data));
end $$;

-- ---------------------------------------------------------------------------
-- Rotinas recorrentes (idempotente por chave)
-- ---------------------------------------------------------------------------
create or replace function public.generate_recurring_tasks(p_org uuid, p_mes date)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_inicio date := date_trunc('month', p_mes)::date;
  v_count int := 0;
  v_n int;
  r public.recurring_routines;
begin
  if not private.is_team(p_org) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  for r in select * from public.recurring_routines where organization_id = p_org and ativo loop
    if r.regra = 'mensal_por_experimento' then
      insert into public.tasks (organization_id, titulo, descricao, categoria, responsavel_id, prazo, experiment_id, origem, chave_recorrencia, created_by)
      select p_org, r.titulo || ' — ' || e.codigo, r.descricao, r.categoria, r.responsavel_id,
             v_inicio + (r.dia_prazo - 1), e.id, 'rotina',
             r.id::text || ':' || e.id::text || ':' || to_char(v_inicio, 'YYYY-MM'), auth.uid()
        from public.experiments e
       where e.organization_id = p_org and e.archived_at is null and e.acompanhamento_ativo
         and e.fase in ('implantacao', 'andamento')
      on conflict (organization_id, chave_recorrencia) do nothing;
    else
      insert into public.tasks (organization_id, titulo, descricao, categoria, responsavel_id, prazo, origem, chave_recorrencia, created_by)
      values (p_org, r.titulo, r.descricao, r.categoria, r.responsavel_id, v_inicio + (r.dia_prazo - 1), 'rotina',
              r.id::text || ':' || to_char(v_inicio, 'YYYY-MM'), auth.uid())
      on conflict (organization_id, chave_recorrencia) do nothing;
    end if;
    get diagnostics v_n = row_count;
    v_count := v_count + v_n;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Importação: desfazer lote quando seguro
-- ---------------------------------------------------------------------------
create or replace function public.undo_import(p_batch uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_batch public.import_batches;
  v_n int;
begin
  select * into v_batch from public.import_batches where id = p_batch for update;
  if not found or not private.has_role(v_batch.organization_id, '{coordenacao,estudante}') then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  if v_batch.desfeito_em is not null then
    raise exception 'Lote já desfeito' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.experiments e where e.import_batch_id = p_batch and (
      exists (select 1 from public.visit_schedule_experiments v where v.experiment_id = e.id)
      or exists (select 1 from public.result_summaries r where r.experiment_id = e.id)
      or exists (select 1 from public.files f where f.experiment_id = e.id)
      or exists (select 1 from public.editorial_sources s where s.experiment_id = e.id))) then
    raise exception 'Há registros vinculados aos experimentos importados; arquive-os individualmente' using errcode = '22023';
  end if;
  update public.experiments set archived_at = now(), archived_by = auth.uid()
   where import_batch_id = p_batch and archived_at is null;
  get diagnostics v_n = row_count;
  update public.import_batches set desfeito_em = now() where id = p_batch;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- Feedback público (anônimo) com limite de taxa e verificação de ativação
-- ---------------------------------------------------------------------------
create or replace function public.submit_feedback(
  p_org_slug text, p_publication uuid, p_clareza int, p_utilidade int, p_comentario text,
  p_sugestao text, p_perfil text, p_consentimento boolean, p_origem_hash text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select o.id into v_org from public.organizations o
    join public.project_settings s on s.organization_id = o.id
   where o.slug = p_org_slug and s.portal_publico_ativo and s.feedback_publico_ativo;
  if v_org is null then
    raise exception 'Feedback indisponível' using errcode = '42501';
  end if;
  if not coalesce(p_consentimento, false) then
    raise exception 'É necessário consentir com o uso das respostas' using errcode = '22023';
  end if;
  if (select count(*) from public.audience_feedback where origem_hash = p_origem_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Muitas mensagens em pouco tempo. Tente mais tarde.' using errcode = '54000';
  end if;
  insert into public.audience_feedback (organization_id, public_publication_id, clareza, utilidade, comentario, sugestao_pauta, perfil, consentimento, origem_hash)
  values (v_org,
          (select id from public.public_publications where id = p_publication and organization_id = v_org and revoked_at is null),
          p_clareza, p_utilidade, left(p_comentario, 2000), left(p_sugestao, 1000), p_perfil, true, p_origem_hash);
end $$;

-- cancela solicitações abertas quando o conteúdo volta a rascunho por edição
create or replace function private.after_editorial_reset()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'rascunho' and old.status not in ('rascunho', 'devolvido') then
    update public.approval_requests set status = 'cancelada', concluida_em = now()
     where item_id = new.id and status = 'aberta';
  end if;
  return new;
end $$;
create trigger t_editorial_reset after update of status on public.editorial_items
  for each row execute function private.after_editorial_reset();

-- permissões de execução: somente autenticados (feedback também para anon)
revoke execute on all functions in schema public from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.release_blockers(uuid, public.channel) to authenticated;
grant execute on function public.submit_for_review(uuid, date) to authenticated;
grant execute on function public.workflow_decide(uuid, public.approval_decision, text, public.channel[], date) to authenticated;
grant execute on function public.register_external_validation(uuid, uuid, uuid, text, date, text) to authenticated;
grant execute on function public.register_generated_document(uuid, uuid, uuid, text, text, text, bigint, boolean) to authenticated;
grant execute on function public.register_publication(uuid, public.channel, date, text, uuid, text, text) to authenticated;
grant execute on function public.revoke_publication(uuid, text, text) to authenticated;
grant execute on function public.visit_record_transition(uuid, text, text) to authenticated;
grant execute on function public.result_transition(uuid, text, text, public.channel[]) to authenticated;
grant execute on function public.result_external_validation(uuid, uuid, uuid, text, date, public.channel[]) to authenticated;
grant execute on function public.generate_recurring_tasks(uuid, date) to authenticated;
grant execute on function public.undo_import(uuid) to authenticated;
grant execute on function public.submit_feedback(text, uuid, int, int, text, text, text, boolean, text) to anon, authenticated;
grant execute on all functions in schema private to authenticated, anon, service_role;
revoke execute on function private.notify(uuid, uuid, text, text, text, text) from anon, authenticated;
