# Fluxos

## Visita e ficha de acompanhamento

1. **Planejar**: agendamento com data/hora (America/Bahia), local, interlocutores, estudantes, roteiro e experimentos. Uma ficha por experimento (`unique(visit_id, experiment_id)`).
2. **Realizar**: situação da visita → `realizada`. Adiar/cancelar exige motivo; visita adiada nunca conta como realizada.
3. **Preencher**: relato do pesquisador (com informante identificado) e observação direta das estudantes em campos distintos; roteiro; pendências → atividades vinculadas.
4. **Enviar** (`visit_record_transition('enviar')`): só com visita realizada e informante identificado quando há ocorrência relatada.
5. **Conferir**: outra pessoa (equipe ou responsável do experimento). Devolver exige motivo e notifica o autor.
6. **Finalizar**: ficha fica imutável. PDF da ficha disponível em qualquer etapa (marca de rascunho até finalizar).

Indicador mensal: elegíveis = experimentos ativos, não arquivados, periodicidade mensal/quinzenal, iniciados até o fim do mês e não encerrados antes do mês; atualizados = ficha enviada com visita no mês. Fórmula, numerador e denominador são exibidos no painel e nos relatórios (`src/lib/metrics.ts`).

## Resultados recebidos

Registro descritivo → **conferência** (equipe, ≠ autor) → **validação** pelo responsável do experimento, que define o escopo (boletim, dossiê, Instagram, portal). Alterar síntese/variável/unidade/período/limitações cria nova versão da interpretação e anula conferência e validação.

## Revisão editorial (pautas, Instagram, boletins, dossiês, relatório do piloto)

```
rascunho ──submit_for_review──▶ em_conferencia ──(equipe ≠ autor)──▶ aguardando_validacao ──(responsável)──▶ validado ──(coordenação ≠ autor)──▶ liberado ──register_publication──▶ publicado
                                     │ conteúdo institucional (sem ciência) ─────────────▶ aguardando_revisao_final ─┘
qualquer etapa ── ajustes/rejeição (justificativa) ──▶ devolvido ──▶ (novo envio = nova versão)
publicado ── revoke_publication (motivo, errata) ──▶ revogado
```

- O envio fixa um **snapshot imutável** (hash SHA-256). Todas as decisões referenciam a versão.
- Editar após o envio → volta a rascunho; liberações da versão anterior não valem para a nova.
- **Liberação** verifica, por canal: validação científica da versão; cada resultado citado validado e autorizado para o canal; cada arquivo/imagem com “divulgação autorizada” para o canal; foto com legenda e autoria.
- **PDF final** só de versão liberada; armazenado no Storage com sha256 em `generated_documents`. PDF de rascunho leva marca d’água e não é armazenado.
- **Publicado** exige registro explícito (canal liberado, data real, link, responsável). Gerar PDF não publica.
- **Portal**: a publicação no canal “portal” cria `public_publications` (snapshot sem fontes internas). Nova publicação do mesmo conteúdo substitui a anterior; revogar remove do portal e do PDF público imediatamente.

## Boletim

Edição com número, período, equipe, capa e as 7 seções do pré-projeto (reordenáveis). Seções científicas precisam citar experimento/resultado. Pré-visualização em PDF do rascunho a qualquer momento.

## Dossiê

Assistente: período/escopo → seleção humana de experimentos → revisão de lacunas (fonte ausente, não validado, sem autorização, desatualizado) → síntese → aprovação/PDF. Na finalidade “divulgação”, o snapshot inclui apenas resultados validados para dossiê e arquivos autorizados; contatos e coordenadas nunca entram.

## Instagram

Pautas com formato, texto do card, legenda (contador 2.200), CTA, hashtags, referências e créditos; checklist visual; aprovação por versão; registro manual da publicação; métricas inseridas manualmente com data de referência; repositório de dúvidas sem dados pessoais.

## Importação

CSV/XLSX → mapeamento de colunas → validação no servidor → duplicatas **apenas por código institucional** → confirmação. Colunas sem campo equivalente são preservadas em observações. Lote registrado (arquivo, usuário, data, relatório linha a linha) e pode ser desfeito se não houver vínculos.
