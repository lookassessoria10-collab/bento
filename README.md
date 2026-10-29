# Bento

**Plataforma de gestão científica do projeto Entomo Agro 360.**
Assinatura: *Gestão científica | Entomo Agro 360*.

O Bento organiza o acompanhamento de pesquisas agrícolas (Fazenda Meraki, Luís Eduardo Magalhães/BA) e a divulgação científica do projeto: experimentos, visitas mensais com fichas, resultados recebidos, biblioteca de arquivos, atividades, um motor de revisão (conferência → validação científica → revisão final) e a produção de boletins, dossiês, conteúdos de Instagram e de um portal público controlado.

> O Bento **não** substitui o caderno de campo, a condução do experimento nem as análises dos pesquisadores. Não gera interpretações, rankings ou estatísticas inferenciais. A situação institucional nasce **“Em alinhamento”**: nada no sistema afirma adesão, credenciamento ou autorização que ainda não exista.

## Stack

Next.js 16 (App Router, TypeScript estrito) · Tailwind CSS 4 · Supabase (Postgres + RLS, Auth, Storage) · Zod · @react-pdf/renderer (PDF real no servidor) · Vitest · Playwright · Vercel · GitHub Actions.

## Início rápido (local)

Pré-requisitos: Node 20.9+, Docker.

```bash
npm install
npx supabase start          # sobe Postgres/Auth/Storage locais nas portas 557xx e aplica migrations + seed
cp .env.example .env.local  # preencha com os valores exibidos por `npx supabase status`
npm run dev                 # http://localhost:3000
```

Usuários de teste do seed **local** (senha `bento-local-123`, válida apenas no Supabase local):
`admin@`, `coordenacao@`, `pesquisador@`, `pesquisador2@`, `estudante@`, `estudante2@`, `editor@`, `leitor@`, `outraorg@` — todos `@bento.local`. Os registros do seed exibem o selo **“Dados ilustrativos”**.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | App |
| `npm run lint` · `npm run typecheck` | Qualidade |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:integration` | RLS, isolamento, fluxo de aprovação e Storage contra o Supabase local |
| `npm run test:e2e` | Playwright (desktop + celular) contra `npm run dev` |
| `npm run db:reset` | Recria o banco local do zero (migrations + seed) |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` |
| `npm run bootstrap:admin -- --email x@y --nome "Nome"` | Cria o primeiro administrador em produção |

## Estrutura

```
supabase/migrations/   schema, RLS, RPCs de fluxo, Storage, configuração inicial (11 migrations)
supabase/seed.sql      dados fictícios — somente ambiente local
src/proxy.ts           sessão Supabase + checagem otimista de /app
src/lib/               auth, permissões, workflow, métricas, validação, PDF, camada de dados por domínio
src/app/app/           área autenticada (experimentos, visitas, atividades, resultados, biblioteca,
                       aprovações, editorial, relatórios, equipe, configurações, busca, notificações)
src/app/               login, convite, recuperação, portal público, privacidade, transparência
tests/unit|integration|e2e
docs/                  arquitetura, permissões, fluxos, deploy, segurança, operação, pendências reais
```

## Identidade visual

- Marca vetorial em `src/components/logo.tsx` (`BentoMark`, `Logo`), também em `public/brand/` (marca e ícone de app) e `src/app/icon.svg` (favicon).
- Paleta: `#165D3B` (verde profundo), `#3E9B5F` (verde médio), `#A7D572` (verde-lima). Tokens em `src/app/globals.css`.
- Tipografia: Outfit (títulos e números) e Plus Jakarta Sans (texto).
- Navegação: menu lateral no desktop; barra inferior com “Mais” no celular e no tablet.
- Tela de carregamento com a marca: `src/components/splash.tsx` (`app/loading.tsx` e `app/app/loading.tsx`).

## Documentação

- [docs/arquitetura.md](docs/arquitetura.md) — modelo de dados (diagrama ER) e decisões
- [docs/permissoes.md](docs/permissoes.md) — matriz de acesso e como é testada
- [docs/fluxos.md](docs/fluxos.md) — visitas, resultados, revisão e publicação
- [docs/seguranca.md](docs/seguranca.md) — RLS, Storage, material público, LGPD
- [docs/deploy.md](docs/deploy.md) — GitHub, Supabase, Vercel, SMTP, backup
- [docs/operacao.md](docs/operacao.md) — guia rápido para estudantes, pesquisadores e professor
- [docs/pendencias-reais.md](docs/pendencias-reais.md) — o que depende de credenciais/autorizações externas
