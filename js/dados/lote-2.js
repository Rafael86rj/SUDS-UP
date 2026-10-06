// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/dados/lote-2.js
// Módulo: Etapas 8, 10 e 11 — contratos e validação
// Objetivo: Relacionar áreas, vistorias e decisões sem inferência técnica.
// Responsabilidade: Entradas, validação e operações imutáveis, sem DOM/storage.
// Dependências: Leitor decimal existente da Etapa 13; catálogo recebido.
// Utilizado por: Interfaces, armazenamento e testes do Lote 2.
// Criado em: 03/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { lerDecimal } from "../calculos/pre-dimensionamento.js";

// Cada etapa possui sua coleção; o vínculo é o ID da área, nunca sua posição.
export const CHAVES_LOTE_2 = {
  8: "suds-up:etapa-8:possibilidades:v1",
  10: "suds-up:etapa-10:visita-campo:v1",
  11: "suds-up:etapa-11:revisao-campo:v1"
};
export const COLECOES = { 8: "areas", 10: "vistorias", 11: "decisoes" };
export const ESTADOS_CAMPO = ["Não avaliado", "Sim", "Não"];

// Os descritores fornecem rótulos e apenas os limites pedidos, sem categorias
// de solo ou limiares hidrológicos. null representa número opcional não levantado.
export const CAMPOS_AREA = [
  { id: "identificacao", nome: "Identificação da área", tipo: "texto", obrigatorio: true },
  { id: "areaDisponivel", nome: "Área disponível (m²)", tipo: "numero", obrigatorio: true, positivo: true },
  { id: "largura", nome: "Largura (m)", tipo: "numero", positivo: true },
  { id: "comprimento", nome: "Comprimento (m)", tipo: "numero", positivo: true },
  { id: "declividade", nome: "Declividade (%)", tipo: "numero" },
  { id: "permeabilidade", nome: "Permeabilidade do solo", tipo: "texto" },
  { id: "distanciaLencol", nome: "Distância do lençol freático (m)", tipo: "numero" },
  { id: "distanciaRocha", nome: "Distância do leito rochoso (m)", tipo: "numero" },
  { id: "distanciaFundacoes", nome: "Distância das fundações próximas (m)", tipo: "numero" },
  { id: "usoSolo", nome: "Uso e ocupação do solo", tipo: "texto" },
  { id: "redeAgua", nome: "Interferência de rede de água", tipo: "texto" },
  { id: "redeEsgoto", nome: "Interferência de rede de esgoto", tipo: "texto" },
  { id: "drenagem", nome: "Interferência de drenagem", tipo: "texto" },
  { id: "postes", nome: "Postes", tipo: "texto" },
  { id: "metro", nome: "Metrô", tipo: "texto" },
  { id: "outrasInterferencias", nome: "Outras estruturas/interferências", tipo: "texto" },
  { id: "areaContribuicao", nome: "Área de contribuição local (m²)", tipo: "numero" },
  { id: "restricoes", nome: "Restrições identificadas", tipo: "texto" },
  { id: "observacoes", nome: "Observações do projetista", tipo: "texto" }
];
export const CAMPOS_VISITA = [
  { id: "postes", nome: "Presença de postes", tipo: "estado" },
  { id: "pocosVisita", nome: "Presença de poços de visita", tipo: "estado" },
  { id: "pavimentacaoHistorica", nome: "Pavimentação histórica", tipo: "estado" },
  { id: "fluxoPedestres", nome: "Fluxo de pedestres", tipo: "texto" },
  { id: "larguraCalcada", nome: "Largura útil da calçada (m)", tipo: "numero" },
  { id: "observacoes", nome: "Observações de campo", tipo: "texto" }
];
export const CAMPOS_DECISAO = [
  { id: "restricaoProjetual", nome: "Restrição projetual", tipo: "texto" },
  { id: "motivo", nome: "Motivo da escolha", tipo: "texto" },
  { id: "observacoes", nome: "Observações pós-campo", tipo: "texto" }
];

// ------------------------------------------------------------
// ÍNDICE DERIVADO DO CATÁLOGO ÚNICO
// ------------------------------------------------------------
/**
 * Indexa as variantes reais para validar IDs e apresentar técnica/variante.
 * Não mantém cópia persistida do catálogo nem recomenda uma alternativa.
 * @param {Array} catalogo TECNICAS_SUDS já carregado pela página.
 * @returns {Map} Índice por ID de variante; sem efeitos colaterais.
 */
export function indexarVariantes(catalogo) {
  const indice = new Map();
  for (const tecnica of catalogo) {
    for (const variante of tecnica.variantes) {
      indice.set(variante.id, { tecnica: tecnica.id, nome: `${tecnica.nome} — ${variante.nome}` });
    }
  }
  return indice;
}

// ------------------------------------------------------------
// LEITURA ESTRITA DO RASCUNHO
// ------------------------------------------------------------
/**
 * Converte somente campos descritos; vazio numérico vira null, inválido vira NaN.
 * O mesmo leitor decimal da Etapa 13 evita aceitar sufixos como "12abc".
 * @param {Object} textos Valores dos controles, ainda não confirmados.
 * @param {Array} campos Descritores da etapa.
 * @returns {Object} Entradas tipadas, sem alterar rascunho ou armazenamento.
 */
export function lerCampos(textos, campos) {
  const dados = {};
  for (const campo of campos) {
    const texto = textos[campo.id] ?? "";
    dados[campo.id] = campo.tipo === "numero"
      ? (texto.trim() === "" ? null : lerDecimal(texto)) : texto;
  }
  return dados;
}

// ------------------------------------------------------------
// ERROS DAS ENTRADAS COMUNS
// ------------------------------------------------------------
/**
 * Valida tipos e limites explícitos; não estima nenhum parâmetro faltante.
 * @param {Object} dados Entradas tipadas ou registro lido.
 * @param {Array} campos Descritores esperados.
 * @returns {Object} Mensagens por campo; sem efeitos colaterais.
 */
export function errosCampos(dados, campos) {
  const erros = {};
  for (const campo of campos) {
    const valor = dados?.[campo.id];
    if (campo.tipo === "numero") {
      if (valor === null && !campo.obrigatorio) continue;
      if (!Number.isFinite(valor) || (campo.positivo ? valor <= 0 : valor < 0)) {
        erros[campo.id] = `Informe um número finito ${campo.positivo ? "maior que zero" : "maior ou igual a zero"}.`;
      }
    } else if (campo.tipo === "estado") {
      if (!ESTADOS_CAMPO.includes(valor)) erros[campo.id] = "Escolha Não avaliado, Sim ou Não.";
    } else if (typeof valor !== "string" || (campo.obrigatorio && !valor.trim())) {
      erros[campo.id] = "Preencha este campo com texto válido.";
    }
  }
  return erros;
}

// ------------------------------------------------------------
// SELEÇÃO MÚLTIPLA SEM DUPLICATAS OU IDS DESCONHECIDOS
// ------------------------------------------------------------
/**
 * Confere a associação ao catálogo recebido; uma lista vazia é permitida.
 * @param {*} ids Valor a verificar.
 * @param {Map} variantes Índice do catálogo compartilhado.
 * @returns {boolean} Validade, sem efeitos colaterais.
 */
export function validarPossiveis(ids, variantes) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return false;
  for (const id of ids) if (!variantes.has(id)) return false;
  return true;
}

// ------------------------------------------------------------
// VALIDAÇÃO DO REGISTRO ANTES DE CONFIRMAR
// ------------------------------------------------------------
/**
 * Aplica o contrato da etapa e a coerência da escolha final do projetista.
 * @param {number} etapa 8, 10 ou 11.
 * @param {Object} dados Entradas sem necessidade de ID/numeração.
 * @param {Map} variantes Catálogo indexado.
 * @returns {Object} Erros por campo, sem efeitos colaterais.
 */
export function errosRegistro(etapa, dados, variantes) {
  const campos = etapa === 8 ? CAMPOS_AREA : etapa === 10 ? CAMPOS_VISITA : CAMPOS_DECISAO;
  const erros = errosCampos(dados, campos);
  // Revisão 04/10/2026: vínculo opcional com geometria da Etapa 6. Registros
  // antigos sem a propriedade continuam válidos e não são migrados na leitura.
  if (etapa === 8 && dados?.espacoLivreId !== undefined
      && (typeof dados.espacoLivreId !== "string" || !dados.espacoLivreId.trim())) {
    erros.espacoLivreId = "O vínculo com o espaço livre deve ser um ID válido.";
  }
  if (etapa !== 10 && !validarPossiveis(dados?.possiveis, variantes)) {
    erros.possiveis = "Selecione somente variantes do catálogo, sem duplicatas.";
  }
  if (etapa === 11) {
    // null é ausência deliberada de seleção; não escolhemos a primeira opção.
    if (dados?.selecionado !== null && (!variantes.has(dados?.selecionado)
        || !Array.isArray(dados?.possiveis) || !dados.possiveis.includes(dados.selecionado))) {
      erros.selecionado = "O SUDS selecionado deve pertencer aos possíveis revisados.";
    }
    if (dados?.selecionado !== null && (typeof dados?.motivo !== "string" || !dados.motivo.trim())) {
      erros.motivo = "Informe o motivo da escolha do SUDS selecionado.";
    }
  }
  return erros;
}

// ------------------------------------------------------------
// CONTRATO VERSIONADO COMPLETO
// ------------------------------------------------------------
/**
 * Recusa dados incompatíveis antes que a interface possa sobrescrevê-los.
 * Vistorias/decisões órfãs são estruturalmente válidas e devem ser preservadas.
 * @param {number} etapa Etapa proprietária da coleção.
 * @param {*} dados Coleção potencialmente incompatível.
 * @param {Map} variantes Catálogo indexado.
 * @returns {boolean} Validade estrutural e das entradas; sem storage.
 */
export function validarColecao(etapa, dados, variantes) {
  const nome = COLECOES[etapa];
  if (!nome || !dados || dados.versao !== 1 || !Array.isArray(dados[nome])) return false;
  if (etapa === 8 && (!Number.isSafeInteger(dados.proximoNumero) || dados.proximoNumero < 1)) return false;
  const ids = new Set();
  const numeros = new Set();
  for (const item of dados[nome]) {
    const id = etapa === 8 ? item?.id : item?.areaId;
    if (typeof id !== "string" || !id.trim() || ids.has(id)) return false;
    ids.add(id);
    if (etapa === 8) {
      if (!Number.isSafeInteger(item.numero) || item.numero < 1
          || item.numero >= dados.proximoNumero || numeros.has(item.numero)) return false;
      numeros.add(item.numero);
    }
    if (Object.keys(errosRegistro(etapa, item, variantes)).length) return false;
  }
  return true;
}

// ------------------------------------------------------------
// COLEÇÃO VAZIA SEM GRAVAÇÃO IMPLÍCITA
// ------------------------------------------------------------
/**
 * Prepara estado inicial apenas em memória, distinguindo ausência de erro.
 * @param {number} etapa Etapa proprietária.
 * @returns {Object} Coleção nova; sem efeitos colaterais.
 */
export function colecaoVazia(etapa) {
  return etapa === 8 ? { versao: 1, proximoNumero: 1, areas: [] }
    : { versao: 1, [COLECOES[etapa]]: [] };
}

// ------------------------------------------------------------
// INCLUSÃO OU EDIÇÃO IMUTÁVEL DA ÁREA
// ------------------------------------------------------------
/**
 * Preserva ID/numeração em edição e avança contador apenas em inclusão.
 * @param {Object} colecao Estado confirmado.
 * @param {Object} entradas Área validável sem metadados.
 * @param {string} id ID estável; a interface gera UUID somente na inclusão.
 * @param {Map} variantes Catálogo indexado.
 * @returns {Object} Próximo estado; lança erro se incompatível, sem gravar.
 */
export function salvarArea(colecao, entradas, id, variantes) {
  const areas = [];
  let encontrou = false;
  for (const area of colecao.areas) {
    if (area.id === id) {
      areas.push({ ...entradas, id, numero: area.numero });
      encontrou = true;
    } else areas.push(area);
  }
  if (!encontrou) areas.push({ ...entradas, id, numero: colecao.proximoNumero });
  const nova = { ...colecao, areas, proximoNumero: colecao.proximoNumero + (encontrou ? 0 : 1) };
  if (!validarColecao(8, nova, variantes)) throw new Error("Área ou numeração inválida.");
  return nova;
}

// ------------------------------------------------------------
// EXCLUSÃO SEM REUTILIZAR NÚMEROS
// ------------------------------------------------------------
/**
 * Remove somente a área escolhida; não toca nos registros das outras etapas.
 * @param {Object} colecao Coleção confirmada de áreas.
 * @param {string} id ID a excluir.
 * @returns {Object} Próximo estado, preservando contador; sem storage.
 */
export function excluirArea(colecao, id) {
  const areas = [];
  for (const area of colecao.areas) if (area.id !== id) areas.push(area);
  return { ...colecao, areas };
}

// ------------------------------------------------------------
// UMA VISTORIA OU DECISÃO POR ÁREA
// ------------------------------------------------------------
/**
 * Substitui o registro do vínculo, conservando os demais, inclusive órfãos.
 * @param {number} etapa 10 ou 11.
 * @param {Object} colecao Estado confirmado da etapa.
 * @param {Object} entradas Campos validados pelo contrato.
 * @param {string} areaId ID da área da Etapa 8.
 * @param {Object} areas Coleção de áreas usada no levantamento.
 * @param {Map} variantes Catálogo indexado.
 * @returns {Object} Próxima coleção; lança erro em vínculo inválido, sem storage.
 */
export function salvarVinculado(etapa, colecao, entradas, areaId, areas, variantes) {
  let existe = false;
  for (const area of areas.areas) if (area.id === areaId) existe = true;
  if (!existe || ![10, 11].includes(etapa)) throw new Error("Área de origem não disponível.");
  const nome = COLECOES[etapa];
  const registros = [];
  for (const item of colecao[nome]) if (item.areaId !== areaId) registros.push(item);
  registros.push({ ...entradas, areaId });
  const nova = { ...colecao, [nome]: registros };
  if (!validarColecao(etapa, nova, variantes)) throw new Error("Registro de campo inválido.");
  return nova;
}

// ------------------------------------------------------------
// CONSULTA DO VÍNCULO SEM ALTERAR AS FONTES
// ------------------------------------------------------------
/**
 * Recupera a vistoria/decisão atual de uma área, ou null quando ainda ausente.
 * @param {Object} colecao Coleção validada.
 * @param {number} etapa 10 ou 11.
 * @param {string} areaId Vínculo procurado.
 * @returns {Object|null} Registro somente para leitura; sem efeitos colaterais.
 */
export function buscarVinculado(colecao, etapa, areaId) {
  for (const item of colecao[COLECOES[etapa]]) if (item.areaId === areaId) return item;
  return null;
}
