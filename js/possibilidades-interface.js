// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/possibilidades-interface.js
// Módulo: Etapa 8 — Possibilidades pré-campo
// Objetivo: Cadastrar áreas candidatas e alternativas indicadas pelo projetista.
// Responsabilidade: CRUD, rascunho, validação, foco e persistência explícita.
// Dependências: Contratos, armazenamento e componentes DOM do Lote 2.
// Utilizado por: js/etapa.js.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import { CAMPOS_AREA, indexarVariantes, errosRegistro, salvarArea, excluirArea } from "./dados/lote-2.js";
import { abrirLote2 } from "./dados/armazenamento-lote-2.js";
import { elemento, botao, linkEtapa, prepararTela, criarCampos, criarPossiveis, lerFormulario, preencherFormulario, mostrarErros, resumo } from "./lote-2-interface.js";

// ------------------------------------------------------------
// CADASTRO PRELIMINAR COM CONFIRMAÇÃO EXPLÍCITA
// ------------------------------------------------------------
/**
 * Inicializa a Etapa 8 mantendo rascunho separado da coleção confirmada.
 * @param {Element} container Região específica criada pelo controlador.
 * @param {Array} catalogo TECNICAS_SUDS compartilhado.
 * @returns {void} Renderiza DOM e eventos; grava só a chave da Etapa 8 ao confirmar.
 */
export function iniciarPossibilidades(container, catalogo) {
  const variantes = indexarVariantes(catalogo);
  const sessao = abrirLote2(8, variantes);
  const { informar, status } = prepararTela(container, "Possibilidades preliminares por área", sessao);
  let dados = sessao.dados[8];
  let editando = null;
  let alterado = false;
  const formulario = elemento(container, "form");
  formulario.id = "lote2-formulario";
  formulario.noValidate = true;
  const titulo = elemento(formulario, "h3", "Nova área");
  const controles = criarCampos(formulario, "Características preliminares", CAMPOS_AREA);
  elemento(formulario, "p", "Campos numéricos opcionais vazios significam não informado. Use vírgula ou ponto decimal, sem separador de milhar. Permeabilidade e interferências são descrições livres.", "card__subtitulo");
  const possiveis = criarPossiveis(formulario, "SUDS preliminarmente possíveis", variantes);
  const acoes = elemento(formulario, "div", "", "lote2-acoes");
  const salvar = elemento(acoes, "button", "Adicionar área", "botao botao--primario");
  salvar.type = "submit";
  const cancelar = botao(acoes, "Limpar rascunho", limpar);
  // A confirmação fica junto da ação mesmo no formulário longo em celular.
  formulario.append(status);
  const tituloLista = elemento(container, "h3", "Áreas cadastradas");
  tituloLista.tabIndex = -1;
  const lista = elemento(container, "div", "", "lote2-lista");
  lista.id = "lote2-lista";

  // ------------------------------------------------------------
  // LIMPEZA APENAS DO RASCUNHO
  // ------------------------------------------------------------
  /** @returns {void} Encerra edição sem mudar dados confirmados; atualiza DOM/foco. */
  function limpar() {
    editando = null;
    alterado = false;
    preencherFormulario(controles, CAMPOS_AREA, null, possiveis);
    mostrarErros(formulario, {}, false);
    titulo.textContent = "Nova área";
    salvar.textContent = "Adicionar área";
    cancelar.textContent = "Limpar rascunho";
    informar("Rascunho limpo. Os registros confirmados foram mantidos.");
    controles.identificacao.focus();
  }

  // ------------------------------------------------------------
  // ABERTURA DE ÁREA EXISTENTE SEM GRAVAÇÃO
  // ------------------------------------------------------------
  /**
   * Copia dados para os controles; pede confirmação se substituir outro rascunho.
   * @param {Object} area Registro confirmado a editar.
   * @returns {void} Atualiza DOM/foco; não altera a coleção.
   */
  function editar(area) {
    if (alterado && !window.confirm("Descartar as alterações não salvas deste rascunho?")) return;
    editando = area.id;
    alterado = false;
    preencherFormulario(controles, CAMPOS_AREA, area, possiveis);
    mostrarErros(formulario, {}, false);
    titulo.textContent = `Editar Área ${area.numero}`;
    salvar.textContent = "Salvar alterações";
    cancelar.textContent = "Cancelar edição";
    informar("Edição aberta. Salve para confirmar as alterações.");
    controles.identificacao.focus();
  }

  // ------------------------------------------------------------
  // CARDS RESPONSIVOS DOS REGISTROS CONFIRMADOS
  // ------------------------------------------------------------
  /** @returns {void} Reconstrói a lista após confirmação, sem modificar storage. */
  function renderizarLista() {
    lista.replaceChildren();
    tituloLista.textContent = `Áreas cadastradas (${dados.areas.length})`;
    if (!dados.areas.length) elemento(lista, "p", sessao.erro ? "A leitura dos registros está indisponível. Confira o aviso de armazenamento." : "Nenhuma área cadastrada. Preencha o formulário para adicionar a primeira.");
    for (const area of dados.areas) {
      const card = elemento(lista, "article", "", "lote2-registro");
      card.dataset.areaId = area.id;
      elemento(card, "h4", `Área ${area.numero} — ${area.identificacao}`);
      elemento(card, "p", `Área disponível: ${String(area.areaDisponivel).replace(".", ",")} m²`);
      const detalhes = elemento(card, "details");
      elemento(detalhes, "summary", `Ver dados da Área ${area.numero}`);
      resumo(detalhes, "Levantamento preliminar", area, CAMPOS_AREA, variantes);
      const botoes = elemento(card, "div", "", "lote2-acoes");

      // ------------------------------------------------------------
      // EDIÇÃO ACIONADA PELO CARD
      // ------------------------------------------------------------
      /** @returns {void} Abre o registro deste card no rascunho, sem salvar. */
      function abrirEdicao() { editar(area); }
      botao(botoes, `Editar Área ${area.numero}`, abrirEdicao);

      // ------------------------------------------------------------
      // EXCLUSÃO CONFIRMADA SEM CASCATA
      // ------------------------------------------------------------
      /** @returns {void} Exclui só na Etapa 8 após confirmar e gravar com sucesso. */
      function excluir() {
        if (!window.confirm(`Excluir Área ${area.numero} — ${area.identificacao}? Vistorias e decisões vinculadas serão preservadas para evitar perda de dados.`)) return;
        const novos = excluirArea(dados, area.id);
        const resultado = sessao.salvar(novos);
        if (!resultado.ok) { informar(resultado.mensagem, true); return; }
        dados = novos;
        if (editando === area.id) limpar();
        renderizarLista();
        tituloLista.focus();
        informar(`Área ${area.numero} excluída. As outras etapas e a numeração foram preservadas.`);
      }
      botao(botoes, `Excluir Área ${area.numero}`, excluir);
      linkEtapa(botoes, `Vistoriar Área ${area.numero}`, 10, { area: area.id });
    }
  }

  // ------------------------------------------------------------
  // SALVAMENTO APÓS VALIDAÇÃO E PROTEÇÃO ENTRE ABAS
  // ------------------------------------------------------------
  /**
   * Confirma inclusão/edição somente após gravação; falha preserva rascunho.
   * @param {SubmitEvent} evento Envio por botão ou teclado.
   * @returns {void} Pode gravar a chave da Etapa 8 e atualizar lista/foco.
   */
  function confirmar(evento) {
    evento.preventDefault();
    const entradas = lerFormulario(controles, CAMPOS_AREA, possiveis);
    if (!mostrarErros(formulario, errosRegistro(8, entradas, variantes))) {
      informar("Confira os campos indicados. A área não foi salva.", true);
      return;
    }
    try {
      const novos = salvarArea(dados, entradas, editando ?? crypto.randomUUID(), variantes);
      const resultado = sessao.salvar(novos);
      if (!resultado.ok) { informar(resultado.mensagem, true); return; }
      dados = novos;
      limpar();
      renderizarLista();
      informar("Área salva neste navegador.");
    } catch (erro) { informar(erro.message, true); }
  }

  // ------------------------------------------------------------
  // RASCUNHO EDITADO NÃO É CONFIRMAÇÃO
  // ------------------------------------------------------------
  /** @returns {void} Limpa confirmação antiga e marca edição; não grava dados. */
  function marcarRascunho() {
    alterado = true;
    mostrarErros(formulario, {}, false);
    informar("Rascunho alterado. Salve para confirmar.");
  }
  formulario.addEventListener("submit", confirmar);
  formulario.addEventListener("input", marcarRascunho);
  renderizarLista();
  // O link vindo das etapas seguintes abre a área sem exigir buscá-la novamente.
  const areaSolicitada = new URLSearchParams(window.location.search).get("area");
  for (const area of dados.areas) if (area.id === areaSolicitada) editar(area);
}
