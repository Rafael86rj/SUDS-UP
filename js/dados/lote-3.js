// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/dados/lote-3.js
// Módulo: Lote 3 — geometria e integrações
// Objetivo: Validar polígonos manuais e relacioná-los ao levantamento existente.
// Responsabilidade: Cálculo de área, contratos, CRUD e projeções de leitura.
// Dependências: Contratos do Lote 2; nenhuma biblioteca geoespacial adicional.
// Utilizado por: Mapas, integrações e testes do Lote 3.
// Criado em: 04/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { CAMPOS_AREA, lerCampos } from "./lote-2.js";

export const CHAVE_BACIA_MAPA = "suds-up:etapa-2:bacia:v1";
export const CHAVE_ESPACOS = "suds-up:etapa-6:espacos-livres:v1";
export const RAIO_TERRA = 6371008.8;

// ------------------------------------------------------------
// COORDENADA GEOGRÁFICA FINITA
// ------------------------------------------------------------
/**
 * Verifica graus decimais antes de calcular ou desenhar uma posição.
 * @param {*} ponto Coordenada candidata.
 * @returns {boolean} Validade, sem efeitos colaterais ou armazenamento.
 */
export function coordenadaValida(ponto) {
  return Boolean(ponto && Number.isFinite(ponto.latitude) && Math.abs(ponto.latitude) <= 90
    && Number.isFinite(ponto.longitude) && Math.abs(ponto.longitude) <= 180);
}

// ------------------------------------------------------------
// LONGITUDES CONTÍNUAS PARA DESENHO LOCAL
// ------------------------------------------------------------
/**
 * Desenrola longitudes em torno do primeiro vértice, inclusive no antimeridiano.
 * @param {Array} vertices Coordenadas previamente validadas.
 * @returns {Array} Pares [latitude, longitude contínua], sem alterar a entrada.
 */
export function coordenadasMapa(vertices) {
  const pontos = [];
  const referencia = vertices[0].longitude;
  for (const ponto of vertices) {
    let longitude = ponto.longitude;
    while (longitude - referencia > 180) longitude -= 360;
    while (longitude - referencia < -180) longitude += 360;
    pontos.push([ponto.latitude, longitude]);
  }
  return pontos;
}

// ------------------------------------------------------------
// ORIENTAÇÃO DE TRÊS VÉRTICES
// ------------------------------------------------------------
/**
 * Calcula o produto vetorial no plano longitude/latitude apenas para topologia.
 * Não é usado para calcular área em metros quadrados.
 * @param {Array} a Primeiro par.
 * @param {Array} b Segundo par.
 * @param {Array} c Terceiro par.
 * @returns {number} Sinal da orientação; sem efeitos colaterais.
 */
function orientacao(a, b, c) {
  return (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
}

// ------------------------------------------------------------
// PONTO SOBRE SEGMENTO COLINEAR
// ------------------------------------------------------------
/**
 * Detecta contatos entre arestas que tornariam o contorno ambíguo.
 * @param {Array} a Início.
 * @param {Array} b Fim.
 * @param {Array} p Ponto colinear.
 * @returns {boolean} Pertencimento ao segmento; sem efeitos colaterais.
 */
function noSegmento(a, b, p) {
  return p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0])
    && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
}

// ------------------------------------------------------------
// VALIDAÇÃO DO CONTORNO MANUAL
// ------------------------------------------------------------
/**
 * Exige vértices distintos e contorno simples, sem cruzamentos ou retrocessos.
 * O modelo destina-se a polígonos locais, sem polos nem extensão >= 180°.
 * @param {*} vertices Anel aberto: o último vértice não repete o primeiro.
 * @returns {string} Erro ou vazio; não lê/grava armazenamento.
 */
export function erroGeometria(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return "Adicione pelo menos 3 vértices distintos.";
  const distintos = new Set();
  for (const ponto of vertices) {
    if (!coordenadaValida(ponto)) return "Latitude deve estar entre -90 e 90 e longitude entre -180 e 180, com valores finitos.";
    if (Math.abs(ponto.latitude) === 90) return "Delimitações que atingem os polos não são suportadas neste protótipo local.";
    const chave = `${ponto.latitude},${ponto.longitude === 180 ? -180 : ponto.longitude}`;
    if (distintos.has(chave)) return "Use vértices distintos; o fechamento é feito automaticamente.";
    distintos.add(chave);
  }
  const pontos = coordenadasMapa(vertices);
  const longitudes = [];
  for (const ponto of pontos) longitudes.push(ponto[1]);
  if (Math.max(...longitudes) - Math.min(...longitudes) >= 180) return "Desenhe um polígono local com extensão longitudinal menor que 180°.";
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length], anterior = pontos[(i + pontos.length - 1) % pontos.length];
    // Arestas consecutivas não podem voltar sobre o mesmo trecho.
    if (orientacao(anterior, a, b) === 0 && (noSegmento(anterior, a, b) || noSegmento(a, b, anterior))) return "O contorno possui arestas sobrepostas. Refaça os vértices.";
    for (let j = i + 1; j < pontos.length; j++) {
      if (j === i + 1 || (i === 0 && j === pontos.length - 1)) continue;
      const c = pontos[j], d = pontos[(j + 1) % pontos.length];
      const abC = orientacao(a, b, c), abD = orientacao(a, b, d);
      const cdA = orientacao(c, d, a), cdB = orientacao(c, d, b);
      if ((abC * abD < 0 && cdA * cdB < 0)
          || (abC === 0 && noSegmento(a, b, c)) || (abD === 0 && noSegmento(a, b, d))
          || (cdA === 0 && noSegmento(c, d, a)) || (cdB === 0 && noSegmento(c, d, b))) {
        return "O contorno possui cruzamentos ou contatos entre arestas. Refaça os vértices.";
      }
    }
  }
  return "";
}

// ------------------------------------------------------------
// ÁREA ESFÉRICA EM METROS QUADRADOS
// ------------------------------------------------------------
/**
 * Aplica a soma esférica de Chamberlain–Duquette, equivalente à forma cíclica
 * A = |R²/2 × Σ (λ[i+1] - λ[i]) × (sin φ[i] + sin φ[i+1])|, em radianos.
 * Referência: JPL Publication 07-03 (2007); implementação de referência:
 * https://github.com/Turfjs/turf/blob/master/packages/turf-area/index.ts
 * Usa raio médio 6.371.008,8 m e subtrai uma constante dos senos para reduzir
 * cancelamento numérico em áreas pequenas (Σ Δλ = 0). Não usa pixels ou zoom.
 * Aproximação esférica para anel simples local, sem furos; não é área topográfica.
 * @param {Array} vertices Anel de coordenadas em graus, sem repetir fechamento.
 * @returns {number} Área com precisão de Number; lança erro se inválida, sem storage.
 */
export function calcularArea(vertices) {
  const erro = erroGeometria(vertices);
  if (erro) throw new Error(erro);
  const pontos = coordenadasMapa(vertices);
  const rad = Math.PI / 180;
  const base = Math.sin(pontos[0][0] * rad);
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i], b = pontos[(i + 1) % pontos.length];
    soma += (b[1] - a[1]) * rad * (Math.sin(a[0] * rad) - base + Math.sin(b[0] * rad) - base);
  }
  const area = Math.abs(soma * RAIO_TERRA * RAIO_TERRA / 2);
  if (!Number.isFinite(area) || area <= 0) throw new Error("A área deve ser finita e maior que zero. Confira o contorno.");
  return area;
}

// ------------------------------------------------------------
// CONTRATO DA BACIA DELIMITADA
// ------------------------------------------------------------
/**
 * Confere formato e recalculabilidade; areaM2 armazenada nunca é a autoridade.
 * @param {*} dados Registro candidato da Etapa 2.
 * @returns {boolean} Validade, sem modificar ou gravar dados.
 */
export function validarBaciaMapa(dados) {
  if (!dados || dados.versao !== 1 || !Number.isFinite(dados.areaM2) || dados.areaM2 <= 0) return false;
  try { calcularArea(dados.vertices); return true; } catch { return false; }
}

// ------------------------------------------------------------
// CONTRATO DOS ESPAÇOS LIVRES
// ------------------------------------------------------------
/**
 * Verifica IDs, números e entradas, preservando contador crescente após exclusão.
 * @param {*} dados Coleção candidata da Etapa 6.
 * @returns {boolean} Validade; sem DOM ou armazenamento.
 */
export function validarEspacos(dados) {
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.espacos)
      || !Number.isSafeInteger(dados.proximoNumero) || dados.proximoNumero < 1) return false;
  const ids = new Set(), numeros = new Set();
  for (const espaco of dados.espacos) {
    if (!espaco || typeof espaco.id !== "string" || !espaco.id.trim() || ids.has(espaco.id)
        || !Number.isSafeInteger(espaco.numero) || espaco.numero < 1 || espaco.numero >= dados.proximoNumero
        || numeros.has(espaco.numero) || typeof espaco.identificacao !== "string" || !espaco.identificacao.trim()
        || typeof espaco.observacao !== "string" || !validarBaciaMapa({ ...espaco, versao: 1 })) return false;
    ids.add(espaco.id); numeros.add(espaco.numero);
  }
  return true;
}

// ------------------------------------------------------------
// CÓPIA COM ÁREAS RECALCULADAS
// ------------------------------------------------------------
/**
 * Normaliza em memória registros já validados, sem regravar a fonte.
 * @param {number} etapa 2 ou 6.
 * @param {Object|null} dados Registro validado ou ausência.
 * @returns {Object|null} Cópia com área obtida dos vértices, sem efeitos colaterais.
 */
export function recalcularRegistro(etapa, dados) {
  if (!dados) return etapa === 2 ? null : { versao: 1, proximoNumero: 1, espacos: [] };
  const copia = structuredClone(dados);
  if (etapa === 2) copia.areaM2 = calcularArea(copia.vertices);
  else for (const espaco of copia.espacos) espaco.areaM2 = calcularArea(espaco.vertices);
  return copia;
}

// ------------------------------------------------------------
// INCLUSÃO E EDIÇÃO DE ESPAÇO
// ------------------------------------------------------------
/**
 * Mantém ID/número de edição e recalcula área a cada confirmação.
 * @param {Object} dados Coleção confirmada.
 * @param {Object} entrada Identificação, observação e vértices.
 * @param {string} id ID estável da inclusão/edição.
 * @returns {Object} Nova coleção válida; lança erro e nunca grava diretamente.
 */
export function salvarEspaco(dados, entrada, id) {
  const espacos = [];
  let numero = dados.proximoNumero;
  let editando = false;
  for (const espaco of dados.espacos) {
    if (espaco.id === id) { numero = espaco.numero; editando = true; }
    else espacos.push(espaco);
  }
  espacos.push({ ...entrada, id, numero, areaM2: calcularArea(entrada.vertices) });
  // A lista mantém ordem numérica sem depender da posição para os vínculos.
  // ------------------------------------------------------------
  // ORDENAÇÃO ESTÁVEL DE EXIBIÇÃO
  // ------------------------------------------------------------
  /** @param {Object} a Espaço. @param {Object} b Espaço. @returns {number} Ordem, sem efeitos externos. */
  function porNumero(a, b) { return a.numero - b.numero; }
  espacos.sort(porNumero);
  const nova = { ...dados, espacos, proximoNumero: dados.proximoNumero + (editando ? 0 : 1) };
  if (!validarEspacos(nova)) throw new Error("Confira identificação, geometria e numeração do espaço.");
  return nova;
}

// ------------------------------------------------------------
// EXCLUSÃO SEM CASCATA
// ------------------------------------------------------------
/**
 * Retira somente o espaço; áreas e decisões relacionadas permanecem intactas.
 * @param {Object} dados Coleção confirmada.
 * @param {string} id Espaço a retirar.
 * @returns {Object} Nova coleção com o mesmo contador; sem armazenamento.
 */
export function excluirEspaco(dados, id) {
  const espacos = [];
  for (const espaco of dados.espacos) if (espaco.id !== id) espacos.push(espaco);
  return { ...dados, espacos };
}

// ------------------------------------------------------------
// RASCUNHO DA ETAPA 8 A PARTIR DE UM ESPAÇO
// ------------------------------------------------------------
/**
 * Copia identificação/área e vínculo, deixando demais entradas vazias.
 * A confirmação posterior na Etapa 8 gera ID próprio; não há importação implícita.
 * @param {Object} espaco Espaço confirmado da Etapa 6.
 * @param {Object} areas Coleção atual da Etapa 8.
 * @returns {Object} Rascunho, ou erro de duplicação; sem gravar nenhuma chave.
 */
export function importarEspaco(espaco, areas) {
  for (const area of areas.areas) if (area.espacoLivreId === espaco.id) throw new Error(`Este espaço já foi aproveitado pela Área ${area.numero} — ${area.identificacao}. Nesta versão, cada espaço pode ser associado a uma única área.`);
  const textos = {};
  for (const campo of CAMPOS_AREA) textos[campo.id] = "";
  return { ...lerCampos(textos, CAMPOS_AREA), identificacao: espaco.identificacao,
    areaDisponivel: calcularArea(espaco.vertices), espacoLivreId: espaco.id, possiveis: [] };
}

// ------------------------------------------------------------
// ASSOCIAÇÃO POSTERIOR SEM COPIAR OS DADOS DO ESPAÇO
// ------------------------------------------------------------
/**
 * Associa uma área existente à geometria confirmada, preservando todos os campos.
 * A exclusividade do vínculo é uma decisão desta versão, não uma regra SUDS.
 * @param {Object} areas Coleção confirmada da Etapa 8.
 * @param {string} areaId Área a associar.
 * @param {string} espacoId Espaço escolhido.
 * @param {Object} espacos Coleção válida da Etapa 6.
 * @returns {Object} Nova coleção ou erro; não grava nem modifica as entradas.
 */
export function associarEspaco(areas, areaId, espacoId, espacos) {
  let origem = false, destino = null;
  for (const espaco of espacos.espacos) if (espaco.id === espacoId) origem = true;
  if (!origem) throw new Error("Selecione um espaço válido ainda cadastrado na Etapa 6.");
  for (const area of areas.areas) {
    if (area.id === areaId) destino = area;
    if (area.espacoLivreId === espacoId && area.id !== areaId) {
      throw new Error(`Este espaço já está associado à Área ${area.numero} — ${area.identificacao}. Nesta versão, cada espaço pode ser associado a uma única área.`);
    }
  }
  if (!destino) throw new Error("A área não está mais disponível. Recarregue a página.");
  if (destino.espacoLivreId) throw new Error("Remova a associação atual antes de escolher outro espaço.");
  const registros = [];
  // A cópia mantém até propriedades adicionais já existentes; só o vínculo muda.
  for (const area of areas.areas) registros.push(area.id === areaId ? { ...area, espacoLivreId: espacoId } : area);
  return { ...areas, areas: registros };
}

// ------------------------------------------------------------
// REMOÇÃO SOMENTE DO VÍNCULO ESPACIAL
// ------------------------------------------------------------
/**
 * Retira espacoLivreId sem excluir área, geometria, vistoria ou decisão.
 * @param {Object} areas Coleção da Etapa 8.
 * @param {string} areaId Área escolhida.
 * @returns {Object} Nova coleção; não grava nem altera as fontes.
 */
export function removerAssociacao(areas, areaId) {
  const registros = [];
  for (const area of areas.areas) {
    if (area.id !== areaId) { registros.push(area); continue; }
    const copia = { ...area };
    delete copia.espacoLivreId;
    registros.push(copia);
  }
  return { ...areas, areas: registros };
}

// ------------------------------------------------------------
// CORES DE APRESENTAÇÃO DO CATÁLOGO EXISTENTE
// ------------------------------------------------------------
/**
 * Atribui uma cor estável por variante a partir da ordem do catálogo completo.
 * Não depende das áreas presentes ou da ordem em que as decisões são lidas.
 * @param {Array} catalogo TECNICAS_SUDS original, sem duplicar nomes/variantes.
 * @returns {Map} ID de variante → cor; dados visuais em memória, sem storage.
 */
export function coresDasTecnicas(catalogo) {
  const paleta = ["#125587", "#984512", "#237443", "#7646a1", "#a22e50", "#177b83", "#706118", "#5c536f"];
  const cores = new Map();
  let indice = 0;
  for (const tecnica of catalogo) for (const variante of tecnica.variantes) {
    cores.set(variante.id, paleta[indice % paleta.length]); indice++;
  }
  return cores;
}

// ------------------------------------------------------------
// LEGENDA DAS ESCOLHAS FINAIS EFETIVAMENTE MAPEADAS
// ------------------------------------------------------------
/**
 * Agrupa variantes adotadas por ID e conta somente áreas representadas no mapa.
 * Decisões sem geometria continuam na lista textual, não criam símbolos na legenda.
 * @param {Array} registros Resumos consolidados da Etapa 12.
 * @param {Array} catalogo Catálogo original para ordem e cores consistentes.
 * @returns {Array} Técnica/variante, cor e quantidade; sem persistência.
 */
export function legendaCenario(registros, catalogo) {
  const contagens = new Map(), cores = coresDasTecnicas(catalogo);
  for (const registro of registros) {
    if (!registro.vertices || !registro.tecnicas.length) continue;
    const tecnica = registro.tecnicas[0];
    const item = contagens.get(tecnica.id) ?? { id: tecnica.id, nome: tecnica.nome, quantidade: 0, cor: cores.get(tecnica.id) };
    item.quantidade++; contagens.set(tecnica.id, item);
  }
  const legenda = [];
  for (const id of cores.keys()) if (contagens.has(id)) legenda.push(contagens.get(id));
  return legenda;
}

// ------------------------------------------------------------
// CONSOLIDAÇÃO DOS MAPAS DE LEITURA
// ------------------------------------------------------------
/**
 * Relaciona fontes sem duplicar armazenamento ou criar intervenções na Etapa 13.
 * Inclui áreas manuais, origens excluídas e decisões preservadas sem área.
 * @param {number} etapa 9 ou 12.
 * @param {Object} espacos Coleção da Etapa 6 validada/recalculada.
 * @param {Object} areas Coleção da Etapa 8 validada.
 * @param {Object} decisoes Coleção da Etapa 11 validada.
 * @param {Array} catalogo TECNICAS_SUDS original.
 * @returns {Array} Resumos com geometria opcional e regime; sem efeitos externos.
 */
export function consolidarMapa(etapa, espacos, areas, decisoes, catalogo) {
  const porEspaco = new Map(), porDecisao = new Map(), variantes = new Map();
  for (const espaco of espacos.espacos) porEspaco.set(espaco.id, espaco);
  for (const decisao of decisoes.decisoes) porDecisao.set(decisao.areaId, decisao);
  for (const tecnica of catalogo) for (const variante of tecnica.variantes) variantes.set(variante.id, { ...variante, nome: `${tecnica.nome} — ${variante.nome}` });
  const registros = [];
  const ids = new Set();
  for (const area of areas.areas) {
    ids.add(area.id);
    const decisao = porDecisao.get(area.id);
    const escolhidas = etapa === 9 ? area.possiveis : decisao?.selecionado ? [decisao.selecionado] : [];
    const tecnicas = [];
    for (const id of escolhidas) tecnicas.push(variantes.get(id));
    const espaco = porEspaco.get(area.espacoLivreId);
    registros.push({ id: area.id, identificacao: `Área ${area.numero} — ${area.identificacao}`,
      areaDisponivel: area.areaDisponivel, areaExistente: true,
      vertices: espaco?.vertices ?? null, tecnicas, motivo: decisao?.motivo ?? "",
      restricao: decisao?.restricaoProjetual ?? "", observacoes: decisao?.observacoes ?? "",
      semOrigem: Boolean(area.espacoLivreId && !espaco) });
  }
  if (etapa === 12) for (const decisao of decisoes.decisoes) {
    if (ids.has(decisao.areaId)) continue;
    registros.push({ id: decisao.areaId, identificacao: "Decisão preservada — área não mais cadastrada",
      areaDisponivel: null, areaExistente: false,
      vertices: null, tecnicas: decisao.selecionado ? [variantes.get(decisao.selecionado)] : [],
      motivo: decisao.motivo, restricao: decisao.restricaoProjetual, observacoes: decisao.observacoes, semOrigem: true });
  }
  return registros;
}
