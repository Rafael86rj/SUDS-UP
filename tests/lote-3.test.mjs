// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: tests/lote-3.test.mjs
// Módulo: Validação pura do Lote 3
// Objetivo: Conferir geometria, contratos, importação e mapas de leitura.
// Responsabilidade: Testes isolados, sem dependência de tiles ou dados do usuário.
// Dependências: Node nativo, catálogo real e módulos dos Lotes 2/3.
// Utilizado por: node tests/lote-3.test.mjs.
// Criado em: 04/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { RAIO_TERRA, calcularArea, validarBaciaMapa, validarEspacos, salvarEspaco, excluirEspaco,
  importarEspaco, consolidarMapa, associarEspaco, removerAssociacao, coresDasTecnicas, legendaCenario,
  CHAVE_BACIA_MAPA, CHAVE_ESPACOS } from "../js/dados/lote-3.js";
import { abrirGeometria, lerGeometria } from "../js/dados/armazenamento-lote-3.js";
import { indexarVariantes, validarColecao, salvarArea, colecaoVazia } from "../js/dados/lote-2.js";

// Retângulo esférico de 1°: referência analítica independente da implementação.
const vertices = [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 },
  { latitude: 1, longitude: 1 }, { latitude: 1, longitude: 0 }];
const esperado = RAIO_TERRA ** 2 * Math.PI / 180 * Math.sin(Math.PI / 180);
assert.ok(Math.abs(calcularArea(vertices) - esperado) < .001);
assert.equal(calcularArea([...vertices].reverse()), calcularArea(vertices));
const bacia = { versao: 1, vertices, areaM2: esperado };
assert.ok(validarBaciaMapa(bacia));
for (const invalido of [vertices.slice(0, 2), [...vertices, vertices[0]],
  [{ latitude: 91, longitude: 0 }, ...vertices.slice(1)],
  [{ latitude: 0, longitude: 181 }, ...vertices.slice(1)],
  [{ latitude: NaN, longitude: 0 }, ...vertices.slice(1)],
  [{ latitude: 0, longitude: Infinity }, ...vertices.slice(1)],
  [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }, { latitude: 0, longitude: 2 }],
  [vertices[0], vertices[2], vertices[1], vertices[3]]]) {
  assert.equal(validarBaciaMapa({ ...bacia, vertices: invalido }), false);
}
assert.equal(validarBaciaMapa({ ...bacia, versao: 2 }), false);
assert.equal(validarBaciaMapa({ ...bacia, areaM2: -1 }), false);
// Um retângulo local no antimeridiano deve ter a mesma área do equivalente em 0°.
const antimeridiano = [{ latitude: 0, longitude: 179.5 }, { latitude: 0, longitude: -179.5 },
  { latitude: 1, longitude: -179.5 }, { latitude: 1, longitude: 179.5 }];
assert.ok(Math.abs(calcularArea(antimeridiano) - esperado) < .001);
console.log("OK: geometria, coordenadas, área esférica analítica, orientação, antimeridiano e rejeição de contornos inválidos.");

// ------------------------------------------------------------
// ESPAÇOS: CRUD SEM REUTILIZAR NÚMEROS
// ------------------------------------------------------------
let espacos = { versao: 1, proximoNumero: 1, espacos: [] };
const entrada = { identificacao: "Praça A", observacao: "Texto <script> literal", vertices };
espacos = salvarEspaco(espacos, entrada, "espaco-a");
espacos = salvarEspaco(espacos, { ...entrada, identificacao: "Praça B" }, "espaco-b");
espacos = salvarEspaco(espacos, { ...entrada, identificacao: "Praça revisada" }, "espaco-a");
assert.equal(espacos.espacos[0].numero, 1);
assert.equal(espacos.espacos[0].id, "espaco-a");
assert.equal(espacos.proximoNumero, 3);
assert.equal(espacos.espacos[0].areaM2, calcularArea(vertices));
espacos = excluirEspaco(espacos, "espaco-b");
espacos = salvarEspaco(espacos, entrada, "espaco-c");
assert.equal(espacos.espacos[1].numero, 3);
assert.ok(validarEspacos(espacos));
assert.equal(validarEspacos({ ...espacos, proximoNumero: 3 }), false);
assert.equal(validarEspacos({ ...espacos, espacos: [espacos.espacos[0], espacos.espacos[0]] }), false);
assert.equal(validarEspacos({ ...espacos, versao: 2 }), false);

// ------------------------------------------------------------
// LEITURA, RECÁLCULO E FALHAS EM MEMÓRIA ISOLADA
// ------------------------------------------------------------
const memoria = new Map();
let falharLeitura = false, falharEscrita = false;
globalThis.localStorage = {
  // ------------------------------------------------------------
  // LEITURA DO STORAGE SIMULADO
  // ------------------------------------------------------------
  /** @param {string} chave Chave. @returns {string|null} Valor; pode simular bloqueio. */
  getItem(chave) { if (falharLeitura) throw new Error("Bloqueado"); return memoria.get(chave) ?? null; },
  // ------------------------------------------------------------
  // ESCRITA DO STORAGE SIMULADO
  // ------------------------------------------------------------
  /** @param {string} chave Chave. @param {string} valor Texto. @returns {void} Altera só memória de teste. */
  setItem(chave, valor) { if (falharEscrita) throw new Error("Sem espaço"); memoria.set(chave, valor); },
  // ------------------------------------------------------------
  // EXCLUSÃO DO STORAGE SIMULADO
  // ------------------------------------------------------------
  /** @param {string} chave Chave. @returns {void} Exclui só da memória isolada. */
  removeItem(chave) { if (falharEscrita) throw new Error("Bloqueado"); memoria.delete(chave); }
};
assert.equal(lerGeometria(2).estado, "ausente");
assert.ok(abrirGeometria(2).salvar(bacia).ok);
assert.ok(abrirGeometria(6).salvar(espacos).ok);
// Cache adulterado não altera a geometria nem determina o valor mostrado/importado.
memoria.set(CHAVE_BACIA_MAPA, JSON.stringify({ ...bacia, areaM2: 1 }));
const original = memoria.get(CHAVE_BACIA_MAPA);
assert.equal(lerGeometria(2).dados.areaM2, calcularArea(vertices));
assert.equal(memoria.get(CHAVE_BACIA_MAPA), original);
assert.deepEqual(lerGeometria(6).dados, espacos);
for (const etapa of [2, 6]) {
  const chave = etapa === 2 ? CHAVE_BACIA_MAPA : CHAVE_ESPACOS;
  const entradaAtual = etapa === 2 ? bacia : espacos;
  const anterior = memoria.get(chave);
  const sessao = abrirGeometria(etapa);
  memoria.set(chave, anterior + " ");
  assert.equal(sessao.salvar(entradaAtual).ok, false);
  memoria.set(chave, anterior);
  falharEscrita = true;
  assert.equal(abrirGeometria(etapa).salvar(entradaAtual).ok, false);
  assert.equal(memoria.get(chave), anterior);
  falharEscrita = false;
  for (const invalido of ["{", "null", '{"versao":2}']) {
    memoria.set(chave, invalido);
    assert.equal(abrirGeometria(etapa).salvar(entradaAtual).ok, false);
    assert.equal(memoria.get(chave), invalido);
  }
  memoria.set(chave, anterior);
}
falharLeitura = true;
assert.equal(lerGeometria(2).estado, "erro");
assert.equal(abrirGeometria(6).salvar(espacos).ok, false);
falharLeitura = false;
assert.ok(abrirGeometria(2).salvar(null).ok);
assert.equal(lerGeometria(2).estado, "ausente");
console.log("OK: Etapas 2/6, CRUD, IDs, numeração, restauração, recálculo, falhas e proteção entre abas.");

// ------------------------------------------------------------
// IMPORTAÇÃO E CONSOLIDAÇÃO COM CATÁLOGO REAL
// ------------------------------------------------------------
const catalogo = vm.runInNewContext(`${fs.readFileSync(new URL("../js/dados/tecnicas-suds.js", import.meta.url), "utf8")}\nTECNICAS_SUDS`);
const variantes = indexarVariantes(catalogo);
const ids = [...variantes.keys()];
const rascunho = importarEspaco(espacos.espacos[0], colecaoVazia(8));
assert.equal(rascunho.identificacao, "Praça revisada");
assert.equal(rascunho.areaDisponivel, calcularArea(vertices));
assert.equal(rascunho.espacoLivreId, "espaco-a");
assert.equal(rascunho.largura, null);
let areas = salvarArea(colecaoVazia(8), { ...rascunho, possiveis: [ids[0], ids[1]] }, "area-propria", variantes);
assert.notEqual(areas.areas[0].id, areas.areas[0].espacoLivreId);
let duplicou = false;
try { importarEspaco(espacos.espacos[0], areas); } catch { duplicou = true; }
assert.ok(duplicou);
const manual = { ...rascunho, identificacao: "Manual" }; delete manual.espacoLivreId;
areas = salvarArea(areas, manual, "area-manual", variantes);
assert.ok(validarColecao(8, areas, variantes));
assert.equal(validarColecao(8, { ...areas, areas: [{ ...areas.areas[0], espacoLivreId: null }] }, variantes), false);
let mapa = consolidarMapa(9, espacos, areas, colecaoVazia(11), catalogo);
assert.ok(mapa[0].vertices);
assert.equal(mapa[0].tecnicas.length, 2);
assert.equal(mapa[0].tecnicas[0].infiltracao, true);
assert.equal(mapa[0].tecnicas[1].infiltracao, false);
assert.equal(mapa[1].vertices, null);
assert.deepEqual(consolidarMapa(9, espacos, colecaoVazia(8), colecaoVazia(11), catalogo), []);
const decisoes = { versao: 1, decisoes: [{ areaId: "area-propria", selecionado: ids[0], possiveis: [ids[0]], motivo: "Escolha", restricaoProjetual: "", observacoes: "" },
  { areaId: "area-sem-origem", selecionado: ids[1], possiveis: [ids[1]], motivo: "Preservar", restricaoProjetual: "", observacoes: "" }] };
mapa = consolidarMapa(12, espacos, areas, decisoes, catalogo);
assert.ok(mapa[0].vertices);
assert.equal(mapa[0].tecnicas[0].id, ids[0]);
assert.equal(mapa[0].motivo, "Escolha");
assert.equal(mapa[1].tecnicas.length, 0);
assert.equal(mapa[2].vertices, null);
const antes = JSON.stringify(areas);
const semOrigem = excluirEspaco(espacos, "espaco-a");
assert.equal(consolidarMapa(9, semOrigem, areas, colecaoVazia(11), catalogo)[0].vertices, null);
assert.equal(JSON.stringify(areas), antes);
assert.deepEqual(consolidarMapa(12, espacos, colecaoVazia(8), colecaoVazia(11), catalogo), []);
console.log("OK: importação explícita, duplicação impedida, cadastro manual, vínculos preservados e mapas 9/12 sem escrita.");

// ------------------------------------------------------------
// ASSOCIAÇÃO POSTERIOR PRESERVA TODOS OS CAMPOS, INCLUSIVE EXTRAS
// ------------------------------------------------------------
const antesAssociacao = structuredClone(areas);
antesAssociacao.areas[1].observacoes = "Observações a preservar";
antesAssociacao.areas[1].campoAdicional = { fonte: "Informação existente" };
const associadas = associarEspaco(antesAssociacao, "area-manual", "espaco-c", espacos);
const esperadoAssociado = structuredClone(antesAssociacao);
esperadoAssociado.areas[1].espacoLivreId = "espaco-c";
assert.deepEqual(associadas, esperadoAssociado);
assert.equal(antesAssociacao.areas[1].espacoLivreId, undefined);
assert.deepEqual(removerAssociacao(associadas, "area-manual"), antesAssociacao);
assert.equal(consolidarMapa(9, espacos, associadas, colecaoVazia(11), catalogo)[1].vertices.length, vertices.length);
assert.equal(consolidarMapa(9, espacos, antesAssociacao, colecaoVazia(11), catalogo)[1].vertices, null);
assert.equal(consolidarMapa(9, espacos, associadas, colecaoVazia(11), catalogo)[1].areaDisponivel, antesAssociacao.areas[1].areaDisponivel);
let conflito = "";
try { associarEspaco(antesAssociacao, "area-manual", "espaco-a", espacos); }
catch (erro) { conflito = erro.message; }
assert.ok(conflito.includes(`Área ${antesAssociacao.areas[0].numero} — ${antesAssociacao.areas[0].identificacao}`));
assert.ok(conflito.includes("Nesta versão"));
let origemAusente = false;
try { associarEspaco(antesAssociacao, "area-manual", "excluido", espacos); } catch { origemAusente = true; }
assert.ok(origemAusente);

// ------------------------------------------------------------
// LEGENDA POR VARIANTE FINAL, SEM CONTAR DECISÕES NÃO MAPEADAS
// ------------------------------------------------------------
const tecnicasMapa = consolidarMapa(12, espacos, areas, decisoes, catalogo);
const primeira = tecnicasMapa[0];
const segunda = { ...primeira, id: "outra-area" };
const terceira = { ...primeira, id: "terceira-area", tecnicas: [tecnicasMapa[2].tecnicas[0]] };
const legenda = legendaCenario([primeira, segunda, terceira, tecnicasMapa[1], tecnicasMapa[2]], catalogo);
assert.equal(legenda.length, 2);
assert.equal(legenda[0].quantidade, 2);
assert.equal(legenda[1].quantidade, 1);
assert.notEqual(legenda[0].cor, legenda[1].cor);
assert.equal(legenda[0].cor, coresDasTecnicas(catalogo).get(primeira.tecnicas[0].id));
assert.deepEqual(legendaCenario([terceira, segunda, primeira], catalogo), legenda);
assert.deepEqual(legendaCenario([tecnicasMapa[1], tecnicasMapa[2]], catalogo), []);
assert.deepEqual(legendaCenario([], catalogo), []);
console.log("OK: associação e remoção preservam todos os campos; exclusividade, área disponível e legenda dinâmica por variante final.");
