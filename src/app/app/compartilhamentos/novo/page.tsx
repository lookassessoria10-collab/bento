import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { parseFilters } from "@/lib/gestao";
import { SHARE_TEMPLATES, shareConfigSchema, type SharePublico } from "@/lib/share";
import { PageHeader } from "@/components/ui";
import { DemoSeal } from "../../gestao/componentes";
import { ShareForm, type ShareFormDefaults } from "../share-form";

export const metadata: Metadata = { title: "Criar link de compartilhamento" };

export default async function NovoCompartilhamento({ searchParams }: PageProps<"/app/compartilhamentos/novo">) {
  const ctx = await requirePermission("compartilhamentos.gerenciar");
  const sp = await searchParams;
  const origemId = typeof sp.origem === "string" && /^[0-9a-f-]{36}$/.test(sp.origem) ? sp.origem : null;
  const substituir = sp.substituir === "1";
  const f = parseFilters(sp);

  const [{ data: exps }, { data: origem }] = await Promise.all([
    ctx.supabase.from("experiments").select("id, codigo, titulo, nivel_acesso, culturas").eq("organization_id", ctx.orgId).is("archived_at", null).order("codigo").limit(2000),
    origemId ? ctx.supabase.from("dashboard_share_links").select("id, nome, publico, config, status").eq("id", origemId).eq("organization_id", ctx.orgId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cfg = origem ? shareConfigSchema.safeParse(origem.config) : null;
  const publico: SharePublico = (origem?.publico as SharePublico) ?? (ctx.orgIsDemo ? "demonstracao_comercial" : "gestor_fazenda");
  // vindo do painel: os filtros de cultura/período viram o escopo inicial
  const fromPanel = !origem && (f.cultura || f.de || f.ate);
  const defaults: ShareFormDefaults = {
    nome: origem ? `${origem.nome}${substituir ? "" : " (cópia)"}` : "",
    publico,
    titulo: cfg?.success ? cfg.data.titulo : ctx.orgIsDemo ? "Bento — demonstração da plataforma" : `Acompanhamento — ${ctx.orgNome}`,
    subtitulo: cfg?.success ? cfg.data.subtitulo : ctx.orgNome,
    secoes: cfg?.success ? cfg.data.secoes : SHARE_TEMPLATES[publico],
    experimentos: cfg?.success ? cfg.data.experimentos : fromPanel && f.cultura ? (exps ?? []).filter((e) => e.culturas.includes(f.cultura)).map((e) => e.id) : [],
    de: cfg?.success ? (cfg.data.de ?? "") : f.de,
    ate: cfg?.success ? (cfg.data.ate ?? "") : f.ate,
    validade_dias: 30,
    substitui: origem && substituir && origem.status === "ativo" ? origem.id : null,
    origem: origem && !substituir ? origem.id : null,
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/app/compartilhamentos", label: "Compartilhamentos" }, { label: defaults.substitui ? "Substituir link" : origem ? "Link adicional" : "Criar link" }]}
        title={defaults.substitui ? "Substituir link" : origem ? "Link adicional com a mesma configuração" : "Criar link de compartilhamento"}
        description={
          defaults.substitui
            ? "Um token novo será criado e o link anterior será revogado no mesmo instante (operação única no banco)."
            : "Cada link tem token próprio, independente dos demais. Confira o resumo antes de gerar."
        }
      />
      {ctx.orgIsDemo && <DemoSeal className="mb-4" />}
      <ShareForm
        defaults={defaults}
        isDemo={ctx.orgIsDemo}
        orgNome={ctx.orgNome}
        experiments={(exps ?? []).map((e) => ({ id: e.id, label: `${e.codigo} · ${e.titulo}`, restrito: e.nivel_acesso === "privado_equipe" }))}
      />
    </>
  );
}
