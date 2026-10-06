// ------------------------------------------------------------
// Arquivo: js/dados/lote-4.js — 06/10/2026
// Objetivo: Contratos do inventário e rastreabilidade hidrológica.
// Responsabilidade: Validação e transformações puras; sem DOM/storage.
// ------------------------------------------------------------
import { validarBacia, validarChuva, CAMPOS_BACIA } from "./lote-1.js";
import { calcularChuva, snapshotBacia } from "../calculos/chuva-projeto.js";
import { POSTOS_PLUVIOMETRICOS } from "./postos-pluviometricos.js";
export const CHAVE_MAPEAMENTO = "suds-up:etapa-5:mapeamento-tecnico:v1";
export const CATEGORIAS_MAPEAMENTO = ["Hidrografia", "Rede de drenagem", "Infraestrutura existente", "Uso do solo", "Patrimônio"];
export const METODO_CHUVA = "dissertacao-eq3-v1";

// ------------------------------------------------------------
// VALIDAÇÃO DA ENTRADA MANUAL DO INVENTÁRIO
// ------------------------------------------------------------
/** @param {Object} item Rascunho. @returns {boolean} Compatibilidade e campos obrigatórios; sem efeitos externos. */
export function validarItemMapeamento(item) {
  return Boolean(item && CATEGORIAS_MAPEAMENTO.includes(item.categoria)
    && typeof item.identificacao === "string" && item.identificacao.trim()
    && typeof item.fonte === "string" && item.fonte.trim()
    && typeof item.referenciaTemporal === "string" && typeof item.observacoes === "string" && typeof item.lacuna === "boolean");
}

// ------------------------------------------------------------
// CONTRATO VERSIONADO DO INVENTÁRIO
// ------------------------------------------------------------
/** @param {*} dados Coleção candidata. @returns {boolean} Validade incluindo IDs/números únicos e contador crescente. */
export function validarMapeamento(dados) {
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.registros) || !Number.isSafeInteger(dados.proximoNumero) || dados.proximoNumero < 1) return false;
  const ids = new Set(), numeros = new Set();
  for (const item of dados.registros) {
    if (!validarItemMapeamento(item) || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)
      || !Number.isSafeInteger(item.numero) || item.numero < 1 || item.numero >= dados.proximoNumero || numeros.has(item.numero)) return false;
    ids.add(item.id); numeros.add(item.numero);
  }
  return true;
}

// ------------------------------------------------------------
// INCLUSÃO OU EDIÇÃO SEM MODIFICAR A COLEÇÃO CONFIRMADA
// ------------------------------------------------------------
/** @param {Object} dados Coleção válida. @param {Object} entrada Campos. @param {string} id ID de edição ou novo UUID. @returns {Object} Nova coleção; preserva ID/número ao editar e lança erro em entrada inválida. */
export function salvarItemMapeamento(dados, entrada, id) {
  if (!validarMapeamento(dados) || !validarItemMapeamento(entrada)) throw new Error("Informe categoria, identificação e fonte do registro.");
  const copia = structuredClone(dados);
  const indice = copia.registros.findIndex(item => item.id === id);
  if (indice >= 0) copia.registros[indice] = { ...copia.registros[indice], ...entrada, id, numero: copia.registros[indice].numero };
  else copia.registros.push({ ...entrada, id, numero: copia.proximoNumero++ });
  if (!validarMapeamento(copia)) throw new Error("Não foi possível numerar o registro.");
  return copia;
}

// ------------------------------------------------------------
// CONSTRUÇÃO DO RESULTADO AUDITÁVEL
// ------------------------------------------------------------
/** @param {Object} bacia Fonte 14. @param {Object} parametros Modo, posto, fonte e entradas numéricas. @returns {Object} Registro completo calculado; lança erro, sem gravar. */
export function criarResultadoChuva(bacia, parametros) {
  if (!["posto", "manual"].includes(parametros.modo) || typeof parametros.nome !== "string" || !parametros.nome.trim()
    || typeof parametros.fonte !== "string" || !parametros.fonte.trim()) throw new Error("Selecione um posto ou informe identificação e fonte dos coeficientes manuais.");
  if (parametros.modo === "posto") {
    const posto = POSTOS_PLUVIOMETRICOS.find(item => item.id === parametros.postoId);
    if (!posto || ["nome", "fonte", "a", "b", "c", "d"].some(id => posto[id] !== parametros[id])) throw new Error("Selecione um posto cadastrado válido.");
  }
  return { ...parametros, versao: 1, metodo: METODO_CHUVA, baciaUtilizada: snapshotBacia(bacia), ...calcularChuva(bacia, parametros) };
}

// ------------------------------------------------------------
// LEITURA COMPATÍVEL E VALIDAÇÃO DA RASTREABILIDADE NOVA
// ------------------------------------------------------------
/** @param {*} dados Registro 15. @returns {boolean} Mantém contrato mínimo legado; no método novo, confere todos os resultados por recálculo puro. */
export function validarResultadoChuva(dados) {
  if (!validarChuva(dados)) return false;
  if (!("metodo" in dados)) return !dados.baciaUtilizada || validarBacia(dados.baciaUtilizada);
  if (dados.metodo !== METODO_CHUVA) return false;
  try {
    const recalculado = criarResultadoChuva(dados.baciaUtilizada, dados);
    const resultados = calcularChuva(dados.baciaUtilizada, dados);
    for (const id of Object.keys(resultados)) if (dados[id] !== recalculado[id]) return false;
    return true;
  } catch { return false; }
}

// ------------------------------------------------------------
// ATUALIDADE DA CHUVA EM RELAÇÃO AOS CINCO DADOS FÍSICOS
// ------------------------------------------------------------
/** @param {Object} chuva Registro preservado. @param {Object|null} bacia Fonte atual. @returns {boolean} Atual somente com snapshot válido e igual; sem escrita ou migração. */
export function chuvaAtual(chuva, bacia) {
  if (!validarBacia(bacia) || !validarBacia(chuva?.baciaUtilizada)) return false;
  return Object.keys(CAMPOS_BACIA).every(id => chuva.baciaUtilizada[id] === bacia[id]);
}
