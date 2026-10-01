// ------------------------------------------------------------
// ENTRADA DECIMAL E VALIDAÇÃO SEM LIMITES TÉCNICOS INVENTADOS
// ------------------------------------------------------------
// Aceita vírgula ou ponto decimal, sem separador de milhar. Não usa parseFloat,
// que aceitaria parcialmente textos inválidos, nem transforma vazio em zero.
export function lerDecimal(texto) {
  if (typeof texto !== "string" || !/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(texto.trim())) return NaN;
  return Number(texto.trim().replace(",", "."));
}

export function validarParametros({ area, profundidade, vazios }) {
  const erros = {};
  if (!Number.isFinite(area) || area <= 0) erros.area = "Informe uma área finita maior que zero, em m².";
  if (!Number.isFinite(profundidade) || profundidade <= 0) erros.profundidade = "Informe uma profundidade finita maior que zero, em metros.";
  if (!Number.isFinite(vazios) || vazios < 0 || vazios > 1) erros.vazios = "Informe uma fração finita entre 0 e 1, inclusive.";
  return erros;
}

// ------------------------------------------------------------
// CÁLCULO DO VOLUME DAS INTERVENÇÕES
// ------------------------------------------------------------
// Nenhum arredondamento ocorre neste módulo. Zero de vazios é válido inclusive
// com entradas grandes: seu volume é zero, sem multiplicação intermediária infinita.
export function calcularVolumeIntervencao(area, profundidade, vazios) {
  if (Object.keys(validarParametros({ area, profundidade, vazios })).length) throw new Error("Parâmetros inválidos.");
  const produto = area * profundidade;
  // Se A × H transbordar, aplicar n a H primeiro pode manter o resultado final
  // representável. A fórmula continua a mesma, sem impor limites técnicos extras.
  const volume = vazios === 0 ? 0 : Number.isFinite(produto) ? produto * vazios : area * (profundidade * vazios);
  if (!Number.isFinite(volume)) throw new Error("O volume excede a capacidade numérica. Revise área e parâmetros.");
  return volume;
}

export function calcularTotalIntervencoes(intervencoes) {
  // Soma TODAS as entradas confirmadas; não reproduz o intervalo F19:F21 de F28.
  const total = intervencoes.reduce((soma, item) => soma + calcularVolumeIntervencao(item.area, item.profundidade, item.vazios), 0);
  if (!Number.isFinite(total)) throw new Error("O total excede a capacidade numérica. Revise as intervenções.");
  return total;
}
