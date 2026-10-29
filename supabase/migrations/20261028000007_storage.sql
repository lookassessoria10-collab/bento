-- Bento | Storage: bucket privado único; nada é servido publicamente sem verificação.
-- Caminhos: {organization_id}/arquivos/{uuid}-{nome-sanitizado}
--           {organization_id}/documentos/{uuid}.pdf

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bento-privado', 'bento-privado', false, 52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_org(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function private.storage_org(text) to authenticated, anon;

-- leitura: somente se o registro de metadados correspondente for visível ao usuário
create policy "bento leitura autorizada" on storage.objects for select to authenticated
  using (
    bucket_id = 'bento-privado' and (
      exists (select 1 from public.files f where f.storage_path = storage.objects.name)
      or exists (select 1 from public.generated_documents g where g.storage_path = storage.objects.name)
      or exists (select 1 from public.public_publications p where p.pdf_storage_path = storage.objects.name and p.revoked_at is null)
    )
  );

-- visitante: somente PDFs de publicações ativas no portal habilitado
create policy "bento leitura publica controlada" on storage.objects for select to anon
  using (
    bucket_id = 'bento-privado'
    and exists (select 1 from public.public_publications p where p.pdf_storage_path = storage.objects.name and p.revoked_at is null)
  );

-- envio: pasta da própria organização, sem sobrescrever (sem políticas de UPDATE/DELETE)
create policy "bento envio interno" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bento-privado'
    and private.is_internal(private.storage_org(name))
    and split_part(name, '/', 2) in ('arquivos', 'documentos')
    and name !~ '\.\.'
  );
