# Ambiente de demonstração e painel do gestor

> **DADOS SIMULADOS.** Tudo o que o pacote cria — unidade, pessoas, ensaios, medições, ocorrências, revisões e a
> estimativa de tempo — é fictício. Não é resultado agronômico, recomendação, aprovação científica ou medição real.

## Como funciona o isolamento

- A demonstração vive numa **organização própria** (`organizations.is_demo = true`, slug `unidade-modelo-cerrado-demo`,
  nome "Unidade Experimental Modelo do Cerrado"). Não tem relação com a Fazenda Meraki, a UNEB ou pessoas reais.
- A separação é a mesma RLS que já isola organizações: toda consulta, exportação e arquivo é filtrado por
  organização e papel no banco. O marcador `is_demo` também fica gravado em **todos** os registros. Um gatilho o força
  em qualquer registro criado dentro da organização de demonstração, inclusive pela interface.
- O marcador da organização só pode ser alterado administrativamente (gatilho `t_org_demo_guard`).
- O portal público fica desativado na demonstração e nenhum conteúdo dela é publicado automaticamente.
- Quem não pertence à organização de demonstração não lê nem conta registros dela: nem as linhas nem a contagem
  aparecem. Isso é coberto pelos testes de integração.
- Sem preferência salva, o Bento abre uma organização real antes da demonstração. A troca é feita em
  *Configurações › Organização ativa*.

## Comandos (administrativos, só pelo terminal)

| Comando | O que faz |
| --- | --- |
| `npm run demo:dry-run` | Valida o JSON e lista quantos registros seriam criados ou atualizados. Não grava nada. |
| `npm run demo:apply` | Importa ou atualiza de forma idempotente: rodar duas vezes não duplica. `-- --membro email` dá acesso de coordenação **só** à demonstração a um usuário já existente. `-- --restaurar-premissas` volta as premissas de tempo aos valores do JSON. |
| `npm run demo:verify` | Confere as contagens (18/93/186/12/208, distribuição 13/3/1/1), as ausências preservadas, que nenhuma etapa futura consta como realizada, os marcadores e o checkpoint. |
| `npm run demo:rollback` | Remove **somente** a organização de demonstração, seus registros e os arquivos `<org>/demo/…`, numa única transação (`public.demo_purge_organization`, executável apenas pela service role). Recusa organizações sem `is_demo` ou com experimentos sem o marcador. |

- **Alvo:** por padrão, apenas o Supabase **local** (`.env.local` apontando para 127.0.0.1/localhost).
- **Outro banco:** exige `--project-ref <ref> --confirmar-remoto`. As chaves vêm da CLI logada e nunca são impressas.
  Gravar fora do ambiente local precisa de aprovação explícita.
- **Arquivo:** o padrão é `supabase/demo/bento-demo-dados.json`. Outro caminho pode ser passado com `-- --arquivo caminho`.

## Mapeamento do JSON para o esquema

| Origem (JSON) | Destino no Bento |
| --- | --- |
| `demoOrganization` | `organizations` (`is_demo`) + `project_settings` (portal desativado) |
| `experiments[]` | `experiments` (código `DEMO-EA360-NNN` preservado só em organização demo; `fase`: concluido/andamento/interrompido/**planejado**) |
| `sector`, `location` | `farms` (unidade fictícia) + `farm_areas` (setores) |
| `responsible`, `researchTeam` | `people` (fictícias) + `experiment_members` |
| `treatments` | `experiment_treatments` |
| `visits[]` | `visit_schedules` (realizadas) + `visit_schedule_experiments` + `visit_records` |
| `visits[].measurements[]` | **`experiment_measurements`** (nova; valor nulo exige motivo e nunca vira zero) |
| `incidents[]` | **`experiment_incidents`** (nova) |
| `plotReadings[]` | **`experiment_plot_readings`** (nova; natureza `sintetico_sem_teste_estatistico`) |
| `tasks[]` | `tasks` (`concluida_demo` → concluída; `pendente` → a fazer; responsável fictício na descrição) |
| `files[]` | `files` + objeto `.txt` real no bucket privado, com cabeçalho "DADOS SIMULADOS" |
| `scientificReview`, `resultSummary`, `currentStage` | `experiments.demo_meta` (permitido só com `is_demo`) |
| `editorialExamples[]` | `editorial_items` (rascunho, canal interno) + `editorial_sources` |
| `timeEconomyModel.items[]` | **`demo_time_assumptions`** (nova; só existe em organização demo) |

**Limitações registradas** (o pacote não traz esses dados, e nada foi inventado):

- As ocorrências não informam responsável nem data da próxima verificação. A interface mostra "Não informado na
  ocorrência" e cita o responsável pelo ensaio e a próxima visita agendada, quando houver.
- Os ensaios concluídos não informam data efetiva de término, que fica vazia.
- O documento de requisitos cita uma medição ausente no DEMO-EA360-006, mas o JSON não traz valor nulo nesse ensaio:
  todas as medições dele têm valor. A falha de bateria aparece apenas como ocorrência. Os únicos nulos do pacote são
  os 2 do DEMO-EA360-015.

## Telas

- **`/app/gestao` — Painel do gestor** (coordenação e administração; permissão `gestao.painel`).
  - Blocos: situação do portfólio; problemas e decisões; evolução e atividades; acompanhamento administrativo.
  - Filtros por período, cultura, tema, status, responsável e setor. Todos os números são recalculados a partir da
    mesma seleção.
  - A estimativa de tempo aparece apenas na organização de demonstração. As premissas são editáveis por coordenação
    e administração (`gestao.premissas_demo`), também protegidas por RLS e gatilho.
- **`/app/gestao/relatorio` — Relatório gerencial.**
  - Gerado no momento da consulta, com os filtros aplicados.
  - Botão "Imprimir ou salvar PDF".
  - Aviso de dados simulados no início e no fim.
- **`/app/gestao/exportar?tipo=experimentos|ocorrencias|medicoes` — CSV.**
  - Exige `relatorios.exportar_interno`.
  - Na demonstração, cada linha traz "DADOS SIMULADOS" e o arquivo tem o prefixo `bento-demo-`.
- **Ficha do experimento › "Evolução e ocorrências":**
  - linha do tempo, com o que está previsto marcado como "previsto";
  - gráficos só com valores registrados (ausência aparece como lacuna marcada com ×);
  - ocorrências, leituras por parcela sem estatística, documentos e revisão simulada.
- **Faixa fixa "Ambiente de demonstração · Dados simulados"** no topo de todas as telas da organização de demonstração.
  PDFs gerados nela trazem o aviso em todas as páginas.

## Roteiro de apresentação (5–7 min)

1. Entre com a conta de demonstração. Em *Configurações › Organização ativa*, escolha "Unidade Experimental Modelo
   do Cerrado" e abra **Painel do gestor**: 18 ensaios (13 concluídos, 3 em andamento, 1 interrompido, 1 planejado).
2. Filtre **Cultura: Algodão** e abra **DEMO-EA360-005**. Na aba "Evolução e ocorrências", as capturas sobem de
   0 → 1 → 4 → **8** adultos/armadilha e recuam; a ocorrência "Elevação das capturas nas bordaduras" pede avaliação
   técnica, sem recomendar produto.
3. Volte ao painel, filtre **Sorgo** e abra **DEMO-EA360-008**. A umidade do solo cai de 25% para 13% no
   florescimento enquanto a altura cresce; o registro deixa claro que não há inferência causal.
4. Filtre **Status: Interrompido** e abra **DEMO-EA360-015**. A série tem lacuna marcada (falha instrumental), não há
   leituras finais e o motivo da interrupção está registrado.
5. No painel, desça até **Economia de tempo administrativo estimada**: 864 → 448 min/mês, 416 min (6h56min), 48,1%,
   com a etiqueta SIMULAÇÃO. Edite uma premissa para mostrar o recálculo.
6. Clique em **Relatório gerencial**, aplique um período e use **Imprimir ou salvar PDF**.

## Medir economia real (fora do escopo)

A estimativa usa hipóteses fictícias. Medir economia real exige:

- definir as atividades e o método de coleta de tempo;
- comparar um período antes e depois do uso do Bento;
- validar as atividades com a equipe.

Nenhum valor financeiro é calculado.
