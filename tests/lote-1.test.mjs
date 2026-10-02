import assert from 'node:assert/strict';
import { CAMPOS_BACIA, CHAVE_BACIA, CHAVE_CHUVA, CHAVE_CONDICIONANTES, condicionantesVazias, validarCondicionantes, lerCamposBacia, errosBacia, validarBacia, validarChuva, avaliarCenario } from '../js/dados/lote-1.js';
import { lerRegistro, abrirRegistro } from '../js/dados/armazenamento-lote-1.js';

// ------------------------------------------------------------
// BACIA: DECIMAIS E REGRAS FÍSICAS EXPLICITADAS NO PEDIDO
// ------------------------------------------------------------
const textos = {areaTotal:'100,5', areaVegetada:'20.5', comprimentoTalvegue:'10', cotaMaxima:'-1,5', cotaMinima:'-10'};
const bacia = lerCamposBacia(textos);
assert.ok(validarBacia(bacia));
assert.equal(bacia.areaTotal, 100.5);
assert.equal(bacia.areaVegetada, 20.5);
assert.equal(bacia.cotaMaxima, -1.5);
for (const id of Object.keys(CAMPOS_BACIA)) {
  for (const valor of ['', ' ', '12abc', '1,2,3', '1.000,2', 'Infinity', 'NaN', '1e999']) {
    assert.ok(errosBacia(lerCamposBacia({...textos, [id]:valor}))[id], `${id}: ${valor}`);
  }
  assert.ok(!validarBacia({...bacia, [id]:Infinity}));
}
for (const [id, valor] of [['areaTotal',0], ['areaTotal',-1], ['areaVegetada',-1], ['areaVegetada',101], ['comprimentoTalvegue',0], ['comprimentoTalvegue',-1], ['cotaMaxima',-10], ['cotaMaxima',-11]]) {
  assert.ok(errosBacia({...bacia, [id]:valor})[id]);
}
assert.ok(validarBacia({...bacia, areaVegetada:0}));
assert.ok(validarBacia({...bacia, areaVegetada:bacia.areaTotal}));
assert.ok(!validarBacia({...bacia, versao:2}));
assert.ok(validarCondicionantes(condicionantesVazias()));
const cond = condicionantesVazias();
cond.grupos.urbanas.observacao = '<script>texto literal</script>';
assert.ok(validarCondicionantes(cond));
cond.grupos.urbanas.situacao = 'Critério inventado';
assert.ok(!validarCondicionantes(cond));

// ------------------------------------------------------------
// CONTRATO DE CHUVA E COMPARAÇÃO DO CENÁRIO SEM RESULTADOS FICTÍCIOS
// ------------------------------------------------------------
const variantes = new Set(['jardim-permeavel']);
const cenario = {versao:1, proximoNumero:2, intervencoes:[{id:'um', numero:1, variante:'jardim-permeavel', area:100, profundidade:1.5, vazios:.3, volume:9999}], total:9999};
const chuva = volume => ({versao:1, volumeChuvaAManejar:volume});
for (const entrada of [undefined, null, {}, {versao:2,volumeChuvaAManejar:10}, chuva(-1), chuva('10'), chuva(Infinity), chuva(NaN)]) assert.ok(!validarChuva(entrada));
assert.ok(validarChuva(chuva(0)));
assert.ok(validarChuva(chuva(1.234567)));
for (const c of [null, {...cenario, intervencoes:[]}]) {
  const r = avaliarCenario(c, chuva(30), variantes);
  assert.equal(r.atende, null);
  assert.equal(r.capacidade, null);
  assert.ok(r.pendencias.some(p => p.includes('Nenhuma intervenção')));
}
assert.equal(avaliarCenario(cenario, null, variantes).atende, null);
assert.equal(avaliarCenario({...cenario, versao:2}, chuva(10), variantes).atende, null);
for (const [demanda, atende, percentual] of [[90,false,50], [45,true,100], [30,true,150]]) {
  const r = avaliarCenario(cenario, chuva(demanda), variantes);
  assert.equal(r.capacidade,45);
  assert.equal(r.atende,atende);
  assert.equal(r.percentual,percentual);
}
const zero = avaliarCenario(cenario, chuva(0), variantes);
assert.equal(zero.atende,true);
assert.equal(zero.percentual,null);
assert.equal(avaliarCenario(cenario, chuva(Number.MIN_VALUE), variantes).percentual,null);
assert.equal(avaliarCenario(cenario, chuva(45.00000001), variantes).atende,false);
assert.equal(avaliarCenario({...cenario, intervencoes:[{...cenario.intervencoes[0],vazios:0}]}, chuva(10), variantes).capacidade,0);

// ------------------------------------------------------------
// LEITURA SEM ESCRITA E PROTEÇÃO TRANSACIONAL DOS FORMULÁRIOS
// ------------------------------------------------------------
const memoria = new Map([['outra-chave','preservar']]);
globalThis.localStorage = {getItem:key=>memoria.get(key)??null, setItem:(key,value)=>memoria.set(key,value)};
assert.equal(lerRegistro(CHAVE_CHUVA,validarChuva).estado,'ausente');
assert.ok(!memoria.has(CHAVE_CHUVA));
memoria.set(CHAVE_CHUVA,'{"versao":2}');
assert.equal(lerRegistro(CHAVE_CHUVA,validarChuva).estado,'invalido');
memoria.set(CHAVE_CHUVA,JSON.stringify(chuva(10.123456)));
assert.equal(lerRegistro(CHAVE_CHUVA,validarChuva).dados.volumeChuvaAManejar,10.123456);
for (const [chave, validar, dados] of [[CHAVE_BACIA,validarBacia,bacia], [CHAVE_CONDICIONANTES,validarCondicionantes,condicionantesVazias()]]) {
  const store = abrirRegistro(chave,validar);
  assert.ok(store.salvar(dados).ok);
  assert.deepEqual(lerRegistro(chave,validar).dados,dados);
  for (const raw of ['{invalido','{"versao":9}']) {
    memoria.set(chave,raw);
    assert.equal(abrirRegistro(chave,validar).salvar(dados).ok,false);
    assert.equal(memoria.get(chave),raw);
  }
  memoria.delete(chave);
  const concorrente = abrirRegistro(chave,validar);
  memoria.set(chave,'outra aba');
  assert.equal(concorrente.salvar(dados).ok,false);
}
memoria.delete(CHAVE_BACIA);
const falha = abrirRegistro(CHAVE_BACIA,validarBacia);
globalThis.localStorage.setItem = () => {throw new Error('quota');};
assert.equal(falha.salvar(bacia).ok,false);
globalThis.localStorage.getItem = () => {throw new Error('bloqueado');};
assert.equal(lerRegistro(CHAVE_CHUVA,validarChuva).estado,'erro');
assert.equal(abrirRegistro(CHAVE_BACIA,validarBacia).salvar(bacia).ok,false);
assert.equal(memoria.get('outra-chave'),'preservar');
console.log('OK: condicionantes, validações da bacia, contrato da chuva, estados da avaliação e persistência protegida.');
