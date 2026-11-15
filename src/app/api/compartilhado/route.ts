import { resolveShare } from "@/lib/data/share";

// Endpoint dedicado e somente leitura dos painéis compartilhados. O token chega no CORPO (POST), nunca na URL,
// para não aparecer em logs de acesso, histórico ou cabeçalho Referer. Respostas neutras: não revelam se a
// organização ou o link existem.
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Type": "application/json; charset=utf-8",
};

// limite simples por IP e instância (melhor esforço em ambiente serverless; o bloqueio de senha fica no banco)
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  cur.n++;
  return cur.n > 30;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return json({ estado: "limite" }, 429);
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > 2048) return json({ estado: "indisponivel" }, 413);
  let body: { token?: unknown; senha?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ estado: "indisponivel" }, 400);
  }
  const r = await resolveShare(body?.token, body?.senha);
  if (r.status === "ok") return json({ estado: "ok", painel: r.dto });
  if (r.status === "senha") return json({ estado: "senha", erro: r.erro ?? null }, 401);
  return json({ estado: "indisponivel" }, 404);
}

export function GET() {
  return json({ estado: "indisponivel" }, 405);
}
