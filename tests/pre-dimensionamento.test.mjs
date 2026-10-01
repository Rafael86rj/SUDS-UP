import assert from 'node:assert/strict';
import { lerDecimal, calcularVolumeIntervencao, calcularTotalIntervencoes } from '../js/calculos/pre-dimensionamento.js';
import { PARAMETROS_PRE_DIMENSIONAMENTO } from '../js/dados/parametros-pre-dimensionamento.js';
import { CHAVE_CENARIO, abrirCenario, validarCenario } from '../js/dados/cenario-pre-dimensionamento.js';

// ------------------------------------------------------------
// CÁLCULO E VALIDAÇÃO, SEM DOM OU ARMAZENAMENTO DO USUÁRIO
// ------------------------------------------------------------
assert.equal(calcularVolumeIntervencao(100, 1.5, .3), 45);
assert.equal(calcularVolumeIntervencao(100, 1.2, .3), 36);
assert.equal(calcularVolumeIntervencao(100, 2, .4), 80);
assert.equal(calcularTotalIntervencoes([{area:100, profundidade:1.5, vazios:.3}, {area:100, profundidade:1.2, vazios:.3}]), 81);
const variantes = new Set(Object.keys(PARAMETROS_PRE_DIMENSIONAMENTO));
assert.equal(variantes.size, 8);
const todas = [...variantes].map((variante, i) => ({ id: `id-${i}`, numero: i + 1, variante, area: 100, ...PARAMETROS_PRE_DIMENSIONAMENTO[variante] }));
// A especificação informa 633,60, mas a soma dos oito padrões é 533,60.
assert.ok(Math.abs(calcularTotalIntervencoes(todas) - 533.6) < 1e-10);
assert.equal(lerDecimal('1,50'), 1.5);
assert.equal(lerDecimal('1.50'), 1.5);
for (const value of ['', ' ', '1,2,3', '1.000,50', '12abc', 'Infinity']) assert.ok(Number.isNaN(lerDecimal(value)));
for (const args of [[0,1,1], [-1,1,1], [1,0,1], [1,1,-.1], [1,1,1.1], [Infinity,1,1], [1,NaN,1], [1,1,Infinity], [1e308,2,1]]) {
  assert.throws(() => calcularVolumeIntervencao(...args));
}
assert.equal(calcularVolumeIntervencao(1e308, 2, 0), 0);
assert.ok(Math.abs(calcularVolumeIntervencao(1e308, 2, .1) / 2e307 - 1) <= Number.EPSILON);
assert.throws(() => calcularTotalIntervencoes([{area:1e308, profundidade:1, vazios:1}, {area:1e308, profundidade:1, vazios:1}]));
assert.equal(calcularTotalIntervencoes(Array.from({length: 3}, () => ({ area: .004, profundidade: 1, vazios: 1 }))), .012);

// ------------------------------------------------------------
// PERSISTÊNCIA TRANSACIONAL SIMULADA E VOLUMES RECALCULADOS
// ------------------------------------------------------------
const memory = new Map([['suds-up:etapa-1:pontos-alagamento:v1', 'preservar']]);
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
const dados = {versao:1, proximoNumero:9, intervencoes:todas};
assert.ok(validarCenario(dados, variantes));
assert.ok(!validarCenario({...dados, proximoNumero:8}, variantes));
assert.ok(!validarCenario({...dados, intervencoes:[todas[0], todas[0]]}, variantes));
assert.ok(!validarCenario({...dados, intervencoes:[{...todas[0], variante:'inexistente'}]}, variantes));
const store = abrirCenario(variantes);
assert.ok(store.salvar(dados).ok);
memory.set(CHAVE_CENARIO, JSON.stringify({...dados, total:9999, intervencoes:todas.map(i => ({...i, volume:9999}))}));
const restored = abrirCenario(variantes).dados;
assert.ok(!('volume' in restored.intervencoes[0]));
assert.ok(Math.abs(calcularTotalIntervencoes(restored.intervencoes) - 533.6) < 1e-10);
for (const raw of ['{invalido', '{"versao":9}', JSON.stringify({...dados, intervencoes:[{...todas[0], area:-1}]})]) {
  memory.set(CHAVE_CENARIO, raw);
  const blocked = abrirCenario(variantes);
  assert.ok(blocked.erro);
  assert.equal(blocked.salvar(dados).ok, false);
  assert.equal(memory.get(CHAVE_CENARIO), raw);
}
memory.delete(CHAVE_CENARIO);
const concurrent = abrirCenario(variantes);
memory.set(CHAVE_CENARIO, 'outra aba');
assert.equal(concurrent.salvar(dados).ok, false);
memory.delete(CHAVE_CENARIO);
const failed = abrirCenario(variantes);
globalThis.localStorage.setItem = () => {throw new Error('quota');};
assert.equal(failed.salvar(dados).ok, false);
globalThis.localStorage.getItem = () => {throw new Error('denied');};
assert.ok(abrirCenario(variantes).erro);
assert.equal(memory.get('suds-up:etapa-1:pontos-alagamento:v1'), 'preservar');
console.log('OK: fórmula, decimais, oito padrões (533,60 m³), precisão, validações e falhas de persistência.');
