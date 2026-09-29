// ------------------------------------------------------------
// RENDERIZAÇÃO DA CONSULTA E INTEGRAÇÃO COM ETAPA.JS
// ------------------------------------------------------------
// etapa.js fornece um contêiner exclusivo após manter o card de orientações.
// As duas telas usam o mesmo cadastro; textos de dados entram via textContent.
function iniciarConsultaTecnicas(container, numero) {
  const catalogo = numero === 3;
  const parametrosConsulta = new URLSearchParams(window.location.search);
  let tecnica = TECNICAS_SUDS.find(item => item.id === parametrosConsulta.get("tecnica")) || TECNICAS_SUDS[0];
  let variante = tecnica.variantes.find(item => item.id === parametrosConsulta.get("variante")) || tecnica.variantes[0];

  container.className = "card consulta-tecnicas";
  container.innerHTML = `
    <h2>${catalogo ? "Explore as técnicas" : "Consulta por técnica e variante"}</h2>
    <p class="consulta-tecnicas__aviso">Consultar uma técnica não significa escolhê-la definitivamente para uma intervenção nem considerá-la adequada a uma área. A aplicação dos critérios às áreas será tratada na Etapa 8.</p>
    <div class="campos">
      <div class="campo"><label for="consulta-tecnica">Técnica</label><select id="consulta-tecnica"></select></div>
      <div class="campo"><label for="consulta-variante">Variante</label><select id="consulta-variante" aria-describedby="consulta-regime"></select></div>
    </div>
    <p id="consulta-regime" class="card__subtitulo"></p>
    <div id="consulta-detalhes" aria-live="polite" aria-atomic="true"></div>`;

  const seletorTecnica = container.querySelector("#consulta-tecnica");
  const seletorVariante = container.querySelector("#consulta-variante");
  const detalhes = container.querySelector("#consulta-detalhes");
  TECNICAS_SUDS.forEach(item => seletorTecnica.add(new Option(item.nome, item.id)));
  seletorTecnica.value = tecnica.id;

  function adicionarTexto(pai, tag, texto, classe) {
    const elemento = document.createElement(tag);
    elemento.textContent = texto;
    if (classe) elemento.className = classe;
    pai.append(elemento);
    return elemento;
  }

  function preencherVariantes() {
    seletorVariante.replaceChildren();
    tecnica.variantes.forEach(item => seletorVariante.add(new Option(item.nome, item.id)));
    seletorVariante.value = variante.id;
    // Um único registro continua legível, sem sugerir variantes ausentes na fonte.
    seletorVariante.disabled = tecnica.variantes.length === 1;
  }

  // ------------------------------------------------------------
  // PRANCHA ORIGINAL COMPARTILHADA PELAS ETAPAS 3 E 7
  // ------------------------------------------------------------
  // A URL codifica somente o nome real do arquivo, preservando acentos e espaços.
  // Ambas as etapas reutilizam imagem, texto alternativo e ampliação da variante.
  // Abrir a imagem original permite ampliação nativa sem recortar atribuições.
  function renderizarPrancha() {
    const figura = document.createElement("figure");
    figura.className = "consulta-tecnicas__prancha";
    const imagem = document.createElement("img");
    const caminho = `assets/images/tecnicas/${encodeURIComponent(variante.imagem)}`;
    imagem.src = caminho;
    imagem.alt = `Prancha de ${tecnica.nome} — ${variante.nome}, com ilustrações, legendas e atribuições da fonte.`;
    figura.append(imagem);
    const legenda = adicionarTexto(figura, "figcaption", "Prancha original completa. ");
    const ampliar = adicionarTexto(legenda, "a", "Ampliar prancha (abre em nova aba)");
    ampliar.href = caminho;
    ampliar.target = "_blank";
    ampliar.rel = "noopener noreferrer";
    detalhes.append(figura);
  }

  // ------------------------------------------------------------
  // LINK EXCLUSIVO DO CATÁLOGO PARA AS RESTRIÇÕES
  // ------------------------------------------------------------
  // Separado da prancha para que a Etapa 7 não gere um link para ela mesma.
  function renderizarLinkRestricoes() {
    const link = adicionarTexto(detalhes, "a", "Consultar restrições na Etapa 7 →", "botao botao--primario");
    link.href = `etapa.html?${new URLSearchParams({ numero: "7", tecnica: tecnica.id, variante: variante.id })}`;
  }

  // ------------------------------------------------------------
  // RESTRIÇÕES E CONDIÇÕES OBRIGATÓRIAS EM BLOCOS SEPARADOS
  // ------------------------------------------------------------
  // Somente proibições recebem “Não devem ser usados em:”. O exutório é uma
  // exigência; as células permitem conferir cada texto na planilha indicada.
  function renderizarBloco(titulo, regras, condicao = false) {
    const secao = document.createElement("section");
    secao.className = "consulta-tecnicas__bloco";
    adicionarTexto(secao, "h4", titulo);
    adicionarTexto(secao, "p", condicao ? "Condição obrigatória:" : "Não devem ser usados em:", "consulta-tecnicas__rotulo");
    const lista = document.createElement("ul");
    regras.forEach(regra => {
      const item = adicionarTexto(lista, "li", regra.texto);
      item.dataset.regra = regra.id;
      adicionarTexto(item, "small", `Fonte: ${regra.fonte.celula}`, "consulta-tecnicas__celula");
    });
    secao.append(lista);
    detalhes.append(secao);
  }

  function renderizarDetalhes() {
    // Substituir todo o resultado atualiza prancha, alt, ampliação e regras nas
    // duas etapas, sem duplicar imagens ou manter critérios da seleção anterior.
    detalhes.replaceChildren();
    container.querySelector("#consulta-regime").textContent = `${variante.infiltracao ? "Com" : "Sem"} infiltração${tecnica.variantes.length === 1 ? " — única variante cadastrada nesta fonte." : "."}`;
    adicionarTexto(detalhes, "h3", `${tecnica.nome} — ${variante.nome}`);
    renderizarPrancha();
    if (catalogo) {
      renderizarLinkRestricoes();
      return;
    }
    const regras = consultarRegrasSuds(tecnica.id, variante.id);
    renderizarBloco("Restrições gerais da técnica", regras.gerais);
    renderizarBloco(variante.infiltracao ? "Restrições adicionais — COM infiltração" : "Condições adicionais — SEM infiltração", regras.adicionais, !variante.infiltracao);
    adicionarTexto(detalhes, "p", `${FONTE_TECNICAS.arquivo} · Aba “${FONTE_TECNICAS.aba}”`, "consulta-tecnicas__fonte");
    adicionarTexto(detalhes, "p", `${REFERENCIA_TECNICAS.texto} (B38)`, "consulta-tecnicas__fonte");
  }

  // ------------------------------------------------------------
  // EVENTOS DE SELEÇÃO
  // ------------------------------------------------------------
  // Controles nativos oferecem navegação por teclado. A troca de técnica começa
  // pela primeira variante válida; parâmetros desconhecidos também usam esse padrão.
  seletorTecnica.addEventListener("change", () => {
    tecnica = TECNICAS_SUDS.find(item => item.id === seletorTecnica.value);
    variante = tecnica.variantes[0];
    preencherVariantes();
    renderizarDetalhes();
  });
  seletorVariante.addEventListener("change", () => {
    variante = tecnica.variantes.find(item => item.id === seletorVariante.value);
    renderizarDetalhes();
  });
  preencherVariantes();
  renderizarDetalhes();
}
