/*
  CONTROLADOR DAS ETAPAS
  ----------------------
  Lê o número informado na URL, encontra os dados da etapa e monta a interface.
*/

// ------------------------------------------------------------
// SELEÇÃO DA ETAPA E REFERÊNCIAS DA INTERFACE
// ------------------------------------------------------------
// ETAPAS é definido em js/dados-etapas.js, carregado antes deste script por etapa.html.
// A numeração dos dados é sequencial, de 1 até a quantidade de etapas.
const TOTAL_ETAPAS = ETAPAS.length;
const parametros = new URLSearchParams(window.location.search);
const numeroSolicitado = Number(parametros.get("numero"));
// Ausência, texto não numérico ou valor fora do intervalo levam à etapa 1.
// O teste aceita frações dentro do intervalo; não verifica se há uma etapa correspondente.
const numeroEtapa = numeroSolicitado >= 1 && numeroSolicitado <= TOTAL_ETAPAS ? numeroSolicitado : 1;
const etapa = ETAPAS.find(item => item.numero === numeroEtapa);

// Reúne os pontos de atualização do HTML. Os elementos precisam existir na página
// quando este script é carregado, pois as consultas são feitas imediatamente.
const elementos = {
  titulo: document.querySelector("#titulo-etapa"),
  descricao: document.querySelector("#descricao-etapa"),
  breadcrumb: document.querySelector("#breadcrumb"),
  progressoTexto: document.querySelector("#texto-progresso"),
  progressoBarra: document.querySelector("#barra-progresso"),
  lista: document.querySelector("#lista-etapas"),
  area: document.querySelector("#area-trabalho"),
  anterior: document.querySelector("#botao-anterior"),
  proxima: document.querySelector("#botao-proxima"),
  modal: document.querySelector("#modal-orientacao"),
  modalTitulo: document.querySelector("#modal-titulo"),
  modalObjetivo: document.querySelector("#modal-objetivo"),
  modalPassos: document.querySelector("#modal-passos"),
  modalResultado: document.querySelector("#modal-resultado")
};

// ------------------------------------------------------------
// PREENCHIMENTO INICIAL E MENU DAS ETAPAS
// ------------------------------------------------------------
// Atualiza a identificação da etapa e coordena a montagem do conteúdo e dos eventos.
// O progresso indica a posição na sequência, sem medir preenchimento ou conclusão.
function iniciarPagina() {
  document.title = `Etapa ${etapa.numero} — ${etapa.titulo} | SUDS-UP`;
  elementos.titulo.textContent = etapa.titulo;
  elementos.descricao.textContent = etapa.descricao;
  elementos.breadcrumb.textContent = `PROJETO / ${etapa.grupo.toUpperCase()} / ETAPA ${etapa.numero}`;
  elementos.progressoTexto.textContent = `Etapa ${etapa.numero} de ${TOTAL_ETAPAS}`;
  elementos.progressoBarra.style.width = `${(etapa.numero / TOTAL_ETAPAS) * 100}%`;

  montarMenu();
  montarAreaDeTrabalho();
  configurarNavegacao();
  configurarModal();
}

// Usa o mesmo cadastro da seleção inicial para gerar os links de etapa.html.
// aria-current identifica a etapa aberta para tecnologias assistivas.
function montarMenu() {
  elementos.lista.innerHTML = ETAPAS.map(item => `
    <li>
      <a href="etapa.html?numero=${item.numero}" ${item.numero === etapa.numero ? 'aria-current="step"' : ""}>
        <span>${String(item.numero).padStart(2, "0")}</span>
        <strong>${item.menu}</strong>
      </a>
    </li>
  `).join("");
}

// ------------------------------------------------------------
// GERAÇÃO DOS CARDS DA ÁREA DE TRABALHO
// ------------------------------------------------------------
// Estas funções devolvem HTML; montarAreaDeTrabalho insere os cards no documento.
// Os textos interpolados vêm do cadastro local de etapas, e as classes usam os estilos
// vinculados em etapa.html. O card de orientação resume os passos também exibidos no modal.
function criarCardOrientacao() {
  return `
    <article class="card">
      <h2>Como realizar esta etapa</h2>
      <p class="card__subtitulo">Siga a sequência recomendada pela metodologia.</p>
      <ol class="lista-orientacao">
        ${etapa.passos.map((passo, indice) => `
          <li><span>${indice + 1}</span><div><strong>${passo}</strong><p>Consulte as orientações completas no ícone de informação.</p></div></li>
        `).join("")}
      </ol>
    </article>
  `;
}

// Na etapa 1, os IDs dos controles fazem a ligação com js/mapas/etapa-01-mapa.js.
// Esse módulo carrega o Leaflet, habilita a busca por endereço e preenche as coordenadas
// somente após a escolha manual de um ponto; os campos de latitude e longitude são de leitura.
// O status comunica carregamento e erros; as demais etapas recebem um mapa ilustrativo.
function criarMapa(rotulo) {
  if (etapa.numero === 1) {
    return `
      <article class="card card-mapa-etapa-01">
        <h2>${rotulo}</h2>
        <p class="card__subtitulo" id="mapa-instrucao">Busque um endereço para localizar a região e clique no mapa para marcar um ponto de alagamento.</p>
        <div class="mapa-busca">
          <div class="campo">
            <label for="mapa-endereco">ENDEREÇO</label>
            <input id="mapa-endereco" type="search" autocomplete="off" placeholder="Ex.: Praça Mauá, Rio de Janeiro">
          </div>
          <button class="botao botao--primario" id="mapa-buscar" type="button" disabled>Buscar endereço</button>
        </div>
        <p id="mapa-mensagem" class="mapa-mensagem" role="status" aria-live="polite" aria-atomic="true">Carregando mapa…</p>
        <div id="mapa-etapa-01" class="mapa-interativo" role="region" aria-label="Mapa para localização de pontos de alagamento" aria-describedby="mapa-instrucao"></div>
        <div class="campos mapa-coordenadas">
          <div class="campo"><label for="mapa-latitude">Latitude</label><input id="mapa-latitude" type="text" readonly placeholder="Selecione um ponto"></div>
          <div class="campo"><label for="mapa-longitude">Longitude</label><input id="mapa-longitude" type="text" readonly placeholder="Selecione um ponto"></div>
        </div>
        <p class="card__subtitulo">Localização e marcação manual. A seleção permanece apenas enquanto esta página estiver aberta.</p>
        <p class="card__subtitulo">Pesquisa: Nominatim · Dados © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">colaboradores do OpenStreetMap</a>.</p>
      </article>
    `;
  }
  return `<article class="card"><h2>${rotulo}</h2><div class="mapa-prototipo"><span class="mapa-prototipo__rotulo">Visualização cartográfica ilustrativa</span></div></article>`;
}

// Oferece campos provisórios compartilhados pelas telas de mapa e pelo layout padrão.
// Este controlador não registra eventos para salvar ou processar os valores preenchidos.
function criarFormularioPadrao() {
  return `
    <article class="card">
      <h2>Registro das informações</h2>
      <p class="card__subtitulo">Os campos definitivos serão ajustados conforme a tabela correspondente da dissertação.</p>
      <div class="campos">
        <div class="campo"><label>IDENTIFICAÇÃO</label><input placeholder="Informe um nome ou código"></div>
        <div class="campo"><label>CLASSIFICAÇÃO</label><select><option>Selecione uma opção</option></select></div>
        <div class="campo campo--largo"><label>OBSERVAÇÕES DO PROJETISTA</label><textarea placeholder="Registre critérios, fontes e justificativas"></textarea></div>
      </div>
    </article>
  `;
}

// Apresenta linhas fixas de exemplo sob o título da etapa, sem calcular ou consultar dados.
// O contêiner permite rolagem horizontal quando a tabela excede a largura disponível.
function criarTabela(titulo) {
  return `
    <article class="card">
      <h2>${titulo}</h2>
      <div style="overflow-x:auto">
        <table class="tabela-prototipo">
          <thead><tr><th>ID</th><th>Área / técnica</th><th>Parâmetro</th><th>Valor</th><th>Situação</th></tr></thead>
          <tbody>
            <tr><td>01</td><td>Exemplo para validação</td><td>A definir</td><td>—</td><td>Não avaliado</td></tr>
            <tr><td>02</td><td>Nova linha</td><td>A definir</td><td>—</td><td>Não avaliado</td></tr>
          </tbody>
        </table>
      </div>
    </article>
  `;
}

// ------------------------------------------------------------
// COMPOSIÇÃO DA TELA E INTEGRAÇÃO DO MAPA
// ------------------------------------------------------------
// tipoTela, definido em js/dados-etapas.js, determina quais cards serão combinados.
// Os retornos encerram os layouts específicos antes de chegar ao layout padrão.
function montarAreaDeTrabalho() {
  // ------------------------------------------------------------
  // INTEGRAÇÃO DO CATÁLOGO E DA CONSULTA DE RESTRIÇÕES
  // ------------------------------------------------------------
  // Mantém as orientações existentes e delega controles e regras ao módulo
  // compartilhado, sem criar formulários de avaliação ou tabelas fictícias.
  if (etapa.numero === 3 || etapa.numero === 7) {
    elementos.area.innerHTML = `${criarCardOrientacao()}<section id="consulta-tecnicas"></section>`;
    iniciarConsultaTecnicas(document.querySelector("#consulta-tecnicas"), etapa.numero);
    return;
  }

  const mapas = ["mapa-evidencias", "mapa-bacia", "mapa-areas", "mapa-possibilidades", "mapa-cenario"];
  const tabelas = ["matriz", "tabela-campo", "tabela-revisao", "pre-dimensionamento", "chuva-projeto"];

  if (mapas.includes(etapa.tipoTela)) {
    // As etapas 1 e 2 possuem títulos próprios; os outros mapas compartilham um título.
    const tituloMapa = etapa.numero === 1 ? "Mapa dos pontos de alagamento" : etapa.numero === 2 ? "Bacia, relevo e caminho da água" : "Representação espacial da etapa";
    elementos.area.innerHTML = `<div class="grade-trabalho">${criarCardOrientacao()}${criarMapa(tituloMapa)}</div>${criarFormularioPadrao()}`;
    // O contêiner precisa existir antes do Leaflet. As outras etapas não carregam o módulo.
    if (etapa.numero === 1) {
      import("./mapas/etapa-01-mapa.js")
        .then(modulo => modulo.iniciarMapaEtapa01())
        // Trata rejeições da importação ou da inicialização retornada pelo módulo.
        // data-tipo permite que css/style.css destaque a mensagem como erro.
        .catch(() => {
          const mensagem = document.querySelector("#mapa-mensagem");
          mensagem.dataset.tipo = "erro";
          mensagem.textContent = "Não foi possível carregar o mapa. Verifique sua conexão e recarregue a página.";
        });
    }
    return;
  }

  // Inclui as telas de cálculo apenas como tabelas de protótipo: os arquivos de
  // js/calculos não são importados nem executados por este controlador.
  if (tabelas.includes(etapa.tipoTela)) {
    elementos.area.innerHTML = `${criarCardOrientacao()}${criarTabela(etapa.titulo)}<div class="aviso-futuro">Os campos, fórmulas e valores desta tela serão implementados na tarefa específica de cálculo ou levantamento.</div>`;
    return;
  }

  // Tipos fora das duas listas recebem orientação e formulário genérico.
  elementos.area.innerHTML = `<div class="grade-trabalho">${criarCardOrientacao()}${criarFormularioPadrao()}</div>`;
}

// ------------------------------------------------------------
// NAVEGAÇÃO ENTRE ETAPAS
// ------------------------------------------------------------
// Os links abrem etapa.html com outro número, reiniciando a montagem da página.
// Nos extremos da sequência, o destino é a apresentação em index.html;
// finalizar o protótipo apenas define esse link, sem salvar ou validar informações.
function configurarNavegacao() {
  if (etapa.numero === 1) {
    elementos.anterior.href = "index.html";
    elementos.anterior.textContent = "← Voltar à apresentação";
  } else {
    elementos.anterior.href = `etapa.html?numero=${etapa.numero - 1}`;
  }

  if (etapa.numero === TOTAL_ETAPAS) {
    elementos.proxima.href = "index.html";
    elementos.proxima.textContent = "Finalizar protótipo";
  } else {
    elementos.proxima.href = `etapa.html?numero=${etapa.numero + 1}`;
  }
}

// ------------------------------------------------------------
// CONTEÚDO E INTERAÇÕES DO MODAL DE ORIENTAÇÃO
// ------------------------------------------------------------
// O modal detalha objetivo, passos e resultado do mesmo registro usado nos cards.
function configurarModal() {
  elementos.modalTitulo.textContent = etapa.titulo;
  elementos.modalObjetivo.textContent = etapa.objetivo;
  elementos.modalPassos.innerHTML = etapa.passos.map(passo => `<li>${passo}</li>`).join("");
  elementos.modalResultado.textContent = etapa.resultado;

  // O botão lateral e o ícone do cabeçalho abrem a mesma orientação.
  document.querySelectorAll("#abrir-orientacao, #abrir-orientacao-icone").forEach(botao => {
    botao.addEventListener("click", abrirModal);
  });

  // O atributo em etapa.html reúne fundo, botão de fechar e botão de confirmação.
  document.querySelectorAll("[data-fechar-modal]").forEach(elemento => {
    elemento.addEventListener("click", fecharModal);
  });

  // Escape fecha apenas um modal visível, sem agir sobre a orientação já oculta.
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !elementos.modal.hidden) fecharModal();
  });
}

// hidden controla a visibilidade; modal-aberto bloqueia a rolagem em css/style.css.
// Ao abrir, o foco vai para o botão de fechar para permitir interação pelo teclado.
function abrirModal() {
  elementos.modal.hidden = false;
  document.body.classList.add("modal-aberto");
  elementos.modal.querySelector(".modal__fechar").focus();
}

// Remove os estados de exibição e de bloqueio de rolagem aplicados na abertura.
function fecharModal() {
  elementos.modal.hidden = true;
  document.body.classList.remove("modal-aberto");
}

// ------------------------------------------------------------
// INICIALIZAÇÃO DO CONTROLADOR
// ------------------------------------------------------------
// etapa.html inclui este script ao final do body, após o HTML e js/dados-etapas.js.
// Por isso a montagem é iniciada diretamente, sem aguardar DOMContentLoaded.
iniciarPagina();
