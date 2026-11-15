"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, cx } from "@/components/ui";
import { DEMO_ONLY_SECOES, SHARE_PUBLICOS, SHARE_SECOES, SHARE_TEMPLATES, type ShareSecao, type SharePublico } from "@/lib/share-config";
import { createShareLink } from "./actions";

export interface ShareFormDefaults {
  nome: string;
  publico: SharePublico;
  titulo: string;
  subtitulo: string;
  secoes: ShareSecao[];
  experimentos: string[];
  de: string;
  ate: string;
  validade_dias: number;
  substitui: string | null;
  origem: string | null;
}

/** Assistente de criação: escolhas → resumo do que o destinatário verá → link exibido uma única vez. */
export function ShareForm({ defaults, isDemo, experiments, orgNome }: { defaults: ShareFormDefaults; isDemo: boolean; experiments: { id: string; label: string; restrito: boolean }[]; orgNome: string }) {
  const [publico, setPublico] = useState<SharePublico>(defaults.publico);
  const [secoes, setSecoes] = useState<ShareSecao[]>(defaults.secoes);
  const [selected, setSelected] = useState<string[]>(defaults.experimentos);
  const [validade, setValidade] = useState(defaults.validade_dias);
  const [comSenha, setComSenha] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const allowed = (Object.keys(SHARE_SECOES) as ShareSecao[]).filter((s) => isDemo || !DEMO_ONLY_SECOES.includes(s));
  const publicos = (Object.keys(SHARE_PUBLICOS) as SharePublico[]).filter((p) => isDemo || p !== "demonstracao_comercial");
  const restritos = experiments.filter((e) => e.restrito && (selected.length === 0 || selected.includes(e.id))).length;

  if (secret)
    return (
      <div className="space-y-3 rounded-2xl border border-brand-500/40 bg-brand-50 p-5">
        <p className="flex items-center gap-2 font-semibold text-brand-900">
          <ShieldCheck aria-hidden className="h-5 w-5" /> Link criado. Copie agora: por segurança ele não será exibido de novo.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={secret} aria-label="Link de compartilhamento" className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-900"
          >
            {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />} {copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
        <p className="text-xs text-muted">Quem tiver este endereço verá somente o escopo configurado, até a data de validade ou até a revogação. A senha (se houver) deve ser enviada por outro canal.</p>
        <Link href="/app/compartilhamentos" className="inline-block text-sm font-semibold text-brand-700 hover:underline">
          Voltar à lista de compartilhamentos
        </Link>
      </div>
    );

  return (
    <ActionForm action={createShareLink} onDone={(r) => r.ok && r.secret && setSecret(r.secret)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {defaults.substitui && <input type="hidden" name="substitui" value={defaults.substitui} />}
        {defaults.origem && <input type="hidden" name="origem" value={defaults.origem} />}
        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">1. Identificação</legend>
          <Field label="Nome interno" name="nome" required hint="Só aparece para a equipe. Ex.: Apresentação comercial — Estação Experimental X">
            <Input name="nome" required minLength={3} maxLength={200} defaultValue={defaults.nome} />
          </Field>
          <Field label="Título do painel externo" name="titulo" required>
            <Input name="titulo" required minLength={3} maxLength={120} defaultValue={defaults.titulo} />
          </Field>
          <Field label="Subtítulo institucional" name="subtitulo">
            <Input name="subtitulo" maxLength={200} defaultValue={defaults.subtitulo} />
          </Field>
        </fieldset>

        <fieldset className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">2. Público e modelo de visualização</legend>
          {publicos.map((p) => (
            <label key={p} className={cx("flex cursor-pointer gap-3 rounded-xl border p-3 text-sm", publico === p ? "border-brand-600 bg-brand-50" : "border-border")}>
              <input
                type="radio"
                name="publico"
                value={p}
                checked={publico === p}
                onChange={() => {
                  setPublico(p);
                  setSecoes(SHARE_TEMPLATES[p].filter((s) => allowed.includes(s)));
                }}
                className="mt-1 accent-brand-700"
              />
              <span>
                <span className="font-semibold">{SHARE_PUBLICOS[p].label}</span>
                <span className="block text-xs text-muted">{SHARE_PUBLICOS[p].desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">3. Escopo dos dados — {orgNome}</legend>
          <p className="text-xs text-muted">Somente a sua organização atual. Sem seleção, entram todos os ensaios que podem ser compartilhados{isDemo ? "" : " (ensaios de acesso restrito nunca entram)"}.</p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-2">
            {experiments.map((e) => (
              <label key={e.id} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  name="experimentos"
                  value={e.id}
                  checked={selected.includes(e.id)}
                  onChange={(ev) => setSelected((cur) => (ev.target.checked ? [...cur, e.id] : cur.filter((x) => x !== e.id)))}
                  className="accent-brand-700"
                />
                <span className={cx(e.restrito && !isDemo && "text-muted line-through")}>{e.label}</span>
                {e.restrito && !isDemo && <span className="text-[11px] text-warning-600">acesso restrito — não será exibido</span>}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Período — de" name="de">
              <Input type="date" name="de" defaultValue={defaults.de} />
            </Field>
            <Field label="até" name="ate">
              <Input type="date" name="ate" defaultValue={defaults.ate} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">4. Seções visíveis</legend>
          {allowed.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="secoes"
                value={s}
                checked={secoes.includes(s)}
                onChange={(ev) => setSecoes((cur) => (ev.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))}
                className="accent-brand-700"
              />
              {SHARE_SECOES[s]}
            </label>
          ))}
          <p className="text-xs text-muted">Resultados brutos, documentos privados e dados pessoais nunca são incluídos. Fora da demonstração, resultados e documentos só aparecem se validados e liberados para divulgação.</p>
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">5. Segurança</legend>
          <Field label="Validade (dias)" name="validade_dias" hint="Recomendado: 30 dias. Máximo: 365.">
            <Select
              name="validade_dias"
              value={String(validade)}
              onChange={(e) => setValidade(Number(e.target.value))}
              options={[7, 15, 30, 60, 90, 180, 365].map((n) => ({ value: String(n), label: `${n} dias` }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={comSenha} onChange={(e) => setComSenha(e.target.checked)} className="accent-brand-700" />
            Exigir senha (enviada por outro canal)
          </label>
          {comSenha && (
            <Field label="Senha do link" name="senha" required hint="Mínimo de 8 caracteres. Após 5 erros, o link fica bloqueado por 15 minutos.">
              <Input type="password" name="senha" minLength={8} maxLength={200} required autoComplete="new-password" />
            </Field>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-3 rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-24">
        <p className="font-display font-semibold text-brand-950">O que o destinatário verá</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            <strong>Público:</strong> {SHARE_PUBLICOS[publico].label}
          </li>
          <li>
            <strong>Organização:</strong> {orgNome} {isDemo && <span className="text-warning-600">(demonstração — selo de dados simulados em todas as telas)</span>}
          </li>
          <li>
            <strong>Ensaios:</strong> {selected.length ? `${selected.length} selecionado(s)` : "todos os compartilháveis"}
            {!isDemo && restritos > 0 && <span className="block text-xs text-warning-600">{restritos} de acesso restrito ficarão de fora.</span>}
          </li>
          <li>
            <strong>Seções:</strong> {secoes.length ? secoes.map((s) => SHARE_SECOES[s]).join("; ") : "nenhuma"}
          </li>
          <li>
            <strong>Validade:</strong> {validade} dias {comSenha && "· com senha"}
          </li>
        </ul>
        <p className="rounded-lg bg-surface-muted p-2 text-xs text-muted">
          Somente leitura, sem menu interno, sem nomes da equipe, endereços, horários ou contatos. O acesso para no instante da revogação ou da expiração.
        </p>
        <SubmitButton className="w-full">{defaults.substitui ? "Substituir link (revoga o anterior)" : "Gerar link exclusivo"}</SubmitButton>
      </aside>
    </ActionForm>
  );
}
