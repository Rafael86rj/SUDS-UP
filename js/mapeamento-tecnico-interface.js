// ------------------------------------------------------------
// Arquivo: js/mapeamento-tecnico-interface.js — 06/10/2026
// Objetivo: Inventário manual e rastreável da Etapa 5.
// Responsabilidade: CRUD acessível, rascunho e confirmação; sem avaliar aptidão.
// ------------------------------------------------------------
import { abrirRegistro } from "./dados/armazenamento-lote-1.js";
import { CHAVE_MAPEAMENTO, CATEGORIAS_MAPEAMENTO, validarMapeamento, salvarItemMapeamento } from "./dados/lote-4.js";
import { elemento, botao } from "./lote-2-interface.js";

// ------------------------------------------------------------
// INVENTÁRIO COM CONFIRMAÇÃO E PROTEÇÃO DO ARMAZENAMENTO
// ------------------------------------------------------------
/** @param {Element} container Destino. @returns {void} Monta eventos e DOM; grava somente ao salvar/excluir confirmado. */
export function iniciarMapeamentoTecnico(container) {
  const armazenamento = abrirRegistro(CHAVE_MAPEAMENTO, validarMapeamento);
  let dados = armazenamento.leitura.dados || { versao: 1, proximoNumero: 1, registros: [] };
  let editando = null;
  container.className = "card lote-1 lote-4";
  container.innerHTML = `<h2>Inventário das informações técnicas consultadas</h2>
    <p>Documente suas fontes e lacunas. Este inventário não interpreta as informações nem classifica a aptidão de técnicas SUDS.</p>
    <p id="mapeamento-origem" role="status"></p>
    <form id="mapeamento-formulario" novalidate>
      <h3 id="mapeamento-titulo">Novo registro</h3>
      <div class="campos">
        <div class="campo"><label for="mapeamento-categoria">Categoria (obrigatória)</label><select id="mapeamento-categoria" required></select></div>
        <div class="campo"><label for="mapeamento-identificacao">Identificação da base, documento ou informação (obrigatória)</label><input id="mapeamento-identificacao" required></div>
        <div class="campo"><label for="mapeamento-fonte">Fonte ou órgão responsável (obrigatório)</label><input id="mapeamento-fonte" required></div>
        <div class="campo"><label for="mapeamento-referenciaTemporal">Data ou referência temporal (opcional)</label><input id="mapeamento-referenciaTemporal"></div>
      </div>
      <div class="campo"><label for="mapeamento-observacoes">Observações do projetista</label><textarea id="mapeamento-observacoes" rows="3"></textarea></div>
      <label class="lote4-checkbox"><input type="checkbox" id="mapeamento-lacuna"> Há lacuna de informação neste registro</label>
      <div class="lote-acoes"><button class="botao botao--primario" id="mapeamento-salvar" type="submit">Adicionar registro</button><button class="botao botao--secundario" id="mapeamento-cancelar" type="button">Cancelar edição / limpar rascunho</button></div>
    </form>
    <p id="mapeamento-status" role="status" aria-atomic="true"></p>
    <p>Os registros confirmados ficam neste navegador. Limpar os dados de navegação pode apagar o inventário.</p>
    <section id="mapeamento-lista" aria-label="Registros confirmados"></section>`;
  // ------------------------------------------------------------
  // ACESSO A CONTROLES LOCAIS
  // ------------------------------------------------------------
  /** @param {string} id Sufixo. @returns {HTMLElement} Controle existente; sem mutação. */
  function campo(id) { return container.querySelector(`#mapeamento-${id}`); }
  campo("categoria").add(new Option("Selecione uma categoria", ""));
  for (const categoria of CATEGORIAS_MAPEAMENTO) campo("categoria").add(new Option(categoria, categoria));
  campo("origem").textContent = armazenamento.leitura.mensagem || "";
  campo("origem").className = "lote-erro";
  const campos = ["categoria", "identificacao", "fonte", "referenciaTemporal", "observacoes"];

  // ------------------------------------------------------------
  // MENSAGEM DE AÇÃO SEM DESCARTAR O RASCUNHO
  // ------------------------------------------------------------
  /** @param {string} texto Mensagem. @param {boolean} erro Falha. @returns {void} Atualiza status textual e visual. */
  function informar(texto, erro = false) {
    campo("status").textContent = texto;
    campo("status").classList.toggle("lote-erro", erro);
  }

  // ------------------------------------------------------------
  // CANCELAMENTO EXCLUSIVO DO FORMULÁRIO
  // ------------------------------------------------------------
  /** @returns {void} Limpa rascunho e foco; não altera os registros confirmados. */
  function limpar() {
    editando = null; campo("formulario").reset();
    campo("titulo").textContent = "Novo registro";
    campo("salvar").textContent = "Adicionar registro";
    for (const id of campos) campo(id).removeAttribute("aria-invalid");
    campo("categoria").focus();
  }

  // ------------------------------------------------------------
  // LISTA TEXTUAL SEGURA E AÇÕES POR REGISTRO
  // ------------------------------------------------------------
  /** @returns {void} Substitui lista, sem interpretar textos como HTML ou escrever storage. */
  function renderizar() {
    const lista = campo("lista"); lista.replaceChildren();
    if (!dados.registros.length) {
      elemento(lista, "p", armazenamento.leitura.mensagem ? "Os registros não puderam ser lidos. Os dados originais foram preservados." : "Nenhuma informação técnica foi registrada ainda.").setAttribute("role", "status");
    }
    for (const item of dados.registros) {
      const card = elemento(lista, "article", "", "lote4-registro");
      card.dataset.id = item.id;
      elemento(card, "h3", `Registro ${item.numero} — ${item.identificacao}`);
      for (const [rotulo, valor] of [["Categoria", item.categoria], ["Fonte", item.fonte], ["Referência temporal", item.referenciaTemporal || "Não informada"], ["Observações", item.observacoes || "Não informadas"], ["Lacuna de informação", item.lacuna ? "Sim" : "Não indicada"]]) elemento(card, "p", `${rotulo}: ${valor}`);
      const acoes = elemento(card, "div", "", "lote-acoes");
      // ------------------------------------------------------------
      // ABERTURA DE UM RASCUNHO COM O MESMO ID
      // ------------------------------------------------------------
      /** @returns {void} Copia valores para edição; não persiste. */
      function editar() {
        editando = item.id;
        for (const id of campos) campo(id).value = item[id];
        campo("lacuna").checked = item.lacuna;
        campo("titulo").textContent = `Editar registro ${item.numero}`;
        campo("salvar").textContent = "Salvar alterações";
        informar("Edição em rascunho. Salve para confirmar."); campo("identificacao").focus();
      }
      // ------------------------------------------------------------
      // EXCLUSÃO CONFIRMADA, SEM REUTILIZAR NUMERAÇÃO
      // ------------------------------------------------------------
      /** @returns {void} Confirma e grava exclusão; em falha, preserva coleção e rascunho. */
      function excluir() {
        if (!window.confirm(`Excluir o registro ${item.numero}?`)) return;
        const copia = { ...dados, registros: dados.registros.filter(registro => registro.id !== item.id) };
        const resultado = armazenamento.salvar(copia);
        if (!resultado.ok) { informar(resultado.mensagem, true); return; }
        dados = copia;
        if (editando === item.id) limpar();
        renderizar(); campo("categoria").focus(); informar("Registro excluído. A numeração foi preservada.");
      }
      botao(acoes, "Editar registro", editar); botao(acoes, "Excluir registro", excluir);
    }
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO DA ENTRADA E GRAVAÇÃO PROTEGIDA
  // ------------------------------------------------------------
  /** @param {Event} evento Submit. @returns {void} Valida e salva; falhas mantêm rascunho e resultado antigo. */
  function salvar(evento) {
    evento.preventDefault();
    const entrada = { lacuna: campo("lacuna").checked };
    for (const id of campos) entrada[id] = campo(id).value.trim();
    for (const id of ["categoria", "identificacao", "fonte"]) campo(id).setAttribute("aria-invalid", String(!entrada[id]));
    try {
      const copia = salvarItemMapeamento(dados, entrada, editando || crypto.randomUUID());
      const resultado = armazenamento.salvar(copia);
      if (!resultado.ok) { informar(resultado.mensagem, true); return; }
      dados = copia; limpar(); renderizar(); informar("Registro salvo neste navegador.");
    } catch (erro) {
      informar(erro.message, true);
      container.querySelector('[aria-invalid="true"]')?.focus();
    }
  }
  // ------------------------------------------------------------
  // CANCELAMENTO EXPLÍCITO DA EDIÇÃO
  // ------------------------------------------------------------
  /** @returns {void} Limpa somente o rascunho e informa preservação. */
  function cancelar() { limpar(); informar("Rascunho cancelado. Os registros confirmados foram mantidos."); }
  // ------------------------------------------------------------
  // ALERTA DE CONCORRÊNCIA SEM RECARREGAR CAMPOS
  // ------------------------------------------------------------
  /** @param {StorageEvent} evento Alteração externa. @returns {void} Avisa; abrirRegistro impede sobrescrita no envio. */
  function fonteAlterada(evento) {
    if (evento.key === null || evento.key === CHAVE_MAPEAMENTO) informar("Os dados mudaram em outra aba. Recarregue antes de salvar; seu rascunho foi mantido.", true);
  }
  campo("formulario").addEventListener("submit", salvar);
  campo("cancelar").addEventListener("click", cancelar);
  window.addEventListener("storage", fonteAlterada);
  renderizar();
}
