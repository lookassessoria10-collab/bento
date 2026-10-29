-- Bento | Correções de segurança encontradas pelos testes de integração
-- 1) Funções booleanas de autorização nunca podem retornar NULL: em PL/pgSQL, "IF NOT NULL"
--    não dispara a exceção e liberaria a operação. Todas passam a usar coalesce(..., false).
-- 2) Políticas de SELECT não podem depender de buscar a própria linha por id (no INSERT ... RETURNING
--    a linha ainda não é visível ao snapshot da função). Passam a usar as colunas da linha.

create or replace function private.experiment_access_of(exp uuid)
returns public.experiment_access language sql stable security definer set search_path = '' as $$
  select em.acesso
  from public.experiment_members em
  where em.experiment_id = exp and em.user_id = (select auth.uid()) and em.ativo
    and private.is_member(em.organization_id)
  order by case em.acesso when 'proprietario' then 1 when 'revisor' then 2 when 'colaborador' then 3 else 4 end
  limit 1;
$$;

create or replace function private.can_validate_experiment(exp uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.experiment_access_of(exp) in ('proprietario', 'revisor'), false);
$$;

-- leitura de experimento a partir das colunas da linha (sem nova busca)
create or replace function private.can_read_experiment_row(org uuid, exp uuid, nivel public.access_level)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.is_manager(org)
    or (nivel <> 'privado_equipe' and private.has_role(org, array['estudante','editor']::public.org_role[]))
    or private.experiment_access_of(exp) is not null,
  false);
$$;

create or replace function private.can_write_experiment_row(org uuid, exp uuid, nivel public.access_level)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.has_role(org, array['coordenacao']::public.org_role[])
    or (nivel <> 'privado_equipe' and private.has_role(org, array['estudante']::public.org_role[]))
    or private.experiment_access_of(exp) in ('proprietario', 'colaborador'),
  false);
$$;

create or replace function private.can_read_item_row(org uuid, item uuid, rev_cient uuid, rev_final uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.is_team(org)
    or (private.is_member(org) and (
      rev_cient = (select auth.uid()) or rev_final = (select auth.uid())
      or exists (select 1 from public.approval_requests r where r.item_id = item and r.revisor_id = (select auth.uid()))
    )),
  false);
$$;

grant execute on function private.can_read_experiment_row(uuid, uuid, public.access_level) to authenticated;
grant execute on function private.can_write_experiment_row(uuid, uuid, public.access_level) to authenticated;
grant execute on function private.can_read_item_row(uuid, uuid, uuid, uuid) to authenticated;

drop policy experiments_select on public.experiments;
create policy experiments_select on public.experiments for select to authenticated
  using (private.can_read_experiment_row(organization_id, id, nivel_acesso));
drop policy experiments_update on public.experiments;
create policy experiments_update on public.experiments for update to authenticated
  using (private.can_write_experiment_row(organization_id, id, nivel_acesso))
  with check (private.can_write_experiment_row(organization_id, id, nivel_acesso));

drop policy editorial_select on public.editorial_items;
create policy editorial_select on public.editorial_items for select to authenticated
  using (private.can_read_item_row(organization_id, id, revisor_cientifico, revisor_final));

-- revisor científico designado (conteúdo sem experimento): comparação nula não pode liberar
create or replace function private.is_designated(p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(p_user = (select auth.uid()), false);
$$;
grant execute on function private.is_designated(uuid) to authenticated;
