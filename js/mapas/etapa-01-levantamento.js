import { abrirArmazenamentoPontos, coordenadasValidas } from "../dados/pontos-alagamento.js";

// ------------------------------------------------------------
// COLEÇÃO ÚNICA, FORMULÁRIO PROVISÓRIO E CONEXÃO COM O MAPA
// ------------------------------------------------------------
// O formulário é um rascunho separado: clicar, pesquisar ou cancelar não grava.
// A tabela funciona mesmo se o recurso externo do mapa não puder carregar.
export function iniciarLevantamento() {
  const armazenamento = abrirArmazenamentoPontos();
  let dados = armazenamento.dados;
  let posicao = null;
  let editando = null;
  let adaptador = null;
  let revisao = 0;
  const campo = id => document.getElementById(id);
  const formulario = campo("ponto-formulario");
  const endereco = campo("ponto-endereco");
  const descricao = campo("ponto-descricao");
  const mensagem = campo("ponto-mensagem");
  const status = campo("ponto-salvamento");
  const corpo = campo("pontos-corpo");

  function informar(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = erro ? "erro" : "info";
  }

  function limpar() {
    revisao++;
    editando = null;
    posicao = null;
    formulario.reset();
    campo("ponto-titulo").textContent = "Novo ponto de alagamento";
    campo("ponto-salvar").textContent = "Adicionar ponto de alagamento";
    campo("ponto-cancelar").textContent = "Limpar seleção";
    adaptador?.provisorio(null);
  }

  function selecionar(latitude, longitude, referencia = "") {
    if (!coordenadasValidas(latitude, longitude)) {
      informar("Selecione uma posição válida: latitude entre −90 e 90 e longitude entre −180 e 180.", true);
      return false;
    }
    revisao++;
    // Mantém a precisão original em memória; arredondamento é apenas visual.
    posicao = { latitude, longitude };
    campo("mapa-latitude").value = latitude.toFixed(6);
    campo("mapa-longitude").value = longitude.toFixed(6);
    endereco.value = referencia;
    adaptador?.provisorio(posicao);
    informar("Posição provisória selecionada. Confira o endereço ou referência e salve para confirmar.");
    return true;
  }

  // ------------------------------------------------------------
  // TABELA E MARCADORES DERIVADOS DOS MESMOS REGISTROS
  // ------------------------------------------------------------
  // Textos do usuário são atribuídos com textContent ou value, nunca innerHTML.
  function renderizar() {
    corpo.replaceChildren();
    campo("pontos-quantidade").textContent = `${dados.pontos.length} ponto(s) de alagamento cadastrado(s)`;
    if (!dados.pontos.length) {
      const linha = corpo.insertRow();
      const celula = linha.insertCell();
      celula.colSpan = 5;
      celula.textContent = "Nenhum ponto cadastrado. Selecione uma posição e clique em Adicionar ponto de alagamento.";
    }
    dados.pontos.forEach(ponto => {
      const linha = corpo.insertRow();
      linha.dataset.id = ponto.id;
      [ `Ponto ${ponto.numero}`, ponto.endereco, ponto.latitude.toFixed(6), ponto.longitude.toFixed(6) ]
        .forEach(texto => { linha.insertCell().textContent = texto; });
      const acoes = linha.insertCell();
      ["Localizar", "Editar", "Excluir"].forEach(acao => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao botao--secundario";
        botao.textContent = acao;
        botao.setAttribute("aria-label", `${acao} ponto ${ponto.numero}`);
        if (acao === "Localizar") botao.disabled = !adaptador;
        botao.addEventListener("click", () => agir(acao, ponto));
        acoes.append(botao);
      });
    });
    adaptador?.registros(dados.pontos);
  }

  function confirmar(novosDados) {
    const resultado = armazenamento.salvar(novosDados);
    if (!resultado.ok) {
      status.textContent = resultado.erro;
      status.dataset.tipo = "erro";
      informar(resultado.erro, true);
      return false;
    }
    dados = novosDados;
    status.textContent = "Levantamento salvo neste navegador.";
    status.dataset.tipo = "sucesso";
    renderizar();
    return true;
  }

  // ------------------------------------------------------------
  // LOCALIZAÇÃO, EDIÇÃO E EXCLUSÃO CONFIRMADA
  // ------------------------------------------------------------
  // A edição copia valores para o rascunho; ID e número só vêm do registro salvo.
  function agir(acao, ponto) {
    if (acao === "Localizar") {
      revisao++; // Mensagens antigas de consulta não substituem a localização.
      adaptador?.localizar(ponto.id);
      informar(`Ponto ${ponto.numero} destacado no mapa.`);
      return;
    }
    if (acao === "Editar") {
      if (editando && !window.confirm("Descartar a edição em andamento e editar outro ponto?")) return;
      editando = ponto.id;
      selecionar(ponto.latitude, ponto.longitude, ponto.endereco);
      descricao.value = ponto.descricao;
      campo("ponto-titulo").textContent = `Editando ponto ${ponto.numero}`;
      campo("ponto-salvar").textContent = "Salvar alterações";
      campo("ponto-cancelar").textContent = "Cancelar edição";
      adaptador?.localizar(ponto.id);
      informar(`Editando ponto ${ponto.numero}. Se mudar a posição, confira novamente o endereço. Cancelar mantém os dados anteriores.`);
      endereco.focus();
      return;
    }
    if (!window.confirm(`Excluir o ponto de alagamento ${ponto.numero}? Esta ação remove o registro salvo neste navegador.`)) return;
    revisao++;
    if (confirmar({ ...dados, pontos: dados.pontos.filter(item => item.id !== ponto.id) })) {
      if (editando === ponto.id) limpar();
      informar(`Ponto ${ponto.numero} excluído. A numeração dos demais foi mantida.`);
      campo("pontos-quantidade").focus();
    }
  }

  // ------------------------------------------------------------
  // SALVAMENTO EXPLÍCITO E CANCELAMENTO
  // ------------------------------------------------------------
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    revisao++; // Protege inclusive mensagens de validação e falha ao salvar.
    if (!posicao || !coordenadasValidas(posicao.latitude, posicao.longitude)) {
      informar("Selecione primeiro uma posição no mapa ou pela busca.", true);
      return;
    }
    if (!endereco.value.trim()) {
      informar("Informe um endereço ou referência para o ponto.", true);
      endereco.focus();
      return;
    }
    const anterior = dados.pontos.find(item => item.id === editando);
    const ponto = {
      id: anterior?.id || crypto.randomUUID(),
      numero: anterior?.numero || dados.proximoNumero,
      endereco: endereco.value.trim(), descricao: descricao.value.trim(), ...posicao
    };
    const novosDados = {
      versao: 1,
      proximoNumero: anterior ? dados.proximoNumero : dados.proximoNumero + 1,
      pontos: anterior ? dados.pontos.map(item => item.id === editando ? ponto : item) : [...dados.pontos, ponto]
    };
    if (confirmar(novosDados)) {
      limpar();
      informar(`Ponto ${ponto.numero} ${anterior ? "atualizado" : "adicionado"} e salvo neste navegador.`);
    }
  });
  campo("ponto-cancelar").addEventListener("click", () => {
    limpar();
    informar("Seleção descartada. Os registros cadastrados foram mantidos.");
    endereco.focus();
  });
  // Uma resposta atrasada não pode substituir um formulário já alterado.
  // A mensagem também deixa de indicar uma consulta que não será mais aplicada.
  formulario.addEventListener("input", () => {
    revisao++;
    informar("Rascunho alterado. Confira os dados antes de confirmar.");
  });
  status.textContent = armazenamento.erro || "Levantamento carregado. As alterações são salvas ao confirmar cada registro.";
  status.dataset.tipo = armazenamento.erro ? "erro" : "info";
  renderizar();
  return {
    selecionar,
    get revisao() { return revisao; },
    // ------------------------------------------------------------
    // SUGESTÕES ASSÍNCRONAS VINCULADAS AO RASCUNHO
    // ------------------------------------------------------------
    // Iniciar uma busca invalida consultas anteriores. A resposta altera somente
    // o endereço: preserva posição, descrição, modo de edição e registro salvo.
    iniciarConsulta() { return ++revisao; },
    informarConsulta(origem, texto, erro = false) {
      if (origem === revisao) informar(texto, erro);
    },
    sugerirEndereco(origem, texto) {
      if (origem !== revisao) return;
      endereco.value = texto;
      informar(texto
        ? "Endereço sugerido pela posição. Confira o nome da rua e o número."
        : "Não foi possível identificar o endereço. Informe uma referência manualmente.");
    },
    conectarMapa(novoAdaptador) {
      adaptador = novoAdaptador;
      renderizar();
      return dados.pontos;
    }
  };
}
