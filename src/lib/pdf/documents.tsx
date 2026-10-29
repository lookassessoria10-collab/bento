import "server-only";
import { Image, Page, Text, View } from "@react-pdf/renderer";
import { BentoPage, C, DocRoot, KV, Mark, Paragraphs, s, type DocMeta } from "./components";
import { REPORT_FIELDS, type SnapshotContent, type SnapExperiment, type SnapResult } from "@/lib/snapshot";

const PHASE: Record<string, string> = { implantacao: "Em implantação", andamento: "Em andamento", concluido: "Concluído", interrompido: "Interrompido" };
const ANALYSIS: Record<string, string> = { nao_disponivel: "Não disponível", em_analise: "Em análise", preliminar: "Preliminar", final: "Final", nao_informada: "Não informada" };

function d(v?: string | null) {
  if (!v) return "Não informado";
  const [y, m, dd] = v.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
}

function ResultBlock({ r }: { r: SnapResult }) {
  return (
    <View style={s.box} wrap={false}>
      <Text style={s.h3}>
        {r.variavel}
        {r.unidade ? ` (${r.unidade})` : ""}
      </Text>
      <Text style={s.small}>
        Situação da análise: {ANALYSIS[r.situacao_analise] ?? r.situacao_analise} · Período: {d(r.periodo_inicio)} a {d(r.periodo_fim)} · Versão da interpretação: {r.versao_interpretacao}
      </Text>
      <Paragraphs text={r.sintese} />
      {r.limitacoes && <Text style={{ ...s.small, marginBottom: 3 }}>Limitações informadas: {r.limitacoes}</Text>}
      <Text style={s.small}>
        Fonte: {r.fonte ?? "Não informada"} · Fornecido em {d(r.data_fornecimento)}
        {r.referencia ? ` · Ref.: ${r.referencia}` : ""}
      </Text>
    </View>
  );
}

function ExperimentCard({ e }: { e: SnapExperiment }) {
  return (
    <View style={s.box}>
      <Text style={s.h3}>
        {e.codigo} — {e.titulo}
      </Text>
      <View style={s.row}>
        <View style={s.col}>
          <KV label="Responsável" value={e.pesquisador} />
          <KV label="Código institucional" value={e.codigo_institucional} />
          <KV label="Área temática" value={e.area_tematica} />
        </View>
        <View style={s.col}>
          <KV label="Culturas" value={e.culturas?.join(", ")} />
          <KV label="Local" value={[e.fazenda, e.area].filter(Boolean).join(" — ")} />
          <KV label="Fase" value={PHASE[e.fase] ?? e.fase} />
        </View>
        <View style={s.col}>
          <KV label="Início" value={d(e.data_inicio)} />
          <KV label="Término previsto" value={d(e.data_termino_prevista)} />
          <KV label="Término efetivo" value={d(e.data_termino_efetiva)} />
        </View>
      </View>
      <KV label="Objetivo" value={e.objetivo_geral} />
      <KV label="Método resumido" value={e.resumo_metodologico} />
      <Text style={s.small}>
        Fonte do cadastro: {e.fonte_cadastro ?? "Não informada"} · Data da informação: {d(e.data_informacao)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
export function BulletinPdf({ content, meta, images }: { content: SnapshotContent; meta: DocMeta; images: Record<string, string> }) {
  const b = content.bulletin!;
  return (
    <DocRoot title={meta.titulo}>
      <Page size="A4" style={{ ...s.cover }}>
        <View style={{ backgroundColor: C.brand, height: "100%", padding: 56, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Mark size={36} />
            <Text style={{ color: "white", fontSize: 14 }}>Entomo Agro 360</Text>
          </View>
          <View>
            <Text style={{ color: C.accent, fontSize: 12, marginBottom: 8 }}>
              BOLETIM Nº {b.numero}
              {b.volume ? ` · VOL. ${b.volume}` : ""}
            </Text>
            <Text style={{ color: "white", fontSize: 30, fontFamily: "Helvetica-Bold", marginBottom: 12 }}>{content.titulo}</Text>
            <Text style={{ color: C.light, fontSize: 11 }}>
              Período de referência: {d(b.periodo_inicio)} a {d(b.periodo_fim)}
            </Text>
            {b.capa?.id && images[b.capa.id] && (
              <View style={{ marginTop: 18 }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image não aceita alt; a legenda é impressa abaixo */}
<Image src={images[b.capa.id]} style={{ maxHeight: 260, objectFit: "cover", borderRadius: 4 }} />
                <Text style={{ color: C.light, fontSize: 7, marginTop: 3 }}>
                  {b.capa.legenda} — {b.capa.autoria}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: C.light, fontSize: 8 }}>
            {meta.identificador} · {meta.rascunho ? "RASCUNHO INTERNO — NÃO DIVULGAR" : "Versão aprovada para divulgação"}
          </Text>
        </View>
      </Page>
      <BentoPage meta={meta}>
        {b.apresentacao && (
          <>
            <Text style={s.h2}>Apresentação</Text>
            <Paragraphs text={b.apresentacao} />
          </>
        )}
        {b.sections.map((sec) => (
          <View key={sec.id} break={sec.tipo === "destaque"}>
            <Text style={s.h2}>{sec.titulo}</Text>
            {sec.experiment && (
              <Text style={s.small}>
                Experimento {sec.experiment.codigo} · Responsável: {sec.experiment.pesquisador ?? "Não informado"} · Situação: {PHASE[sec.experiment.fase] ?? sec.experiment.fase}
              </Text>
            )}
            <Paragraphs text={sec.corpo} />
            {sec.results.map((r) => (
              <ResultBlock key={r.id} r={r} />
            ))}
            {sec.files
              .filter((f) => images[f.id])
              .map((f) => (
                <View key={f.id} wrap={false} style={{ marginBottom: 8 }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image não aceita alt; a legenda é impressa abaixo */}
<Image src={images[f.id]} style={{ maxHeight: 220, objectFit: "contain" }} />
                  <Text style={s.small}>
                    {f.legenda} — Foto: {f.autoria}
                    {f.licenca ? ` · ${f.licenca}` : ""}
                  </Text>
                </View>
              ))}
            {sec.referencias && <Text style={s.small}>Referências: {sec.referencias}</Text>}
          </View>
        ))}
        {b.equipe_editorial && (
          <View wrap={false}>
            <Text style={s.h2}>Equipe editorial</Text>
            <Text style={s.p}>{b.equipe_editorial}</Text>
          </View>
        )}
        <Text style={{ ...s.small, marginTop: 12 }}>
          Este boletim reúne somente informações conferidas e aprovadas para divulgação. Não substitui os relatórios técnicos originais dos
          pesquisadores. Hash da versão: {content.__hash ?? "—"}
        </Text>
      </BentoPage>
    </DocRoot>
  );
}

// ---------------------------------------------------------------------------
export function DossierPdf({ content, meta }: { content: SnapshotContent; meta: DocMeta }) {
  const dz = content.dossier!;
  const exps = dz.experiments;
  const byPhase = exps.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.fase]: (acc[e.fase] ?? 0) + 1 }), {});
  const byCrop = exps.reduce<Record<string, number>>((acc, e) => {
    for (const c of e.culturas?.length ? e.culturas : ["Não informado"]) acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <DocRoot title={meta.titulo}>
      <BentoPage meta={meta}>
        <Text style={s.h1}>{content.titulo}</Text>
        <Text style={s.small}>
          Dossiê técnico-científico · {dz.finalidade === "divulgacao" ? "Versão autorizada de divulgação" : "Dossiê interno de trabalho"} · Período {d(dz.periodo_inicio)} a{" "}
          {d(dz.periodo_fim)}
        </Text>
        <Text style={s.h2}>Sumário</Text>
        {["1. Apresentação", "2. Escopo do levantamento", "3. Panorama dos experimentos", "4. Fichas dos experimentos", "5. Síntese do conjunto", "6. Referências"].map((x) => (
          <Text key={x}>{x}</Text>
        ))}
        <Text style={s.h2}>1. Apresentação</Text>
        <Paragraphs text={dz.apresentacao} />
        <Text style={s.h2}>2. Escopo do levantamento</Text>
        <KV label="Escopo e áreas abrangidas" value={dz.escopo} />
        <KV label="Critérios de inclusão" value={dz.criterios_inclusao} />
        <KV label="Método de coleta informacional" value={dz.metodo_coleta} />
        <Text style={s.h2}>3. Panorama do conjunto</Text>
        <Text style={s.p}>Experimentos incluídos: {exps.length}</Text>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.th}>Por fase</Text>
            {Object.entries(byPhase).map(([k, v]) => (
              <Text key={k}>
                {PHASE[k] ?? k}: {v}
              </Text>
            ))}
          </View>
          <View style={s.col}>
            <Text style={s.th}>Por cultura</Text>
            {Object.entries(byCrop).map(([k, v]) => (
              <Text key={k}>
                {k}: {v}
              </Text>
            ))}
          </View>
        </View>
        <Text style={s.h2} break>
          4. Fichas dos experimentos
        </Text>
        {exps.map((e) => (
          <View key={e.id}>
            <ExperimentCard e={e} />
            <Text style={{ ...s.th, marginBottom: 4 }}>Resultados disponíveis</Text>
            {e.results?.length ? (
              e.results.map((r) => <ResultBlock key={r.id} r={r} />)
            ) : (
              <Text style={{ ...s.small, marginBottom: 8 }}>Nenhum resultado disponível ou autorizado para este documento.</Text>
            )}
            {e.files?.length ? (
              <Text style={{ ...s.small, marginBottom: 8 }}>
                Documentos e fotografias autorizados: {e.files.map((f) => `${f.nome} (${f.autoria ?? "autoria não informada"})`).join("; ")}
              </Text>
            ) : null}
          </View>
        ))}
        <Text style={s.h2}>5. Síntese do conjunto</Text>
        <Text style={s.small}>Limitada a aspectos administrativos e descritivos verificáveis; não contém comparações científicas entre estudos.</Text>
        <Paragraphs text={dz.sintese} />
        <Text style={s.h2}>6. Referências e anexos</Text>
        <Paragraphs text={dz.referencias} />
        {content.sources.filter((x) => x.referencia).map((x, i) => (
          <Text key={i} style={s.small}>
            • {x.referencia}
          </Text>
        ))}
      </BentoPage>
    </DocRoot>
  );
}

// ---------------------------------------------------------------------------
export function GenericContentPdf({ content, meta }: { content: SnapshotContent; meta: DocMeta }) {
  const blocks = content.draft?.blocks ?? [];
  return (
    <DocRoot title={meta.titulo}>
      <BentoPage meta={meta}>
        <Text style={s.h1}>{content.titulo}</Text>
        {content.descricao && <Text style={s.small}>{content.descricao}</Text>}
        {content.draft?.relatorio &&
          REPORT_FIELDS.map(([k, l]) => (
            <View key={k}>
              <Text style={s.h2}>{l}</Text>
              <Paragraphs text={content.draft.relatorio?.[k]} />
            </View>
          ))}
        {content.draft?.instagram && (
          <View style={s.box}>
            <KV label="Texto do card" value={content.draft.instagram.texto_card} />
            <KV label="Legenda" value={content.draft.instagram.legenda} />
            <KV label="CTA" value={content.draft.instagram.cta} />
            <KV label="Hashtags" value={content.draft.instagram.hashtags} />
            <KV label="Referências" value={content.draft.instagram.referencias} />
            <KV label="Créditos" value={content.draft.instagram.creditos} />
          </View>
        )}
        {blocks.map((b, i) =>
          b.tipo === "titulo" ? (
            <Text key={i} style={s.h2}>
              {b.texto}
            </Text>
          ) : (
            <Paragraphs key={i} text={b.texto} />
          ),
        )}
        {content.sources.length > 0 && (
          <>
            <Text style={s.h2}>Fontes</Text>
            {content.sources.map((x, i) => (
              <Text key={i} style={s.small}>
                • {x.experiment ? `${x.experiment.codigo} — ${x.experiment.titulo}` : x.result ? `Resultado: ${x.result.variavel}` : x.file ? `Arquivo: ${x.file.nome}` : x.referencia}
              </Text>
            ))}
          </>
        )}
      </BentoPage>
    </DocRoot>
  );
}

// ---------------------------------------------------------------------------
export interface ExperimentSheetData {
  e: SnapExperiment & {
    descricao?: string | null;
    justificativa?: string | null;
    objetivos_especificos?: string | null;
    delineamento?: string | null;
    disponibilidade?: string;
    nivel_acesso?: string;
  };
  treatments: { codigo: string | null; descricao: string; fonte: string | null }[];
  milestones: { titulo: string; data_prevista: string | null; status: string }[];
}

export function ExperimentSheetPdf({ data, meta }: { data: ExperimentSheetData; meta: DocMeta }) {
  const { e } = data;
  return (
    <DocRoot title={meta.titulo}>
      <BentoPage meta={meta}>
        <Text style={s.h1}>
          {e.codigo} — {e.titulo}
        </Text>
        <Text style={s.small}>Ficha de uso interno. Não contém contatos nem coordenadas.</Text>
        <ExperimentCard e={e} />
        <Text style={s.h2}>Descrição e justificativa</Text>
        <Paragraphs text={e.descricao} />
        <Paragraphs text={e.justificativa} />
        <KV label="Objetivos específicos" value={e.objetivos_especificos} />
        <Text style={s.h2}>Tratamentos descritos pelo responsável</Text>
        {data.treatments.length ? (
          data.treatments.map((t, i) => (
            <Text key={i}>
              • {t.codigo ? `${t.codigo}: ` : ""}
              {t.descricao}
              {t.fonte ? ` (fonte: ${t.fonte})` : ""}
            </Text>
          ))
        ) : (
          <Text style={s.small}>Não informado.</Text>
        )}
        <Text style={s.h2}>Etapas e avaliações</Text>
        {data.milestones.length ? (
          data.milestones.map((m, i) => (
            <Text key={i}>
              • {d(m.data_prevista)} — {m.titulo} ({m.status})
            </Text>
          ))
        ) : (
          <Text style={s.small}>Não informado.</Text>
        )}
      </BentoPage>
    </DocRoot>
  );
}

// ---------------------------------------------------------------------------
export interface VisitRecordData {
  visita: { titulo: string; data_hora: string; local: string | null; status: string; interlocutores: string | null };
  experimento: { codigo: string; codigo_institucional: string | null; titulo: string; responsavel: string | null };
  participantes: string[];
  r: Record<string, string | null>;
  checklist: { item: string; resposta: string; observacao: string | null }[];
}

export function VisitRecordPdf({ data, meta }: { data: VisitRecordData; meta: DocMeta }) {
  const { r } = data;
  const dt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }).format(new Date(data.visita.data_hora));
  return (
    <DocRoot title={meta.titulo}>
      <BentoPage meta={meta}>
        <Text style={s.h1}>Ficha de acompanhamento</Text>
        <View style={s.row}>
          <View style={s.col}>
            <KV label="Experimento" value={`${data.experimento.codigo} — ${data.experimento.titulo}`} />
            <KV label="Código institucional" value={data.experimento.codigo_institucional} />
            <KV label="Responsável" value={data.experimento.responsavel} />
          </View>
          <View style={s.col}>
            <KV label="Visita" value={`${data.visita.titulo} (${dt})`} />
            <KV label="Local" value={data.visita.local} />
            <KV label="Estudantes participantes" value={data.participantes.join(", ")} />
          </View>
        </View>
        <KV label="Objetivo" value={r.objetivo} />
        <KV label="Etapa atual" value={r.etapa_atual} />
        <KV label="Atividades desde a última visita" value={r.atividades_desde_ultima} />
        <KV label="Avaliações previstas (relato do responsável)" value={r.avaliacoes_previstas} />
        <KV label="Avaliações realizadas (relato do responsável)" value={r.avaliacoes_realizadas} />
        <View style={s.box}>
          <Text style={s.th}>INFORMAÇÃO FORNECIDA PELO PESQUISADOR</Text>
          <KV label="Ocorrências relatadas" value={r.ocorrencias_relatadas} />
          <KV label="Informante" value={r.informante} />
        </View>
        <View style={s.box}>
          <Text style={s.th}>OBSERVAÇÃO DIRETA DAS ESTUDANTES</Text>
          <Paragraphs text={r.observacoes_diretas} />
        </View>
        <KV label="Resultados disponibilizados" value={r.resultados_disponibilizados} />
        <KV label="Situação da análise" value={ANALYSIS[r.situacao_analise ?? ""] ?? r.situacao_analise} />
        <KV label="Fontes" value={r.fontes} />
        <KV label="Conteúdo potencial para divulgação" value={r.conteudo_potencial} />
        <KV label="Próxima ação / responsável / prazo" value={[r.proxima_acao, r.proxima_acao_responsavel, d(r.proxima_acao_prazo)].filter(Boolean).join(" · ")} />
        <KV label="Conferência" value={`${r.status_label}${r.conferido_por ? ` por ${r.conferido_por}` : ""}${r.conferido_em ? ` em ${r.conferido_em}` : ""}${r.comentario_conferencia ? ` — ${r.comentario_conferencia}` : ""}`} />
        {data.checklist.length > 0 && (
          <>
            <Text style={s.h2}>Roteiro de verificação</Text>
            {data.checklist.map((c, i) => (
              <Text key={i}>
                [{c.resposta === "sim" ? "x" : c.resposta === "nao" ? "não" : c.resposta === "nao_se_aplica" ? "n/a" : " "}] {c.item}
                {c.observacao ? ` — ${c.observacao}` : ""}
              </Text>
            ))}
          </>
        )}
      </BentoPage>
    </DocRoot>
  );
}
