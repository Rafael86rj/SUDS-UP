// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// ------------------------------------------------------------
// Arquivo: js/dados/resumo-final.js
// Módulo: Consolidação do estudo — Lote 5
// Objetivo: Derivar resumo, disponibilidade e avaliação das fontes confirmadas.
// Responsabilidade: Leitura validada e agregação; nenhuma escrita ou migração.
// Dependências: Contratos e cálculos oficiais dos Lotes 1–4.
// Utilizado por: resumo-final-interface.js e testes/lote-5.test.mjs.
// Criado em: 07/10/2026
// Última revisão: 07/10/2026
// ------------------------------------------------------------
import { CHAVE_PONTOS, validarLevantamento } from "./pontos-alagamento.js";
import { CHAVE_CONDICIONANTES, CHAVE_BACIA, CHAVE_CHUVA, validarCondicionantes, validarBacia, avaliarCenario } from "./lote-1.js";
import { CHAVES_LOTE_2, indexarVariantes, validarColecao, colecaoVazia } from "./lote-2.js";
import { CHAVE_BACIA_MAPA, CHAVE_ESPACOS, consolidarMapa, legendaCenario } from "./lote-3.js";
import { CHAVE_MAPEAMENTO, CATEGORIAS_MAPEAMENTO, validarMapeamento } from "./lote-4.js";
import { CHAVE_CENARIO, validarCenario } from "./cenario-pre-dimensionamento.js";
import { calcularVolumeIntervencao } from "../calculos/pre-dimensionamento.js";
import { lerRegistro } from "./armazenamento-lote-1.js";
import { lerGeometria } from "./armazenamento-lote-3.js";
import { lerChuvaAtual } from "./armazenamento-lote-4.js";

export const CHAVES_RESUMO = [CHAVE_PONTOS, CHAVE_BACIA_MAPA, CHAVE_CONDICIONANTES, CHAVE_MAPEAMENTO,
  CHAVE_ESPACOS, ...Object.values(CHAVES_LOTE_2), CHAVE_CENARIO, CHAVE_BACIA, CHAVE_CHUVA];

// ------------------------------------------------------------
// AGREGAÇÃO EM MEMÓRIA DAS LEITURAS VALIDADAS
// ------------------------------------------------------------
/**
 * Mantém escolhas espaciais e intervenções independentes e deriva métricas oficiais.
 * @param {Object} fontes Leituras por etapa, incluindo chuva já verificada quanto à atualidade.
 * @param {Array} catalogo Catálogo original.
 * @returns {Object} Resumo derivado; não altera entradas, DOM ou armazenamento.
 */
export function agregarResumoFinal(fontes, catalogo) {
  const variantes = indexarVariantes(catalogo);
  const pontos = fontes[1].dados?.pontos || [];
  const baciaMapa = fontes[2].dados;
  const inventario = { total: 0, lacunas: 0, categorias: {} };
  for (const categoria of CATEGORIAS_MAPEAMENTO) inventario.categorias[categoria] = 0;
  for (const item of fontes[5].dados?.registros || []) {
    inventario.total++; inventario.categorias[item.categoria]++;
    if (item.lacuna) inventario.lacunas++;
  }
  // Uma fonte inválida não apaga os resumos válidos das demais fontes.
  // Sem origem 8 válida, decisões são apresentadas sem atribuir geometria.
  const escolhas = consolidarMapa(12, fontes[6].dados || { espacos: [] },
    fontes[8].dados || colecaoVazia(8), fontes[11].dados || colecaoVazia(11), catalogo);
  const espacializados = [];
  for (const item of escolhas) if (item.vertices && item.tecnicas.length) espacializados.push(item);
  const intervencoes = [];
  for (const item of fontes[13].dados?.intervencoes || []) {
    // Não usa o volume/total armazenado como autoridade e não infere vínculo com 11.
    intervencoes.push({ ...item, nome: variantes.get(item.variante).nome,
      volume: calcularVolumeIntervencao(item.area, item.profundidade, item.vazios) });
  }
  const avaliacao = avaliarCenario(fontes[13].dados, fontes[15].dados, new Set(variantes.keys()));
  const pendencias = [];
  if (avaliacao.capacidade === null) pendencias.push({ etapa: 13, texto: fontes[13].mensagem || "Nenhuma intervenção foi confirmada na Etapa 13." });
  if (avaliacao.demanda === null) pendencias.push({ etapa: 15, texto: fontes[15].mensagem || "O volume de chuva ainda não foi calculado na Etapa 15." });
  const disponibilidade = [];
  for (const [etapa, nome, presente] of [[1, "Pontos de alagamento", pontos.length > 0],
    [2, "Bacia delimitada", Boolean(baciaMapa)], [4, "Condicionantes registradas", Boolean(fontes[4].dados)],
    [5, "Inventário técnico", inventario.total > 0], [12, "Cenário espacial", espacializados.length > 0],
    [13, "Pré-dimensionamento", intervencoes.length > 0], [14, "Dados físicos da bacia", Boolean(fontes[14].dados)],
    [15, "Chuva de projeto atual", Boolean(fontes[15].dados)], [17, "Avaliação hidrológica", avaliacao.atende !== null]]) {
    disponibilidade.push({ etapa, nome, estado: presente ? "Disponível" : "Pendente" });
  }
  return { fontes, pontos, baciaMapa, baciaFisica: fontes[14].dados, condicionantes: fontes[4].dados,
    inventario, escolhas, espacializados, legenda: legendaCenario(espacializados, catalogo), intervencoes,
    avaliacao, pendencias, disponibilidade,
    deficit: avaliacao.atende === null ? null : Math.max(avaliacao.demanda - avaliacao.capacidade, 0),
    temGeografia: Boolean(pontos.length || baciaMapa || espacializados.length) };
}

// ------------------------------------------------------------
// LEITURA DAS FONTES EXISTENTES SEM NOVA PERSISTÊNCIA
// ------------------------------------------------------------
/**
 * Lê 1/2/4/5/6/8/10/11/13/14/15 com seus validadores oficiais; chuva passa pelo leitor de atualidade.
 * @param {Array} catalogo Catálogo original para validar variantes.
 * @returns {Object} Resumo atual, incluindo falhas e ausência; nunca grava ou remove chaves.
 */
export function lerResumoFinal(catalogo) {
  const variantes = indexarVariantes(catalogo);
  const fontes = {
    1: lerRegistro(CHAVE_PONTOS, validarLevantamento), 2: lerGeometria(2),
    4: lerRegistro(CHAVE_CONDICIONANTES, validarCondicionantes),
    5: lerRegistro(CHAVE_MAPEAMENTO, validarMapeamento), 6: lerGeometria(6),
    14: lerRegistro(CHAVE_BACIA, validarBacia), 15: lerChuvaAtual()
  };
  for (const etapa of [8, 10, 11]) {
    // ------------------------------------------------------------
    // VALIDAÇÃO DA COLEÇÃO DE ORIGEM
    // ------------------------------------------------------------
    /** @param {*} dados JSON candidato. @returns {boolean} Compatibilidade sem mutação. */
    function validar(dados) { return validarColecao(etapa, dados, variantes); }
    fontes[etapa] = lerRegistro(CHAVES_LOTE_2[etapa], validar);
  }
  // ------------------------------------------------------------
  // VALIDAÇÃO DO PRÉ-DIMENSIONAMENTO CONFIRMADO
  // ------------------------------------------------------------
  /** @param {*} dados JSON da Etapa 13. @returns {boolean} Compatibilidade, sem confiar em totais armazenados. */
  function validarIntervencoes(dados) { return validarCenario(dados, new Set(variantes.keys())); }
  fontes[13] = lerRegistro(CHAVE_CENARIO, validarIntervencoes);
  return agregarResumoFinal(fontes, catalogo);
}
