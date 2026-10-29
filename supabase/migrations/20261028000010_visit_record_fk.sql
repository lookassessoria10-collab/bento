-- Bento | Vínculo direto ficha → visita (além do vínculo com a relação visita×experimento)
alter table public.visit_records
  add constraint visit_records_visit_fk foreign key (visit_id, organization_id)
  references public.visit_schedules (id, organization_id) on delete restrict;
