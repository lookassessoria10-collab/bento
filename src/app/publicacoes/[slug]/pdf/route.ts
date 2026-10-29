import { NextResponse } from "next/server";
import { portalState } from "@/lib/data/portal";

// PDF público: só existe enquanto a publicação estiver ativa (RLS + política de storage para anon).
export async function GET(_req: Request, { params }: RouteContext<"/publicacoes/[slug]/pdf">) {
  const { slug } = await params;
  const st = await portalState();
  if (!st.active || !/^[a-z0-9-]{3,120}$/.test(slug)) return new NextResponse("Não encontrado", { status: 404 });
  const { data: pub } = await st.sb.from("public_publications").select("pdf_storage_path").eq("slug", slug).maybeSingle();
  if (!pub?.pdf_storage_path) return new NextResponse("Não encontrado", { status: 404 });
  const { data } = await st.sb.storage.from("bento-privado").createSignedUrl(pub.pdf_storage_path, 60);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
