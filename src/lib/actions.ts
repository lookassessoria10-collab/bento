import { ZodError, type ZodType } from "zod";

export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

export class UserError extends Error {}

interface DbError {
  message?: string;
  code?: string;
  details?: string | null;
}

/** Traduz erros do banco para mensagens seguras em português (sem detalhes internos). */
export function dbMessage(error: DbError | null | undefined): string {
  if (!error) return "Erro desconhecido.";
  const msg = error.message ?? "";
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) {
    // mensagens das nossas RPCs já são em português e seguras
    return /[ãçéêíóú]|Sem permissão|exige|Somente|não pode/i.test(msg) && !/row-level/i.test(msg)
      ? msg
      : "Você não tem permissão para esta operação.";
  }
  if (error.code === "23505") return "Já existe um registro com estes dados.";
  if (error.code === "23503") return "Registro vinculado inválido ou inexistente.";
  if (error.code === "23514") return "Os dados não atendem às regras de validação (verifique campos obrigatórios).";
  if (error.code === "P0002" || error.code === "22023" || error.code === "54000") return msg;
  if (error.code === "PGRST116") return "Registro não encontrado ou sem acesso.";
  if (/[ãçéêíóú]/.test(msg)) return msg;
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function assertOk<T>(res: { data: T; error: DbError | null }): NonNullable<T> {
  if (res.error) throw new UserError(dbMessage(res.error));
  // operações sem retorno (insert/update sem select) devolvem null: tratamos como sucesso
  return (res.data ?? ([] as unknown)) as NonNullable<T>;
}

export function parseForm<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export async function run(fn: () => Promise<ActionResult | void>, success = "Salvo com sucesso."): Promise<ActionResult> {
  try {
    const r = await fn();
    return r ?? { ok: true, message: success };
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) {
        const k = issue.path.join(".");
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return { ok: false, message: "Revise os campos destacados.", fieldErrors };
    }
    if (e instanceof UserError) return { ok: false, message: e.message };
    // erros de navegação (redirect) devem propagar
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[bento] erro em ação:", e instanceof Error ? e.message : "desconhecido");
    return { ok: false, message: "Não foi possível concluir a operação. Tente novamente." };
  }
}

/** Converte FormData em objeto simples (campos repetidos viram array). */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const val = typeof v === "string" ? v : v;
    if (k in out) {
      const cur = out[k];
      out[k] = Array.isArray(cur) ? [...cur, val] : [cur, val];
    } else out[k] = val;
  }
  return out;
}
