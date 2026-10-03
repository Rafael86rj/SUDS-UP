// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: tests/lote-2.test.mjs
// Módulo: Testes de lógica das Etapas 8, 10 e 11
// Objetivo: Verificar contratos, vínculos, CRUD e persistência defensiva.
// Responsabilidade: Asserções isoladas sem acessar dados reais do navegador.
// Dependências: Node nativo; módulos do Lote 2 e catálogo real lido via vm.
// Utilizado por: Execução manual: node tests/lote-2.test.mjs.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { CAMPOS_AREA, CAMPOS_VISITA, CAMPOS_DECISAO, CHAVES_LOTE_2, ESTADOS_CAMPO,
  indexarVariantes, lerCampos, errosRegistro, validarColecao, colecaoVazia,
  salvarArea, excluirArea, salvarVinculado, buscarVinculado } from "../js/dados/lote-2.js";
import { abrirLote2 } from "../js/dados/armazenamento-lote-2.js";

// O catálogo utilizado é o arquivo de produção, nunca uma lista paralela de IDs.
const catalogo = vm.runInNewContext(`${fs.readFileSync(new URL("../js/dados/tecnicas-suds.js", import.meta.url), "utf8")}\nTECNICAS_SUDS`);
const variantes = indexarVariantes(catalogo);
const ids = [...variantes.keys()];

// ------------------------------------------------------------
// ENTRADAS MÍNIMAS DE TESTE
// ------------------------------------------------------------
/**
 * Produz valores textuais vazios para exercer os mesmos leitores dos formulários.
 * @param {Array} campos Descritores da etapa.
 * @returns {Object} Entradas novas, sem efeitos colaterais.
 */
function textosVazios(campos) {
  const textos = {};
  for (const campo of campos) textos[campo.id] = campo.tipo === "estado" ? "Não avaliado" : "";
  return textos;
}
const textoArea = { ...textosVazios(CAMPOS_AREA), identificacao: "Área de teste", areaDisponivel: "100,25" };
const area = { ...lerCampos(textoArea, CAMPOS_AREA), possiveis: [ids[0], ids[1]] };
assert.deepEqual(errosRegistro(8, area, variantes), {});
assert.equal(area.areaDisponivel, 100.25);
assert.equal(lerCampos({ ...textoArea, areaDisponivel: "100.25" }, CAMPOS_AREA).areaDisponivel, 100.25);
for (const campo of CAMPOS_AREA) if (campo.tipo === "numero" && !campo.obrigatorio) assert.equal(area[campo.id], null);
assert.ok(errosRegistro(8, { ...area, identificacao: "  " }, variantes).identificacao);
for (const valor of ["", "0", "-1", "12abc", "1,2,3", "Infinity", "1e999", "1.000,50"]) {
  const invalida = { ...lerCampos({ ...textoArea, areaDisponivel: valor }, CAMPOS_AREA), possiveis: [] };
  assert.ok(errosRegistro(8, invalida, variantes).areaDisponivel, valor);
}
// Cada opcional respeita o limite específico, sem transformar vazio em zero.
for (const campo of CAMPOS_AREA) {
  if (campo.tipo !== "numero" || campo.obrigatorio) continue;
  assert.ok(errosRegistro(8, { ...area, [campo.id]: -1 }, variantes)[campo.id]);
  assert.ok(errosRegistro(8, { ...area, [campo.id]: NaN }, variantes)[campo.id]);
  assert.equal(Boolean(errosRegistro(8, { ...area, [campo.id]: 0 }, variantes)[campo.id]), Boolean(campo.positivo));
  assert.deepEqual(errosRegistro(8, { ...area, [campo.id]: 1.5 }, variantes), {});
}
for (const possiveis of [["id-inexistente"], [ids[0], ids[0]], null]) assert.ok(errosRegistro(8, { ...area, possiveis }, variantes).possiveis);
assert.deepEqual(errosRegistro(8, { ...area, possiveis: [] }, variantes), {});

// ------------------------------------------------------------
// CRUD E CONTADOR ESTÁVEL DA ETAPA 8
// ------------------------------------------------------------
let areas = salvarArea(colecaoVazia(8), area, "area-a", variantes);
areas = salvarArea(areas, { ...area, identificacao: "Segunda área" }, "area-b", variantes);
const anterior = structuredClone(areas);
areas = salvarArea(areas, { ...area, identificacao: "Área editada" }, "area-a", variantes);
assert.equal(areas.areas[0].numero, 1);
assert.equal(areas.areas[0].id, "area-a");
assert.equal(areas.areas[0].identificacao, "Área editada");
assert.equal(anterior.areas[0].identificacao, "Área de teste");
areas = excluirArea(areas, "area-b");
areas = salvarArea(areas, area, "area-c", variantes);
assert.equal(areas.areas[1].numero, 3);
assert.equal(areas.proximoNumero, 4);
assert.ok(validarColecao(8, areas, variantes));
for (const invalida of [null, {}, { ...areas, versao: 2 }, { ...areas, proximoNumero: 3 },
  { ...areas, areas: [areas.areas[0], areas.areas[0]] }, { ...areas, areas: [{ ...areas.areas[0], largura: "" }] }]) {
  assert.equal(validarColecao(8, invalida, variantes), false);
}
console.log("OK: Etapa 8 — decimais, limites, campos opcionais, catálogo real, CRUD e numeração não reutilizada.");

// ------------------------------------------------------------
// VISTORIA ÚNICA E VÍNCULO COM A ÁREA
// ------------------------------------------------------------
const visita = lerCampos({ ...textosVazios(CAMPOS_VISITA), larguraCalcada: "1,25", observacoes: "Texto <img> literal" }, CAMPOS_VISITA);
let visitas = salvarVinculado(10, colecaoVazia(10), visita, "area-a", areas, variantes);
for (const estado of ESTADOS_CAMPO) {
  visitas = salvarVinculado(10, visitas, { ...visita, postes: estado }, "area-a", areas, variantes);
  assert.equal(visitas.vistorias.length, 1);
  assert.equal(buscarVinculado(visitas, 10, "area-a").postes, estado);
}
assert.equal(buscarVinculado(visitas, 10, "area-a").larguraCalcada, 1.25);
assert.equal(buscarVinculado(visitas, 10, "area-c"), null);
assert.equal(visitas.vistorias[0].observacoes, "Texto <img> literal");
for (const valor of [-1, Infinity, NaN, "2"]) assert.ok(errosRegistro(10, { ...visita, larguraCalcada: valor }, variantes).larguraCalcada);
for (const valor of [null, 0, 2.5]) assert.deepEqual(errosRegistro(10, { ...visita, larguraCalcada: valor }, variantes), {});
assert.ok(errosRegistro(10, { ...visita, postes: "Talvez" }, variantes).postes);
assert.equal(validarColecao(10, { ...visitas, vistorias: [visitas.vistorias[0], visitas.vistorias[0]] }, variantes), false);
assert.equal(validarColecao(10, { ...visitas, versao: 2 }, variantes), false);
let rejeitouVinculo = false;
try { salvarVinculado(10, visitas, visita, "inexistente", colecaoVazia(8), variantes); }
catch { rejeitouVinculo = true; }
assert.ok(rejeitouVinculo);
console.log("OK: Etapa 10 — ausência de origem, vínculo, três estados, largura e atualização sem duplicação.");

// ------------------------------------------------------------
// DECISÃO PÓS-CAMPO E PRESERVAÇÃO DOS ÓRFÃOS
// ------------------------------------------------------------
const decisao = { ...lerCampos(textosVazios(CAMPOS_DECISAO), CAMPOS_DECISAO), possiveis: [ids[0], ids[1]], selecionado: null };
assert.deepEqual(errosRegistro(11, decisao, variantes), {});
assert.ok(errosRegistro(11, { ...decisao, selecionado: ids[0] }, variantes).motivo);
assert.ok(errosRegistro(11, { ...decisao, selecionado: ids[2], motivo: "Escolha" }, variantes).selecionado);
assert.ok(errosRegistro(11, { ...decisao, possiveis: ["desconhecido"] }, variantes).possiveis);
const escolhida = { ...decisao, selecionado: ids[1], motivo: "Justificativa do projetista" };
let decisoes = salvarVinculado(11, colecaoVazia(11), escolhida, "area-a", areas, variantes);
decisoes = salvarVinculado(11, decisoes, decisao, "area-c", areas, variantes);
assert.equal(buscarVinculado(decisoes, 11, "area-a").selecionado, ids[1]);
const semA = excluirArea(areas, "area-a");
const visitaOrfa = structuredClone(visitas.vistorias[0]);
visitas = salvarVinculado(10, visitas, visita, "area-c", semA, variantes);
assert.deepEqual(visitas.vistorias[0], visitaOrfa);
assert.equal(visitas.vistorias.length, 2);
assert.ok(validarColecao(11, decisoes, variantes));
console.log("OK: Etapa 11 — múltiplos revisados, seleção coerente, motivo obrigatório, seleção vazia e preservação de órfãos.");

// ------------------------------------------------------------
// STORAGE ISOLADO COM FALHAS CONTROLADAS
// ------------------------------------------------------------
const memoria = new Map();
let falharLeitura = false;
let falharEscrita = false;
globalThis.localStorage = {
  // ------------------------------------------------------------
  // SIMULAÇÃO DE LEITURA SEM DADOS REAIS
  // ------------------------------------------------------------
  /** @param {string} chave Chave solicitada. @returns {string|null} Valor isolado. */
  getItem(chave) {
    if (falharLeitura) throw new Error("Bloqueado");
    return memoria.get(chave) ?? null;
  },
  // ------------------------------------------------------------
  // SIMULAÇÃO DE CONFIRMAÇÃO OU FALTA DE ESPAÇO
  // ------------------------------------------------------------
  /** @param {string} chave Destino isolado. @param {string} valor JSON. @returns {void} Altera somente memória de teste. */
  setItem(chave, valor) {
    if (falharEscrita) throw new Error("Sem espaço");
    memoria.set(chave, valor);
  }
};
memoria.set("outra-etapa", "preservar");
assert.equal(abrirLote2(10, variantes).dados[8].areas.length, 0);
assert.equal(memoria.size, 1);
assert.ok(abrirLote2(8, variantes).salvar(areas).ok);
assert.ok(abrirLote2(10, variantes).salvar(visitas).ok);
assert.ok(abrirLote2(11, variantes).salvar(decisoes).ok);
const restaurada = abrirLote2(11, variantes);
assert.deepEqual(restaurada.dados[8], areas);
assert.deepEqual(restaurada.dados[10], visitas);
assert.deepEqual(restaurada.dados[11], decisoes);
const snapshot = new Map(memoria);
falharEscrita = true;
assert.equal(restaurada.salvar(decisoes).ok, false);
assert.deepEqual(memoria, snapshot);
falharEscrita = false;
falharLeitura = true;
assert.ok(abrirLote2(8, variantes).erro);
assert.equal(restaurada.salvar(decisoes).ok, false);
falharLeitura = false;

// Mudança em qualquer origem impede salvar decisão baseada em resumos antigos.
for (const etapa of [8, 10, 11]) {
  const sessao = abrirLote2(11, variantes);
  const chave = CHAVES_LOTE_2[etapa];
  const original = memoria.get(chave);
  memoria.set(chave, `${original} `);
  assert.equal(sessao.salvar(decisoes).ok, false);
  memoria.set(chave, original);
}
for (const etapa of [8, 10, 11]) {
  const chave = CHAVES_LOTE_2[etapa];
  const original = memoria.get(chave);
  for (const invalido of ["{", '{"versao":999}', "null"]) {
    memoria.set(chave, invalido);
    const sessao = abrirLote2(etapa, variantes);
    assert.ok(sessao.erro);
    assert.equal(sessao.salvar(colecaoVazia(etapa)).ok, false);
    assert.equal(memoria.get(chave), invalido);
  }
  memoria.set(chave, original);
}
assert.equal(memoria.get("outra-etapa"), "preservar");
console.log("OK: Persistência/restauração das três etapas, JSON incompatível, falhas e concorrência sem sobrescrita.");
