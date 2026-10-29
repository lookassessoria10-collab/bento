# Pendências que dependem de ação externa

| # | Pendência | Quem | Ação exata |
|---|---|---|---|
| 1 | Projeto Supabase de produção | Responsável técnico do projeto | Criar projeto, `supabase link` + `supabase db push`, configurar Auth (sign-up desativado, Site/Redirect URLs, senha ≥10) — ver docs/deploy.md §2 |
| 2 | Repositório GitHub `bento-entomoagro360` | Responsável pela conta GitHub | `gh repo create bento-entomoagro360 --private --source . --push` |
| 3 | Projeto Vercel conectado | Responsável pela conta Vercel | Importar o repositório e definir as 5 variáveis (docs/deploy.md §3); depois executar a verificação mínima de produção |
| 4 | Primeiro administrador | Quem administra o Supabase | `npm run bootstrap:admin -- --email <e-mail real> --nome "<nome>"` |
| 5 | SMTP próprio | Responsável institucional/TI | Configurar em Supabase Auth › SMTP para recuperação de senha e links mágicos confiáveis |
| 6 | E-mails reais da equipe | Coordenação | Convidar Jucileide de Campos, Ananda Reis, Sofia Mota e o professor Marco Antonio Tamai (após confirmação do papel) |
| 7 | Adesão formal da Fazenda Meraki | Coordenação / fazenda | Registrar em Configurações › Situação institucional com documento |
| 8 | Uso de marcas (fazenda, UNEB) | Coordenação / instituições | Idem; só então habilitar “Exibir marcas institucionais” e enviar logotipos autorizados |
| 9 | Enquadramento como extensão | UNEB | Idem (credenciamento_extensao) |
| 10 | Autorização de publicação e ativação do portal | Coordenação | Registrar autorização; ativar “Portal público” e, se desejado, o feedback |
| 11 | Acesso à base original de cadastros | Fazenda | Registrar autorização; usar Experimentos › Importar |
| 12 | Backup gerenciado | Responsável financeiro | Plano Supabase Pro para backups diários, ou rotina de `supabase db dump` (docs/deploy.md) |
| 13 | Integração Instagram (opcional, futura) | Coordenação | Exige app Meta aprovado e credenciais; hoje a publicação e as métricas são manuais por decisão de escopo |

Nada acima foi simulado: não há URL de produção, repositório remoto, conta Meta nem SMTP configurados.
