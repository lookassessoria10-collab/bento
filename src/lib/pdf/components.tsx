import "server-only";
import type { ReactNode } from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer, Svg, Rect } from "@react-pdf/renderer";

export const C = {
  brand: "#1b4532",
  brand2: "#2f6f50",
  light: "#e3efe7",
  accent: "#b8862f",
  text: "#1c2321",
  muted: "#5d6762",
  border: "#d5dad0",
  danger: "#b42318",
};

export const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 60, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: C.text, lineHeight: 1.45 },
  header: { position: "absolute", top: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 },
  headerText: { fontSize: 8, color: C.muted },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.brand, marginBottom: 6 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.brand, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.text, marginTop: 8, marginBottom: 3 },
  p: { marginBottom: 6, textAlign: "justify" },
  small: { fontSize: 8, color: C.muted },
  label: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 10, marginBottom: 5 },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  watermark: { position: "absolute", top: 330, left: 60, fontSize: 70, color: "#b4231822", transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
  cover: { padding: 0, fontFamily: "Helvetica" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border, paddingVertical: 3 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.muted },
});

export interface DocMeta {
  titulo: string;
  identificador: string; // ex.: "Boletim nº 1 · versão 3"
  geradoPor: string;
  geradoEm: string; // ISO
  rascunho: boolean;
  assinatura?: string;
  demo?: boolean;
}

function fmtTs(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function Mark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="2" y="2" width="28" height="28" rx="7" fill={C.brand} />
      <Rect x="7" y="7" width="8" height="8" rx="2" fill={C.light} />
      <Rect x="17" y="7" width="8" height="8" rx="2" fill={C.accent} />
      <Rect x="7" y="17" width="18" height="3" rx="1.5" fill={C.light} />
      <Rect x="7" y="22" width="12" height="3" rx="1.5" fill={C.light} />
    </Svg>
  );
}

export function BentoPage({ meta, children }: { meta: DocMeta; children: ReactNode }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={s.header} fixed>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Mark size={14} />
          <Text style={s.headerText}>Bento · {meta.assinatura ?? "Gestão científica | Entomo Agro 360"}</Text>
        </View>
        <Text style={s.headerText}>{meta.titulo}</Text>
      </View>
      {meta.rascunho && (
        <Text style={s.watermark} fixed>
          RASCUNHO INTERNO
        </Text>
      )}
      {meta.demo && (
        <Text style={{ ...s.small, color: C.danger, marginBottom: 6 }}>Contém dados ilustrativos (fictícios) de demonstração.</Text>
      )}
      {children}
      <View style={s.footer} fixed>
        <Text>
          {meta.identificador} · Gerado por {meta.geradoPor} em {fmtTs(meta.geradoEm)} {meta.rascunho ? "· RASCUNHO — não divulgar" : ""}
        </Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  );
}

export function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View wrap={false}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value === null || value === undefined || value === "" ? "Não informado" : String(value)}</Text>
    </View>
  );
}

export function Paragraphs({ text }: { text?: string | null }) {
  if (!text) return <Text style={{ ...s.p, color: C.muted }}>Não informado.</Text>;
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <Text key={i} style={s.p}>
          {p}
        </Text>
      ))}
    </>
  );
}

export async function renderPdf(doc: ReactNode): Promise<Buffer> {
  return renderToBuffer(<Document>{doc}</Document>);
}

export function DocRoot({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Document title={title} author="Bento" creator="Bento — Entomo Agro 360" producer="Bento">
      {children}
    </Document>
  );
}

export async function toBuffer(doc: ReactNode) {
  // doc já deve ser um <DocRoot>
  return renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
}
