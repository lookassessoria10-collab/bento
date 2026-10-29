-- Bento | Row Level Security (deny-by-default)
-- Toda tabela do schema public tem RLS habilitado. Sem política = sem acesso.
-- Tabelas sem política de INSERT/UPDATE/DELETE só são alteradas por RPC SECURITY DEFINER.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- anon não acessa tabelas diretamente (portal usa apenas public_publications)
revoke all on all tables in schema public from anon;
grant select on public.public_publications to anon;
grant select on public.organizations to anon;
grant select on public.project_settings to anon;

-- ---------------------------------------------------------------------------
-- Organização, perfis, participação, convites
-- ---------------------------------------------------------------------------
create policy org_select on public.organizations for select to authenticated
  using (private.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (private.has_role(id, '{admin}')) with check (private.has_role(id, '{admin}'));
-- anon vê apenas organizações com portal ativo (nome/slug)
create policy org_public on public.organizations for select to anon
  using (exists (select 1 from public.project_settings s where s.organization_id = id and s.portal_publico_ativo));

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id and private.is_member(m.organization_id)
    )
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- usuários só alteram o próprio nome; situação da conta é administrativa
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_member(organization_id));
create policy memberships_admin_insert on public.memberships for insert to authenticated
  with check (private.has_role(organization_id, '{admin}') and user_id <> (select auth.uid()));
create policy memberships_admin_update on public.memberships for update to authenticated
  using (private.has_role(organization_id, '{admin}') and user_id <> (select auth.uid()))
  with check (private.has_role(organization_id, '{admin}') and user_id <> (select auth.uid()));
revoke update on public.memberships from authenticated;
grant update (status, delegacao_revisao_final, fim) on public.memberships to authenticated;

create policy invitations_admin_select on public.invitations for select to authenticated
  using (private.has_role(organization_id, '{admin}'));
create policy invitations_admin_insert on public.invitations for insert to authenticated
  with check (private.has_role(organization_id, '{admin}') and invited_by = (select auth.uid()) and accepted_at is null and revoked_at is null);
create policy invitations_admin_update on public.invitations for update to authenticated
  using (private.has_role(organization_id, '{admin}') and accepted_at is null)
  with check (private.has_role(organization_id, '{admin}'));
revoke update on public.invitations from authenticated;
grant update (revoked_at, token_hash, expires_at, reenvios) on public.invitations to authenticated;

-- ---------------------------------------------------------------------------
-- Configurações
-- ---------------------------------------------------------------------------
create policy settings_select on public.project_settings for select to authenticated
  using (private.is_member(organization_id));
create policy settings_public on public.project_settings for select to anon
  using (portal_publico_ativo);
create policy settings_update on public.project_settings for update to authenticated
  using (private.has_role(organization_id, '{admin}')) with check (private.has_role(organization_id, '{admin}'));

create policy instauth_select on public.institutional_authorizations for select to authenticated
  using (private.is_member(organization_id));
create policy instauth_write on public.institutional_authorizations for insert to authenticated
  with check (private.is_manager(organization_id));
create policy instauth_update on public.institutional_authorizations for update to authenticated
  using (private.is_manager(organization_id)) with check (private.is_manager(organization_id));

-- ---------------------------------------------------------------------------
-- Fazendas, áreas e pessoas
-- ---------------------------------------------------------------------------
create policy farms_select on public.farms for select to authenticated using (private.is_member(organization_id));
create policy farms_insert on public.farms for insert to authenticated with check (private.is_manager(organization_id));
create policy farms_update on public.farms for update to authenticated
  using (private.is_manager(organization_id)) with check (private.is_manager(organization_id));

create policy areas_select on public.farm_areas for select to authenticated using (private.is_internal(organization_id));
create policy areas_insert on public.farm_areas for insert to authenticated with check (private.is_team(organization_id));
create policy areas_update on public.farm_areas for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy people_select on public.people for select to authenticated using (private.is_internal(organization_id));
create policy people_insert on public.people for insert to authenticated with check (private.is_team(organization_id));
create policy people_update on public.people for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

-- contatos institucionais: somente gestão e equipe executora
create policy contacts_select on public.people_contacts for select to authenticated using (private.is_team(organization_id));
create policy contacts_insert on public.people_contacts for insert to authenticated with check (private.is_team(organization_id));
create policy contacts_update on public.people_contacts for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

-- ---------------------------------------------------------------------------
-- Experimentos
-- ---------------------------------------------------------------------------
create policy experiments_select on public.experiments for select to authenticated
  using (private.can_read_experiment(id));
create policy experiments_insert on public.experiments for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante}'));
create policy experiments_update on public.experiments for update to authenticated
  using (private.can_write_experiment(id))
  with check (private.can_write_experiment(id));
-- sem DELETE: arquivamento lógico (archived_at)

create policy expmembers_select on public.experiment_members for select to authenticated
  using (private.can_read_experiment(experiment_id));
create policy expmembers_insert on public.experiment_members for insert to authenticated
  with check (
    private.is_manager(organization_id)
    or (private.experiment_access_of(experiment_id) = 'proprietario' and acesso <> 'proprietario')
  );
create policy expmembers_update on public.experiment_members for update to authenticated
  using (private.is_manager(organization_id) and coalesce(user_id, '00000000-0000-0000-0000-000000000000') <> (select auth.uid()))
  with check (private.is_manager(organization_id));
revoke update on public.experiment_members from authenticated;
grant update (acesso, funcao, ativo) on public.experiment_members to authenticated;

create policy treatments_select on public.experiment_treatments for select to authenticated using (private.can_read_experiment(experiment_id));
create policy treatments_insert on public.experiment_treatments for insert to authenticated with check (private.can_write_experiment(experiment_id));
create policy treatments_update on public.experiment_treatments for update to authenticated
  using (private.can_write_experiment(experiment_id)) with check (private.can_write_experiment(experiment_id));
create policy treatments_delete on public.experiment_treatments for delete to authenticated using (private.can_write_experiment(experiment_id));

create policy milestones_select on public.experiment_milestones for select to authenticated using (private.can_read_experiment(experiment_id));
create policy milestones_insert on public.experiment_milestones for insert to authenticated with check (private.can_write_experiment(experiment_id));
create policy milestones_update on public.experiment_milestones for update to authenticated
  using (private.can_write_experiment(experiment_id)) with check (private.can_write_experiment(experiment_id));
create policy milestones_delete on public.experiment_milestones for delete to authenticated using (private.can_write_experiment(experiment_id));

-- ---------------------------------------------------------------------------
-- Visitas e fichas
-- ---------------------------------------------------------------------------
create policy visits_select on public.visit_schedules for select to authenticated
  using (
    private.is_team(organization_id)
    or exists (select 1 from public.visit_schedule_experiments v where v.visit_id = visit_schedules.id and private.can_read_experiment(v.experiment_id))
  );
create policy visits_insert on public.visit_schedules for insert to authenticated with check (private.is_team(organization_id));
create policy visits_update on public.visit_schedules for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy vse_select on public.visit_schedule_experiments for select to authenticated using (private.can_read_experiment(experiment_id));
create policy vse_insert on public.visit_schedule_experiments for insert to authenticated
  with check (private.is_team(organization_id) and private.can_read_experiment(experiment_id));
create policy vse_delete on public.visit_schedule_experiments for delete to authenticated using (private.is_team(organization_id));

create policy vpart_select on public.visit_participants for select to authenticated using (private.is_internal(organization_id));
create policy vpart_insert on public.visit_participants for insert to authenticated with check (private.is_team(organization_id));
create policy vpart_delete on public.visit_participants for delete to authenticated using (private.is_team(organization_id));

create policy vtpl_select on public.visit_checklist_templates for select to authenticated using (private.is_internal(organization_id));
create policy vtpl_insert on public.visit_checklist_templates for insert to authenticated with check (private.is_manager(organization_id) or private.is_team(organization_id));
create policy vtpl_update on public.visit_checklist_templates for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy vrec_select on public.visit_records for select to authenticated using (private.can_read_experiment(experiment_id));
create policy vrec_insert on public.visit_records for insert to authenticated
  with check (private.is_team(organization_id) and private.can_read_experiment(experiment_id));
create policy vrec_update on public.visit_records for update to authenticated
  using ((private.is_team(organization_id) and private.can_read_experiment(experiment_id)) or private.can_write_experiment(experiment_id))
  with check ((private.is_team(organization_id) and private.can_read_experiment(experiment_id)) or private.can_write_experiment(experiment_id));

create policy vcheck_select on public.visit_checklist_items for select to authenticated
  using (exists (select 1 from public.visit_records r where r.id = visit_record_id));
create policy vcheck_write on public.visit_checklist_items for insert to authenticated
  with check (exists (select 1 from public.visit_records r where r.id = visit_record_id and r.status in ('rascunho', 'preenchida', 'devolvida')) and private.is_team(organization_id));
create policy vcheck_update on public.visit_checklist_items for update to authenticated
  using (exists (select 1 from public.visit_records r where r.id = visit_record_id and r.status in ('rascunho', 'preenchida', 'devolvida')) and private.is_team(organization_id))
  with check (private.is_team(organization_id));

-- ---------------------------------------------------------------------------
-- Resultados
-- ---------------------------------------------------------------------------
create policy results_select on public.result_summaries for select to authenticated using (private.can_read_experiment(experiment_id));
create policy results_insert on public.result_summaries for insert to authenticated with check (private.can_write_experiment(experiment_id));
create policy results_update on public.result_summaries for update to authenticated
  using (private.can_write_experiment(experiment_id)) with check (private.can_write_experiment(experiment_id));

-- ---------------------------------------------------------------------------
-- Arquivos
-- ---------------------------------------------------------------------------
create or replace function private.can_read_file(f public.files)
returns boolean language sql stable security definer set search_path = '' as $$
  select f.deleted_at is null and (
    case
      when f.experiment_id is not null then private.can_read_experiment(f.experiment_id)
      when f.editorial_item_id is not null then private.can_read_item(f.editorial_item_id)
      else private.is_team(f.organization_id) or f.created_by = (select auth.uid())
    end
  );
$$;
grant execute on function private.can_read_file(public.files) to authenticated;

create policy files_select on public.files for select to authenticated using (private.can_read_file(files));
create policy files_insert on public.files for insert to authenticated
  with check (
    private.is_internal(organization_id)
    and (experiment_id is null or private.can_write_experiment(experiment_id) or (private.is_team(organization_id) and private.can_read_experiment(experiment_id)))
    and (editorial_item_id is null or private.is_team(organization_id))
  );
create policy files_update on public.files for update to authenticated
  using (deleted_at is null and (private.is_team(organization_id) or created_by = (select auth.uid())))
  with check (private.is_team(organization_id) or created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Atividades
-- ---------------------------------------------------------------------------
create policy tasks_select on public.tasks for select to authenticated
  using (
    private.is_team(organization_id)
    or (private.is_member(organization_id) and (responsavel_id = (select auth.uid()) or colaborador_id = (select auth.uid()) or created_by = (select auth.uid())))
  );
create policy tasks_insert on public.tasks for insert to authenticated with check (private.is_internal(organization_id));
create policy tasks_update on public.tasks for update to authenticated
  using (private.is_team(organization_id) or responsavel_id = (select auth.uid()) or colaborador_id = (select auth.uid()))
  with check (private.is_internal(organization_id));

create policy tcom_select on public.task_comments for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_id));
create policy tcom_insert on public.task_comments for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id) and private.is_internal(organization_id));

create policy tchk_select on public.task_checklist_items for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_id));
create policy tchk_insert on public.task_checklist_items for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id) and private.is_internal(organization_id));
create policy tchk_update on public.task_checklist_items for update to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id)) with check (private.is_internal(organization_id));
create policy tchk_delete on public.task_checklist_items for delete to authenticated using (exists (select 1 from public.tasks t where t.id = task_id) and private.is_internal(organization_id));

create policy routines_select on public.recurring_routines for select to authenticated using (private.is_team(organization_id));
create policy routines_insert on public.recurring_routines for insert to authenticated with check (private.is_manager(organization_id) or private.has_role(organization_id, '{estudante}'));
create policy routines_update on public.recurring_routines for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy notif_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notif_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (lida_em) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Editorial e governança
-- ---------------------------------------------------------------------------
create policy editorial_select on public.editorial_items for select to authenticated using (private.can_read_item(id));
create policy editorial_insert on public.editorial_items for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));
create policy editorial_update on public.editorial_items for update to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'))
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy esrc_select on public.editorial_sources for select to authenticated using (private.can_read_item(item_id));
create policy esrc_insert on public.editorial_sources for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}')
    and (experiment_id is null or private.can_read_experiment(experiment_id)));
create policy esrc_delete on public.editorial_sources for delete to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy eversions_select on public.editorial_versions for select to authenticated using (private.can_read_item(item_id));
create policy areq_select on public.approval_requests for select to authenticated using (private.can_read_item(item_id) or revisor_id = (select auth.uid()));
create policy adec_select on public.approval_decisions for select to authenticated using (private.can_read_item(item_id));
create policy release_select on public.release_permissions for select to authenticated using (private.can_read_item(item_id));

create policy bulletins_select on public.bulletin_editions for select to authenticated using (private.can_read_item(editorial_item_id));
create policy bulletins_insert on public.bulletin_editions for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));
create policy bulletins_update on public.bulletin_editions for update to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'))
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy bsec_select on public.bulletin_sections for select to authenticated
  using (exists (select 1 from public.bulletin_editions b where b.id = bulletin_id));
create policy bsec_insert on public.bulletin_sections for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}')
    and (experiment_id is null or private.can_read_experiment(experiment_id)));
create policy bsec_update on public.bulletin_sections for update to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'))
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}')
    and (experiment_id is null or private.can_read_experiment(experiment_id)));
create policy bsec_delete on public.bulletin_sections for delete to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy dossiers_select on public.dossiers for select to authenticated using (private.can_read_item(editorial_item_id));
create policy dossiers_insert on public.dossiers for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));
create policy dossiers_update on public.dossiers for update to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'))
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy dexp_select on public.dossier_experiments for select to authenticated using (private.can_read_experiment(experiment_id));
create policy dexp_insert on public.dossier_experiments for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}') and private.can_read_experiment(experiment_id));
create policy dexp_update on public.dossier_experiments for update to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'))
  with check (private.has_role(organization_id, '{coordenacao,estudante,editor}'));
create policy dexp_delete on public.dossier_experiments for delete to authenticated
  using (private.has_role(organization_id, '{coordenacao,estudante,editor}'));

create policy gdocs_select on public.generated_documents for select to authenticated
  using ((item_id is not null and private.can_read_item(item_id)) or (item_id is null and private.is_team(organization_id)));
create policy gdocs_insert on public.generated_documents for insert to authenticated
  with check (private.is_team(organization_id) and gerado_por = (select auth.uid()) and rascunho);

create policy pubrec_select on public.publication_records for select to authenticated using (private.can_read_item(item_id));

create policy pubpub_anon on public.public_publications for select to anon
  using (revoked_at is null and exists (
    select 1 from public.project_settings s where s.organization_id = public_publications.organization_id and s.portal_publico_ativo));
create policy pubpub_auth on public.public_publications for select to authenticated
  using (private.is_member(organization_id) or (revoked_at is null and exists (
    select 1 from public.project_settings s where s.organization_id = public_publications.organization_id and s.portal_publico_ativo)));

create policy igm_select on public.instagram_metrics for select to authenticated using (private.is_team(organization_id) or private.has_role(organization_id, '{leitor}'));
create policy igm_insert on public.instagram_metrics for insert to authenticated
  with check (private.is_team(organization_id) and registrado_por = (select auth.uid()));

create policy aq_select on public.audience_questions for select to authenticated using (private.is_team(organization_id));
create policy aq_insert on public.audience_questions for insert to authenticated with check (private.is_team(organization_id));
create policy aq_update on public.audience_questions for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy fb_select on public.audience_feedback for select to authenticated using (private.is_team(organization_id));
create policy fb_update on public.audience_feedback for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));
revoke update on public.audience_feedback from authenticated;
grant update (moderacao) on public.audience_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- Piloto, frentes, importações e auditoria
-- ---------------------------------------------------------------------------
create policy pm_select on public.pilot_milestones for select to authenticated using (private.is_member(organization_id));
create policy pm_insert on public.pilot_milestones for insert to authenticated with check (private.is_manager(organization_id));
create policy pm_update on public.pilot_milestones for update to authenticated
  using (private.is_team(organization_id)) with check (private.is_team(organization_id));

create policy pr_select on public.pilot_report for select to authenticated using (private.is_member(organization_id));

create policy wf_select on public.work_fronts for select to authenticated using (private.is_member(organization_id));
create policy wf_insert on public.work_fronts for insert to authenticated with check (private.is_manager(organization_id));
create policy wf_update on public.work_fronts for update to authenticated
  using (private.is_manager(organization_id)) with check (private.is_manager(organization_id));

create policy imp_select on public.import_batches for select to authenticated using (private.is_team(organization_id));
create policy imp_insert on public.import_batches for insert to authenticated
  with check (private.has_role(organization_id, '{coordenacao,estudante}') and criado_por = (select auth.uid()));

create policy log_select on public.activity_log for select to authenticated using (private.is_manager(organization_id));

-- códigos: somente via gatilho
-- (experiment_code_counters não tem políticas: inacessível a clientes)
