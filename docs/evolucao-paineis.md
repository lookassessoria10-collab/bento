# Evolução: painéis, navegação, calendário e compartilhamento externo

Branch: `evolucao/paineis-compartilhamento`. Tudo foi acrescentado ao Bento existente: as rotas, o banco, a autenticação e as apresentações foram preservados.

## 1. Auditoria (resumo)

| Item | O que já existia | Decisão |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, Tailwind v4, Supabase (RLS deny-by-default) | Mantido |
| Multi-organização | `organizations` + `memberships` + RLS por papel; seletor em Configurações; `organizations.is_demo` (migração 14) | Reutilizado para escopo de painéis e links |
| Demonstração | Organização fictícia isolada, marcador forçado por gatilho, importador idempotente | Complemento de agenda no mesmo importador |
| Visitas | `visit_schedules` (planejada, confirmada, realizada, adiada, cancelada) + fichas `visit_records` | Reutilizadas como “visitas de acompanhamento” do calendário (sem duplicar) |
| Marcos e prazos | `experiment_milestones`, `tasks.prazo` | Tarefas entram em atraso e atenção; marcos continuam na ficha |
| Notificações | `notifications` + gatilhos de atribuição | Reutilizadas para o responsável de um compromisso |
| Auditoria | `activity_log` + `private.audit()` | Aplicada a `calendar_events` |
| Gráficos | Componentes próprios em SVG (sem biblioteca) | Novos gráficos no mesmo padrão (`charts-extra.tsx`) |
| Chave privilegiada | `createAdminClient()` só no servidor | Usada somente pelo montador do painel externo |
| Apresentações | `/apresentacao` e `/apresentacao/comercial` | Não alteradas |

**Novas entidades (migração 15) e por que:**

- `calendar_events`: compromissos que não são visitas (avaliação, reunião de revisão, coleta, prazo de entrega, marco de encerramento, outro), com `data_prevista` separada de `realizado_em` e histórico de reagendamentos.
- `dashboard_share_links`: links externos. Guardam só o hash SHA-256 do token, a validade, o estado, a configuração e a senha opcional (scrypt).
- `dashboard_share_access`: contagem diária de acessos, sem IP ou identificação.
- `dashboard_share_audit`: criação, substituição e revogação, com a configuração. Nunca guarda token ou senha.

## 2. Navegação

O menu foi agrupado em seções recolhíveis. As URLs antigas continuam iguais e cada página repete a checagem de permissão no servidor.

| Seção | Itens (rota real) |
| --- | --- |
| Visão geral | Painel geral (`/app`, modos em `/app/gestao` e `/app/painel/*`), Calendário (`/app/calendario`), Relatórios (`/app/relatorios`) |
| Pesquisas | Ensaios (`/app/experimentos`), Acompanhamentos (`/app/visitas`), Resultados (`/app/resultados`) |
| Gestão | Pendências (`/app/atividades`), Aprovações (`/app/aprovacoes`), Compartilhamentos (`/app/compartilhamentos`, só para gestão) |
| Documentos e comunicação | Arquivos (`/app/biblioteca`), Publicações (`/app/editorial`, conforme permissão) |
| Administração | Equipe, Configurações |

- **No desktop:** a seção ativa fica aberta e as outras recolhidas. O menu pode ser recolhido para só ícones, com a preferência guardada no navegador. O cabeçalho mostra “Seção › Item”.
- **No celular:** barra inferior (Painel, Ensaios, Acompanhamentos, Pendências) e a folha “Mais”, agrupada por seção.
- **Busca:** o campo diz “Buscar nesta organização”. A busca já era restrita à organização pela RLS.
- **Demonstração:** faixa fixa `AMBIENTE DE DEMONSTRAÇÃO | DADOS SIMULADOS`.

## 3. Painéis

| Modo | Rota | Para quê |
| --- | --- | --- |
| Visão geral | `/app` | 7 indicadores; cultura (clique filtra); situação por cultura; visitas realizadas × agendadas; atenção (top 5); linha do tempo; próximos acompanhamentos; situação documental; taxa de atualização; piloto |
| Gestor da fazenda | `/app/gestao` | Portfólio, problemas e decisões, evolução, administrativo e simulação de tempo (demo) |
| Operacional | `/app/painel/operacional` | Agenda da semana, visitas devidas, pendências por responsável e prioridade, prazos, ensaios sem registro (critério `?dias=`), mapa de calor semanal, cronograma previsto × registrado |
| Técnico-científico | `/app/painel/tecnico` | Uma variável de um ensaio por vez, metodologia, pontos por tratamento (cada repetição; sem média nem teste), qualidade dos registros |
| Documentos e aprovações | `/app/painel/documentos` | Funil de etapas, taxa de aprovação e tempo até a decisão (com n), arquivos por autorização |

O donut de status não foi incluído porque repetiria a barra empilhada. No lugar, o painel mostra a taxa de cumprimento de visitas.

### Matriz de indicadores

| Indicador | Fonte | Fórmula | Unidade | Autorização | Novo campo? |
| --- | --- | --- | --- | --- | --- |
| Total / em andamento / concluídos | `experiments` | contagem por `fase` | ensaios | RLS do perfil | não |
| Em atraso | `visit_schedules`, `calendar_events`, `tasks` | ensaios ativos com ≥ 1 item vencido não cumprido | ensaios | RLS | `calendar_events` |
| Ocorrências abertas | `experiment_incidents` | status ∈ {aberta, em_acompanhamento} | ocorrências | RLS por ensaio | não |
| Visitas (30 dias) | `visit_schedules` | planejada/confirmada com data ∈ [ref, ref + 30] | visitas | RLS | não |
| Pendências abertas | `tasks` | status ∉ {concluída, cancelada} | pendências | RLS | não |
| Cumprimento de visitas | `visit_schedules` | realizadas ÷ (vencidas − canceladas) | % | RLS | não |
| Tempo de resolução | `experiment_incidents` | mediana(resolvida − detectada), com n | dias | RLS | não |
| Taxa de atualização | `experiments`, `visit_records` | regra do piloto (já existente) | % | RLS | não |
| Taxa de aprovação | `approval_requests`, `approval_decisions` | liberados na revisão final ÷ submetidos à conferência | % | RLS | não |
| Tempo até decisão | `approval_requests` | mediana(concluída − criada), com n | dias | RLS | não |
| Simulação de tempo | `demo_time_assumptions` | Σ vezes × (antes − Bento) | min/mês | só demo | não |

As definições completas estão em `src/lib/metricas.ts` e aparecem na tela em “Como é calculado”.

Regras de cálculo:

- Sem base de cálculo, o painel mostra “Dados insuficientes”.
- Nulos nunca viram zero.
- Os filtros se aplicam igualmente a cards, gráficos e tabelas.
- As agregações acontecem no servidor (`src/lib/painel.ts` e `src/lib/gestao.ts`).

## 4. Calendário (`/app/calendario`)

- **Visualizações:** mês, semana e agenda de 60 dias. Os vencidos aparecem na agenda.
- **Filtros:** ensaio, cultura, área, tipo e estado.
- **Resumo:** hoje, próximo compromisso (ou “Ainda não agendado”), vencidos, próximos 7 e 30 dias.
- **Visitas:** continuam sendo agendadas e concluídas em Acompanhamentos, onde a ficha fica vinculada à visita. Assim nada é duplicado.
- **Demais compromissos:** criar, confirmar, reagendar (com motivo), concluir (nunca em data futura, regra no banco) e cancelar (motivo obrigatório). Exige `agenda.gerenciar` (equipe), com RLS e histórico.
- **Datas sem horário:** ficam como `date`. Os horários são convertidos com o fuso America/Bahia.
- **Notificações:** só a notificação interna ao responsável. Não há lembretes agendados, porque a plataforma não tem rotina programada.

## 5. Complemento da demonstração

O arquivo `supabase/demo/bento-demo-complemento.json` é aplicado pelo mesmo `npm run demo:apply`, de forma idempotente.

- **Conteúdo:** 4 visitas futuras planejadas ou confirmadas (DEMO-004, 007, 013 e 017) e 7 compromissos. Um deles é um exercício didático já realizado: a reunião sobre a interrupção do 015, em 18/06/2026.
- **Datas:** absolutas, ancoradas na referência 15/11/2026. Nada futuro consta como realizado.
- **Validação:** feita contra o pacote principal. Ensaio inexistente ou compromisso futuro “realizado” são rejeitados.
- **Verificação:** o `demo:verify` agora confere 93 visitas realizadas, 4 planejadas, 7 compromissos e 0 realizados no futuro.
- **DEMO-EA360-006:** como já registrado em `docs/demonstracao.md`, o JSON não traz valor nulo nesse ensaio; a falha de bateria existe só como ocorrência. Nada foi inventado.

## 6. Compartilhamento externo

- **Gestão em `/app/compartilhamentos`** (admin e coordenação):
  - lista com público, criação, validade, situação (ativo, expirado ou revogado), acessos agregados e último acesso;
  - ações Pré-visualizar, Link adicional, Substituir e Desativar (com confirmação);
  - **Criar link:** assistente com nome, público, escopo (ensaios e período), seções, validade (padrão 30 dias, máximo 365) e senha opcional. Mostra um resumo do que o destinatário verá.
- **Token:** 32 bytes de CSPRNG (base64url, 43 caracteres). O banco guarda só o SHA-256, com índice único. A URL aparece uma única vez; depois, a lista oferece novo link em vez de revelar o antigo.
- **URL pública:** `/compartilhado#<token>`. O token fica no fragmento, que o navegador não envia ao servidor, então não entra em logs de acesso nem no Referer. A página busca o painel por `POST /api/compartilhado` com o token no corpo.
- **Montagem no servidor** (`src/lib/data/share.ts`):
  - resolve o hash e confere estado, validade e senha;
  - usa a organização do próprio link, nunca a da requisição, e filtra explicitamente cada consulta por ela e pelo escopo;
  - devolve um DTO mínimo, sem IDs internos, nomes de pessoas, e-mails, endereços, horários ou contatos.
- **Fora da demonstração:**
  - ensaios de acesso restrito não entram nem nas contagens;
  - resultados só aparecem se `validacao_status = validado` e com `portal` no escopo de divulgação;
  - documentos só com `divulgacao_autorizada` e o canal `portal`, em lista e sem download;
  - a simulação de tempo e a apresentação comercial ficam restritas à demonstração.
- **Na demonstração:** selo `DADOS SIMULADOS | AMBIENTE DE DEMONSTRAÇÃO` em todas as partes, e resultados rotulados como sintéticos não validados.
- **Senha:** scrypt (N = 2^15) com sal único e comparação em tempo constante. Após 5 erros, o link fica bloqueado por 15 minutos (no banco). A senha nunca vai na URL.
- **Cabeçalhos** em `/compartilhado` e `/api/compartilhado`:
  - `Cache-Control: private, no-store`;
  - `Referrer-Policy: no-referrer`;
  - `X-Robots-Tag: noindex, nofollow`.
- **Limite de requisições:** 30 por minuto por IP e instância (melhor esforço), corpo de até 2 KB e respostas neutras (“Este link está indisponível”).
- **Banco:** criação, substituição atômica e revogação por funções `SECURITY DEFINER` que conferem `is_manager`. `anon` não tem acesso a nenhuma tabela nova.
- **Exportação:** “Imprimir ou salvar PDF” só aparece se a seção “impressão” for habilitada, e imprime somente o que já está na tela.

## 7. Relatórios

`/app/gestao/relatorio?tipo=` passou a ter quatro tipos:

- `executivo`: o relatório que já existia;
- `operacional`: pendências, prazos e visitas previstas × realizadas;
- `documental`: etapas, decisões e tempos;
- `comercial`: só na demonstração, com a apresentação e a simulação.

Os filtros preservam o tipo, e cada relatório traz período, organização, momento da geração, filtros e origem. A página `/app/relatorios` ganhou atalhos para os quatro tipos. O relatório por ensaio continua sendo a ficha PDF e a aba “Evolução e ocorrências”.

## 8. Permissões novas

| Permissão | Papéis | Também no banco |
| --- | --- | --- |
| `agenda.gerenciar` | admin, coordenação, estudante, editor | RLS `calendar_insert/update` (`is_team`) |
| `compartilhamentos.gerenciar` | admin, coordenação | `share_link_create/revoke` (`is_manager`), RLS de leitura |

Nenhuma permissão existente foi ampliada.

## 9. Limitações conhecidas

- O limite por IP em ambiente serverless vale por instância. O bloqueio de senha, que é por link, fica no banco.
- O caminho `/compartilhado` aparece nos logs da Vercel; o token não, porque fica no fragmento.
- Não há lembretes automáticos de compromissos, porque não existe rotina agendada. Ficam só a notificação de atribuição e os destaques de vencidos e próximos.
- O cronograma “registrado” usa a primeira e a última visita, e não marcos com data realizada, porque os ensaios demo não têm marcos.
- A taxa de aprovação e os tempos dependem de solicitações e decisões reais; na demonstração aparece “Dados insuficientes”.

## 10. Implantação (só com autorização)

1. Aplicar a migração `20261116000015_agenda_compartilhamento.sql` no Supabase de produção (`supabase db push --linked`). Ela só acrescenta estruturas.
2. Fazer o merge da branch na `main`, o que dispara o deploy da Vercel.
3. Aplicar o complemento da demonstração em produção: `npx tsx scripts/importar-demo-bento.ts --modo apply --project-ref <ref> --confirmar-remoto`. É idempotente.
4. Conferir com `--modo verify` e pelo fluxo de criar link, abrir em janela anônima e revogar.

**Rollback:**

- Reverter o merge.
- As tabelas novas podem ficar, porque nenhuma tela antiga depende delas. Se for preciso removê-las, siga o bloco “Reversão” no topo da migração.
