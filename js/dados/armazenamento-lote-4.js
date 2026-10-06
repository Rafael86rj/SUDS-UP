// ------------------------------------------------------------
// Arquivo: js/dados/armazenamento-lote-4.js — 06/10/2026
// Objetivo: Consultar chuva confirmada com rastreabilidade da bacia atual.
// Responsabilidade: Compor leitores existentes sem apagar nem migrar dados.
// ------------------------------------------------------------
import { lerRegistro } from "./armazenamento-lote-1.js";
import { CHAVE_BACIA, CHAVE_CHUVA, validarBacia } from "./lote-1.js";
import { validarResultadoChuva, chuvaAtual } from "./lote-4.js";

// ------------------------------------------------------------
// LEITURA ATUALIZADA COM PRESERVAÇÃO DO RESULTADO ANTIGO
// ------------------------------------------------------------
/** @returns {Object} Leitura com dados utilizáveis somente quando atuais; preservados contém o registro desatualizado, sem escrita. */
export function lerChuvaAtual() {
  const chuva = lerRegistro(CHAVE_CHUVA, validarResultadoChuva);
  if (chuva.estado !== "valido") return chuva;
  const bacia = lerRegistro(CHAVE_BACIA, validarBacia);
  if (!chuvaAtual(chuva.dados, bacia.dados)) return { ...chuva, estado: "desatualizado", dados: null, preservados: chuva.dados,
    mensagem: "Chuva desatualizada ou sem rastreabilidade da bacia atual. Confirme a Etapa 14 e recalcule na Etapa 15. O resultado anterior foi preservado." + (bacia.mensagem ? ` ${bacia.mensagem}` : "") };
  return chuva;
}
