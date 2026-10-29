import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold text-brand-900">Aviso de privacidade e institucional</h1>
        <p>
          O Bento é a plataforma de gestão científica do projeto acadêmico Entomo Agro 360, atualmente em fase de alinhamento institucional.
          Este aviso não declara certificações, credenciamentos ou aprovações que ainda não existam.
        </p>
        <h2 className="text-lg font-semibold">Quais dados tratamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Equipe interna: nome, e-mail de acesso, papéis e registros de autoria/auditoria necessários à integridade científica.</li>
          <li>Pesquisadores e contatos: dados mínimos de identificação; contatos ficam restritos à equipe e nunca são publicados.</li>
          <li>Público do portal: respostas anônimas de feedback, com consentimento. Não armazenamos IP; usamos um código anônimo diário apenas para limitar spam.</li>
        </ul>
        <h2 className="text-lg font-semibold">Finalidade e minimização</h2>
        <p>Os dados servem exclusivamente ao acompanhamento das pesquisas, à revisão e à divulgação autorizada. Coletamos o mínimo necessário.</p>
        <h2 className="text-lg font-semibold">Controle de acesso e segurança</h2>
        <p>
          O acesso é feito por convite, com permissões por papel e por experimento aplicadas no banco de dados. Arquivos ficam em
          armazenamento privado e só são acessados por links temporários após verificação de permissão.
        </p>
        <h2 className="text-lg font-semibold">Retenção, correção e exclusão</h2>
        <p>
          Você pode solicitar correção ou exclusão de dados pessoais à coordenação do projeto. Registros de autoria e decisões de revisão
          podem ser mantidos quando necessários à integridade científica, com acesso restrito.
        </p>
        <h2 className="text-lg font-semibold">Contato</h2>
        <p>Use o contato institucional divulgado pelo projeto. Este aviso será atualizado conforme as autorizações institucionais.</p>
      </article>
    </PublicShell>
  );
}
