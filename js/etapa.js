/*
  CONTROLADOR DAS ETAPAS
  ----------------------
  Lê o número informado na URL, encontra os dados da etapa e monta a interface.
*/

const TOTAL_ETAPAS = ETAPAS.length;
const parametros = new URLSearchParams(window.location.search);
const numeroSolicitado = Number(parametros.get("numero"));
const numeroEtapa = numeroSolicitado >= 1 && numeroSolicitado <= TOTAL_ETAPAS ? numeroSolicitado : 1;
const etapa = ETAPAS.find(item => item.numero === numeroEtapa);

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

function montarAreaDeTrabalho() {
  const mapas = ["mapa-evidencias", "mapa-bacia", "mapa-areas", "mapa-possibilidades", "mapa-cenario"];
  const tabelas = ["matriz", "tabela-campo", "tabela-revisao", "pre-dimensionamento", "chuva-projeto"];

  if (mapas.includes(etapa.tipoTela)) {
    const tituloMapa = etapa.numero === 1 ? "Mapa dos pontos de alagamento" : etapa.numero === 2 ? "Bacia, relevo e caminho da água" : "Representação espacial da etapa";
    elementos.area.innerHTML = `<div class="grade-trabalho">${criarCardOrientacao()}${criarMapa(tituloMapa)}</div>${criarFormularioPadrao()}`;
    // O contêiner precisa existir antes do Leaflet. As outras etapas não carregam o módulo.
    if (etapa.numero === 1) {
      import("./mapas/etapa-01-mapa.js")
        .then(modulo => modulo.iniciarMapaEtapa01())
        .catch(() => {
          const mensagem = document.querySelector("#mapa-mensagem");
          mensagem.dataset.tipo = "erro";
          mensagem.textContent = "Não foi possível carregar o mapa. Verifique sua conexão e recarregue a página.";
        });
    }
    return;
  }

  if (tabelas.includes(etapa.tipoTela)) {
    elementos.area.innerHTML = `${criarCardOrientacao()}${criarTabela(etapa.titulo)}<div class="aviso-futuro">Os campos, fórmulas e valores desta tela serão implementados na tarefa específica de cálculo ou levantamento.</div>`;
    return;
  }

  elementos.area.innerHTML = `<div class="grade-trabalho">${criarCardOrientacao()}${criarFormularioPadrao()}</div>`;
}

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

function configurarModal() {
  elementos.modalTitulo.textContent = etapa.titulo;
  elementos.modalObjetivo.textContent = etapa.objetivo;
  elementos.modalPassos.innerHTML = etapa.passos.map(passo => `<li>${passo}</li>`).join("");
  elementos.modalResultado.textContent = etapa.resultado;

  document.querySelectorAll("#abrir-orientacao, #abrir-orientacao-icone").forEach(botao => {
    botao.addEventListener("click", abrirModal);
  });

  document.querySelectorAll("[data-fechar-modal]").forEach(elemento => {
    elemento.addEventListener("click", fecharModal);
  });

  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !elementos.modal.hidden) fecharModal();
  });
}

function abrirModal() {
  elementos.modal.hidden = false;
  document.body.classList.add("modal-aberto");
  elementos.modal.querySelector(".modal__fechar").focus();
}

function fecharModal() {
  elementos.modal.hidden = true;
  document.body.classList.remove("modal-aberto");
}

iniciarPagina();
