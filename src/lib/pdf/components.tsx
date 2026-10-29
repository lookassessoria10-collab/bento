import "server-only";
import type { ReactNode } from "react";
import { ClipPath, Ellipse, Defs, Document, G, Page, Path, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";

export const C = {
  brand: "#165D3B",
  brand2: "#3E9B5F",
  light: "#E2F0E4",
  accent: "#A7D572",
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

export function Mark({ size = 18, gap = "#ffffff" }: { size?: number; gap?: string }) {
  // mesma marca vetorial da plataforma (B com folha e faixas de cultivo)
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <ClipPath id="pdf-b">
          <Path d="M24 8H62V54H80C98 54 112 67 112 84C112 100 98 112 80 112H24C15 112 8 105 8 96V24C8 15 15 8 24 8Z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#pdf-b)">
        <Rect x="0" y="0" width="120" height="120" fill="#165D3B" />
        <Ellipse cx="6" cy="120" rx="110" ry="70" fill="#A7D572" />
        <Ellipse cx="6" cy="120" rx="86.9" ry="55.3" fill={gap} />
        <Ellipse cx="6" cy="120" rx="84.15" ry="53.55" fill="#3E9B5F" />
        <Ellipse cx="6" cy="120" rx="66" ry="42" fill={gap} />
        <Ellipse cx="6" cy="120" rx="63.25" ry="40.25" fill="#2A7F4F" />
        <Ellipse cx="6" cy="120" rx="47.3" ry="30.1" fill={gap} />
        <Ellipse cx="6" cy="120" rx="44.55" ry="28.35" fill="#1D6B42" />
      </G>
      <Path d="M58 56C58 30 76 12 108 10C110 40 90 56 58 56Z" fill="#A7D572" stroke={gap} strokeWidth={4} />
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
