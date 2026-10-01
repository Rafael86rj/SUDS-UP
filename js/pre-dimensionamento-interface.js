import { obterPadrao, FONTE_PRE_DIMENSIONAMENTO } from "./dados/parametros-pre-dimensionamento.js";
import { lerDecimal, validarParametros, calcularVolumeIntervencao, calcularTotalIntervencoes } from "./calculos/pre-dimensionamento.js";
import { abrirCenario } from "./dados/cenario-pre-dimensionamento.js";

// ------------------------------------------------------------
// INTERFACE DA ETAPA 13 E DEPENDÊNCIA DO CATÁLOGO COMPARTILHADO
// ------------------------------------------------------------
// Recebe o cadastro de etapa.js, sem copiar nomes ou importar seleções de outras
// etapas. Uma intervenção é criada somente pela confirmação manual do formulário.
export function iniciarPreDimensionamento(container, catalogo) {
  const variantes = new Map(catalogo.flatMap(tecnica => tecnica.variantes
    .filter(variante => obterPadrao(variante.id))
    .map(variante => [variante.id, `${tecnica.nome} — ${variante.nome}`])));
  const armazenamento = abrirCenario(new Set(variantes.keys()));
  let dados = armazenamento.dados;
  let editando = null;
  let varianteAtual = "";
  let avisoRestauracao;
  const volumeFormatado = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numeroFormatado = new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 15 });
  container.className = "card pre-dimensionamento";
  container.innerHTML = `
    <h2>Intervenções do cenário</h2>
    <p>Cadastre manualmente cada aplicação de uma técnica. Um ponto de alagamento localiza o problema; uma área disponível é um espaço candidato; uma intervenção aplica uma técnica com área e parâmetros definidos.</p>
    <p>Estimativa simplificada de armazenamento para pré-dimensionamento. Considera a área, a profundidade e a fração de vazios; não simula a infiltração nem a descarga durante a chuva.</p>
    <p><strong>V = A × H × n</strong> — área (m²) × profundidade (m) × fração de vazios. O total soma todas as intervenções confirmadas.</p>
    <form id="pre-formulario" novalidate>
      <h3 id="pre-titulo">Nova intervenção</h3>
      <div class="campos">
        <div class="campo campo--largo"><label for="pre-variante">Técnica / variante (obrigatória)</label><select id="pre-variante" required aria-describedby="pre-erro-variante"></select><small id="pre-erro-variante" class="pre-erro"></small></div>
        <div class="campo"><label for="pre-area">Área ocupada pela técnica (m²)</label><input id="pre-area" type="text" inputmode="decimal" required aria-describedby="pre-decimais pre-erro-area"><small id="pre-erro-area" class="pre-erro"></small></div>
        <div class="campo"><label for="pre-profundidade">Profundidade (m)</label><input id="pre-profundidade" type="text" inputmode="decimal" required aria-describedby="pre-decimais pre-erro-profundidade"><small id="pre-erro-profundidade" class="pre-erro"></small></div>
        <div class="campo"><label for="pre-vazios">Índice de vazios (0 a 1)</label><input id="pre-vazios" type="text" inputmode="decimal" required aria-describedby="pre-decimais pre-erro-vazios"><small id="pre-erro-vazios" class="pre-erro"></small></div>
      </div>
      <p id="pre-decimais" class="card__subtitulo">Use vírgula ou ponto decimal, sem separador de milhar (ex.: 1,50). Os padrões podem ser ajustados pelo projetista. 0,30 corresponde a 30% de vazios.</p>
      <button id="pre-restaurar" type="button" class="botao botao--secundario" disabled>Restaurar parâmetros padrão</button>
      <p id="pre-restauracao-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <p id="pre-previa" role="status" aria-atomic="true"></p>
      <div class="pre-acoes"><button id="pre-salvar" type="submit" class="botao botao--primario">Adicionar intervenção</button><button id="pre-cancelar" type="button" class="botao botao--secundario">Limpar rascunho</button></div>
    </form>
    <p id="pre-mensagem" role="status" aria-atomic="true"></p>
    <p id="pre-armazenamento" role="status" aria-atomic="true"></p>
    <p class="card__subtitulo">As intervenções são salvas neste navegador. Limpar os dados de navegação pode apagar o cenário.</p>
    <div class="pre-resumo" tabindex="-1" id="pre-resumo"><strong id="pre-quantidade"></strong><strong id="pre-total"></strong></div>
    <div class="pre-tabela" role="region" aria-label="Intervenções confirmadas" tabindex="0">
      <table class="tabela-prototipo"><thead><tr><th scope="col">Intervenção</th><th scope="col">Técnica</th><th scope="col">Área (m²)</th><th scope="col">Profundidade (m)</th><th scope="col">Índice de vazios</th><th scope="col">Volume (m³)</th><th scope="col">Ações</th></tr></thead><tbody id="pre-registros"></tbody></table>
    </div>
    <p id="pre-fonte" class="card__subtitulo"></p>`;
  const campo = nome => container.querySelector(`#pre-${nome}`);
  const seletor = campo("variante");
  seletor.add(new Option("Selecione uma técnica / variante", ""));
  variantes.forEach((nome, id) => seletor.add(new Option(nome, id)));
  const fonte = FONTE_PRE_DIMENSIONAMENTO;
  campo("fonte").textContent = `Padrões: ${fonte.arquivo}, aba “${fonte.aba}”, ${fonte.celulas}; ${fonte.documento}, páginas ${fonte.paginas}, ${fonte.referencia}. Valores fornecidos na especificação do projeto.`;

  function informar(texto) { campo("mensagem").textContent = texto; }
  // ------------------------------------------------------------
  // CONFIRMAÇÃO LOCAL DA RESTAURAÇÃO
  // ------------------------------------------------------------
  // Esvaziar a região e repor o texto em outra atualização permite anunciar
  // cliques repetidos. Cancelar o timer impede avisos antigos após editar o rascunho.
  function limparConfirmacaoRestauracao() {
    clearTimeout(avisoRestauracao);
    campo("restauracao-status").textContent = "";
  }
  function preencherPadroes() {
    const padrao = obterPadrao(varianteAtual);
    for (const nome of ["profundidade", "vazios"]) campo(nome).value = padrao ? String(padrao[nome]).replace(".", ",") : "";
    campo("restaurar").disabled = !padrao;
  }
  function limpar() {
    limparConfirmacaoRestauracao();
    editando = null;
    varianteAtual = "";
    campo("formulario").reset();
    preencherPadroes();
    campo("titulo").textContent = "Nova intervenção";
    campo("salvar").textContent = "Adicionar intervenção";
    campo("cancelar").textContent = "Limpar rascunho";
    atualizarPrevia();
  }

  // ------------------------------------------------------------
  // VALIDAÇÃO POR CAMPO E PRÉVIA SEM ALTERAR O TOTAL CONFIRMADO
  // ------------------------------------------------------------
  // A cada entrada recalculamos usando valores completos. Uma prévia inválida é
  // removida imediatamente; também conferimos o total resultante da confirmação.
  function atualizarPrevia() {
    const entrada = { variante: seletor.value };
    for (const nome of ["area", "profundidade", "vazios"]) entrada[nome] = lerDecimal(campo(nome).value);
    const erros = validarParametros(entrada);
    if (!variantes.has(entrada.variante)) erros.variante = "Selecione uma variante cadastrada.";
    let volume;
    if (!Object.keys(erros).length) {
      try {
        volume = calcularVolumeIntervencao(entrada.area, entrada.profundidade, entrada.vazios);
        calcularTotalIntervencoes([...dados.intervencoes.filter(item => item.id !== editando), entrada]);
      } catch (erro) { erros.area = erro.message; }
    }
    for (const nome of ["variante", "area", "profundidade", "vazios"]) {
      campo(`erro-${nome}`).textContent = erros[nome] || "";
      campo(nome).setAttribute("aria-invalid", String(Boolean(erros[nome])));
    }
    const valida = Object.keys(erros).length === 0;
    campo("previa").textContent = valida ? `Prévia: ${volumeFormatado.format(volume)} m³ — ainda não incluída no total.` : "Prévia indisponível. Confira os campos indicados.";
    return { entrada, erros, valida };
  }

  // ------------------------------------------------------------
  // TABELA E TOTAL DERIVADOS DAS ENTRADAS CONFIRMADAS
  // ------------------------------------------------------------
  // Volume nunca é persistido. Apenas sua exibição é arredondada; o total usa
  // todas as entradas originais, incluindo intervenções repetidas da mesma variante.
  function renderizar() {
    campo("quantidade").textContent = `${dados.intervencoes.length} intervenção(ões)`;
    campo("total").textContent = `Volume total: ${volumeFormatado.format(calcularTotalIntervencoes(dados.intervencoes))} m³`;
    const corpo = campo("registros");
    corpo.replaceChildren();
    if (!dados.intervencoes.length) {
      const celula = corpo.insertRow().insertCell();
      celula.colSpan = 7;
      celula.textContent = "Nenhuma intervenção confirmada. Preencha e adicione a primeira intervenção.";
    }
    dados.intervencoes.forEach(item => {
      const linha = corpo.insertRow();
      linha.dataset.id = item.id;
      const volume = calcularVolumeIntervencao(item.area, item.profundidade, item.vazios);
      [`Intervenção ${item.numero}`, variantes.get(item.variante), numeroFormatado.format(item.area), numeroFormatado.format(item.profundidade), numeroFormatado.format(item.vazios), volumeFormatado.format(volume)]
        .forEach(texto => { linha.insertCell().textContent = texto; });
      const acoes = linha.insertCell();
      ["Editar", "Excluir"].forEach(acao => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao botao--secundario";
        botao.textContent = acao;
        botao.setAttribute("aria-label", `${acao} intervenção ${item.numero}`);
        botao.addEventListener("click", () => agir(acao, item));
        acoes.append(botao);
      });
    });
  }

  function confirmar(novosDados) {
    const resultado = armazenamento.salvar(novosDados);
    campo("armazenamento").textContent = resultado.ok ? "Cenário salvo neste navegador." : resultado.erro;
    campo("armazenamento").classList.toggle("pre-erro", !resultado.ok);
    if (!resultado.ok) { informar("Alteração não confirmada. O rascunho foi mantido."); return false; }
    dados = novosDados;
    renderizar();
    return true;
  }

  // ------------------------------------------------------------
  // EDIÇÃO, EXCLUSÃO E NUMERAÇÃO ESTÁVEL
  // ------------------------------------------------------------
  // Editar recupera parâmetros efetivamente salvos. A troca de variante mantém
  // o ID/número da intervenção em edição; excluir não reduz o próximo número.
  function agir(acao, item) {
    if (acao === "Editar") {
      limparConfirmacaoRestauracao();
      editando = item.id;
      varianteAtual = item.variante;
      seletor.value = varianteAtual;
      for (const nome of ["area", "profundidade", "vazios"]) campo(nome).value = String(item[nome]).replace(".", ",");
      campo("restaurar").disabled = false;
      campo("titulo").textContent = `Editando intervenção ${item.numero}`;
      campo("salvar").textContent = "Salvar alterações";
      campo("cancelar").textContent = "Cancelar edição";
      atualizarPrevia();
      informar("Edição aberta com os parâmetros salvos. Cancele para manter o registro anterior.");
      seletor.focus();
      return;
    }
    if (!window.confirm(`Excluir a intervenção ${item.numero}?`)) return;
    if (confirmar({ ...dados, intervencoes: dados.intervencoes.filter(registro => registro.id !== item.id) })) {
      if (editando === item.id) limpar();
      else atualizarPrevia();
      informar(`Intervenção ${item.numero} excluída. Os demais números foram mantidos.`);
      campo("resumo").focus();
    }
  }

  // ------------------------------------------------------------
  // EVENTOS DO RASCUNHO E SUBSTITUIÇÃO EXPLÍCITA DOS PADRÕES
  // ------------------------------------------------------------
  seletor.addEventListener("change", () => {
    const anterior = obterPadrao(varianteAtual);
    const personalizados = anterior && ["profundidade", "vazios"].some(nome => lerDecimal(campo(nome).value) !== anterior[nome]);
    if (personalizados && !window.confirm("Substituir os parâmetros personalizados pelos padrões da nova variante?")) {
      seletor.value = varianteAtual;
      return;
    }
    varianteAtual = seletor.value;
    limparConfirmacaoRestauracao();
    preencherPadroes();
    atualizarPrevia();
    informar("Os parâmetros do rascunho foram atualizados conforme a variante selecionada.");
  });
  campo("restaurar").addEventListener("click", () => {
    preencherPadroes();
    atualizarPrevia();
    limparConfirmacaoRestauracao();
    avisoRestauracao = setTimeout(() => {
      campo("restauracao-status").textContent = "Profundidade e índice de vazios restaurados para o padrão da técnica.";
    }, 150);
  });
  campo("formulario").addEventListener("input", evento => {
    if (evento.target === campo("profundidade") || evento.target === campo("vazios")) limparConfirmacaoRestauracao();
    if (evento.target !== seletor) atualizarPrevia();
  });
  campo("cancelar").addEventListener("click", () => {
    limpar();
    informar("Rascunho descartado. As intervenções confirmadas foram mantidas.");
    seletor.focus();
  });
  campo("formulario").addEventListener("submit", evento => {
    evento.preventDefault();
    const { entrada, erros, valida } = atualizarPrevia();
    if (!valida) { campo(Object.keys(erros)[0]).focus(); return; }
    const anterior = dados.intervencoes.find(item => item.id === editando);
    const registro = { id: anterior?.id || crypto.randomUUID(), numero: anterior?.numero || dados.proximoNumero, ...entrada };
    const novosDados = { versao: 1, proximoNumero: dados.proximoNumero + (anterior ? 0 : 1),
      intervencoes: anterior ? dados.intervencoes.map(item => item.id === editando ? registro : item) : [...dados.intervencoes, registro] };
    if (confirmar(novosDados)) {
      limpar();
      informar(`Intervenção ${registro.numero} ${anterior ? "atualizada" : "adicionada"}.`);
      seletor.focus();
    }
  });
  campo("armazenamento").textContent = armazenamento.erro || "Cenário carregado. Confirme cada intervenção para salvar.";
  campo("armazenamento").classList.toggle("pre-erro", Boolean(armazenamento.erro));
  renderizar();
  limpar();
}
