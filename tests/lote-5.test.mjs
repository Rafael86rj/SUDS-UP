// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// ------------------------------------------------------------
// Arquivo: tests/lote-5.test.mjs
// Módulo: Testes puros do Lote 5.
// Objetivo: agregação, atualidade e ausência de escrita.
// Responsabilidade: fixtures em memória; não acessa dados do usuário.
// Dependências: Node, catálogo e leitores oficiais.
// Utilizado por: node tests/lote-5.test.mjs.
// Criado em: 07/10/2026
// Última revisão: 07/10/2026
// ------------------------------------------------------------
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { agregarResumoFinal, lerResumoFinal } from "../js/dados/resumo-final.js";
import { formatarPeriodoRetorno } from "../js/resumo-final-interface.js";
import { CHAVE_CENARIO } from "../js/dados/cenario-pre-dimensionamento.js";
import { CHAVE_BACIA, CHAVE_CHUVA, condicionantesVazias } from "../js/dados/lote-1.js";
import { salvarEspaco, importarEspaco } from "../js/dados/lote-3.js";
import { salvarArea, colecaoVazia, indexarVariantes } from "../js/dados/lote-2.js";
const catalogo = vm.runInNewContext(`${fs.readFileSync(new URL("../js/dados/tecnicas-suds.js", import.meta.url), "utf8")}\nTECNICAS_SUDS`);
// Formatação exclusiva da apresentação; inclusive frações além de duas casas.
for (const [valor, texto] of [[10, "10 anos"], [25, "25 anos"], [10.5, "10,5 anos"], [10.123456789, "10,123456789 anos"]]) {
  assert.equal(formatarPeriodoRetorno(valor), texto);
}
assert.equal(formatarPeriodoRetorno(undefined), "Não informado");
const variantes = indexarVariantes(catalogo), variante = [...variantes.keys()][0];
const memoria = new Map();
globalThis.localStorage = {
  // ------------------------------------------------------------
  // LEITURA ISOLADA; QUALQUER ESCRITA NO AGREGADOR FALHARIA
  // ------------------------------------------------------------
  /** @param {string} chave Identificador. @returns {string|null} Fixture sem mutação. */
  getItem(chave) { return memoria.get(chave) ?? null; },
  // ------------------------------------------------------------
  // PROTEÇÃO CONTRA ESCRITA ACIDENTAL DURANTE A LEITURA
  // ------------------------------------------------------------
  /** @returns {void} Rejeita gravações indevidas no resumo. */
  setItem() { throw new Error("Resumo não pode gravar"); }
};
assert.equal(lerResumoFinal(catalogo).temGeografia, false);
const cenario = { versao: 1, proximoNumero: 2, intervencoes: [{ id: "i", numero: 1, variante, area: 100, profundidade: .5, vazios: .9, volume: 999 }] };
const bacia = { versao: 1, areaTotal: 100, areaVegetada: 10, comprimentoTalvegue: 20, cotaMaxima: 10, cotaMinima: 1 };
memoria.set(CHAVE_CENARIO, JSON.stringify(cenario)); memoria.set(CHAVE_BACIA, JSON.stringify(bacia));
for (const [demanda, atende, deficit, percentual] of [[90, false, 45, 50], [45, true, 0, 100], [30, true, 0, 150], [0, true, 0, null]]) {
  memoria.set(CHAVE_CHUVA, JSON.stringify({ versao: 1, volumeChuvaAManejar: demanda, baciaUtilizada: bacia }));
  const antes = [...memoria], resumo = lerResumoFinal(catalogo);
  assert.equal(resumo.avaliacao.capacidade, 45); assert.equal(resumo.intervencoes[0].volume, 45);
  assert.equal(resumo.avaliacao.atende, atende); assert.equal(resumo.deficit, deficit); assert.equal(resumo.avaliacao.percentual, percentual);
  assert.deepEqual([...memoria], antes);
}
memoria.set(CHAVE_BACIA, JSON.stringify({ ...bacia, areaTotal: 101 }));
assert.equal(lerResumoFinal(catalogo).avaliacao.atende, null);
assert.equal(lerResumoFinal(catalogo).fontes[15].estado, "desatualizado");
memoria.set(CHAVE_CENARIO, "{invalid");
assert.equal(lerResumoFinal(catalogo).avaliacao.capacidade, null);
memoria.clear();
const fontes = lerResumoFinal(catalogo).fontes;
const vertices = [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: .01 }, { latitude: .01, longitude: .01 }];
const espacos = salvarEspaco({ versao: 1, proximoNumero: 1, espacos: [] }, { identificacao: "Praça", observacao: "", vertices }, "e");
const area = importarEspaco(espacos.espacos[0], colecaoVazia(8));
const areas = salvarArea(colecaoVazia(8), { ...area, possiveis: [variante] }, "a", variantes);
const decisoes = { versao: 1, decisoes: [{ areaId: "a", selecionado: variante, possiveis: [variante], motivo: "Escolha", restricaoProjetual: "", observacoes: "" }] };
for (let mask = 0; mask < 8; mask++) {
  const f = structuredClone(fontes);
  f[1].dados = mask & 1 ? { pontos: [{ numero: 1, endereco: "Rua", descricao: "", latitude: 0, longitude: 0 }] } : null;
  f[2].dados = mask & 2 ? { vertices, areaM2: 100 } : null;
  if (mask & 4) { f[6].dados = espacos; f[8].dados = areas; f[11].dados = decisoes; }
  const antes = JSON.stringify(f), resumo = agregarResumoFinal(f, catalogo);
  assert.equal(resumo.temGeografia, mask !== 0); assert.equal(resumo.espacializados.length, mask & 4 ? 1 : 0);
  assert.equal(resumo.legenda.length, mask & 4 ? 1 : 0); assert.equal(JSON.stringify(f), antes);
}
fontes[4].dados = condicionantesVazias();
fontes[5].dados = { registros: [{ categoria: "Hidrografia", lacuna: true }, { categoria: "Hidrografia", lacuna: false }] };
const resumo = agregarResumoFinal(fontes, catalogo);
assert.equal(resumo.inventario.total, 2); assert.equal(resumo.inventario.lacunas, 1); assert.equal(resumo.inventario.categorias.Hidrografia, 2);
assert.equal(resumo.condicionantes.grupos.urbanas.situacao, "Não avaliada");
assert.equal(resumo.avaliacao.atende, null);
console.log("OK: resumo parcial/completo, 8 combinações geográficas, recálculo, menor/igual/maior/zero, déficit, chuva desatualizada, inventário e nenhuma escrita.");
