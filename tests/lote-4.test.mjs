// ------------------------------------------------------------
// Arquivo: tests/lote-4.test.mjs — 06/10/2026
// Objetivo: Referência independente, limites numéricos e contratos do Lote 4.
// Responsabilidade: Testes Node com armazenamento isolado; sem dados do usuário.
// ------------------------------------------------------------
import assert from "node:assert/strict";
import { calcularChuva, calcularIntensidadeIDF, calcularConcentracao } from "../js/calculos/chuva-projeto.js";
import { POSTOS_PLUVIOMETRICOS } from "../js/dados/postos-pluviometricos.js";
import { criarResultadoChuva, validarResultadoChuva, chuvaAtual, validarMapeamento, salvarItemMapeamento, CHAVE_MAPEAMENTO } from "../js/dados/lote-4.js";
import { abrirRegistro } from "../js/dados/armazenamento-lote-1.js";
import { lerChuvaAtual } from "../js/dados/armazenamento-lote-4.js";
import { CHAVE_BACIA, CHAVE_CHUVA } from "../js/dados/lote-1.js";
const bacia = { versao: 1, areaTotal: 1039587, areaVegetada: 276339, comprimentoTalvegue: 1292.2, cotaMaxima: 209.9, cotaMinima: 2.84 };
const parametros = { modo: "posto", postoId: "jardim-botanico", ...POSTOS_PLUVIOMETRICOS[4], TR: 10, runoff: .4 };
const resultado = criarResultadoChuva(bacia, parametros);
const referencia = { P: .2658161366004, L_km: 1.2922, S: .1602383531961, tcMin: 18.5624377391, tcHoras: 18.5624377391 / 60, intensidade: 117.3031274299, alturaMm: 36.2905333253, alturaM: .0362905333253, areaUrbana: 763248, volumeChuvaAManejar: 11079.4707917757 };
for (const [id, esperado] of Object.entries(referencia)) assert.ok(Math.abs(resultado[id] - esperado) < 1e-8, id);
assert.equal(new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(resultado.volumeChuvaAManejar), "11.079,47");
assert.ok(Math.abs(resultado.intensidade - 124.53) > 7, "Fórmula divergente da planilha não é aceita");
assert.equal(resultado.volumeChuvaAManejar, parametros.runoff * resultado.alturaM * resultado.areaUrbana);
assert.notEqual(resultado.volumeChuvaAManejar, Number(resultado.volumeChuvaAManejar.toFixed(2)));
assert.equal(calcularChuva(bacia, { ...parametros, runoff: 0 }).volumeChuvaAManejar, 0);
assert.equal(calcularChuva({ ...bacia, areaVegetada: bacia.areaTotal }, parametros).volumeChuvaAManejar, 0);
assert.equal(criarResultadoChuva(bacia, { ...parametros, modo: "manual", postoId: null }).volumeChuvaAManejar, resultado.volumeChuvaAManejar);
for (const campo of ["a", "b", "c", "d", "TR", "runoff"]) {
  for (const valor of [NaN, Infinity, -Infinity, "", "1abc"]) assert.throws(() => calcularChuva(bacia, { ...parametros, [campo]: valor }));
}
for (const valor of [0, -1]) assert.throws(() => calcularChuva(bacia, { ...parametros, TR: valor }));
for (const valor of [-.1, 1.1]) assert.throws(() => calcularChuva(bacia, { ...parametros, runoff: valor }));
assert.throws(() => calcularChuva(bacia, { ...parametros, a: 0 }));
assert.throws(() => calcularChuva(bacia, { ...parametros, c: -resultado.tcMin }));
assert.throws(() => calcularChuva(bacia, { ...parametros, a: Number.MAX_VALUE }));
assert.throws(() => calcularChuva(bacia, { ...parametros, b: 1000 }));
assert.throws(() => calcularChuva(bacia, { ...parametros, d: 1000 }));
assert.throws(() => calcularConcentracao({ ...bacia, cotaMaxima: Number.MAX_VALUE, cotaMinima: -Number.MAX_VALUE }));
for (const campo of Object.keys(bacia).filter(id => id !== "versao")) assert.throws(() => calcularChuva({ ...bacia, [campo]: Infinity }, parametros));
assert.ok(calcularIntensidadeIDF(10, -1, -1, -1, 10, 2) > 0, "Não inventa limites para b/c/d");
assert.equal(validarResultadoChuva(resultado), true);
assert.equal(validarResultadoChuva({ ...resultado, volumeChuvaAManejar: 124.53 }), false);
assert.equal(validarResultadoChuva({ versao: 1, volumeChuvaAManejar: 0 }), true);
assert.equal(chuvaAtual({ versao: 1, volumeChuvaAManejar: 0 }, bacia), false);
for (const id of Object.keys(bacia).filter(id => id !== "versao")) assert.equal(chuvaAtual(resultado, { ...bacia, [id]: bacia[id] + 1 }), false);
assert.equal(chuvaAtual(resultado, null), false);
assert.equal(chuvaAtual(resultado, { ...bacia, observacao: "não física" }), true);
assert.equal(POSTOS_PLUVIOMETRICOS.length, 12);
assert.deepEqual(POSTOS_PLUVIOMETRICOS.map(p => [p.a, p.b, p.c, p.d]), [[711.3,.18,7,.687],[891.6,.18,14,.689],[843.7,.17,12,.698],[1208,.17,14,.788],[1239,.15,20,.74],[921.3,.16,15.4,.673],[1423,.19,14.5,.796],[1782,.17,16.6,.841],[7032,.15,26.6,.141],[1164,.14,6.96,.769],[5986,.15,29.7,1.05],[1660,.15,14.7,.841]]);
console.log("OK: referência 11079.470791775657 m³, TR^b, unidades, precisão, zeros e rejeição de cálculos inválidos/overflow.");

const entrada = { categoria: "Hidrografia", identificacao: "Mapa", fonte: "Órgão", referenciaTemporal: "2026", observacoes: "Texto", lacuna: true };
let inventario = salvarItemMapeamento({ versao: 1, proximoNumero: 1, registros: [] }, entrada, "a");
inventario = salvarItemMapeamento(inventario, { ...entrada, fonte: "Revisada" }, "a");
assert.equal(inventario.proximoNumero, 2); assert.equal(inventario.registros[0].numero, 1);
inventario = salvarItemMapeamento({ ...inventario, registros: [] }, entrada, "b");
assert.equal(inventario.registros[0].numero, 2);
assert.equal(validarMapeamento({ ...inventario, registros: [...inventario.registros, ...inventario.registros] }), false);
assert.throws(() => salvarItemMapeamento(inventario, { ...entrada, fonte: "" }, "c"));

// ------------------------------------------------------------
// STORAGE DE TESTE SEM ACESSO A NAVEGADOR REAL
// ------------------------------------------------------------
const dados = new Map();
globalThis.localStorage = {
  /** @param {string} chave ID. @returns {string|null} Conteúdo isolado. */
  getItem(chave) { return dados.get(chave) ?? null; },
  /** @param {string} chave ID. @param {string} valor Texto. @returns {void} Grava apenas no Map de teste. */
  setItem(chave, valor) { dados.set(chave, valor); }
};
const sessao = abrirRegistro(CHAVE_MAPEAMENTO, validarMapeamento);
assert.equal(sessao.salvar(inventario).ok, true);
dados.set(CHAVE_MAPEAMENTO, "{invalido");
assert.equal(sessao.salvar(inventario).ok, false);
assert.equal(abrirRegistro(CHAVE_MAPEAMENTO, validarMapeamento).salvar(inventario).ok, false);
assert.equal(dados.get(CHAVE_MAPEAMENTO), "{invalido");
assert.equal(lerChuvaAtual().estado, "ausente");
dados.set(CHAVE_CHUVA, JSON.stringify(resultado));
assert.equal(lerChuvaAtual().estado, "desatualizado");
dados.set(CHAVE_BACIA, JSON.stringify(bacia));
assert.equal(lerChuvaAtual().estado, "valido");
dados.set(CHAVE_BACIA, JSON.stringify({ ...bacia, areaTotal: 2e6 }));
assert.equal(lerChuvaAtual().dados, null);
assert.equal(dados.get(CHAVE_CHUVA), JSON.stringify(resultado));
console.log("OK: inventário, IDs/números, persistência defensiva, compatibilidade e snapshot desatualizado sem apagar dados.");
