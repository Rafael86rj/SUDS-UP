// ------------------------------------------------------------
// Arquivo: js/calculos/chuva-projeto.js — 06/10/2026
// Objetivo: George Ribeiro e Equação 3 da dissertação.
// Responsabilidade: Cálculos puros com precisão integral, sem DOM/storage.
// ------------------------------------------------------------
import { validarBacia, CAMPOS_BACIA } from "../dados/lote-1.js";

// ------------------------------------------------------------
// PROTEÇÃO NUMÉRICA DOS RESULTADOS INTERMEDIÁRIOS
// ------------------------------------------------------------
/** @param {number} valor Resultado. @returns {number} Valor finito; lança erro sem efeitos externos. */
function finito(valor) {
  if (!Number.isFinite(valor)) throw new Error("O cálculo excede a capacidade numérica. Revise os parâmetros; nenhum resultado foi salvo.");
  return valor;
}

// ------------------------------------------------------------
// SNAPSHOT DOS CINCO DADOS FÍSICOS
// ------------------------------------------------------------
/** @param {Object} bacia Origem válida. @returns {Object} Cópia dos dados usados; lança erro sem alterar a origem. */
export function snapshotBacia(bacia) {
  if (!validarBacia(bacia)) throw new Error("Confirme dados válidos da bacia na Etapa 14.");
  const copia = { versao: 1 };
  for (const id of Object.keys(CAMPOS_BACIA)) copia[id] = bacia[id];
  return copia;
}

// ------------------------------------------------------------
// TEMPO DE CONCENTRAÇÃO DE GEORGE RIBEIRO
// ------------------------------------------------------------
/** @param {Object} bacia Dados físicos da Etapa 14. @returns {Object} P, L_km, S e tempos; lança erro em resultado não representável. */
export function calcularConcentracao(bacia) {
  const dados = snapshotBacia(bacia);
  const P = finito(dados.areaVegetada / dados.areaTotal);
  const L_km = finito(dados.comprimentoTalvegue / 1000);
  const S = finito(finito(dados.cotaMaxima - dados.cotaMinima) / dados.comprimentoTalvegue);
  const base = finito(100 * S);
  const denominador = finito((1.05 - 0.2 * P) * finito(base ** 0.04));
  const tcMin = finito(finito(16 * L_km) / denominador);
  const tcHoras = finito(tcMin / 60);
  if (S <= 0 || L_km <= 0 || tcMin <= 0 || tcHoras <= 0) throw new Error("Tempo ou declividade não representável. Revise os dados da bacia.");
  return { P, L_km, S, tcMin, tcHoras };
}

// ------------------------------------------------------------
// IDF ÚNICA PARA POSTOS CADASTRADOS E COEFICIENTES MANUAIS
// ------------------------------------------------------------
/** @param {number} a Coeficiente positivo. @param {number} b Expoente de TR. @param {number} c Minutos. @param {number} d Expoente. @param {number} TR Anos. @param {number} tcMin Minutos. @returns {number} Intensidade mm/h; lança erro sem efeitos externos. */
export function calcularIntensidadeIDF(a, b, c, d, TR, tcMin) {
  if (![a, b, c, d, TR, tcMin].every(Number.isFinite) || a <= 0 || TR <= 0 || tcMin <= 0) throw new Error("Informe coeficientes finitos, a positivo e TR maior que zero.");
  const base = finito(tcMin + c);
  if (base <= 0) throw new Error("A soma tc + c deve ser maior que zero.");
  // Decisão normativa: TR elevado a b, nunca o produto TR × b da planilha.
  const numerador = finito(a * finito(TR ** b));
  const denominador = finito(base ** d);
  const intensidade = finito(numerador / denominador);
  if (denominador <= 0 || intensidade < 0) throw new Error("A intensidade não é numericamente válida.");
  return intensidade;
}

// ------------------------------------------------------------
// ALTURA E VOLUME SEM ARREDONDAMENTO INTERMEDIÁRIO
// ------------------------------------------------------------
/** @param {Object} bacia Origem confirmada. @param {Object} parametros a/b/c/d/TR/runoff. @returns {Object} Resultados auditáveis; lança erro sem persistir ou alterar entradas. */
export function calcularChuva(bacia, parametros) {
  const { a, b, c, d, TR, runoff } = parametros;
  if (!Number.isFinite(runoff) || runoff < 0 || runoff > 1) throw new Error("Runoff deve ser um número entre 0 e 1.");
  const tempos = calcularConcentracao(bacia);
  const intensidade = calcularIntensidadeIDF(a, b, c, d, TR, tempos.tcMin);
  const alturaMm = finito(intensidade * tempos.tcHoras);
  const alturaM = finito(alturaMm / 1000);
  const areaUrbana = finito(bacia.areaTotal - bacia.areaVegetada);
  const volumeChuvaAManejar = finito(finito(runoff * alturaM) * areaUrbana);
  return { ...tempos, intensidade, alturaMm, alturaM, areaUrbana, volumeChuvaAManejar };
}
