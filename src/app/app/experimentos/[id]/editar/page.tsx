import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth";
import { listFarms, listPeople, myExperimentAccess, personOptions } from "@/lib/data/lookups";
import { canWriteExperiment } from "@/lib/permissions";
import { Alert, PageHeader } from "@/components/ui";
import { ExperimentForm } from "../../experiment-form";
import { updateExperiment } from "../../actions";

export const metadata: Metadata = { title: "Editar experimento" };

export default async function EditExperimentPage({ params }: PageProps<"/app/experimentos/[id]/editar">) {
  const { id } = await params;
  const ctx = await requireContext();
  const { data: e } = await ctx.supabase.from("experiments").select("*").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!e) notFound();
  const access = await myExperimentAccess(ctx, id);
  const [people, farms] = await Promise.all([listPeople(ctx), listFarms(ctx)]);
  return (
    <>
      <PageHeader
        title={`Editar ${e.codigo}`}
        breadcrumbs={[
          { href: "/app/experimentos", label: "Experimentos" },
          { href: `/app/experimentos/${id}`, label: e.codigo },
          { label: "Editar" },
        ]}
      />
      {!canWriteExperiment(ctx.roles, e.nivel_acesso, access) ? (
        <Alert tone="warning" title="Somente leitura">
          Você pode consultar este experimento, mas não tem permissão para editá-lo.
        </Alert>
      ) : (
        <ExperimentForm action={updateExperiment} experiment={e} people={personOptions(people)} farms={farms} />
      )}
    </>
  );
}
