// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/lote-3-integracoes.js
// Módulo: Ações explícitas 2 → 14 e 6 → 8
// Objetivo: Aproveitar dados geográficos sem sobrescrever confirmações existentes.
// Responsabilidade: Leitura atualizada, seleção de origem e preenchimento de rascunho.
// Dependências: Componentes DOM do Lote 2 e contratos/persistência geográficos.
// Utilizado por: js/bacia-interface.js e js/possibilidades-interface.js.
// Criado em: 04/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { elemento, botao } from "./lote-2-interface.js";
import { lerGeometria } from "./dados/armazenamento-lote-3.js";
import { CHAVE_ESPACOS, CHAVE_BACIA_MAPA } from "./dados/lote-3.js";

// ------------------------------------------------------------
// APROVEITAMENTO DA ÁREA DELIMITADA NO RASCUNHO DA ETAPA 14
// ------------------------------------------------------------
/**
 * Disponibiliza botão para copiar somente área total, sempre relendo a origem.
 * @param {Element} formulario Formulário da Etapa 14.
 * @param {HTMLInputElement} campoTotal Entrada de área total.
 * @returns {void} Altera DOM/rascunho por ação; não grava Etapa 2 ou 14.
 */
export function integrarBaciaDelimitada(formulario, campoTotal) {
  const caixa = elemento(formulario, "section", "", "geo-integracao");
  const acao = botao(caixa, "Usar área delimitada na Etapa 2", usar);
  const aviso = elemento(caixa, "p", ""); aviso.setAttribute("role", "status");
  // ------------------------------------------------------------
  // DISPONIBILIDADE DA ORIGEM SEM COPIAR DADOS
  // ------------------------------------------------------------
  /** @returns {void} Lê a Etapa 2 e informa disponibilidade, sem alterar campos. */
  function atualizar() {
    const leitura = lerGeometria(2);
    acao.disabled = leitura.estado !== "valido";
    aviso.textContent = leitura.mensagem || (leitura.dados ? "A área da Etapa 2 pode ser aproveitada no rascunho. Salve esta etapa para confirmar." : "Nenhuma bacia válida foi delimitada na Etapa 2. O preenchimento manual continua disponível.");
  }
  // ------------------------------------------------------------
  // PREENCHIMENTO EXPLÍCITO APENAS DA ÁREA TOTAL
  // ------------------------------------------------------------
  /** @returns {void} Copia área recalculada, aciona validação existente e mantém demais entradas. */
  function usar() {
    const leitura = lerGeometria(2);
    if (leitura.estado !== "valido") { atualizar(); return; }
    campoTotal.value = String(leitura.dados.areaM2).replace(".", ",");
    campoTotal.dispatchEvent(new Event("input", { bubbles: true }));
    campoTotal.focus();
    aviso.textContent = "Área delimitada copiada para o rascunho. Os demais campos foram mantidos. Salve os dados da bacia para confirmar.";
  }
  // ------------------------------------------------------------
  // ORIGEM ALTERADA EM OUTRA ABA
  // ------------------------------------------------------------
  /** @param {StorageEvent} evento Alteração externa. @returns {void} Atualiza só disponibilidade/aviso. */
  function alterada(evento) { if (evento.key === null || evento.key === CHAVE_BACIA_MAPA) atualizar(); }
  window.addEventListener("storage", alterada); atualizar();
}

// ------------------------------------------------------------
// SELETOR DE ESPAÇO PARA NOVO RASCUNHO DA ETAPA 8
// ------------------------------------------------------------
/**
 * Oferece apenas espaços confirmados. A interface chamadora controla duplicação.
 * @param {Element} pai Destino dos controles, fora do formulário de cadastro.
 * @param {Function} importar Callback recebe espaço e texto original da fonte.
 * @returns {void} Lê Etapa 6; não grava nem cria uma área automaticamente.
 */
export function integrarEspacos(pai, importar) {
  const caixa = elemento(pai, "section", "", "geo-integracao");
  const campo = elemento(caixa, "div", "", "campo");
  elemento(campo, "label", "Espaço confirmado na Etapa 6").htmlFor = "espaco-origem";
  const seletor = elemento(campo, "select"); seletor.id = "espaco-origem";
  const acao = botao(caixa, "Adicionar espaço da Etapa 6", usar);
  const aviso = elemento(caixa, "p", ""); aviso.id = "espaco-origem-status"; aviso.setAttribute("role", "status");
  // ------------------------------------------------------------
  // RELEITURA DO SELETOR SEM ALTERAR O CADASTRO MANUAL
  // ------------------------------------------------------------
  /** @returns {void} Atualiza opções confirmadas e avisos; não toca em rascunhos. */
  function atualizar() {
    const selecionado = seletor.value;
    const leitura = lerGeometria(6);
    seletor.replaceChildren(); seletor.add(new Option("Selecione um espaço", ""));
    for (const espaco of leitura.dados.espacos) seletor.add(new Option(`Espaço ${espaco.numero} — ${espaco.identificacao}`, espaco.id));
    for (const opcao of seletor.options) if (opcao.value === selecionado) seletor.value = selecionado;
    acao.disabled = Boolean(leitura.mensagem) || leitura.dados.espacos.length === 0;
    aviso.textContent = leitura.mensagem || (leitura.dados.espacos.length ? "Escolha um espaço para preencher um novo rascunho. Confirme pelo botão Adicionar área." : "Nenhum espaço cadastrado na Etapa 6. O cadastro manual continua disponível.");
  }
  // ------------------------------------------------------------
  // IMPORTAÇÃO INICIADA PELO PROJETISTA
  // ------------------------------------------------------------
  /** @returns {void} Relê origem e entrega a cópia ao rascunho, ou informa falha. */
  function usar() {
    const leitura = lerGeometria(6);
    if (leitura.mensagem) { aviso.textContent = leitura.mensagem; return; }
    for (const espaco of leitura.dados.espacos) if (espaco.id === seletor.value) {
      try { importar(espaco, leitura.original); aviso.textContent = "Espaço copiado para um novo rascunho. Complete os dados e confirme em Adicionar área."; }
      catch (erro) { aviso.textContent = erro.message; }
      return;
    }
    aviso.textContent = "Selecione um espaço ainda cadastrado na Etapa 6."; seletor.focus();
  }
  // ------------------------------------------------------------
  // DISPONIBILIDADE APÓS ALTERAÇÃO EXTERNA
  // ------------------------------------------------------------
  /** @param {StorageEvent} evento Origem alterada. @returns {void} Atualiza apenas o seletor. */
  function alterada(evento) { if (evento.key === null || evento.key === CHAVE_ESPACOS) atualizar(); }
  window.addEventListener("storage", alterada); atualizar();
}
