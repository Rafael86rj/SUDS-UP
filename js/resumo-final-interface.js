// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// ------------------------------------------------------------
// Arquivo: js/resumo-final-interface.js
// Módulo: Resumo final — Lote 5
// Objetivo: Apresentar estudo confirmado, avaliação, pendências e impressão.
// Responsabilidade: Interface somente de leitura, sem documento persistido.
// Dependências: Agregador final, mapa Leaflet e elementos seguros existentes.
// Utilizado por: resultados-interface.js na Etapa 17.
// Criado em: 07/10/2026
// Última revisão: 07/10/2026
// ------------------------------------------------------------
import { lerResumoFinal, CHAVES_RESUMO } from "./dados/resumo-final.js";
import { GRUPOS_CONDICIONANTES, CAMPOS_BACIA } from "./dados/lote-1.js";
import { elemento, botao, linkEtapa } from "./lote-2-interface.js";
import { criarMapaResumo } from "./mapas/resumo-final-mapa.js";

// ------------------------------------------------------------
// FORMATAÇÃO VISUAL, SEM ARREDONDAR AS FONTES
// ------------------------------------------------------------
/** @param {number|null} valor Número original. @param {string} unidade Unidade opcional. @param {number} casas Casas visuais. @returns {string} Texto pt-BR; sem DOM ou storage. */
function formatar(valor, unidade = "", casas = 2) {
  if (!Number.isFinite(valor)) return "Não informado";
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: casas }).format(valor)}${unidade ? ` ${unidade}` : ""}`;
}

// ------------------------------------------------------------
// PERÍODO DE RETORNO SEM ZEROS DECIMAIS ARTIFICIAIS
// ------------------------------------------------------------
/** @param {number} valor TR confirmado. @returns {string} Anos em pt-BR; preserva a precisão do Number, sem alterar cálculo ou storage. */
export function formatarPeriodoRetorno(valor) {
  if (!Number.isFinite(valor)) return "Não informado";
  // Dígitos significativos evitam o arredondamento padrão de frações do Intl.
  return `${new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 21 }).format(valor)} anos`;
}

// ------------------------------------------------------------
// PRANCHA DA VARIANTE JÁ RESOLVIDA PELO CATÁLOGO
// ------------------------------------------------------------
/** @param {Element} pai Card da decisão. @param {Object} tecnica Variante enriquecida pelo agregador existente. @returns {void} Insere imagem original e alternativa textual; não lê nem grava storage. */
function ilustrarTecnica(pai, tecnica) {
  const figura = elemento(pai, "figure", "", "resumo-tecnica-prancha");
  const imagem = elemento(figura, "img");
  imagem.alt = tecnica.nome;
  // A associação vem de TECNICAS_SUDS, propagada por consolidarMapa.
  // Não recorta a prancha: legendas e autoria continuam na imagem original.
  imagem.src = `assets/images/tecnicas/${encodeURIComponent(tecnica.imagem)}`;
  // ------------------------------------------------------------
  // FALHA DA IMAGEM SEM OCULTAR A DECISÃO DO PROJETISTA
  // ------------------------------------------------------------
  /** @returns {void} Substitui apenas a imagem indisponível por aviso textual. */
  function informarFalha() {
    imagem.hidden = true;
    elemento(figura, "figcaption", "Prancha indisponível. As informações da técnica permanecem disponíveis.");
  }
  imagem.addEventListener("error", informarFalha, { once: true });
}

// ------------------------------------------------------------
// LINK DE REVISÃO, OCULTO NA IMPRESSÃO
// ------------------------------------------------------------
/** @param {Element} pai Destino. @param {string} texto Ação. @param {number} etapa Origem. @returns {HTMLElement} Link inserido, sem escrita. */
function revisar(pai, texto, etapa) {
  const link = linkEtapa(pai, texto, etapa);
  link.className = "botao botao--secundario resumo-interativo";
  return link;
}

// ------------------------------------------------------------
// LISTA DE DEFINIÇÃO PARA MÉTRICAS
// ------------------------------------------------------------
/** @param {Element} pai Lista. @param {string} titulo Rótulo. @param {string} texto Valor visual. @param {string} id Identificador opcional. @returns {void} Insere texto seguro; sem storage. */
function metrica(pai, titulo, texto, id = "") {
  const bloco = elemento(pai, "div"); elemento(bloco, "dt", titulo);
  const valor = elemento(bloco, "dd", texto); if (id) valor.id = id;
}

// ------------------------------------------------------------
// REGIÕES ESTÁVEIS PARA ATUALIZAÇÃO DAS FONTES
// ------------------------------------------------------------
/** @param {Element} container Destino da Etapa 17. @param {Array} catalogo Catálogo original. @returns {void} Monta DOM/eventos; apenas lê fontes existentes e chama window.print por ação explícita. */
export function iniciarResumoFinal(container, catalogo) {
  document.body.classList.add("pagina-resumo-final");
  // Evita anunciar todo o relatório cada vez que uma camada Leaflet muda.
  document.querySelector("#area-trabalho")?.removeAttribute("aria-live");
  container.className = "card lote-1 lote-5"; container.replaceChildren();
  elemento(container, "h2", "SUDS-UP — Resumo final do estudo");
  const data = elemento(container, "time"); data.id = "resumo-data";
  elemento(container, "p", "Resumo do estado atual dos dados confirmados neste navegador. Não constitui validação cadastral das geometrias nem aprovação automática das condições locais.");
  const secoes = {};
  for (const [id, titulo] of [["avaliacao", "Avaliação do cenário"], ["mapa", "Mapa consolidado"], ["area", "Resumo da área de estudo"],
    ["tecnicas", "Técnicas e intervenções do cenário"], ["chuva", "Chuva de projeto e demanda"], ["conclusao", "Conclusão"], ["disponibilidade", "Disponibilidade das informações"]]) {
    const secao = elemento(container, "section", "", "resumo-secao"); secao.id = id === "mapa" ? "resumo-secao-mapa" : `resumo-${id}`;
    elemento(secao, "h3", titulo); secoes[id] = elemento(secao, "div");
  }
  const mapaPai = elemento(secoes.mapa, "div");
  const legenda = elemento(secoes.mapa, "div", "", "resumo-legenda"); legenda.id = "resumo-legenda";
  const mapaTexto = elemento(secoes.mapa, "div"); mapaTexto.id = "resumo-mapa-texto";
  const mapa = criarMapaResumo(mapaPai, catalogo);
  const acoesMapa = elemento(secoes.mapa, "div", "", "lote-acoes resumo-interativo");
  revisar(acoesMapa, "Revisar pontos de alagamento", 1); revisar(acoesMapa, "Revisar bacia delimitada", 2); revisar(acoesMapa, "Revisar Cenário 1", 12);
  const acoes = elemento(container, "div", "", "lote-acoes resumo-interativo");
  revisar(acoes, "Revisar pré-dimensionamento", 13); revisar(acoes, "Revisar chuva de projeto", 15);
  const imprimir = botao(acoes, "Imprimir / Salvar como PDF", imprimirResumo); imprimir.id = "resumo-imprimir";
  const inicio = elemento(acoes, "a", "Voltar à apresentação", "botao botao--secundario"); inicio.href = "index.html";

  // ------------------------------------------------------------
  // ESTADO DE CADA FONTE E CAMINHO PARA REVISÃO
  // ------------------------------------------------------------
  /** @param {Element} pai Destino. @param {Object} resumo Fontes validadas. @param {number} etapa Origem. @param {string} ausente Mensagem de ausência. @returns {void} Informa falhas sem exibir UUIDs nem escrever dados. */
  function estadoFonte(pai, resumo, etapa, ausente) {
    const fonte = resumo.fontes[etapa];
    if (!fonte.dados || fonte.mensagem) {
      elemento(pai, "p", fonte.mensagem || ausente, "resumo-aviso");
      revisar(pai, `Revisar Etapa ${etapa}`, etapa);
    }
  }

  // ------------------------------------------------------------
  // AVALIAÇÃO OFICIAL E CONCLUSÃO DERIVADA
  // ------------------------------------------------------------
  /** @param {Object} resumo Agregação atual. @returns {void} Atualiza métricas/conclusão sem arredondamento matemático ou persistência. */
  function mostrarAvaliacao(resumo) {
    const { avaliacao, pendencias } = resumo;
    secoes.avaliacao.replaceChildren(); secoes.conclusao.replaceChildren();
    const lista = elemento(secoes.avaliacao, "dl", "", "lote-metricas");
    const percentual = avaliacao.atende === null ? "Indisponível" : avaliacao.demanda === 0 ? "Não se aplica: demanda igual a zero."
      : avaliacao.percentual === null ? "Percentual fora da faixa numérica representável." : formatar(avaliacao.percentual, "%");
    metrica(lista, "Volume disponível pelas técnicas SUDS (m³)", avaliacao.capacidade === null ? "Indisponível" : formatar(avaliacao.capacidade, "m³"), "avaliacao-capacidade");
    metrica(lista, "Volume de chuva a manejar (m³)", avaliacao.demanda === null ? "Indisponível" : formatar(avaliacao.demanda, "m³"), "avaliacao-demanda");
    metrica(lista, "Percentual atendido (%)", percentual, "avaliacao-percentual");
    const resultado = elemento(secoes.avaliacao, "div", "", "lote-resultado"); resultado.id = "avaliacao-resultado";
    resultado.setAttribute("role", "status"); resultado.setAttribute("aria-atomic", "true");
    if (avaliacao.atende === null) {
      elemento(resultado, "h4", "Avaliação pendente");
      elemento(secoes.conclusao, "p", "Avaliação pendente. Não há conclusão hidrológica enquanto capacidade e demanda atual não estiverem disponíveis.");
      for (const pendencia of pendencias) {
        elemento(resultado, "p", `Etapa ${pendencia.etapa}: ${pendencia.texto}`);
        elemento(secoes.conclusao, "p", pendencia.texto);
        revisar(secoes.conclusao, `Revisar Etapa ${pendencia.etapa}`, pendencia.etapa);
      }
    } else {
      elemento(resultado, "h4", avaliacao.atende ? "O cenário atende à demanda." : "O cenário não atende integralmente à demanda.");
      elemento(secoes.conclusao, "p", avaliacao.atende ? "O cenário proposto atende à demanda calculada." : "O cenário proposto não atende integralmente à demanda calculada.");
      elemento(secoes.conclusao, "p", `Capacidade: ${formatar(avaliacao.capacidade, "m³")}. Demanda: ${formatar(avaliacao.demanda, "m³")}. Percentual atendido: ${percentual}`);
      if (!avaliacao.atende) {
        elemento(secoes.conclusao, "p", `Déficit: ${formatar(resumo.deficit, "m³")}.`).id = "resumo-deficit";
        revisar(secoes.conclusao, "Revisar possibilidades", 9);
      }
    }
  }

  // ------------------------------------------------------------
  // LEGENDA E ALTERNATIVA TEXTUAL DO MAPA
  // ------------------------------------------------------------
  /** @param {Object} resumo Fontes agregadas. @returns {void} Lista apenas símbolos presentes; texto funciona sem Leaflet/tiles. */
  function mostrarGeografia(resumo) {
    legenda.replaceChildren(); mapaTexto.replaceChildren();
    legenda.hidden = !resumo.temGeografia;
    if (resumo.temGeografia) {
      elemento(legenda, "h4", "Legenda do mapa final");
      const lista = elemento(legenda, "ul");
      if (resumo.pontos.length) elemento(lista, "li", "● Pontos de alagamento — marcadores circulares");
      if (resumo.baciaMapa) elemento(lista, "li", "┄ Bacia de contribuição — contorno tracejado sem preenchimento");
      for (const item of resumo.legenda) {
        const linha = elemento(lista, "li");
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 20 20"); svg.setAttribute("aria-hidden", "true");
        const rect = document.createElementNS(svg.namespaceURI, "rect");
        rect.setAttribute("width", "20"); rect.setAttribute("height", "20"); rect.setAttribute("fill", item.cor);
        svg.append(rect); linha.append(svg);
        elemento(linha, "span", `${item.nome} — ${item.quantidade} ${item.quantidade === 1 ? "área" : "áreas"}`);
      }
    }
    elemento(mapaTexto, "p", `Pontos de alagamento: ${resumo.pontos.length}. Áreas com técnica definitiva espacializada: ${resumo.espacializados.length}.`);
    elemento(mapaTexto, "p", resumo.baciaMapa ? `Área delimitada no mapa — Etapa 2: ${formatar(resumo.baciaMapa.areaM2, "m²")} (${formatar(resumo.baciaMapa.areaM2 / 10000, "ha")}).` : "Bacia delimitada: não disponível.");
    for (const item of resumo.legenda) elemento(mapaTexto, "p", `${item.nome}: ${item.quantidade} área(s) no mapa.`);
    for (const etapa of [1, 2, 6, 8, 11]) if (resumo.fontes[etapa].mensagem) estadoFonte(mapaTexto, resumo, etapa, "");
    mapa.atualizar(resumo);
  }

  // ------------------------------------------------------------
  // CONTEXTO TERRITORIAL E FONTES FÍSICAS DISTINTAS
  // ------------------------------------------------------------
  /** @param {Object} resumo Fontes confirmadas. @returns {void} Apresenta fontes sem fundir área delimitada e área do cálculo; sem escrita. */
  function mostrarArea(resumo) {
    const pai = secoes.area; pai.replaceChildren();
    elemento(pai, "h4", "Pontos de alagamento — Etapa 1");
    if (!resumo.pontos.length) elemento(pai, "p", "Nenhum ponto de alagamento disponível para o resumo.");
    for (const ponto of resumo.pontos) {
      const card = elemento(pai, "article", "", "resumo-card");
      elemento(card, "h5", `Ponto ${ponto.numero} — ${ponto.endereco}`);
      elemento(card, "p", ponto.descricao || "Descrição não informada.");
      elemento(card, "p", `Latitude: ${formatar(ponto.latitude, "°", 6)}; longitude: ${formatar(ponto.longitude, "°", 6)}.`);
    }
    elemento(pai, "h4", "Área delimitada no mapa — Etapa 2");
    if (resumo.baciaMapa) elemento(pai, "p", `${formatar(resumo.baciaMapa.areaM2, "m²")} — ${formatar(resumo.baciaMapa.areaM2 / 10000, "ha")}.`);
    else estadoFonte(pai, resumo, 2, "Nenhuma bacia delimitada disponível.");
    elemento(pai, "h4", "Condicionantes iniciais — Etapa 4");
    if (resumo.condicionantes) {
      for (const [id, nome] of Object.entries(GRUPOS_CONDICIONANTES)) {
        const grupo = resumo.condicionantes.grupos[id];
        elemento(pai, "p", `${nome}: ${grupo.situacao}. ${grupo.observacao || "Observação não informada."}`);
      }
      elemento(pai, "p", "Os estados documentam a análise do projetista; não representam aprovação automática.");
    } else estadoFonte(pai, resumo, 4, "Condicionantes não informadas.");
    elemento(pai, "h4", "Inventário técnico — Etapa 5");
    if (resumo.fontes[5].dados) {
      elemento(pai, "p", `${resumo.inventario.total} registros; ${resumo.inventario.lacunas} com lacuna de informação.`);
      const lista = elemento(pai, "ul");
      for (const [categoria, quantidade] of Object.entries(resumo.inventario.categorias)) elemento(lista, "li", `${categoria}: ${quantidade}`);
    } else estadoFonte(pai, resumo, 5, "Inventário técnico não informado.");
    elemento(pai, "h4", "Dados físicos usados no cálculo — Etapa 14");
    if (resumo.baciaFisica) {
      const lista = elemento(pai, "dl", "", "resumo-dados");
      for (const [id, nome] of Object.entries(CAMPOS_BACIA)) metrica(lista, id === "areaTotal" ? "Área total usada no cálculo — Etapa 14 (m²)" : nome, formatar(resumo.baciaFisica[id]));
    } else estadoFonte(pai, resumo, 14, "Dados físicos da bacia não informados.");
  }

  // ------------------------------------------------------------
  // ESCOLHAS ESPACIAIS E INTERVENÇÕES SEM INFERIR VÍNCULO
  // ------------------------------------------------------------
  /** @param {Object} resumo Agregação atual. @returns {void} Lista blocos distintos e volumes recalculados, sem criar intervenções. */
  function mostrarTecnicas(resumo) {
    const pai = secoes.tecnicas; pai.replaceChildren();
    elemento(pai, "h4", "Técnicas escolhidas no Cenário 1");
    elemento(pai, "p", "As escolhas por área da Etapa 11 e as intervenções da Etapa 13 são registros distintos. Não há vínculo obrigatório um-para-um entre eles.");
    if (!resumo.escolhas.length) elemento(pai, "p", "Nenhuma área ou decisão pós-campo disponível.");
    for (const item of resumo.escolhas) {
      const card = elemento(pai, "article", "", "resumo-card");
      for (const tecnica of item.tecnicas) {
        card.classList.add("resumo-tecnica-card");
        elemento(card, "h5", tecnica.nome, "resumo-tecnica-nome");
        ilustrarTecnica(card, tecnica);
      }
      const detalhes = elemento(card, "div", "", "resumo-tecnica-texto");
      for (const tecnica of item.tecnicas) {
        // A fonte não possui descrição textual estruturada; não cria conteúdo técnico.
        elemento(detalhes, "p", "Descrição técnica: consulte a prancha da técnica.");
        elemento(detalhes, "p", `Observação: ${tecnica.infiltracao ? "Com" : "Sem"} infiltração.`);
      }
      elemento(detalhes, "p", `Área: ${item.identificacao}`);
      if (!item.tecnicas.length) elemento(detalhes, "p", "Sem técnica definitiva selecionada.");
      if (!item.vertices) elemento(detalhes, "p", "Sem localização no mapa. Os dados textuais foram preservados.");
      elemento(detalhes, "p", `Motivo da escolha: ${item.motivo || "Não informado"}`);
      if (item.restricao) elemento(detalhes, "p", `Restrição projetual: ${item.restricao}`);
      if (item.observacoes) elemento(detalhes, "p", `Observações pós-campo: ${item.observacoes}`);
    }
    revisar(pai, "Revisar decisões pós-campo", 11);
    elemento(pai, "h4", "Intervenções consideradas no pré-dimensionamento");
    estadoFonte(pai, resumo, 13, "Nenhuma intervenção foi confirmada na Etapa 13.");
    for (const item of resumo.intervencoes) {
      const card = elemento(pai, "article", "", "resumo-card resumo-intervencao");
      elemento(card, "h5", `Intervenção ${item.numero} — ${item.nome}`);
      elemento(card, "p", `Área: ${formatar(item.area, "m²")}; profundidade: ${formatar(item.profundidade, "m")}; índice de vazios: ${formatar(item.vazios, "", 4)}.`);
      elemento(card, "p", `Volume calculado: ${formatar(item.volume, "m³")}.`);
    }
    elemento(pai, "p", `Intervenções confirmadas: ${resumo.intervencoes.length}. Capacidade total: ${resumo.avaliacao.capacidade === null ? "Indisponível" : formatar(resumo.avaliacao.capacidade, "m³")}.`);
  }

  // ------------------------------------------------------------
  // CHUVA SOMENTE QUANDO VÁLIDA E ATUAL
  // ------------------------------------------------------------
  /** @param {Object} resumo Fontes validadas. @returns {void} Mostra dados confirmados ou pendência; nunca apresenta chuva antiga como atual. */
  function mostrarChuva(resumo) {
    const pai = secoes.chuva; pai.replaceChildren();
    const chuva = resumo.fontes[15].dados;
    if (!chuva) { estadoFonte(pai, resumo, 15, "Volume ainda não calculado na Etapa 15."); return; }
    elemento(pai, "p", `Modo: ${chuva.modo === "posto" ? "Posto cadastrado" : chuva.modo === "manual" ? "Coeficientes manuais" : "Não informado"}. Posto/origem: ${chuva.nome || "Não informado"}.`);
    elemento(pai, "p", `Fonte: ${chuva.fonte || "Não informada"}.`);
    const lista = elemento(pai, "dl", "", "resumo-dados");
    for (const [id, nome, unidade, casas] of [["TR", "Período de retorno", "anos", 2], ["runoff", "Runoff (fração)", "", 4], ["tcMin", "Tempo de concentração", "min", 4],
      ["intensidade", "Intensidade", "mm/h", 2], ["alturaMm", "Altura da chuva", "mm", 2], ["alturaM", "Altura da chuva", "m", 6], ["volumeChuvaAManejar", "Volume de chuva a manejar", "m³", 2]]) metrica(lista, nome, id === "TR" ? formatarPeriodoRetorno(chuva[id]) : formatar(chuva[id], unidade, casas));
  }

  // ------------------------------------------------------------
  // LEITURA ATUALIZADA SEM COPIAR FONTES PARA UM RELATÓRIO SALVO
  // ------------------------------------------------------------
  /** @returns {void} Lê fontes oficiais e atualiza regiões, data local e mapa; nenhuma escrita em storage. */
  function atualizar() {
    const resumo = lerResumoFinal(catalogo);
    const agora = new Date(); data.dateTime = agora.toISOString(); data.textContent = `Visualização gerada em ${agora.toLocaleString("pt-BR")}.`;
    mostrarAvaliacao(resumo); mostrarGeografia(resumo); mostrarArea(resumo); mostrarTecnicas(resumo); mostrarChuva(resumo);
    secoes.disponibilidade.replaceChildren();
    elemento(secoes.disponibilidade, "p", "Disponibilidade para compor este resumo; não é uma classificação de aprovação do estudo.");
    const lista = elemento(secoes.disponibilidade, "ul");
    for (const item of resumo.disponibilidade) {
      const linha = elemento(lista, "li", `${item.nome}: ${item.estado}. `);
      if (item.estado === "Pendente" && item.etapa !== 17) revisar(linha, `Revisar Etapa ${item.etapa}`, item.etapa);
    }
    for (const [etapa, fonte] of Object.entries(resumo.fontes)) if (fonte.mensagem) {
      elemento(secoes.disponibilidade, "p", `Etapa ${etapa}: ${fonte.mensagem}`, "resumo-aviso");
      revisar(secoes.disponibilidade, `Revisar Etapa ${etapa}`, Number(etapa));
    }
  }

  // ------------------------------------------------------------
  // IMPRESSÃO NATIVA POR AÇÃO EXPLÍCITA
  // ------------------------------------------------------------
  /** @returns {void} Relê estado confirmado e abre diálogo do navegador; não gera arquivo programaticamente nem salva data. */
  function imprimirResumo() { atualizar(); mapa.enquadrar(); window.print(); }

  // ------------------------------------------------------------
  // REVISÃO QUANDO FONTES MUDAM OU A PÁGINA RETORNA DO HISTÓRICO
  // ------------------------------------------------------------
  /** @param {Event} evento Storage/pageshow. @returns {void} Refaz somente leitura; atualização não cria documento permanente. */
  function fonteAlterada(evento) {
    if (evento.type === "pageshow" ? evento.persisted : evento.key === null || CHAVES_RESUMO.includes(evento.key)) atualizar();
  }
  window.addEventListener("storage", fonteAlterada); window.addEventListener("pageshow", fonteAlterada);
  // Ctrl+P também deve refletir o estado atual, sem depender do botão da tela.
  window.addEventListener("beforeprint", atualizar);
  atualizar();
}
