import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listFarms, listPeople, personOptions } from "@/lib/data/lookups";
import { PageHeader } from "@/components/ui";
import { ExperimentForm } from "../experiment-form";
import { createExperiment } from "../actions";

export const metadata: Metadata = { title: "Novo experimento" };

export default async function NewExperimentPage() {
  const ctx = await requirePermission("experimentos.criar");
  const [people, farms] = await Promise.all([listPeople(ctx), listFarms(ctx)]);
  return (
    <>
      <PageHeader
        title="Novo experimento"
        breadcrumbs={[{ href: "/app/experimentos", label: "Experimentos" }, { label: "Novo" }]}
        description="Registre as informações fornecidas pelo pesquisador responsável, com fonte e data."
      />
      <ExperimentForm action={createExperiment} people={personOptions(people)} farms={farms} />
    </>
  );
}
