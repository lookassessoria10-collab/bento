import type { Metadata } from "next";
import { requireContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Guia de uso" };

const GUIDES: { titulo: string; para: string; passos: string[] }[] = [
  {
    titulo: "Estudantes / equipe executora",
    para: "estudante",
    passos: [
      "Cadastre experimentos com fonte, informante e data da informação. Deixe em branco o que não foi informado.",
      "Agende visitas vinculando os experimentos; cada um ganha sua ficha.",
      "Após a visita, marque-a como realizada, preencha as fichas separando relato do pesquisador e observação direta, e envie para conferência.",
      "Outra pessoa da equipe confere a ficha; pendências viram atividades.",
      "Registre resultados exatamente como recebidos; o responsável valida e define onde podem ser divulgados.",
      "No editorial, monte pautas, boletins e dossiês e fixe a versão para revisão. Você não pode liberar o que redigiu.",
    ],
  },
  {
    titulo: "Pesquisadores responsáveis",
    para: "pesquisador",
    passos: [
      "Você vê os experimentos em que participa. Resultados de outros estudos não aparecem para você.",
      "Em Resultados, valide as sínteses do seu experimento e escolha os canais autorizados.",
      "Em Revisões e aprovações, valide cientificamente conteúdos que citam seus estudos — ou devolva com justificativa.",
    ],
  },
  {
    titulo: "Coordenação / professor orientador",
    para: "coordenacao",
    passos: [
      "Acompanhe o panorama na Visão geral e nos Relatórios.",
      "Faça a revisão final e autorize canais específicos para cada versão (a liberação é bloqueada se faltar validação ou autorização de imagem).",
      "Registre autorizações institucionais em Configurações › Situação institucional, sempre com documento.",
      "Revogue publicações quando necessário, com motivo e errata.",
    ],
  },
  {
    titulo: "Administração do sistema",
    para: "admin",
    passos: [
      "Convide membros e atribua papéis; suspenda acessos sem apagar autoria.",
      "Configure o início real do piloto, limites de upload e a ativação do portal público (somente após autorização).",
      "Administração não concede aprovação científica nem editorial.",
    ],
  },
];

export default async function HelpPage() {
  const ctx = await requireContext();
  return (
    <>
      <PageHeader title="Guia de uso" description={`Seus papéis: ${ctx.roles.map((r) => ROLE_LABELS[r]).join(", ")}. O guia completo está em docs/operacao.md.`} />
      <div className="grid gap-5 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Card key={g.titulo} className={ctx.roles.includes(g.para as never) ? "border-brand-500" : undefined}>
            <CardHeader title={g.titulo} />
            <CardBody>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {g.passos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </CardBody>
          </Card>
        ))}
        <Card className="md:col-span-2">
          <CardHeader title="Princípios de registro" />
          <CardBody>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Identifique fonte, autoria, data, status de conferência e última atualização.</li>
              <li>Distinga informação do pesquisador, observação direta da equipe e conteúdo editorial.</li>
              <li>Nunca complete dados científicos por estimativa: use “Não informado” ou “A confirmar”.</li>
              <li>Não altere arquivos originais dos pesquisadores: envie novas versões com motivo.</li>
              <li>Material público só mostra informação e imagens aprovadas para aquele uso.</li>
              <li>O Bento não substitui o caderno de campo nem as análises originais.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
