// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/mapas/lote-3-editor.js
// Módulo: Editores manuais das Etapas 2 e 6
// Objetivo: Desenhar bacia e espaços livres com confirmação explícita.
// Responsabilidade: Rascunho, vértices, CRUD, resumos e integração com mapa.
// Dependências: Leaflet via lote-3-mapa; contratos/persistência dos Lotes 1/3.
// Utilizado por: js/etapa.js, somente nas Etapas 2 e 6.
// Criado em: 04/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { elemento, botao } from "../lote-2-interface.js";
import { lerDecimal } from "../calculos/pre-dimensionamento.js";
import { calcularArea, coordenadaValida, salvarEspaco, excluirEspaco } from "../dados/lote-3.js";
import { abrirGeometria } from "../dados/armazenamento-lote-3.js";
import { criarMapaLote3 } from "./lote-3-mapa.js";

// ------------------------------------------------------------
// EDIÇÃO MANUAL INDEPENDENTE DO CARREGAMENTO DO MAPA
// ------------------------------------------------------------
/**
 * Monta controles antes de carregar Leaflet; coordenadas são alternativa por teclado.
 * @param {Element} container Região da etapa.
 * @param {number} etapa 2 (uma bacia) ou 6 (múltiplos espaços).
 * @returns {Promise<void>} Renderiza eventos/DOM; persiste apenas em salvar/excluir.
 */
export async function iniciarEditorGeografico(container, etapa) {
  container.className = "card lote-3"; container.replaceChildren();
  const sessao = abrirGeometria(etapa);
  let dados = sessao.leitura.dados;
  let mapa = null, vertices = [], fechado = false, desenhando = false, editando = null;
  elemento(container, "h2", etapa === 2 ? "Delimitação manual da bacia" : "Espaços livres para análise");
  elemento(container, "p", "Desenhe um contorno simples, sem cruzamentos. A delimitação é manual; não há análise automática de relevo, altitude ou aptidão para SUDS.");
  const aviso = elemento(container, "p", sessao.leitura.mensagem || "", "geo-erro");
  aviso.id = "geo-armazenamento"; aviso.setAttribute("role", "status");
  const mapaPai = elemento(container, "div");
  const formulario = elemento(container, "form"); formulario.id = "geo-formulario"; formulario.noValidate = true;
  const titulo = elemento(formulario, "h3", etapa === 2 ? "Rascunho da delimitação" : "Novo espaço");
  let nome, observacao;
  if (etapa === 6) {
    nome = campo(formulario, "identificacao", "Identificação do espaço (obrigatória)"); nome.required = true;
    observacao = campo(formulario, "observacao", "Observação (opcional)", "textarea");
  }
  const acoes = elemento(formulario, "div", "", "geo-acoes");
  botao(acoes, "Iniciar / refazer desenho", iniciar);
  const desfazerBotao = botao(acoes, "Desfazer último vértice", desfazer);
  botao(acoes, "Cancelar desenho", cancelar);
  const fecharBotao = botao(acoes, "Fechar polígono", fechar);
  const centroBotao = botao(acoes, "Adicionar vértice no centro do mapa", adicionarCentro); centroBotao.disabled = true;
  elemento(formulario, "p", "Inicie o desenho e clique no mapa para adicionar vértices. Pelo teclado, mova o mapa com as setas e adicione seu centro, ou informe as coordenadas abaixo. Fechar não salva: confirme pelo botão de salvamento.", "card__subtitulo");
  const coordenadas = elemento(formulario, "fieldset");
  elemento(coordenadas, "legend", "Adicionar vértice por coordenadas");
  const grade = elemento(coordenadas, "div", "", "campos");
  const latitude = campo(grade, "latitude", "Latitude (graus decimais)"); latitude.inputMode = "decimal";
  const longitude = campo(grade, "longitude", "Longitude (graus decimais)"); longitude.inputMode = "decimal";
  const adicionarBotao = botao(coordenadas, "Adicionar coordenadas", adicionarCoordenadas);
  const listaVertices = elemento(formulario, "ol"); listaVertices.id = "geo-vertices"; listaVertices.tabIndex = -1;
  listaVertices.setAttribute("aria-label", "Vértices do rascunho"); listaVertices.setAttribute("aria-describedby", "geo-geometria-erro");
  const erroGeometria = elemento(formulario, "p", "", "geo-erro"); erroGeometria.id = "geo-geometria-erro";
  const areaTexto = elemento(formulario, "p", "", "geo-area"); areaTexto.id = "geo-area"; areaTexto.setAttribute("role", "status");
  const salvar = elemento(formulario, "button", etapa === 2 ? "Salvar delimitação" : "Adicionar espaço", "botao botao--primario"); salvar.type = "submit";
  const status = elemento(formulario, "p", "", "geo-status"); status.id = "geo-status"; status.setAttribute("role", "status"); status.setAttribute("aria-atomic", "true");
  elemento(container, "p", "Os registros são salvos neste navegador. A área é uma aproximação esférica pelas coordenadas; somente a apresentação é arredondada.", "card__subtitulo");
  const lista = elemento(container, "div"); lista.id = "geo-registros"; lista.tabIndex = -1;

  // ------------------------------------------------------------
  // CAMPO COM RÓTULO E ERRO ASSOCIADO
  // ------------------------------------------------------------
  /** @param {Element} pai Destino. @param {string} id Nome. @param {string} texto Label. @param {string} tag Controle. @returns {Element} Campo inserido; sem storage. */
  function campo(pai, id, texto, tag = "input") {
    const caixa = elemento(pai, "div", "", "campo");
    elemento(caixa, "label", texto).htmlFor = `geo-${id}`;
    const controle = elemento(caixa, tag); controle.id = `geo-${id}`;
    controle.setAttribute("aria-describedby", `geo-${id}-erro`);
    elemento(caixa, "small", "", "geo-erro").id = `geo-${id}-erro`;
    return controle;
  }

  // ------------------------------------------------------------
  // ÁREA FORMATADA SEM ALTERAR A PRECISÃO DO REGISTRO
  // ------------------------------------------------------------
  /** @param {number} area Metros quadrados. @returns {string} Texto em m²/ha, sem efeitos colaterais. */
  function formatarArea(area) {
    const formato = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
    return `${formato.format(area)} m² (${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(area / 10000)} ha)`;
  }

  // ------------------------------------------------------------
  // ERROS DO RASCUNHO
  // ------------------------------------------------------------
  /** @returns {void} Limpa erros anteriores no DOM, sem alterar entradas. */
  function limparErros() {
    for (const erro of formulario.querySelectorAll("[id$='-erro']")) erro.textContent = "";
    for (const controle of formulario.querySelectorAll("[aria-invalid]")) controle.removeAttribute("aria-invalid");
  }

  // ------------------------------------------------------------
  // SINCRONIZAÇÃO DA PRÉVIA E LISTA TEXTUAL
  // ------------------------------------------------------------
  /** @returns {void} Atualiza somente rascunho visual e habilitação de botões. */
  function atualizarDesenho() {
    listaVertices.replaceChildren();
    for (const ponto of vertices) elemento(listaVertices, "li", `Latitude ${ponto.latitude}; longitude ${ponto.longitude}`);
    desfazerBotao.disabled = vertices.length === 0;
    fecharBotao.disabled = !desenhando;
    adicionarBotao.disabled = !desenhando;
    centroBotao.disabled = !mapa || !desenhando;
    areaTexto.textContent = fechado ? `Área do rascunho: ${formatarArea(calcularArea(vertices))}` : `${vertices.length} vértices no rascunho. Feche o polígono para calcular a área.`;
    if (mapa) mapa.previa(vertices, fechado);
  }

  // ------------------------------------------------------------
  // INÍCIO OU REDESENHO EXPLÍCITO
  // ------------------------------------------------------------
  /** @returns {void} Limpa somente a geometria do rascunho; mantém registro confirmado. */
  function iniciar() {
    vertices = []; fechado = false; desenhando = true; limparErros(); atualizarDesenho();
    status.textContent = "Desenho iniciado. Adicione os vértices na ordem do contorno.";
  }

  // ------------------------------------------------------------
  // INCLUSÃO DE POSIÇÃO MANUAL
  // ------------------------------------------------------------
  /** @param {Object} ponto Coordenada já obtida do mapa/campos. @returns {void} Modifica apenas o rascunho. */
  function adicionar(ponto) {
    if (!desenhando) return;
    if (!coordenadaValida(ponto)) { status.textContent = "Confira latitude e longitude."; return; }
    for (const anterior of vertices) if (anterior.latitude === ponto.latitude && anterior.longitude === ponto.longitude) { status.textContent = "Este vértice já foi adicionado. Use Fechar polígono para concluir o contorno."; return; }
    vertices.push({ ...ponto }); limparErros(); atualizarDesenho();
    status.textContent = `Vértice ${vertices.length} adicionado ao rascunho.`;
  }

  // ------------------------------------------------------------
  // ENTRADA POR TECLADO INDEPENDENTE DE TILES
  // ------------------------------------------------------------
  /** @returns {void} Valida campos e adiciona coordenada; não salva registro. */
  function adicionarCoordenadas() {
    const ponto = { latitude: lerDecimal(latitude.value), longitude: lerDecimal(longitude.value) };
    limparErros();
    for (const [id, limite, controle] of [["latitude", 90, latitude], ["longitude", 180, longitude]]) {
      if (!Number.isFinite(ponto[id]) || Math.abs(ponto[id]) > limite) {
        controle.setAttribute("aria-invalid", "true");
        formulario.querySelector(`#geo-${id}-erro`).textContent = `Informe um número entre -${limite} e ${limite}.`;
        controle.focus(); return;
      }
    }
    adicionar(ponto);
  }

  // ------------------------------------------------------------
  // ADIÇÃO DO CENTRO DO MAPA
  // ------------------------------------------------------------
  /** @returns {void} Converte ação de teclado em vértice, sem geocodificar. */
  function adicionarCentro() { if (mapa) adicionar(mapa.centro()); }

  // ------------------------------------------------------------
  // DESFAZER ÚLTIMO VÉRTICE
  // ------------------------------------------------------------
  /** @returns {void} Reabre contorno do rascunho e remove apenas o último ponto. */
  function desfazer() { vertices.pop(); fechado = false; desenhando = true; limparErros(); atualizarDesenho(); status.textContent = "Último vértice removido do rascunho."; }

  // ------------------------------------------------------------
  // FECHAMENTO VALIDADO SEM SALVAMENTO
  // ------------------------------------------------------------
  /** @returns {void} Calcula prévia ou apresenta erro e foco; não grava dados. */
  function fechar() {
    limparErros();
    try {
      calcularArea(vertices); fechado = true; desenhando = false; atualizarDesenho();
      status.textContent = "Polígono fechado no rascunho. Salve para confirmar.";
    } catch (erro) {
      erroGeometria.textContent = erro.message; listaVertices.setAttribute("aria-invalid", "true"); listaVertices.focus();
    }
  }

  // ------------------------------------------------------------
  // CANCELAMENTO DA EDIÇÃO SEM EXCLUIR DADOS
  // ------------------------------------------------------------
  /** @returns {void} Limpa rascunho e metadados; mantém a coleção persistida. */
  function cancelar() {
    vertices = []; fechado = false; desenhando = false; editando = null;
    if (nome) { nome.value = ""; observacao.value = ""; }
    titulo.textContent = etapa === 2 ? "Rascunho da delimitação" : "Novo espaço";
    salvar.textContent = etapa === 2 ? "Salvar delimitação" : "Adicionar espaço";
    limparErros(); atualizarDesenho(); status.textContent = "Rascunho cancelado. Os registros confirmados foram mantidos.";
  }

  // ------------------------------------------------------------
  // LISTA E CAMADA DOS REGISTROS CONFIRMADOS
  // ------------------------------------------------------------
  /** @param {boolean} enquadrar Ajusta mapa na restauração. @returns {void} Atualiza resumo/mapa; não persiste. */
  function renderizar(enquadrar = false) {
    lista.replaceChildren();
    const registros = etapa === 2 ? (dados ? [{ ...dados, id: "bacia", identificacao: "Bacia de contribuição" }] : []) : dados.espacos;
    const camadas = [];
    if (!registros.length) elemento(lista, "p", sessao.leitura.mensagem ? "Leitura dos registros indisponível. Consulte o aviso acima." : "Nenhuma delimitação confirmada nesta etapa.");
    for (const registro of registros) {
      const texto = `${etapa === 6 ? `Espaço ${registro.numero} — ` : ""}${registro.identificacao}`;
      const card = elemento(lista, "article", "", "geo-resumo");
      elemento(card, "h3", texto); elemento(card, "p", `Área confirmada: ${formatarArea(registro.areaM2)}`);
      if (registro.observacao) elemento(card, "p", registro.observacao);
      const detalhes = elemento(card, "details"); elemento(detalhes, "summary", "Coordenadas do contorno");
      const pontos = elemento(detalhes, "ol");
      for (const ponto of registro.vertices) elemento(pontos, "li", `${ponto.latitude}; ${ponto.longitude}`);
      const botoes = elemento(card, "div", "", "geo-acoes");
      // ------------------------------------------------------------
      // LOCALIZAÇÃO A PARTIR DO RESUMO TEXTUAL
      // ------------------------------------------------------------
      /** @returns {void} Abre polígono no mapa se disponível; não grava. */
      function localizar() { if (mapa) mapa.localizar(registro.id); else status.textContent = "Mapa indisponível; consulte as coordenadas do contorno."; }
      botao(botoes, "Localizar no mapa", localizar);
      // ------------------------------------------------------------
      // EDIÇÃO DOS METADADOS E GEOMETRIA
      // ------------------------------------------------------------
      /** @returns {void} Restaura rascunho do registro, preservando o confirmado. */
      function editar() {
        vertices = structuredClone(registro.vertices); fechado = true; desenhando = false; editando = registro.id;
        if (nome) { nome.value = registro.identificacao; observacao.value = registro.observacao; }
        titulo.textContent = `Editar ${texto}`; salvar.textContent = "Salvar alterações";
        limparErros(); atualizarDesenho(); status.textContent = "Edição aberta. Use Iniciar / refazer desenho para substituir o contorno, ou salve os metadados.";
        (nome || listaVertices).focus();
      }
      botao(botoes, "Editar delimitação", editar);
      // ------------------------------------------------------------
      // EXCLUSÃO EXPLÍCITA SEM PROPAGAÇÃO ÀS OUTRAS ETAPAS
      // ------------------------------------------------------------
      /** @returns {void} Grava exclusão somente após confirmar e verificar concorrência. */
      function excluir() {
        if (!window.confirm(`Excluir ${texto}? Os dados aproveitados em outras etapas serão preservados.`)) return;
        const resultado = sessao.salvar(etapa === 2 ? null : excluirEspaco(dados, registro.id));
        if (!resultado.ok) { status.textContent = resultado.mensagem; return; }
        dados = resultado.dados;
        if (etapa === 2 || editando === registro.id) cancelar();
        renderizar(); lista.focus(); status.textContent = "Delimitação excluída. Os dados das outras etapas foram preservados.";
      }
      botao(botoes, "Excluir delimitação", excluir);
      camadas.push({ id: registro.id, vertices: registro.vertices, texto: `${texto} — ${formatarArea(registro.areaM2)}`, rotulo: texto });
    }
    if (mapa) mapa.registros(camadas, enquadrar);
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO DO RASCUNHO VALIDADO
  // ------------------------------------------------------------
  /** @param {SubmitEvent} evento Envio manual. @returns {void} Salva somente Etapa 2 ou 6, sem integração automática. */
  function confirmar(evento) {
    evento.preventDefault(); limparErros();
    if (nome && !nome.value.trim()) {
      nome.setAttribute("aria-invalid", "true"); formulario.querySelector("#geo-identificacao-erro").textContent = "Informe a identificação do espaço."; nome.focus(); return;
    }
    if (!fechado) { erroGeometria.textContent = "Feche um polígono válido antes de salvar."; listaVertices.setAttribute("aria-invalid", "true"); listaVertices.focus(); return; }
    try {
      const novos = etapa === 2 ? { versao: 1, vertices, areaM2: calcularArea(vertices) }
        : salvarEspaco(dados, { vertices, identificacao: nome.value, observacao: observacao.value }, editando || crypto.randomUUID());
      const resultado = sessao.salvar(novos);
      if (!resultado.ok) { status.textContent = resultado.mensagem; return; }
      dados = resultado.dados; cancelar(); renderizar(true);
      status.textContent = etapa === 2 ? "Delimitação da bacia salva neste navegador." : "Espaço livre salvo neste navegador.";
    } catch (erro) { status.textContent = erro.message; }
  }

  // ------------------------------------------------------------
  // AVISO DE ALTERAÇÃO EXTERNA SEM DESCARTAR O RASCUNHO
  // ------------------------------------------------------------
  /** @returns {void} Verifica a chave atual e informa necessidade de recarregar. */
  function verificarOrigem() { aviso.textContent = sessao.verificar(); }
  formulario.addEventListener("submit", confirmar);
  window.addEventListener("storage", verificarOrigem); window.addEventListener("pageshow", verificarOrigem);
  atualizarDesenho(); renderizar();
  // Todo o editor já funciona por coordenadas enquanto os recursos externos carregam.
  mapa = await criarMapaLote3(mapaPai, adicionar);
  renderizar(true); atualizarDesenho();
}
