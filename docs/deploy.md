# Implantação: GitHub, Supabase, Vercel

## 1. GitHub

```bash
gh repo create bento-entomoagro360 --private --source . --push
```
O workflow `.github/workflows/ci.yml` roda lint, tipos, unitários, integração (Supabase descartável no runner), build e E2E. Não precisa de segredos.

## 2. Supabase (produção)

1. Crie o projeto (região São Paulo recomendada) em supabase.com.
2. Vincule e aplique as migrations **sem seed**:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push        # aplica supabase/migrations; seed.sql NÃO é enviado
   ```
3. **Auth › Providers › Email**: habilite e-mail; **desative “Allow new users to sign up”** (contas só por convite).
4. **Auth › URL Configuration**: Site URL = domínio de produção; Redirect URLs = `https://<dominio>/auth/callback` e o padrão de previews da Vercel `https://*-<time>.vercel.app/auth/callback`.
5. **Auth › Password**: mínimo 10 caracteres.
6. **SMTP**: o e-mail embutido do Supabase tem limite baixo de envios. Para recuperação de senha e links mágicos confiáveis, configure SMTP próprio (Auth › SMTP). Sem SMTP, os convites funcionam por link copiado na tela de Equipe; recuperação pode falhar por limite — isso não é mascarado.
7. Storage: o bucket `bento-privado` é criado pela migration 7 (privado).
8. Primeiro administrador:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run bootstrap:admin -- --email pessoa@uneb.br --nome "Nome"
   ```
9. Tipos (opcional, após mudanças de schema): `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.

## 3. Vercel

1. Importe o repositório do GitHub (framework Next.js, sem configuração extra).
2. Variáveis por ambiente (Production e Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (**server-only**, sem `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL` (domínio canônico; em Preview, a URL do preview)
   - `FEEDBACK_HASH_SALT`
3. Deploy. **Verificação mínima de produção**: login com o admin, cadastrar um experimento (gravação), abrir a ficha PDF, gerar convite e aceitá-lo em janela anônima, confirmar que `/app` sem login redireciona.

## Custos e limites

Planos gratuitos de Supabase e Vercel atendem ao piloto (3 estudantes, dezenas de experimentos), observando: Supabase Free pausa projetos inativos e **não tem backup diário gerenciado com PITR**; e-mail embutido limitado; Storage 1 GB. Vercel Hobby é para uso não comercial; funções de PDF usam até 60 s. Domínio próprio e SMTP podem ter custo.

## Backup

- Supabase Pro: backups diários gerenciados (e PITR opcional). No Free, faça dumps periódicos:
  ```bash
  npx supabase db dump --linked -f backup-$(date +%F).sql
  npx supabase db dump --linked --data-only -f dados-$(date +%F).sql
  ```
- Arquivos do Storage: baixe periodicamente pelo painel/CLI (S3).
- Exportações CSV do app **não** são backup completo.
- Teste a restauração em um projeto separado ou no Supabase local (`psql -f`).
