-- Bento | Configuração essencial do espaço Entomo Agro 360 (sem pesquisas, sem contas, sem dados fictícios)
-- Situação institucional nasce "em alinhamento": nada aqui afirma adesão, credenciamento ou autorização.

do $$
declare
  v_org uuid;
  v_farm uuid;
begin
  if exists (select 1 from public.organizations where slug = 'entomo-agro-360') then
    return;
  end if;

  insert into public.organizations (nome, slug, status_institucional)
  values ('Entomo Agro 360', 'entomo-agro-360', 'em_alinhamento')
  returning id into v_org;

  insert into public.project_settings (organization_id, politica_editorial)
  values (v_org,
    'Toda informação científica específica exige validação do pesquisador responsável e autorização final antes de qualquer publicação. '
    || 'Conteúdo institucional não científico segue fluxo editorial próprio, sem afirmar validação científica inexistente.');

  insert into public.institutional_authorizations (organization_id, tipo, descricao, status) values
    (v_org, 'adesao_fazenda', 'Adesão formal da Fazenda Meraki ao acompanhamento', 'em_alinhamento'),
    (v_org, 'uso_marca_fazenda', 'Uso público do nome e da marca da fazenda', 'em_alinhamento'),
    (v_org, 'uso_marca_instituicao', 'Uso público do nome e da marca da UNEB', 'em_alinhamento'),
    (v_org, 'credenciamento_extensao', 'Enquadramento como extensão universitária', 'em_alinhamento'),
    (v_org, 'autorizacao_publicacao', 'Autorização geral de divulgação de conteúdos', 'em_alinhamento'),
    (v_org, 'acesso_base_original', 'Acesso à base original de cadastros da fazenda', 'em_alinhamento');

  insert into public.farms (organization_id, nome, municipio, uf, descricao, adesao_formal)
  values (v_org, 'Fazenda Meraki', 'Luís Eduardo Magalhães', 'BA',
          'Fazenda experimental citada na proposta. Adesão formal pendente de confirmação.', false)
  returning id into v_farm;

  -- pessoas citadas na proposta, sem e-mail e sem conta de acesso
  insert into public.people (organization_id, nome, tipo, instituicao, situacao, observacoes) values
    (v_org, 'Jucileide de Campos', 'estudante', 'UNEB', 'confirmado', 'Integrante da equipe proponente.'),
    (v_org, 'Ananda Reis', 'estudante', 'UNEB', 'confirmado', 'Integrante da equipe proponente.'),
    (v_org, 'Sofia Mota', 'estudante', 'UNEB', 'confirmado', 'Integrante da equipe proponente.'),
    (v_org, 'Marco Antonio Tamai', 'orientador', 'UNEB', 'pendente_confirmacao',
     'Professor orientador citado na proposta. Papel e acesso pendentes de confirmação.');

  insert into public.pilot_milestones (organization_id, mes, titulo, descricao) values
    (v_org, 1, 'Alinhamento e cadastro inicial', 'Alinhamento, definição do escopo, cadastro inicial e teste do roteiro.'),
    (v_org, 2, 'Visitas e planejamento editorial', 'Visitas, conferência e planejamento editorial.'),
    (v_org, 3, 'Primeira edição do boletim', 'Primeira edição do boletim após revisão.'),
    (v_org, 4, 'Avaliação e rodízio', 'Avaliação, ajustes e rodízio de funções.'),
    (v_org, 5, 'Segunda edição em preparação', 'Segunda edição em preparação e devolutiva com o público.'),
    (v_org, 6, 'Encerramento do piloto', 'Segunda edição, dossiê, relatório do piloto e proposta de continuidade.');

  insert into public.visit_checklist_templates (organization_id, nome, itens) values
    (v_org, 'Roteiro padrão de acompanhamento', jsonb_build_array(
      'Etapa atual confirmada com o responsável',
      'Atividades desde a última visita registradas',
      'Avaliações previstas e realizadas conferidas',
      'Ocorrências relatadas com identificação do informante',
      'Fotografias com legenda, autoria e autorização',
      'Resultados disponibilizados e situação da análise',
      'Pendências com responsável e prazo',
      'Conteúdo potencial para divulgação identificado'));

  insert into public.recurring_routines (organization_id, titulo, descricao, regra, dia_prazo, categoria)
  values (v_org, 'Acompanhamento mensal', 'Registrar a ficha de acompanhamento do mês para o experimento.',
          'mensal_por_experimento', 25, 'visita');
end $$;
