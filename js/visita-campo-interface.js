// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/visita-campo-interface.js
// Módulo: Etapa 10 — Visita de campo
// Objetivo: Registrar constatações in loco para uma área já cadastrada.
// Responsabilidade: Seleção, resumo pré-campo, rascunho e gravação da vistoria.
// Dependências: Contratos, persistência e elementos comuns do Lote 2.
// Utilizado por: js/etapa.js.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import { CAMPOS_VISITA, indexarVariantes, errosRegistro, buscarVinculado, salvarVinculado } from "./dados/lote-2.js";
import { abrirLote2 } from "./dados/armazenamento-lote-2.js";
import { elemento, botao, prepararTela, criarCampos, lerFormulario, preencherFormulario, mostrarErros, informarOrfaos, criarSeletorArea, mostrarOrigens } from "./lote-2-interface.js";

// ------------------------------------------------------------
// VISTORIA ÚNICA POR ÁREA CONFIRMADA
// ------------------------------------------------------------
/**
 * Abre registros da Etapa 8 e salva apenas constatações na chave da Etapa 10.
 * @param {Element} container Região de trabalho específica.
 * @param {Array} catalogo Catálogo compartilhado.
 * @returns {void} Renderiza e registra eventos; leitura nunca cria dados.
 */
export function iniciarVisitaCampo(container, catalogo) {
  const variantes = indexarVariantes(catalogo);
  const sessao = abrirLote2(10, variantes);
  const { informar, status } = prepararTela(container, "Registro da visita de campo", sessao);
  // Uma origem ilegível não deve ser apresentada como ausência de áreas.
  if (!["valido", "ausente"].includes(sessao.leituras[8].estado)) return;
  informarOrfaos(container, sessao);
  const areas = sessao.dados[8];
  const seletor = criarSeletorArea(container, areas.areas);
  if (!seletor) return;
  let areaAtual = seletor.value;
  let alterado = false;
  let dados = sessao.dados[10];
  const origem = elemento(container, "div");
  origem.id = "lote2-origens";
  const formulario = elemento(container, "form");
  formulario.id = "lote2-formulario";
  formulario.noValidate = true;
  const controles = criarCampos(formulario, "Constatações da visita", CAMPOS_VISITA);
  elemento(formulario, "p", "A largura útil é opcional e deve ser maior ou igual a zero. Use vírgula ou ponto decimal, sem separador de milhar.", "card__subtitulo");
  const acoes = elemento(formulario, "div", "", "lote2-acoes");
  const salvar = elemento(acoes, "button", "Salvar vistoria", "botao botao--primario");
  salvar.type = "submit";
  botao(acoes, "Descartar alterações", restaurar);
  // Mantém o anúncio de sucesso/erro visível junto ao botão de confirmação.
  formulario.append(status);

  // ------------------------------------------------------------
  // RESTAURAÇÃO DO REGISTRO DA ÁREA ATUAL
  // ------------------------------------------------------------
  /** @returns {void} Recupera controles/resumo; não escreve na Etapa 8 nem 10. */
  function restaurar() {
    const visita = buscarVinculado(dados, 10, areaAtual);
    preencherFormulario(controles, CAMPOS_VISITA, visita);
    mostrarErros(formulario, {}, false);
    for (const area of areas.areas) if (area.id === areaAtual) mostrarOrigens(origem, area, null, variantes);
    alterado = false;
    informar(visita ? "Vistoria confirmada recuperada." : "Ainda não há vistoria registrada para esta área.");
  }

  // ------------------------------------------------------------
  // TROCA DE ÁREA SEM DESCARTE SILENCIOSO
  // ------------------------------------------------------------
  /** @returns {void} Troca o vínculo após confirmar eventual perda de rascunho. */
  function trocarArea() {
    if (alterado && !window.confirm("Descartar as alterações não salvas antes de trocar de área?")) { seletor.value = areaAtual; return; }
    areaAtual = seletor.value;
    restaurar();
  }

  // ------------------------------------------------------------
  // ATUALIZAÇÃO DA VISTORIA SEM DUPLICAÇÃO
  // ------------------------------------------------------------
  /**
   * Valida entradas e confirma uma única vistoria no vínculo areaId.
   * @param {SubmitEvent} evento Envio do formulário.
   * @returns {void} Grava somente a chave da Etapa 10; falha mantém rascunho.
   */
  function confirmar(evento) {
    evento.preventDefault();
    const entradas = lerFormulario(controles, CAMPOS_VISITA);
    if (!mostrarErros(formulario, errosRegistro(10, entradas, variantes))) { informar("Confira os campos indicados. A vistoria não foi salva.", true); return; }
    const novos = salvarVinculado(10, dados, entradas, areaAtual, areas, variantes);
    const resultado = sessao.salvar(novos);
    if (!resultado.ok) { informar(resultado.mensagem, true); return; }
    dados = novos;
    alterado = false;
    informar("Vistoria salva neste navegador.");
  }

  // ------------------------------------------------------------
  // SINALIZAÇÃO DE EDIÇÃO AINDA NÃO CONFIRMADA
  // ------------------------------------------------------------
  /** @returns {void} Atualiza status e erros; não persiste entradas. */
  function marcarRascunho() {
    alterado = true;
    mostrarErros(formulario, {}, false);
    informar("Rascunho alterado. Salve para confirmar a vistoria.");
  }
  seletor.addEventListener("change", trocarArea);
  formulario.addEventListener("input", marcarRascunho);
  formulario.addEventListener("submit", confirmar);
  restaurar();
}
