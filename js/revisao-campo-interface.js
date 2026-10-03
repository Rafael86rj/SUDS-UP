// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/revisao-campo-interface.js
// Módulo: Etapa 11 — Revisão pós-campo e escolha do SUDS
// Objetivo: Consolidar fontes e registrar a decisão do projetista.
// Responsabilidade: Resumos de leitura, alternativas revisadas e escolha final.
// Dependências: Contratos, persistência e componentes DOM do Lote 2.
// Utilizado por: js/etapa.js; decisões poderão ser consumidas pela futura Etapa 12.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import { CAMPOS_DECISAO, indexarVariantes, errosRegistro, buscarVinculado, salvarVinculado } from "./dados/lote-2.js";
import { abrirLote2 } from "./dados/armazenamento-lote-2.js";
import { elemento, botao, prepararTela, criarCampos, criarPossiveis, lerFormulario, preencherFormulario, mostrarErros, informarOrfaos, criarSeletorArea, mostrarOrigens } from "./lote-2-interface.js";

// ------------------------------------------------------------
// DECISÃO INDEPENDENTE DOS REGISTROS DE ORIGEM
// ------------------------------------------------------------
/**
 * Apresenta pré-campo/vistoria e permite confirmar uma decisão por área.
 * @param {Element} container Região específica disponibilizada pelo controlador.
 * @param {Array} catalogo TECNICAS_SUDS compartilhado.
 * @returns {void} Renderiza DOM; grava exclusivamente a chave da Etapa 11.
 */
export function iniciarRevisaoCampo(container, catalogo) {
  const variantes = indexarVariantes(catalogo);
  const sessao = abrirLote2(11, variantes);
  const { informar, status } = prepararTela(container, "Revisão pós-campo e escolha do SUDS", sessao);
  // Fontes incompatíveis não viram resumos vazios nem decisões substitutas.
  if (!["valido", "ausente"].includes(sessao.leituras[8].estado)
      || !["valido", "ausente"].includes(sessao.leituras[10].estado)) return;
  informarOrfaos(container, sessao);
  const areas = sessao.dados[8];
  const seletor = criarSeletorArea(container, areas.areas);
  if (!seletor) return;
  let areaAtual = seletor.value;
  let alterado = false;
  let dados = sessao.dados[11];
  const origem = elemento(container, "div");
  origem.id = "lote2-origens";
  const formulario = elemento(container, "form");
  formulario.id = "lote2-formulario";
  formulario.noValidate = true;
  elemento(formulario, "h3", "Decisão pós-campo");
  const controles = criarCampos(formulario, "Justificativas do projetista", CAMPOS_DECISAO);
  const possiveis = criarPossiveis(formulario, "SUDS possíveis revisados", variantes);
  const caixa = elemento(formulario, "div", "", "campo");
  elemento(caixa, "label", "SUDS selecionado (opcional)").htmlFor = "lote2-selecionado";
  const selecionado = elemento(caixa, "select");
  selecionado.id = "lote2-selecionado";
  selecionado.setAttribute("aria-describedby", "lote2-selecionado-erro");
  selecionado.add(new Option("Nenhum SUDS selecionado", ""));
  // Todas as variantes permanecem visíveis: uma escolha removida dos revisados
  // recebe erro explícito ao salvar, em vez de ser apagada silenciosamente.
  for (const [id, variante] of variantes) selecionado.add(new Option(variante.nome, id));
  elemento(caixa, "small", "", "lote2-erro").id = "lote2-selecionado-erro";
  elemento(formulario, "p", "A escolha final deve estar entre os possíveis revisados e exige um motivo. É válido manter a escolha vazia. Ao iniciar uma revisão, as possibilidades preliminares são copiadas apenas para o rascunho, sem seleção automática.", "card__subtitulo");
  const acoes = elemento(formulario, "div", "", "lote2-acoes");
  const salvar = elemento(acoes, "button", "Salvar decisão pós-campo", "botao botao--primario");
  salvar.type = "submit";
  botao(acoes, "Descartar alterações", restaurar);
  // Evita que a confirmação fique distante da ação em telas pequenas.
  formulario.append(status);

  // ------------------------------------------------------------
  // RESTAURAÇÃO SEM REDIGITAR AS FONTES
  // ------------------------------------------------------------
  /** @returns {void} Preenche resumos e rascunho, sem modificar as três coleções. */
  function restaurar() {
    let area;
    for (const registro of areas.areas) if (registro.id === areaAtual) area = registro;
    const visita = buscarVinculado(sessao.dados[10], 10, areaAtual);
    const decisao = buscarVinculado(dados, 11, areaAtual);
    mostrarOrigens(origem, area, visita, variantes, true);
    preencherFormulario(controles, CAMPOS_DECISAO, decisao ?? { possiveis: area.possiveis }, possiveis);
    selecionado.value = decisao?.selecionado ?? "";
    controles.motivo.required = Boolean(selecionado.value);
    mostrarErros(formulario, {}, false);
    alterado = false;
    informar(decisao ? "Decisão pós-campo confirmada recuperada." : "Nova revisão. Nenhum SUDS foi selecionado automaticamente.");
  }

  // ------------------------------------------------------------
  // MUDANÇA DO VÍNCULO ATUAL
  // ------------------------------------------------------------
  /** @returns {void} Troca a área com proteção do rascunho não salvo. */
  function trocarArea() {
    if (alterado && !window.confirm("Descartar as alterações não salvas antes de trocar de área?")) { seletor.value = areaAtual; return; }
    areaAtual = seletor.value;
    restaurar();
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO DA COERÊNCIA ENTRE POSSÍVEIS E SELECIONADO
  // ------------------------------------------------------------
  /**
   * Rejeita escolha fora do conjunto revisado ou sem motivo, mantendo entradas.
   * @param {SubmitEvent} evento Envio por botão/teclado.
   * @returns {void} Pode gravar a Etapa 11; nunca escreve nas Etapas 8/10.
   */
  function confirmar(evento) {
    evento.preventDefault();
    const entradas = lerFormulario(controles, CAMPOS_DECISAO, possiveis);
    entradas.selecionado = selecionado.value || null;
    if (!mostrarErros(formulario, errosRegistro(11, entradas, variantes))) { informar("Confira os campos indicados. A decisão não foi salva.", true); return; }
    const novos = salvarVinculado(11, dados, entradas, areaAtual, areas, variantes);
    const resultado = sessao.salvar(novos);
    if (!resultado.ok) { informar(resultado.mensagem, true); return; }
    dados = novos;
    alterado = false;
    informar("Decisão pós-campo salva neste navegador.");
  }

  // ------------------------------------------------------------
  // EDIÇÃO DA DECISÃO SEM SALVAMENTO AUTOMÁTICO
  // ------------------------------------------------------------
  /** @returns {void} Atualiza obrigatoriedade/status sem alterar escolhas. */
  function marcarRascunho() {
    alterado = true;
    controles.motivo.required = Boolean(selecionado.value);
    mostrarErros(formulario, {}, false);
    informar("Rascunho alterado. Salve para confirmar a decisão pós-campo.");
  }
  seletor.addEventListener("change", trocarArea);
  formulario.addEventListener("input", marcarRascunho);
  formulario.addEventListener("submit", confirmar);
  restaurar();
}
