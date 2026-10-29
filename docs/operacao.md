# Guia rápido de operação

## Primeiro uso (produção, sem dados fictícios)

O banco de produção nasce apenas com: organização Entomo Agro 360, configurações, situação institucional “Em alinhamento”, Fazenda Meraki (adesão pendente), as quatro pessoas citadas na proposta (sem e-mail e sem conta; orientador “pendente de confirmação”), marcos dos meses 1–6, roteiro padrão de visita e rotina mensal. **Nenhum experimento, resultado ou publicação.**

1. Administrador entra (criado via `bootstrap:admin`) → Configurações: início real do piloto.
2. Equipe → Convidar (e-mail real + papel) → enviar o link por canal institucional.
3. Configurações › Fazenda e áreas: cadastrar talhões/setores.
4. Equipe › Pessoas: cadastrar pesquisadores (com ou sem conta).
5. Experimentos › Novo: cadastrar com fonte, informante e data. Vincular o pesquisador como “proprietário” em Participantes (com conta) para que ele valide.
6. Visitas › Agendar → realizar → fichas → conferência.
7. Resultados → conferência → validação do responsável.
8. Editorial → pauta/boletim/dossiê → fixar versão → conferência → validação → revisão final → PDF final → registrar publicação.

## Estudantes

- Registre só o que foi informado; deixe em branco o resto (“Não informado”).
- Separe **relato do pesquisador** de **observação direta**.
- Fotos exigem legenda, autoria e data; autorização de uso define onde podem aparecer.
- Você não confere nem libera o que você mesma redigiu.
- Rascunhos de formulários ficam guardados nesta aba enquanto não salvos (aviso amarelo); salve no servidor quando houver conexão.

## Pesquisadores

- Você vê apenas experimentos em que participa.
- Resultados: “Validar esta versão” e escolha os canais autorizados. Correções posteriores exigem nova validação.
- Revisões e aprovações: valide ou devolva com justificativa os conteúdos que citam seus estudos.

## Professor orientador / coordenação

- Revisão final: escolha canais por versão; o sistema bloqueia se faltar validação ou autorização de imagem.
- Revogue publicações com motivo e errata quando necessário.
- Registre autorizações institucionais com documento comprobatório.

## Ambiente local (desenvolvimento)

- `npx supabase start` sobe tudo nas portas 557xx (API 55721, banco 55722, e-mails de teste em http://127.0.0.1:55724).
- Usuários de teste: `*@bento.local`, senha `bento-local-123` (somente local; o seed não roda em produção e se recusa a rodar se houver experimentos reais).
- `npm run db:reset` recria o banco; rode antes de `npm run test:integration` e `npm run test:e2e` para resultados reprodutíveis.

## Começar a cadastrar dados reais sem usar os fictícios

Os dados fictícios existem **só** no Supabase local. Em produção (`supabase db push`) o seed não é aplicado. Se algum registro fictício for criado por engano, ele aparece com o selo “Dados ilustrativos” e pode ser arquivado.
