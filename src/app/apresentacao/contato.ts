// Parâmetros comerciais da apresentação (uso exclusivo de /apresentacao).
//
// Ainda não há canal comercial definido. Enquanto os campos estiverem vazios (null), as chamadas
// "Agendar uma demonstração" e "Conhecer o projeto piloto" aparecem apenas como destaque visual,
// sem link — nada de WhatsApp, e-mail ou formulário inventado.
//
// Para ativar, preencha com um endereço real e aprovado, por exemplo:
//   demonstracao: "mailto:comercial@suainstituicao.br?subject=Demonstração%20do%20Bento"
//   piloto: "https://…/piloto"
export const CONTATO_COMERCIAL: {
  /** Link para agendar uma demonstração (https://, mailto: ou tel:). */
  demonstracao: string | null;
  /** Link com informações sobre o projeto piloto. */
  piloto: string | null;
  /** Texto curto exibido abaixo das chamadas (ex.: nome e cargo de quem atende). */
  responsavel: string | null;
} = {
  demonstracao: null,
  piloto: null,
  responsavel: null,
};

const SAFE_LINK = /^(https:\/\/|mailto:|tel:)/i;

/** Retorna o link apenas se for um endereço explícito e seguro; caso contrário, null. */
export function linkComercial(v: string | null): string | null {
  const s = v?.trim();
  return s && SAFE_LINK.test(s) ? s : null;
}
