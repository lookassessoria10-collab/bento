-- Bento | Pré-visualização de snapshot (rascunho) e registro auditável de downloads

-- Pré-visualização do conteúdo como ficaria se enviado agora (nada é gravado).
create or replace function public.preview_snapshot(p_item uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_read_item(p_item) then
    raise exception 'Conteúdo não encontrado' using errcode = 'P0002';
  end if;
  return private.build_snapshot(p_item);
end $$;
revoke execute on function public.preview_snapshot(uuid) from public, anon;
grant execute on function public.preview_snapshot(uuid) to authenticated;

-- Download auditável: registra quem baixou qual arquivo (sem conteúdo).
create or replace function public.log_file_download(p_file uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.files where id = p_file;
  if v_org is null or not private.is_member(v_org) then
    raise exception 'Arquivo não encontrado' using errcode = 'P0002';
  end if;
  insert into public.activity_log (organization_id, user_id, entidade, entidade_id, acao)
  values (v_org, auth.uid(), 'files', p_file, 'download');
end $$;
revoke execute on function public.log_file_download(uuid) from public, anon;
grant execute on function public.log_file_download(uuid) to authenticated;
