// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/possibilidades-interface.js
// Módulo: Etapa 8 — Possibilidades pré-campo
// Objetivo: Cadastrar áreas candidatas e alternativas indicadas pelo projetista.
// Responsabilidade: CRUD, rascunho, validação, foco e persistência explícita.
// Dependências: Contratos, armazenamento e componentes DOM do Lote 2.
// Utilizado por: js/etapa.js.
// Criado em: 03/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { CAMPOS_AREA, indexarVariantes, errosRegistro, salvarArea, excluirArea } from "./dados/lote-2.js";
import { abrirLote2 } from "./dados/armazenamento-lote-2.js";
import { importarEspaco, associarEspaco, removerAssociacao } from "./dados/lote-3.js";
import { lerGeometria } from "./dados/armazenamento-lote-3.js";
import { integrarEspacos } from "./lote-3-integracoes.js";
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
  // A origem acompanha apenas o rascunho importado; o ID da área será próprio.
  let espacoLivreId;
  let origemEspaco = null;
  const importacao = elemento(container, "div");
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
  integrarEspacos(importacao, aproveitarEspaco);

  // ------------------------------------------------------------
  // NOVO RASCUNHO VINCULADO A UM ESPAÇO CONFIRMADO
  // ------------------------------------------------------------
  /**
   * Copia identificação/área após conferir duplicação; não grava a Etapa 8.
   * @param {Object} espaco Registro válido da Etapa 6.
   * @param {string} original Texto da fonte para detectar mudança antes de salvar.
   * @returns {void} Atualiza rascunho/foco; lança erro para aviso na importação.
   */
  function aproveitarEspaco(espaco, original) {
    const entradas = importarEspaco(espaco, dados);
    if (alterado && !window.confirm("Descartar as alterações não salvas para aproveitar este espaço?")) throw new Error("Importação cancelada. O rascunho anterior foi mantido.");
    limpar();
    espacoLivreId = espaco.id; origemEspaco = original;
    preencherFormulario(controles, CAMPOS_AREA, entradas, possiveis);
    alterado = true;
    informar("Espaço aproveitado no rascunho. Complete os dados e confirme em Adicionar área.");
  }

  // ------------------------------------------------------------
  // LIMPEZA APENAS DO RASCUNHO
  // ------------------------------------------------------------
  /** @returns {void} Encerra edição sem mudar dados confirmados; atualiza DOM/foco. */
  function limpar() {
    editando = null;
    espacoLivreId = undefined; origemEspaco = null;
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
    // Edição de entradas não atualiza a área copiada nem apaga o vínculo existente.
    espacoLivreId = area.espacoLivreId; origemEspaco = null;
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
    const origem = lerGeometria(6);
    const idsEspacos = new Set();
    for (const espaco of origem.dados.espacos) idsEspacos.add(espaco.id);
    if (!dados.areas.length) elemento(lista, "p", sessao.erro ? "A leitura dos registros está indisponível. Confira o aviso de armazenamento." : "Nenhuma área cadastrada. Preencha o formulário para adicionar a primeira.");
    for (const area of dados.areas) {
      const card = elemento(lista, "article", "", "lote2-registro");
      card.dataset.areaId = area.id;
      elemento(card, "h4", `Área ${area.numero} — ${area.identificacao}`);
      elemento(card, "p", `Área disponível: ${String(area.areaDisponivel).replace(".", ",")} m²`);
      if (area.espacoLivreId) {
        // A ausência da geometria nunca exclui ou reescreve o levantamento.
        elemento(card, "p", origem.mensagem ? "Não foi possível consultar a geometria de origem. Os dados desta área foram preservados."
          : idsEspacos.has(area.espacoLivreId) ? "Área vinculada a um espaço da Etapa 6."
          : "A geometria de origem não está mais disponível. Os dados desta área foram preservados.");
      }
      criarAssociacao(card, area, origem);
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
  // ASSOCIAÇÃO ESPACIAL DO REGISTRO CONFIRMADO
  // ------------------------------------------------------------
  /**
   * Oferece associação/remoção no card, sem reaproveitar campos do espaço.
   * @param {Element} card Card da área confirmada.
   * @param {Object} area Registro original da Etapa 8.
   * @param {Object} origem Leitura da Etapa 6 usada para montar o seletor.
   * @returns {void} Insere controles; a gravação só ocorre após confirmação.
   */
  function criarAssociacao(card, area, origem) {
    const caixa = elemento(card, "fieldset", "", "geo-associacao");
    elemento(caixa, "legend", "Associação espacial");
    const mensagem = elemento(caixa, "p", "");
    mensagem.setAttribute("role", "status"); mensagem.setAttribute("aria-atomic", "true");

    // ------------------------------------------------------------
    // CONFIRMAÇÃO DO VÍNCULO SEM SALVAR OUTROS RASCUNHOS
    // ------------------------------------------------------------
    /**
     * Grava a coleção que difere apenas em espacoLivreId e mantém o rascunho aberto.
     * @param {Object} novos Coleção com a associação alterada.
     * @param {string|undefined} vinculo Novo ID ou ausência após remoção.
     * @returns {void} Escreve somente a Etapa 8 via sessão defensiva; atualiza card/foco.
     */
    function confirmarVinculo(novos, vinculo) {
      const resultado = sessao.salvar(novos);
      if (!resultado.ok) { mensagem.textContent = resultado.mensagem; return; }
      dados = novos;
      // Impede que salvar uma edição já aberta restaure um vínculo removido,
      // sem descartar os demais campos ainda não confirmados desse rascunho.
      if (editando === area.id) { espacoLivreId = vinculo; origemEspaco = null; }
      renderizarLista();
      const texto = vinculo ? "Associação espacial salva. Os demais dados da área foram preservados." : "Associação espacial removida. A área e os registros posteriores foram preservados.";
      informar(texto);
      // A ação é no card, distante do formulário: devolve foco e mensagem ali.
      for (const registro of lista.children) if (registro.dataset.areaId === area.id) {
        const aviso = registro.querySelector(".geo-associacao [role='status']");
        aviso.textContent = texto; aviso.tabIndex = -1; aviso.focus();
      }
    }

    if (area.espacoLivreId) {
      // ------------------------------------------------------------
      // REMOÇÃO EXPLÍCITA DA ASSOCIAÇÃO
      // ------------------------------------------------------------
      /** @returns {void} Solicita confirmação e altera somente o vínculo na Etapa 8. */
      function remover() {
        if (!window.confirm(`Remover a associação espacial da Área ${area.numero} — ${area.identificacao}? Todos os demais dados e registros posteriores serão preservados.`)) return;
        confirmarVinculo(removerAssociacao(dados, area.id), undefined);
      }
      botao(caixa, "Remover associação espacial", remover);
      return;
    }
    const campo = elemento(caixa, "div", "", "campo");
    const id = `associacao-area-${area.numero}`;
    elemento(campo, "label", `Espaço da Etapa 6 para a Área ${area.numero}`).htmlFor = id;
    const seletor = elemento(campo, "select"); seletor.id = id;
    mensagem.id = `${id}-status`; seletor.setAttribute("aria-describedby", mensagem.id);
    seletor.add(new Option("Selecione um espaço", ""));
    // Exibe os espaços confirmados; a validação informa qual área ocupa um deles.
    for (const espaco of origem.dados.espacos) seletor.add(new Option(`Espaço ${espaco.numero} — ${espaco.identificacao}`, espaco.id));
    elemento(caixa, "p", "Nesta versão, cada espaço pode ser associado a uma única área. A associação preserva os dados já informados nesta área.", "card__subtitulo");
    if (origem.mensagem || !origem.dados.espacos.length) mensagem.textContent = origem.mensagem || "Cadastre um espaço na Etapa 6 para associar esta área.";
    linkEtapa(caixa, "Revisar espaços livres", 6);

    // ------------------------------------------------------------
    // ASSOCIAÇÃO COM A GEOMETRIA VISTA NO SELETOR
    // ------------------------------------------------------------
    /** @returns {Promise<void>} Relê a origem e confirma antes de gravar somente a associação na Etapa 8. */
    async function associar() {
      const atual = lerGeometria(6);
      if (atual.mensagem || atual.original !== origem.original) {
        mensagem.textContent = "Os espaços mudaram ou estão indisponíveis. Recarregue antes de associar; os dados da área foram mantidos.";
        return;
      }
      try {
        const escolhido = seletor.value;
        associarEspaco(dados, area.id, escolhido, atual.dados);
        if (!window.confirm(`Associar a Área ${area.numero} — ${area.identificacao} a ${seletor.selectedOptions[0].textContent}? Somente a associação espacial será alterada.`)) return;
        // Outra aba pode mudar a origem enquanto a confirmação está aberta.
        // O diálogo bloqueia a tarefa JavaScript: libere o ciclo de eventos para
        // receber mudanças pendentes de armazenamento antes de reler a fonte.
        // ------------------------------------------------------------
        // RETOMADA APÓS EVENTOS PENDENTES DO NAVEGADOR
        // ------------------------------------------------------------
        /** @param {Function} resolver Continuação da associação. @returns {void} Agenda próxima tarefa; não grava dados. */
        function aguardarAtualizacoes(resolver) { setTimeout(resolver, 0); }
        await new Promise(aguardarAtualizacoes);
        const confirmada = lerGeometria(6);
        if (confirmada.mensagem || confirmada.original !== atual.original) {
          mensagem.textContent = "Os espaços mudaram durante a confirmação. Recarregue antes de associar; os dados da área foram mantidos.";
          return;
        }
        // Reconstrói sobre a coleção atual, sem reutilizar uma cópia anterior
        // à confirmação; a sessão ainda verifica alterações externas na Etapa 8.
        confirmarVinculo(associarEspaco(dados, area.id, escolhido, confirmada.dados), escolhido);
      } catch (erro) { mensagem.textContent = erro.message; seletor.focus(); }
    }
    const acao = botao(caixa, "Associar a espaço da Etapa 6", associar);
    acao.disabled = Boolean(origem.mensagem) || !origem.dados.espacos.length;
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
    if (espacoLivreId) entradas.espacoLivreId = espacoLivreId;
    if (origemEspaco !== null) {
      // A importação depende da versão vista ao copiar; cadastro manual e edição
      // de áreas antigas seguem independentes da disponibilidade da Etapa 6.
      const origem = lerGeometria(6);
      if (origem.mensagem || origem.original !== origemEspaco) {
        informar("O espaço de origem mudou ou está indisponível. Recarregue antes de confirmar a importação; o rascunho foi mantido.", true);
        return;
      }
      // Uma associação feita nesta mesma tela pode ocupar o espaço enquanto
      // existe um rascunho de importação; não permita duplicá-lo ao confirmar.
      for (const area of dados.areas) if (area.espacoLivreId === espacoLivreId && area.id !== editando) {
        informar(`Este espaço já está associado à Área ${area.numero} — ${area.identificacao}. Edite a área existente.`, true);
        return;
      }
    }
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
  for (const area of dados.areas) if (area.id === areaSolicitada) {
    // O link de associação vindo dos mapas conduz ao controle do card;
    // os links de revisão existentes continuam abrindo o formulário de edição.
    if (new URLSearchParams(window.location.search).get("associar") === "1") {
      for (const card of lista.children) if (card.dataset.areaId === area.id) card.querySelector(".geo-associacao select, .geo-associacao button").focus();
    } else editar(area);
  }
}
