// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/lote-2-interface.js
// Módulo: Elementos comuns das Etapas 8, 10 e 11
// Objetivo: Manter formulários e resumos acessíveis e seguros.
// Responsabilidade: DOM, seleções do catálogo, avisos e resumos de leitura.
// Dependências: Descritores/contratos do Lote 2; APIs nativas do navegador.
// Utilizado por: possibilidades, visita-campo e revisao-campo-interface.js.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import { CAMPOS_AREA, CAMPOS_VISITA, ESTADOS_CAMPO, CHAVES_LOTE_2, COLECOES, lerCampos } from "./dados/lote-2.js";

// ------------------------------------------------------------
// INSERÇÃO SEGURA DE TEXTO
// ------------------------------------------------------------
/**
 * Cria um elemento sem interpretar textos do usuário como HTML.
 * @param {Element} pai Destino no DOM.
 * @param {string} tag Nome da tag.
 * @param {string} texto Conteúdo textual opcional.
 * @param {string} classe Classe visual opcional.
 * @returns {HTMLElement} Elemento inserido; altera somente o DOM.
 */
export function elemento(pai, tag, texto = "", classe = "") {
  const novo = document.createElement(tag);
  novo.textContent = texto;
  if (classe) novo.className = classe;
  pai.append(novo);
  return novo;
}

// ------------------------------------------------------------
// LINK DE NAVEGAÇÃO ENTRE ETAPAS
// ------------------------------------------------------------
/**
 * Cria link local; parâmetros opcionais identificam técnica/variante ou área.
 * @param {Element} pai Destino do link.
 * @param {string} texto Rótulo acessível.
 * @param {number} numero Etapa alvo.
 * @param {Object} parametros Parâmetros adicionais da URL.
 * @returns {HTMLAnchorElement} Link inserido; sem storage.
 */
export function linkEtapa(pai, texto, numero, parametros = {}) {
  const link = elemento(pai, "a", texto);
  link.href = `etapa.html?${new URLSearchParams({ numero, ...parametros })}`;
  return link;
}

// ------------------------------------------------------------
// BOTÃO COM RESPONSABILIDADE EXPLÍCITA
// ------------------------------------------------------------
/**
 * Monta botão nativo acionável por teclado, sem submit acidental.
 * @param {Element} pai Destino.
 * @param {string} texto Nome acessível.
 * @param {Function} acao Evento click documentado pela interface chamadora.
 * @returns {HTMLButtonElement} Botão inserido no DOM.
 */
export function botao(pai, texto, acao) {
  const controle = elemento(pai, "button", texto, "botao botao--secundario");
  controle.type = "button";
  controle.addEventListener("click", acao);
  return controle;
}

// ------------------------------------------------------------
// BASE DA ETAPA E AVISOS PERSISTENTES
// ------------------------------------------------------------
/**
 * Cria cabeçalho, região de status e aviso exclusivo de armazenamento.
 * @param {Element} container Região de trabalho disponibilizada pelo controlador.
 * @param {string} titulo Título da funcionalidade.
 * @param {Object} sessao Sessão defensiva de persistência.
 * @returns {Object} Status e método informar; registra observação de outras abas.
 */
export function prepararTela(container, titulo, sessao) {
  container.className = "card lote-2";
  container.replaceChildren();
  elemento(container, "h2", titulo);
  elemento(container, "p", "Os registros confirmados ficam neste navegador. Salve para confirmar cada alteração. Limpar os dados de navegação pode apagar o levantamento.", "card__subtitulo");
  const aviso = elemento(container, "p", sessao.erro, "lote2-erro");
  aviso.id = "lote2-armazenamento";
  aviso.setAttribute("role", "status");
  aviso.setAttribute("aria-atomic", "true");
  const status = elemento(container, "p", "", "lote2-status");
  status.id = "lote2-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  let temporizador;

  // ------------------------------------------------------------
  // ANÚNCIO INCLUSIVE EM AÇÕES REPETIDAS
  // ------------------------------------------------------------
  /**
   * Renova a região após uma atualização do DOM para anunciar textos repetidos.
   * @param {string} texto Mensagem atual.
   * @param {boolean} erro Indica falha por texto e estilo, nunca só pela cor.
   * @returns {void} Atualiza DOM e agenda um timer; não persiste dados.
   */
  function informar(texto, erro = false) {
    clearTimeout(temporizador);
    status.textContent = "";
    status.classList.toggle("lote2-erro", erro);
    // ------------------------------------------------------------
    // ENTREGA DO TEXTO NA REGIÃO VIVA
    // ------------------------------------------------------------
    /** @returns {void} Publica a mensagem atual no DOM, sem storage. */
    function anunciar() { status.textContent = texto; }
    temporizador = setTimeout(anunciar, 60);
  }

  // ------------------------------------------------------------
  // ALERTA DE FONTE DESATUALIZADA SEM DESCARTAR RASCUNHO
  // ------------------------------------------------------------
  /**
   * Sinaliza mudanças relevantes; a sessão também compara chaves ao salvar.
   * @param {StorageEvent|PageTransitionEvent} evento Alteração externa ou retorno.
   * @returns {void} Atualiza aviso; não substitui controles preenchidos.
   */
  function verificarOrigem(evento) {
    if (evento.type === "storage" && evento.key !== null) {
      let relevante = false;
      for (const origem of Object.keys(sessao.leituras)) if (CHAVES_LOTE_2[origem] === evento.key) relevante = true;
      if (!relevante) return;
    }
    aviso.textContent = sessao.verificar();
  }
  window.addEventListener("storage", verificarOrigem);
  window.addEventListener("pageshow", verificarOrigem);
  return { status, informar };
}

// ------------------------------------------------------------
// CAMPOS NATIVOS COM LABEL E ERRO ASSOCIADOS
// ------------------------------------------------------------
/**
 * Monta campos descritos, sem copiar regras hidrológicas para a interface.
 * @param {Element} formulario Destino do fieldset.
 * @param {string} titulo Legend do grupo.
 * @param {Array} campos Descritores do contrato.
 * @returns {Object} Controles por ID; altera o DOM, não grava dados.
 */
export function criarCampos(formulario, titulo, campos) {
  const grupo = elemento(formulario, "fieldset");
  elemento(grupo, "legend", titulo);
  const grade = elemento(grupo, "div", "", "campos");
  const controles = {};
  for (const campo of campos) {
    const caixa = elemento(grade, "div", "", "campo");
    const id = `lote2-${campo.id}`;
    const label = elemento(caixa, "label", `${campo.nome}${campo.obrigatorio ? " (obrigatória)" : ""}`);
    label.htmlFor = id;
    const controle = elemento(caixa, campo.tipo === "estado" ? "select" : campo.tipo === "numero" || campo.id === "identificacao" ? "input" : "textarea");
    controle.id = id;
    controle.name = campo.id;
    controle.required = Boolean(campo.obrigatorio);
    if (campo.tipo === "numero") { controle.type = "text"; controle.inputMode = "decimal"; }
    if (campo.tipo === "estado") for (const estado of ESTADOS_CAMPO) controle.add(new Option(estado, estado));
    controle.setAttribute("aria-describedby", `${id}-erro`);
    elemento(caixa, "small", "", "lote2-erro").id = `${id}-erro`;
    controles[campo.id] = controle;
  }
  return controles;
}

// ------------------------------------------------------------
// SELEÇÃO MÚLTIPLA E CONSULTA CONTEXTUAL DO CATÁLOGO
// ------------------------------------------------------------
/**
 * Usa checkboxes com links próprios à Etapa 7; nenhuma opção é recomendada.
 * @param {Element} formulario Formulário destino.
 * @param {string} titulo Legend da seleção preliminar ou revisada.
 * @param {Map} variantes Índice derivado do catálogo.
 * @returns {HTMLElement} Fieldset que contém as opções; sem storage.
 */
export function criarPossiveis(formulario, titulo, variantes) {
  const grupo = elemento(formulario, "fieldset");
  grupo.id = "lote2-possiveis";
  grupo.tabIndex = -1;
  grupo.setAttribute("aria-describedby", "lote2-possiveis-erro");
  elemento(grupo, "legend", titulo);
  elemento(grupo, "p", "Marque as variantes que você considera possíveis. A seleção é do projetista; consulte as restrições antes de decidir.", "card__subtitulo");
  for (const [id, variante] of variantes) {
    const linha = elemento(grupo, "div", "", "lote2-opcao");
    const label = elemento(linha, "label");
    const controle = elemento(label, "input");
    controle.type = "checkbox";
    controle.name = "possiveis";
    controle.value = id;
    elemento(label, "span", variante.nome);
    linkEtapa(linha, `Consultar restrições: ${variante.nome}`, 7, { tecnica: variante.tecnica, variante: id });
  }
  elemento(grupo, "small", "", "lote2-erro").id = "lote2-possiveis-erro";
  return grupo;
}

// ------------------------------------------------------------
// LEITURA DOS CONTROLES AINDA NÃO SALVOS
// ------------------------------------------------------------
/**
 * Reúne campos e, quando presente, a seleção múltipla em um novo objeto.
 * @param {Object} controles Campos indexados por nome.
 * @param {Array} campos Descritores da etapa.
 * @param {Element|null} possiveis Grupo opcional de checkboxes.
 * @returns {Object} Entradas tipadas, sem alterar controles ou storage.
 */
export function lerFormulario(controles, campos, possiveis = null) {
  const textos = {};
  for (const campo of campos) textos[campo.id] = controles[campo.id].value;
  const dados = lerCampos(textos, campos);
  if (possiveis) {
    dados.possiveis = [];
    for (const controle of possiveis.querySelectorAll("input:checked")) dados.possiveis.push(controle.value);
  }
  return dados;
}

// ------------------------------------------------------------
// RESTAURAÇÃO SEGURA DOS CAMPOS
// ------------------------------------------------------------
/**
 * Preenche controles por value/checked, mantendo texto livre literal.
 * @param {Object} controles Campos indexados.
 * @param {Array} campos Descritores da etapa.
 * @param {Object|null} dados Registro confirmado ou ausência.
 * @param {Element|null} possiveis Seleção múltipla opcional.
 * @returns {void} Atualiza DOM, sem salvar ou modificar os dados recebidos.
 */
export function preencherFormulario(controles, campos, dados, possiveis = null) {
  for (const campo of campos) {
    const valor = dados?.[campo.id] ?? (campo.tipo === "estado" ? "Não avaliado" : "");
    controles[campo.id].value = campo.tipo === "numero" ? String(valor).replace(".", ",") : valor;
  }
  if (possiveis) for (const controle of possiveis.querySelectorAll("input")) controle.checked = Boolean(dados?.possiveis?.includes(controle.value));
}

// ------------------------------------------------------------
// ERROS ACESSÍVEIS E FOCO NA PRIMEIRA PENDÊNCIA
// ------------------------------------------------------------
/**
 * Liga erros aos controles, removendo avisos antigos ao validar novamente.
 * @param {Element} formulario Formulário validado.
 * @param {Object} erros Mensagens por ID do contrato.
 * @param {boolean} focar Se deve levar o foco ao primeiro campo inválido.
 * @returns {boolean} True quando não há erros; altera somente DOM/foco.
 */
export function mostrarErros(formulario, erros, focar = true) {
  for (const aviso of formulario.querySelectorAll("[id$='-erro']")) aviso.textContent = "";
  for (const controle of formulario.querySelectorAll("[aria-invalid]")) controle.removeAttribute("aria-invalid");
  let primeiro = null;
  for (const [id, mensagem] of Object.entries(erros)) {
    const controle = formulario.querySelector(`#lote2-${id}`);
    if (!controle) continue;
    controle.setAttribute("aria-invalid", "true");
    formulario.querySelector(`#lote2-${id}-erro`).textContent = mensagem;
    primeiro ??= controle;
  }
  if (focar && primeiro) primeiro.focus();
  return Object.keys(erros).length === 0;
}

// ------------------------------------------------------------
// RESUMO COMPLETO SOMENTE PARA LEITURA
// ------------------------------------------------------------
/**
 * Mostra todos os dados levantados e distingue vazio de zero sem arredondar.
 * @param {Element} pai Destino.
 * @param {string} titulo Cabeçalho do resumo.
 * @param {Object|null} dados Área/vistoria confirmada ou ausência.
 * @param {Array} campos Descritores dos valores a mostrar.
 * @param {Map} variantes Catálogo para traduzir IDs sem duplicar nomes salvos.
 * @returns {HTMLElement} Bloco criado, sem alterar as fontes.
 */
export function resumo(pai, titulo, dados, campos, variantes) {
  const bloco = elemento(pai, "section", "", "lote2-resumo");
  elemento(bloco, "h3", titulo);
  if (!dados) { elemento(bloco, "p", "Ainda não há vistoria registrada para esta área."); return bloco; }
  const lista = elemento(bloco, "dl");
  for (const campo of campos) {
    const linha = elemento(lista, "div");
    elemento(linha, "dt", campo.nome);
    const valor = dados[campo.id];
    elemento(linha, "dd", valor === null || valor === "" ? "Não informado" : String(valor));
  }
  if (dados.possiveis) {
    const nomes = [];
    for (const id of dados.possiveis) nomes.push(variantes.get(id).nome);
    elemento(bloco, "p", `SUDS preliminarmente possíveis: ${nomes.join("; ") || "Nenhum indicado"}.`);
  }
  return bloco;
}

// ------------------------------------------------------------
// AVISO SOBRE REGISTROS SEM ÁREA DE ORIGEM
// ------------------------------------------------------------
/**
 * Informa a quantidade de vistorias e decisões sem área cadastrada em linguagem
 * amigável, sem expor IDs internos. A consulta não modifica os registros.
 * @param {Element} pai Destino dos avisos.
 * @param {Object} sessao Sessão com áreas e coleções relacionadas.
 * @returns {void} Insere avisos; não remove nenhum registro.
 */
export function informarOrfaos(pai, sessao) {
  const ids = new Set();
  for (const area of sessao.dados[8].areas) ids.add(area.id);
  for (const etapa of [10, 11]) {
    if (!sessao.dados[etapa]) continue;
    const orfaos = [];
    for (const registro of sessao.dados[etapa][COLECOES[etapa]]) if (!ids.has(registro.areaId)) orfaos.push(registro.areaId);
    if (orfaos.length) {
      // O tipo vem da coleção de origem, inclusive quando a Etapa 11 também
      // apresenta vistorias preservadas. Apenas a mensagem muda, não os vínculos.
      const singular = etapa === 10 ? "vistoria" : "decisão pós-campo";
      const plural = etapa === 10 ? "vistorias" : "decisões pós-campo";
      const mensagem = orfaos.length === 1
        ? `Existe 1 ${singular} associada a uma área que não está mais cadastrada. O registro foi preservado para evitar perda de dados.`
        : `Existem ${orfaos.length} ${plural} associadas a áreas que não estão mais cadastradas. Os registros foram preservados para evitar perda de dados.`;
      // Conserva o parágrafo e sua inserção textual na região acessível existente.
      elemento(pai, "p", mensagem, "lote2-aviso");
    }
  }
}

// ------------------------------------------------------------
// ESCOLHA DA ÁREA CONFIRMADA NA ETAPA 8
// ------------------------------------------------------------
/**
 * Monta seletor sem permitir criar áreas; respeita vínculo contextual na URL.
 * @param {Element} pai Destino do seletor.
 * @param {Array} areas Registros confirmados e válidos.
 * @returns {HTMLSelectElement|null} Seletor ou estado vazio com retorno à Etapa 8.
 */
export function criarSeletorArea(pai, areas) {
  if (!areas.length) {
    elemento(pai, "p", "Nenhuma área foi cadastrada na Etapa 8.");
    linkEtapa(pai, "Voltar à Etapa 8", 8);
    return null;
  }
  const caixa = elemento(pai, "div", "", "campo");
  elemento(caixa, "label", "Área cadastrada na Etapa 8").htmlFor = "lote2-area";
  const seletor = elemento(caixa, "select");
  seletor.id = "lote2-area";
  for (const area of areas) seletor.add(new Option(`Área ${area.numero} — ${area.identificacao}`, area.id));
  const solicitada = new URLSearchParams(window.location.search).get("area");
  for (const area of areas) if (area.id === solicitada) seletor.value = solicitada;
  return seletor;
}

// ------------------------------------------------------------
// RESUMOS DA ORIGEM SEM EXIGIR REDIGITAÇÃO
// ------------------------------------------------------------
/**
 * Apresenta o pré-campo e, se solicitado, a vistoria vinculada à área.
 * @param {Element} pai Região a substituir.
 * @param {Object} area Área atual.
 * @param {Object|null} visita Vistoria disponível.
 * @param {Map} variantes Catálogo indexado.
 * @param {boolean} mostrarVisita Habilita bloco da Etapa 10 na revisão.
 * @returns {void} Atualiza apenas resumos no DOM.
 */
export function mostrarOrigens(pai, area, visita, variantes, mostrarVisita = false) {
  pai.replaceChildren();
  resumo(pai, `Dados pré-campo — Área ${area.numero}`, area, CAMPOS_AREA, variantes);
  if (mostrarVisita) resumo(pai, "Visita de campo", visita, CAMPOS_VISITA, variantes);
  const links = elemento(pai, "nav", "", "lote2-acoes");
  links.setAttribute("aria-label", "Revisar dados de origem");
  linkEtapa(links, "Revisar dados pré-campo", 8, { area: area.id });
  if (mostrarVisita) linkEtapa(links, "Revisar visita de campo", 10, { area: area.id });
}
