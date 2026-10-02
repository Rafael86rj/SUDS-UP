import { lerDecimal, calcularTotalIntervencoes } from "../calculos/pre-dimensionamento.js";
import { validarCenario } from "./cenario-pre-dimensionamento.js";

// ------------------------------------------------------------
// DADOS DE INTERFACE DAS CONDICIONANTES, SEM CRITÉRIOS TÉCNICOS
// ------------------------------------------------------------
export const CHAVE_CONDICIONANTES = "suds-up:etapa-4:condicionantes:v1";
export const CHAVE_BACIA = "suds-up:etapa-14:bacia:v1";
export const CHAVE_CHUVA = "suds-up:etapa-15:chuva-projeto:v1";
export const GRUPOS_CONDICIONANTES = {
  urbanas: "Condicionantes urbanas gerais", ambientais: "Aspectos ambientais",
  sanitarias: "Aspectos sanitários", socioeconomicas: "Aspectos socioeconômicos"
};
export const SITUACOES_CONDICIONANTES = [
  "Não avaliada", "Sem restrição registrada", "Requer atenção", "Restrição relevante identificada"
];
export function condicionantesVazias() {
  return { versao: 1, grupos: Object.fromEntries(Object.keys(GRUPOS_CONDICIONANTES)
    .map(id => [id, { situacao: "Não avaliada", observacao: "" }])) };
}
export function validarCondicionantes(dados) {
  return Boolean(dados && dados.versao === 1 && dados.grupos && !Array.isArray(dados.grupos)
    && Object.keys(dados.grupos).length === 4 && Object.keys(GRUPOS_CONDICIONANTES).every(id => {
      const grupo = dados.grupos[id];
      return grupo && SITUACOES_CONDICIONANTES.includes(grupo.situacao) && typeof grupo.observacao === "string";
    }));
}

// ------------------------------------------------------------
// VALIDAÇÃO DOS DADOS DA BACIA, SEM CÁLCULO HIDROLÓGICO
// ------------------------------------------------------------
export const CAMPOS_BACIA = {
  areaTotal: "Área total de contribuição (m²)", areaVegetada: "Área vegetada (m²)",
  comprimentoTalvegue: "Comprimento do talvegue (m)", cotaMaxima: "Cota máxima (m)", cotaMinima: "Cota mínima (m)"
};
export function lerCamposBacia(textos) {
  // Mesma convenção decimal da Etapa 13; vazio e texto parcial nunca viram zero.
  return { versao: 1, ...Object.fromEntries(Object.keys(CAMPOS_BACIA).map(id => [id, lerDecimal(textos[id])])) };
}
export function errosBacia(dados) {
  const erros = {};
  for (const id of Object.keys(CAMPOS_BACIA)) {
    if (!Number.isFinite(dados?.[id])) erros[id] = "Informe um número finito. Use vírgula ou ponto decimal.";
  }
  if (!erros.areaTotal && dados.areaTotal <= 0) erros.areaTotal = "A área total deve ser maior que zero.";
  if (!erros.areaVegetada && dados.areaVegetada < 0) erros.areaVegetada = "A área vegetada não pode ser negativa.";
  if (!erros.areaTotal && !erros.areaVegetada && dados.areaVegetada > dados.areaTotal) erros.areaVegetada = "A área vegetada não pode exceder a área total.";
  if (!erros.comprimentoTalvegue && dados.comprimentoTalvegue <= 0) erros.comprimentoTalvegue = "O comprimento do talvegue deve ser maior que zero.";
  if (!erros.cotaMaxima && !erros.cotaMinima && dados.cotaMaxima <= dados.cotaMinima) erros.cotaMaxima = "A cota máxima deve ser maior que a cota mínima.";
  return erros;
}
export function validarBacia(dados) {
  return Boolean(dados && dados.versao === 1 && Object.keys(errosBacia(dados)).length === 0);
}

// ------------------------------------------------------------
// CONTRATO FUTURO DA CHUVA E AVALIAÇÃO COM VALORES NÃO ARREDONDADOS
// ------------------------------------------------------------
// A Etapa 15 ainda não produz este objeto. 16 e 17 apenas leem:
// { versao: 1, volumeChuvaAManejar: <número finito não negativo em m³> }.
// Zero é um resultado explícito válido, distinto de ausência; seu percentual
// não é definido. Campos extras são permitidos para futura rastreabilidade.
export function validarChuva(dados) {
  return Boolean(dados && dados.versao === 1 && Number.isFinite(dados.volumeChuvaAManejar) && dados.volumeChuvaAManejar >= 0);
}
export function avaliarCenario(cenario, chuva, variantes) {
  const pendencias = [];
  let capacidade = null;
  let demanda = null;
  if (cenario == null) pendencias.push("Nenhuma intervenção foi confirmada na Etapa 13.");
  else if (!validarCenario(cenario, variantes)) pendencias.push("Os dados do cenário da Etapa 13 são inválidos ou incompatíveis.");
  else if (!cenario.intervencoes.length) pendencias.push("Nenhuma intervenção foi confirmada na Etapa 13.");
  else capacidade = calcularTotalIntervencoes(cenario.intervencoes);
  if (chuva == null) pendencias.push("O volume de chuva ainda não foi calculado na Etapa 15.");
  else if (!validarChuva(chuva)) pendencias.push("O resultado da Etapa 15 é inválido ou incompatível.");
  else demanda = chuva.volumeChuvaAManejar;
  if (pendencias.length) return { capacidade, demanda, pendencias, atende: null, percentual: null };
  const percentual = demanda === 0 ? null : (capacidade / demanda) * 100;
  return { capacidade, demanda, pendencias, atende: capacidade >= demanda,
    percentual: Number.isFinite(percentual) ? percentual : null };
}
