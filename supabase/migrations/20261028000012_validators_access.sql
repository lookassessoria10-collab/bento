-- Bento | Responsáveis pelos experimentos citados enxergam e são notificados sobre conteúdos
-- que aguardam a validação científica deles (antes, só o revisor designado manualmente via o item).

-- verdadeiro se o usuário atual pode validar algum experimento citado pelo conteúdo
create or replace function private.is_item_validator(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(exists (
    select 1 from public.editorial_sources s
      left join public.result_summaries r on r.id = s.result_id
     where s.item_id = p_item and private.can_validate_experiment(coalesce(s.experiment_id, r.experiment_id))
    union all
    select 1 from public.bulletin_editions b
      join public.bulletin_sections bs on bs.bulletin_id = b.id
     where b.editorial_item_id = p_item and (
       private.can_validate_experiment(bs.experiment_id)
       or exists (select 1 from public.result_summaries r2 where r2.id = any (bs.result_ids) and private.can_validate_experiment(r2.experiment_id)))
    union all
    select 1 from public.dossiers d
      join public.dossier_experiments de on de.dossier_id = d.id
     where d.editorial_item_id = p_item and private.can_validate_experiment(de.experiment_id)
  ), false);
$$;
grant execute on function private.is_item_validator(uuid) to authenticated;

create or replace function private.can_read_item_row(org uuid, item uuid, rev_cient uuid, rev_final uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    private.is_team(org)
    or (private.is_member(org) and (
      rev_cient = (select auth.uid()) or rev_final = (select auth.uid())
      or exists (select 1 from public.approval_requests r where r.item_id = item and r.revisor_id = (select auth.uid()))
      or private.is_item_validator(item)
    )),
  false);
$$;

create or replace function private.can_read_item(p_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.can_read_item_row(i.organization_id, i.id, i.revisor_cientifico, i.revisor_final)
      from public.editorial_items i where i.id = p_item), false);
$$;

-- notificação aos responsáveis/revisores dos experimentos citados
create or replace function private.notify_validators()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ver public.editorial_versions;
  u uuid;
begin
  if new.status = 'aguardando_validacao' and old.status is distinct from new.status then
    select * into v_ver from public.editorial_versions where id = new.current_version_id;
    for u in
      select distinct m.user_id from public.experiment_members m
       where m.experiment_id = any (private.version_experiments(v_ver.content))
         and m.acesso in ('proprietario', 'revisor') and m.ativo and m.user_id is not null
         and m.user_id is distinct from new.revisor_cientifico
    loop
      perform private.notify(new.organization_id, u, 'revisao', 'Validação científica solicitada', new.titulo, '/app/aprovacoes/' || new.id);
    end loop;
  end if;
  return new;
end $$;
create trigger t_editorial_notify_validators after update of status on public.editorial_items
  for each row execute function private.notify_validators();
