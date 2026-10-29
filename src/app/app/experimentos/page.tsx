import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { requireContext, has } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { PHASE_LABELS, INFO_STATUS_LABELS } from "@/lib/labels";
import { listPeople } from "@/lib/data/lookups";
import { experimentFilters, queryExperiments } from "@/lib/data/experiments";
import {
  Card,
  DemoBadge,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  PrivateBadge,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
  buttonClass,
  optionsFrom,
} from "@/components/ui";

export const metadata: Metadata = { title: "Experimentos" };
const PAGE_SIZE = 20;

export default async function ExperimentsPage({ searchParams }: PageProps<"/app/experimentos">) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const f = experimentFilters(sp);

  const q = queryExperiments(ctx, f);
  const from = (f.page - 1) * PAGE_SIZE;
  const [{ data: rows, count, error }, people] = await Promise.all([q.range(from, from + PAGE_SIZE - 1), listPeople(ctx)]);

  const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  const hrefFor = (p: number) => {
    params.set("page", String(p));
    return `/app/experimentos?${params}`;
  };
  params.delete("page");
  const exportHref = `/app/experimentos/exportar?${params}`;

  return (
    <>
      <PageHeader
        title="Experimentos"
        description="Pesquisas acompanhadas pelo projeto. A situação do experimento não indica aprovação para divulgação."
        actions={
          <>
            <a className={buttonClass("secondary")} href={exportHref}>
              <Download aria-hidden className="h-4 w-4" /> Exportar CSV
            </a>
            {has(ctx, "experimentos.importar") && (
              <LinkButton href="/app/experimentos/importar">
                <Upload aria-hidden className="h-4 w-4" /> Importar
              </LinkButton>
            )}
            {has(ctx, "experimentos.criar") && (
              <LinkButton variant="primary" href="/app/experimentos/novo">
                <Plus aria-hidden className="h-4 w-4" /> Novo experimento
              </LinkButton>
            )}
          </>
        }
      />

      <Card className="mb-4 p-4">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Filtrar experimentos">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="sr-only">
              Buscar
            </label>
            <Input name="q" placeholder="Título, código ou área…" defaultValue={f.q} />
          </div>
          <div>
            <label htmlFor="fase" className="sr-only">
              Fase
            </label>
            <Select name="fase" defaultValue={f.fase} options={optionsFrom(PHASE_LABELS)} placeholder="Todas as fases" />
          </div>
          <div>
            <label htmlFor="cultura" className="sr-only">
              Cultura
            </label>
            <Input name="cultura" placeholder="Cultura (ex.: soja)" defaultValue={f.cultura} />
          </div>
          <div>
            <label htmlFor="responsavel" className="sr-only">
              Responsável
            </label>
            <Select
              name="responsavel"
              defaultValue={f.responsavel}
              options={people.filter((p) => p.tipo === "pesquisador" || p.tipo === "orientador").map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Todos os responsáveis"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ordem" className="sr-only">
              Ordenação
            </label>
            <Select
              name="ordem"
              defaultValue={f.ordem}
              options={[
                { value: "codigo", label: "Por código" },
                { value: "atualizacao", label: "Mais recentes" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="arquivados" value="1" defaultChecked={f.arquivados} className="h-4 w-4 accent-brand-700" />
              Mostrar arquivados
            </label>
            <button className={buttonClass("primary", "sm")}>Filtrar</button>
            <Link href="/app/experimentos" className="text-sm text-brand-700 hover:underline">
              Limpar filtros
            </Link>
          </div>
        </form>
      </Card>

      {error ? (
        <EmptyState title="Não foi possível carregar os experimentos.">Tente novamente em instantes.</EmptyState>
      ) : !rows?.length ? (
        <EmptyState
          title={f.q || f.fase || f.cultura ? "Nenhum experimento encontrado com esses filtros." : "Nenhum experimento cadastrado ainda."}
          action={
            has(ctx, "experimentos.criar") && (
              <LinkButton variant="primary" href="/app/experimentos/novo">
                Cadastrar o primeiro experimento
              </LinkButton>
            )
          }
        >
          Cadastre os experimentos conforme as informações fornecidas pelos pesquisadores responsáveis.
        </EmptyState>
      ) : (
        <Card>
          <Table caption="Lista de experimentos">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Título</Th>
                <Th>Responsável</Th>
                <Th>Cultura / área</Th>
                <Th>Fase</Th>
                <Th>Informações</Th>
                <Th>Atualização</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-surface-muted/60">
                  <Td className="whitespace-nowrap font-mono text-xs">
                    <Link className="font-semibold text-brand-700 hover:underline" href={`/app/experimentos/${e.id}`}>
                      {e.codigo}
                    </Link>
                    {e.codigo_institucional && <div className="text-muted">{e.codigo_institucional}</div>}
                  </Td>
                  <Td>
                    <Link className="font-medium hover:underline" href={`/app/experimentos/${e.id}`}>
                      {e.titulo_curto || e.titulo}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.is_demo && <DemoBadge />}
                      {e.nivel_acesso === "privado_equipe" && <PrivateBadge />}
                      {e.archived_at && <span className="text-xs text-muted">Arquivado</span>}
                    </div>
                  </Td>
                  <Td>{(e.people as unknown as { nome: string } | null)?.nome ?? <span className="text-muted">Não informado</span>}</Td>
                  <Td>
                    <div>{e.culturas.join(", ") || <span className="text-muted">Não informado</span>}</div>
                    <div className="text-xs text-muted">{e.area_tematica}</div>
                  </Td>
                  <Td>
                    <StatusBadge status={e.fase} label={PHASE_LABELS[e.fase]} />
                  </Td>
                  <Td className="text-xs">{INFO_STATUS_LABELS[e.disponibilidade]}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(e.updated_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="px-4 pb-4">
            <Pagination page={f.page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={hrefFor} />
          </div>
        </Card>
      )}
    </>
  );
}
