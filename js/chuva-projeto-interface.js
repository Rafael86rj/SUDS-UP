// ------------------------------------------------------------
// Arquivo: js/chuva-projeto-interface.js — 06/10/2026
// Objetivo: Produzir demanda hidrológica confirmada na Etapa 15.
// Responsabilidade: Origem, rascunho, prévia e confirmação; cálculos em módulo puro.
// ------------------------------------------------------------
import { CHAVE_BACIA, CHAVE_CHUVA, CAMPOS_BACIA, validarBacia } from "./dados/lote-1.js";
import { abrirRegistro, lerRegistro } from "./dados/armazenamento-lote-1.js";
import { lerChuvaAtual } from "./dados/armazenamento-lote-4.js";
import { criarResultadoChuva, validarResultadoChuva, chuvaAtual, METODO_CHUVA } from "./dados/lote-4.js";
import { POSTOS_PLUVIOMETRICOS } from "./dados/postos-pluviometricos.js";
import { calcularConcentracao } from "./calculos/chuva-projeto.js";
import { lerDecimal } from "./calculos/pre-dimensionamento.js";
import { elemento, linkEtapa } from "./lote-2-interface.js";

// ------------------------------------------------------------
// FORMULÁRIO DE CHUVA COM FONTES CONFIRMADAS
// ------------------------------------------------------------
/** @param {Element} container Destino. @returns {void} Monta interface; somente submit pode gravar o resultado, sem alterar a Etapa 14. */
export function iniciarChuvaProjeto(container) {
  const origem = lerRegistro(CHAVE_BACIA, validarBacia);
  const armazenamento = abrirRegistro(CHAVE_CHUVA, validarResultadoChuva);
  const bacia = origem.dados;
  container.className = "card lote-1 lote-4";
  container.innerHTML = `<h2>Chuva de projeto</h2>
    <section><h3>1. Dados da bacia utilizados</h3><p id="chuva-origem" role="status"></p><dl class="lote4-metricas" id="chuva-bacia"></dl><a href="etapa.html?numero=14">Revisar dados da bacia na Etapa 14</a></section>
    <section><h3>2. Tempo de concentração</h3><p>George Ribeiro: tc = 16 × L_km / [(1,05 − 0,2 × P) × (100 × S)^0,04]. P é uma fração e S é calculada com o comprimento em metros.</p><dl class="lote4-metricas" id="chuva-tempos"></dl></section>
    <form id="chuva-formulario" novalidate>
      <fieldset><legend>3. Chuva de projeto / IDF</legend>
        <p>A IDF segue a Equação 3 da dissertação: i = a × TR^b / (tc + c)^d. Selecione o posto ou informe os coeficientes e sua fonte.</p>
        <div class="campos"><div class="campo"><label for="chuva-modo">Modo IDF</label><select id="chuva-modo"><option value="posto">Posto cadastrado</option><option value="manual">Coeficientes manuais</option></select></div>
        <div class="campo"><label for="chuva-posto">Posto pluviométrico</label><select id="chuva-posto"></select></div></div>
        <div class="campos" id="chuva-campos"></div>
        <p>Use vírgula ou ponto decimal, sem separador de milhar. Coeficientes dos postos cadastrados são somente leitura.</p>
      </fieldset>
      <fieldset><legend>4. Coeficiente de runoff</legend><div class="campo"><label for="chuva-runoff">Runoff C (fração de 0 a 1)</label><input id="chuva-runoff" type="text" inputmode="decimal" value="0,40" required></div></fieldset>
      <section><h3>5. Resultados — prévia não confirmada</h3><p id="chuva-previa" role="status" aria-atomic="true"></p><dl class="lote4-metricas" id="chuva-resultados"></dl></section>
      <section><h3>6. Confirmação</h3><p>Somente o resultado confirmado será usado nas Etapas 16 e 17. Alterar o rascunho não substitui o resultado anterior.</p><button id="chuva-salvar" type="submit" class="botao botao--primario">Confirmar chuva de projeto</button></section>
    </form>
    <p id="chuva-status" role="status" aria-atomic="true"></p>
    <section id="chuva-confirmado" aria-label="Resultado confirmado"></section>`;

  // ------------------------------------------------------------
  // CONTROLES DA ETAPA
  // ------------------------------------------------------------
  /** @param {string} id Sufixo. @returns {HTMLElement} Elemento existente, sem mutação. */
  function campo(id) { return container.querySelector(`#chuva-${id}`); }
  const rotulos = { nome: "Identificação do posto", fonte: "Fonte dos coeficientes", a: "Coeficiente a", b: "Coeficiente b", c: "Coeficiente c (min)", d: "Coeficiente d", TR: "Período de retorno TR (anos)" };
  for (const [id, rotulo] of Object.entries(rotulos)) {
    const bloco = elemento(campo("campos"), "div", "", "campo");
    const label = elemento(bloco, "label", rotulo); label.htmlFor = `chuva-${id}`;
    const input = elemento(bloco, "input"); input.id = `chuva-${id}`; input.type = "text"; input.required = true;
    input.setAttribute("aria-describedby", "chuva-previa");
    if (!["nome", "fonte"].includes(id)) input.inputMode = "decimal";
  }
  campo("TR").value = "10";
  campo("posto").add(new Option("Selecione um posto", ""));
  for (const posto of POSTOS_PLUVIOMETRICOS) campo("posto").add(new Option(posto.nome, posto.id));

  // ------------------------------------------------------------
  // FORMATAÇÃO EXCLUSIVA DE APRESENTAÇÃO
  // ------------------------------------------------------------
  /** @param {number} valor Número original. @param {number} casas Precisão visual. @returns {string} Texto pt-BR; não altera o número. */
  function formatar(valor, casas = 2) { return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: casas }).format(valor); }

  // ------------------------------------------------------------
  // MÉTRICA TEXTUAL COM UNIDADE
  // ------------------------------------------------------------
  /** @param {Element} pai Lista de definição. @param {string} rotulo Nome. @param {number} valor Número. @param {string} unidade Unidade. @param {number} casas Precisão visual. @returns {HTMLElement} Valor inserido, sem storage. */
  function metrica(pai, rotulo, valor, unidade = "", casas = 2) {
    const bloco = elemento(pai, "div"); elemento(bloco, "dt", rotulo);
    return elemento(bloco, "dd", `${formatar(valor, casas)}${unidade ? ` ${unidade}` : ""}`);
  }
  if (bacia) {
    campo("origem").textContent = "Dados confirmados da Etapa 14. Estes valores não são editados nesta tela.";
    for (const [id, rotulo] of Object.entries(CAMPOS_BACIA)) metrica(campo("bacia"), rotulo, bacia[id]);
    try {
      const tempos = calcularConcentracao(bacia);
      for (const [id, rotulo, unidade, casas] of [["P", "Fração de vegetação P", "", 6], ["L_km", "Comprimento do talvegue", "km", 4], ["S", "Declividade média", "m/m", 6], ["tcMin", "Tempo de concentração", "min", 4], ["tcHoras", "Tempo de concentração", "h", 6]]) metrica(campo("tempos"), rotulo, tempos[id], unidade, casas);
    } catch (erro) { campo("origem").textContent = erro.message; }
  } else campo("origem").textContent = origem.mensagem || "Confirme os dados da bacia na Etapa 14 antes de calcular a chuva. Nenhum volume foi assumido.";

  // ------------------------------------------------------------
  // RASTREABILIDADE DO RESULTADO JÁ CONFIRMADO
  // ------------------------------------------------------------
  /** @returns {void} Relê resultado e atualidade; não modifica dados nem rascunho. */
  function mostrarConfirmado() {
    const leitura = lerChuvaAtual();
    const destino = campo("confirmado"); destino.replaceChildren();
    elemento(destino, "h3", "Resultado confirmado");
    elemento(destino, "p", leitura.estado === "valido" ? `${formatar(leitura.dados.volumeChuvaAManejar)} m³ — confirmado e atual.` : leitura.mensagem || "Nenhum resultado confirmado ainda.");
    if (leitura.preservados) elemento(destino, "p", `Resultado anterior preservado, não utilizado na avaliação: ${formatar(leitura.preservados.volumeChuvaAManejar)} m³.`);
  }

  // ------------------------------------------------------------
  // COEFICIENTES DO POSTO OU CAMPOS MANUAIS
  // ------------------------------------------------------------
  /** @returns {void} Atualiza coeficientes visíveis; nunca reinicia TR/runoff nem grava. */
  function atualizarPosto() {
    const cadastrado = campo("modo").value === "posto";
    campo("posto").disabled = !cadastrado;
    const posto = POSTOS_PLUVIOMETRICOS.find(item => item.id === campo("posto").value);
    for (const id of ["nome", "fonte", "a", "b", "c", "d"]) {
      campo(id).readOnly = cadastrado;
      if (cadastrado) campo(id).value = posto ? (typeof posto[id] === "number" ? String(posto[id]).replace(".", ",") : posto[id]) : "";
    }
  }

  // ------------------------------------------------------------
  // LEITURA ESTRITA DO RASCUNHO
  // ------------------------------------------------------------
  /** @returns {Object} Entradas numéricas e identificação; não persiste. */
  function lerParametros() {
    const parametros = { modo: campo("modo").value, postoId: campo("modo").value === "posto" ? campo("posto").value : null, nome: campo("nome").value.trim(), fonte: campo("fonte").value.trim() };
    for (const id of ["a", "b", "c", "d", "TR", "runoff"]) {
      parametros[id] = lerDecimal(campo(id).value);
      campo(id).setAttribute("aria-invalid", String(!Number.isFinite(parametros[id]) || (id === "a" || id === "TR") && parametros[id] <= 0 || id === "runoff" && (parametros[id] < 0 || parametros[id] > 1)));
    }
    return parametros;
  }

  // ------------------------------------------------------------
  // VERIFICAÇÃO DA ORIGEM ANTES DE CALCULAR OU CONFIRMAR
  // ------------------------------------------------------------
  /** @returns {void} Lança erro se a origem estiver ausente, inválida ou alterada; não sobrescreve o rascunho. */
  function conferirOrigem() {
    if (!bacia) throw new Error("Confirme uma bacia válida na Etapa 14 e retorne a esta etapa.");
    const atual = lerRegistro(CHAVE_BACIA, validarBacia);
    if (!chuvaAtual({ baciaUtilizada: bacia }, atual.dados)) throw new Error("Os dados da Etapa 14 mudaram ou estão indisponíveis. Recarregue antes de calcular; o rascunho foi mantido.");
  }

  // ------------------------------------------------------------
  // PRÉVIA SEM ESCRITA NO ARMAZENAMENTO
  // ------------------------------------------------------------
  /** @returns {Object|null} Resultado válido ou null; atualiza métricas e erros, sem persistir. */
  function atualizarPrevia() {
    campo("resultados").replaceChildren();
    try {
      conferirOrigem();
      const resultado = criarResultadoChuva(bacia, lerParametros());
      for (const [id, rotulo, unidade, casas] of [["intensidade", "Intensidade", "mm/h", 2], ["alturaMm", "Altura pluviométrica", "mm", 2], ["alturaM", "Altura pluviométrica", "m", 6], ["areaUrbana", "Área urbana", "m²", 2], ["runoff", "Runoff C", "", 4]]) metrica(campo("resultados"), rotulo, resultado[id], unidade, casas);
      metrica(campo("resultados"), "Volume de chuva a manejar", resultado.volumeChuvaAManejar, "m³").id = "chuva-previa-volume";
      campo("previa").textContent = "Prévia válida, ainda não confirmada.";
      campo("previa").className = "";
      return resultado;
    } catch (erro) { campo("previa").textContent = erro.message; campo("previa").className = "lote-erro"; return null; }
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO EXPLÍCITA COM PROTEÇÃO DE CONCORRÊNCIA
  // ------------------------------------------------------------
  /** @param {Event} evento Envio. @returns {void} Salva só um resultado válido e atual; falhas preservam rascunho/confirmado. */
  function confirmar(evento) {
    evento.preventDefault();
    const resultado = atualizarPrevia();
    if (!resultado) {
      campo("status").textContent = "Confira a origem e os parâmetros. Nenhum resultado foi salvo.";
      campo("status").className = "lote-erro";
      container.querySelector('[aria-invalid="true"]')?.focus(); return;
    }
    const gravacao = armazenamento.salvar(resultado);
    campo("status").textContent = gravacao.ok ? "Chuva de projeto confirmada neste navegador." : gravacao.mensagem;
    campo("status").className = gravacao.ok ? "" : "lote-erro";
    if (gravacao.ok) mostrarConfirmado();
  }

  // ------------------------------------------------------------
  // ALTERAÇÃO DE RASCUNHO, SEM APAGAR CONFIRMAÇÃO
  // ------------------------------------------------------------
  /** @param {Event} evento Input/change. @returns {void} Atualiza apenas coeficientes e prévia. */
  function editar(evento) {
    if (evento.target === campo("modo") || evento.target === campo("posto")) atualizarPosto();
    campo("status").textContent = "Rascunho alterado. Confirme para atualizar as Etapas 16 e 17.";
    campo("status").className = "";
    atualizarPrevia();
  }

  // ------------------------------------------------------------
  // ALERTA DE ALTERAÇÃO EXTERNA SEM PERDER CAMPOS
  // ------------------------------------------------------------
  /** @param {StorageEvent|PageTransitionEvent} evento Mudança de origem/retorno. @returns {void} Refaz leitura e avisa; nenhuma escrita. */
  function fonteAlterada(evento) {
    if (evento.type === "pageshow" && !evento.persisted) return;
    if (evento.type === "pageshow" || evento.key === null || [CHAVE_BACIA, CHAVE_CHUVA].includes(evento.key)) {
      campo("status").textContent = "As fontes podem ter mudado. Revise os avisos; seu rascunho foi mantido.";
      mostrarConfirmado(); atualizarPrevia();
    }
  }
  // Restaura apenas entradas confirmadas do método conhecido, nunca resultados
  // formatados nem valores fictícios derivados de registros legados incompletos.
  const confirmado = armazenamento.leitura.dados;
  if (confirmado?.metodo === METODO_CHUVA) {
    campo("modo").value = confirmado.modo; campo("posto").value = confirmado.postoId || "";
    for (const id of [...Object.keys(rotulos), "runoff"]) campo(id).value = typeof confirmado[id] === "number" ? String(confirmado[id]).replace(".", ",") : confirmado[id];
  }
  atualizarPosto(); atualizarPrevia(); mostrarConfirmado();
  campo("formulario").addEventListener("input", editar);
  campo("formulario").addEventListener("change", editar);
  campo("formulario").addEventListener("submit", confirmar);
  window.addEventListener("storage", fonteAlterada); window.addEventListener("pageshow", fonteAlterada);
  linkEtapa(container, "Consultar volume confirmado na Etapa 16", 16);
}
