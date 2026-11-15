# Permissões

Controle por **papel na organização** (`memberships`, um usuário pode ter vários) **e** por **participação no experimento** (`experiment_members`). Fonte da verdade: funções `private.*` + RLS no banco. Espelho para a UI: `src/lib/permissions.ts`.

## Papéis na organização

| Ação | Admin | Coordenação | Pesquisador | Estudante | Editor | Leitor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Membros, convites, configurações do sistema | ✔ | | | | | |
| Situação institucional, marcos, frentes | ✔ | ✔ | | | | |
| Ver todos os experimentos (inclusive privados) | ✔ | ✔ | | | | |
| Ver experimentos de nível “equipe/colaboradores” | ✔ | ✔ | só vinculados | ✔ | ✔ | só compartilhados |
| Cadastrar experimentos / importar | | ✔ | | ✔ | | |
| Editar experimento | | ✔ | proprietário/colaborador | ✔ (não privados) | | |
| Agendar visitas, fichas, pessoas | ✔ | ✔ | | ✔ | ✔ | |
| Conferir ficha (outra pessoa) | ✔ | ✔ | proprietário/revisor | ✔ | ✔ | |
| Registrar resultados | | ✔ | proprietário/colaborador | ✔ | | |
| **Validar resultado / conteúdo científico** | | só se proprietário/revisor do experimento | proprietário/revisor | | | |
| Criar conteúdo editorial, boletim, dossiê | | ✔ | | ✔ | ✔ | |
| Conferência interna (≠ autor) | ✔ | ✔ | | ✔ | ✔ | |
| **Revisão final / liberação (≠ autor)** | | ✔ | | | com delegação | |
| Registrar publicação (versão liberada) | ✔ | ✔ | | ✔ | ✔ | |
| Revogar publicação | | ✔ | | | com delegação | |
| Auditoria | ✔ | ✔ | | | | |

Regras fixas:
- Administração não concede aprovação científica nem editorial.
- Ninguém altera o próprio vínculo nem se atribui papéis; contas só por convite (cadastro público desativado no Auth).
- Validação científica e revisão final são decisões separadas e registradas mesmo quando a mesma pessoa exerce as duas (com delegação de revisor no experimento).
- Quem redigiu a versão não confere nem libera.
- Pesquisador sem conta: validação externa registrada por membro habilitado, **com comprovante, pessoa responsável, método e data**.
- Usuário suspenso perde acesso na próxima requisição (checagem em toda política).

## Acesso por experimento

`proprietario` (responsável; valida), `revisor` (delegação de validação), `colaborador` (edita), `visualizador` (lê). Níveis do experimento: `privado_equipe` (gestão + membros), `colaboradores` e `preparado_revisao` (+ estudantes/editores). Nenhum nível torna dados públicos.

## Como é testado

- `tests/unit/permissions.test.ts` — matriz.
- `tests/integration/rls.test.ts` — isolamento entre organizações, estudo privado, leitor, contatos, códigos, autoelevação, convites, suspensão, tabelas protegidas, anônimos.
- `tests/integration/workflow.test.ts` — quem pode conferir/validar/liberar/publicar/revogar, inclusive regressões de NULL.
- `tests/integration/storage.test.ts` — leitura de arquivos segue a permissão do registro.
- `tests/e2e/smoke.spec.ts` — todas as páginas para 5 papéis sem erros.
- `tests/integration/demo.test.ts` — organização de demonstração: contagens, idempotência, isolamento (leitura, contagem, arquivos, anônimos), premissas editáveis só na demo, marcador protegido, remoção exclusiva.
- `tests/e2e/demo.spec.ts` — jornada do gestor na demonstração e regressão das apresentações públicas.

## Painel do gestor e demonstração

- `gestao.painel` (administração, coordenação): `/app/gestao`, relatório gerencial e CSV do painel (CSV também exige `relatorios.exportar_interno`). Os dados vêm das mesmas consultas sob RLS.
- `gestao.premissas_demo` (administração, coordenação): editar as premissas da estimativa de tempo **apenas** na organização de demonstração. O banco repete a regra (política `time_assumptions_update`, gatilho `t_time_assumptions_demo` e grant só nas colunas numéricas).
- Nenhuma permissão existente foi ampliada. Ver [demonstracao.md](demonstracao.md).
