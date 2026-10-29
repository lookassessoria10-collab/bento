# Segurança, privacidade e material público

## Camadas

1. **Auth**: e-mail/senha e link mágico (Supabase Auth); cadastro público desativado; contas só por convite (token aleatório de 256 bits, banco guarda apenas o SHA-256, validade de 7 dias, reenvio invalida o anterior, revogação). Senha mínima de 10 caracteres com letras e números.
2. **Sessão**: cookies httpOnly via `@supabase/ssr`; `src/proxy.ts` renova a sessão e redireciona `/app` sem login; `/app` com `Cache-Control: private, no-store` e `X-Robots-Tag: noindex`.
3. **RLS** em todas as tabelas, deny-by-default; políticas por organização, papel e participação no experimento.
4. **RPCs** `SECURITY DEFINER`, `search_path=''`, checagens explícitas, EXECUTE revogado de `anon`/`public` (exceto feedback público).
5. **Gatilhos de proteção**: situação, autoria, código, versão de arquivo e caminhos não são alteráveis por clientes; registros imutáveis (versões, decisões, documentos gerados).
6. **Servidor**: Server Actions validam entrada com Zod, verificam sessão e traduzem erros sem expor detalhes.

## Storage

- Bucket único **privado** `bento-privado` (limite 50 MB, lista de MIME permitidos; SVG/HTML/executáveis bloqueados).
- Caminhos `{org}/arquivos/{uuid}-{nome-sanitizado}`; envio só na pasta da própria organização; sem UPDATE/DELETE (originais nunca sobrescritos; novas versões com motivo).
- Leitura só se o registro em `files`/`generated_documents` for visível pela RLS; URLs assinadas de 60–120 s geradas após a checagem.
- Visitante anônimo: somente PDF de publicação **ativa** em portal **ativado** (política específica). O bucket nunca é público.

## Material público

- Portal desativado por padrão; antes da ativação, a home mostra apenas apresentação genérica, sem indexação.
- O portal lê só `public_publications` (snapshot liberado, sem fontes/ids internos/caminhos). Revogação tem efeito imediato.
- Contatos, telefones e coordenadas ficam em tabelas/colunas restritas e nunca entram em snapshot.
- Marcas institucionais só com configuração explícita e autorização registrada (com documento) em Configurações.

## Outras proteções

- XSS: nenhum HTML de usuário é renderizado (texto puro estruturado).
- CSRF: Server Actions do Next verificam origem; logout via POST.
- IDOR: toda leitura passa pela RLS; ids na URL não concedem acesso.
- Upload: extensão × MIME × tamanho validados no cliente e no servidor + bucket.
- CSV: neutralização de injeção de fórmulas.
- Feedback público: consentimento obrigatório, honeypot, limite de 5/hora por hash diário (IP + sal; IP não é armazenado), moderação.
- Enumeração de usuários: login e recuperação com mensagens genéricas.
- Logs: em desenvolvimento, apenas código/mensagem de erros de consulta; nada de tokens ou conteúdo.
- Cabeçalhos: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## LGPD

Minimização (dados mínimos de pessoas; contatos separados), finalidade (acompanhamento e divulgação autorizada), controle de acesso, transparência (página de privacidade), correção/exclusão sob solicitação respeitando a integridade científica (autoria e decisões preservadas com acesso restrito).

## Bugs de segurança encontrados e corrigidos durante os testes

1. `can_validate_experiment` retornava NULL para não membros → `IF NOT NULL` não bloqueava: uma estudante conseguia validar. Corrigido com `coalesce` (migration 11) + teste.
2. Revisor científico designado nulo também liberava a validação de conteúdo sem experimento. Corrigido (`private.is_designated`) + teste de regressão.
