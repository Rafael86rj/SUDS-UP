// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/mapas/lote-3-consulta.js
// Módulo: Mapas de possibilidades e Cenário 1
// Objetivo: Espacializar dados confirmados sem duplicar ou criar registros.
// Responsabilidade: Leitura das fontes, resumos equivalentes e mapa temático.
// Dependências: Lotes 1/2/3, catálogo original e adaptador Leaflet.
// Utilizado por: js/etapa.js nas Etapas 9 e 12.
// Criado em: 04/10/2026
// Última revisão: 05/10/2026
// ------------------------------------------------------------
import { elemento, botao, linkEtapa } from "../lote-2-interface.js";
import { CHAVES_LOTE_2, indexarVariantes, validarColecao, colecaoVazia } from "../dados/lote-2.js";
import { lerRegistro } from "../dados/armazenamento-lote-1.js";
import { lerGeometria } from "../dados/armazenamento-lote-3.js";
import { CHAVE_ESPACOS, consolidarMapa, coresDasTecnicas, legendaCenario } from "../dados/lote-3.js";
import { criarMapaLote3 } from "./lote-3-mapa.js";

// ------------------------------------------------------------
// CONSULTA DE POSSIBILIDADES OU ESCOLHAS FINAIS
// ------------------------------------------------------------
/**
 * Monta mapa e listas equivalentes; atualiza fontes alteradas sem nenhuma escrita.
 * @param {Element} container Região da etapa.
 * @param {number} etapa 9 ou 12.
 * @param {Array} catalogo TECNICAS_SUDS já carregado.
 * @returns {Promise<void>} Inicializa mapa/eventos; lê chaves 6/8 e, em 12, 11.
 */
export async function iniciarConsultaGeografica(container, etapa, catalogo) {
  container.className = "card lote-3 geo-consulta-mapa"; container.replaceChildren();
  const variantes = indexarVariantes(catalogo);
  const cores = coresDasTecnicas(catalogo);
  let mapa = null, camadas = [];
  let carregamentoMapa = null;
  elemento(container, "h2", etapa === 9 ? "Possibilidades preliminares no mapa" : "Cenário 1 — decisões pós-campo");
  elemento(container, "p", "Consulta dos registros confirmados. As alternativas e decisões pertencem ao projetista. Consulte também os resumos desta etapa.");
  const aviso = elemento(container, "p", "", "geo-erro"); aviso.id = "geo-fontes-status"; aviso.setAttribute("role", "status");
  const mapaPai = elemento(container, "div");
  const vazio = elemento(container, "section", "", "geo-resumo");
  vazio.id = "geo-estado-vazio"; vazio.setAttribute("role", "status");
  vazio.setAttribute("aria-atomic", "true");
  const legenda = elemento(container, "section", "", "geo-legenda");
  legenda.id = "geo-legenda";
  const resumos = elemento(container, "div"); resumos.id = "geo-consulta";
  const status = elemento(container, "p", ""); status.setAttribute("role", "status");
  if (etapa === 12) linkEtapa(container, "Prosseguir para o pré-dimensionamento", 13);

  // ------------------------------------------------------------
  // VALIDAÇÃO DA FONTE PRELIMINAR
  // ------------------------------------------------------------
  /** @param {*} dados JSON da Etapa 8. @returns {boolean} Compatibilidade; sem efeitos externos. */
  function validarAreas(dados) { return validarColecao(8, dados, variantes); }
  // ------------------------------------------------------------
  // VALIDAÇÃO DA DECISÃO PÓS-CAMPO
  // ------------------------------------------------------------
  /** @param {*} dados JSON da Etapa 11. @returns {boolean} Compatibilidade; sem efeitos externos. */
  function validarDecisoes(dados) { return validarColecao(11, dados, variantes); }

  // ------------------------------------------------------------
  // ORIENTAÇÃO SEM GEOMETRIA E CARREGAMENTO SOB DEMANDA
  // ------------------------------------------------------------
  /**
   * Alterna apenas a apresentação; mantém os resumos e as fontes intactos.
   * @param {boolean} indisponivel Distingue fonte inválida de ausência de vínculos.
   * @returns {Promise<void>} Reutiliza uma única instância e enquadra as camadas atuais.
   */
  async function atualizarMapa(indisponivel = false) {
    const temGeometria = camadas.length > 0;
    mapaPai.hidden = !temGeometria;
    legenda.hidden = !temGeometria;
    vazio.hidden = temGeometria || indisponivel;
    vazio.replaceChildren();
    if (!temGeometria) {
      legenda.replaceChildren();
      if (mapa) mapa.registros([]);
      if (indisponivel) return;
      elemento(vazio, "h3", etapa === 9
        ? "Nenhuma área possui localização no mapa ainda."
        : "Nenhuma intervenção do Cenário 1 possui localização no mapa.");
      elemento(vazio, "p", etapa === 9
        ? "Para espacializar as possibilidades de SUDS, associe uma área cadastrada na Etapa 8 a um espaço livre desenhado na Etapa 6."
        : "Associe as áreas a espaços livres da Etapa 6 pela Etapa 8 para representar espacialmente as técnicas escolhidas.");
      const acoes = elemento(vazio, "div", "", "geo-acoes");
      linkEtapa(acoes, "Revisar espaços livres", 6);
      linkEtapa(acoes, "Associar áreas", 8);
      if (etapa === 12) linkEtapa(acoes, "Revisar decisões pós-campo", 11);
      return;
    }
    // Mudanças de storage durante a carga compartilham a mesma promessa.
    // Após a espera, usa-se a seleção atual, nunca uma cópia desatualizada.
    // Zoom imediato evita que uma animação anterior descarte o novo enquadramento
    // quando as fontes mudam durante a consulta. Os editores mantêm seu padrão.
    if (!carregamentoMapa) carregamentoMapa = criarMapaLote3(mapaPai, null, false);
    mapa = await carregamentoMapa;
    if (mapa) {
      if (camadas.length) mapa.redimensionar();
      mapa.registros(camadas, camadas.length > 0);
    }
  }

  // ------------------------------------------------------------
  // LEGENDA PRÓPRIA DAS POSSIBILIDADES OU DAS TÉCNICAS ADOTADAS
  // ------------------------------------------------------------
  /**
   * Mantém regimes agregados na Etapa 9 e agrupa variantes finais na Etapa 12.
   * @param {Array} registros Dados consolidados desta leitura.
   * @param {boolean} indisponivel Indica fonte incompatível, distinta de ausência.
   * @returns {void} Substitui a legenda no DOM, sem criar armazenamento.
   */
  function atualizarLegenda(registros, indisponivel = false) {
    legenda.replaceChildren();
    if (etapa === 9) {
      elemento(legenda, "h3", "Legenda dos regimes");
      elemento(legenda, "p", "Linha contínua azul: somente alternativas com infiltração. Linha tracejada marrom: somente alternativas sem infiltração. Linha pontilhada azul: alternativas com e sem infiltração. Consulte os nomes e regimes no resumo de cada área. Áreas sem alternativas são identificadas como Nenhum SUDS definido.");
      return;
    }
    elemento(legenda, "h3", "Técnicas adotadas no Cenário 1");
    if (indisponivel) {
      elemento(legenda, "p", "Não foi possível consultar as técnicas adotadas. Verifique o aviso sobre os dados de origem.");
      return;
    }
    const itens = legendaCenario(registros, catalogo);
    if (!itens.length) {
      elemento(legenda, "p", "Nenhuma técnica definitiva possui geometria disponível para representação no mapa. Consulte os registros abaixo.");
      return;
    }
    elemento(legenda, "p", "Variantes adotadas nas áreas representadas no mapa. A mesma variante mantém a mesma cor; nomes e quantidades também identificam cada escolha.");
    const lista = elemento(legenda, "ul", "", "geo-tecnicas-adotadas");
    for (const item of itens) {
      const linha = elemento(lista, "li"); linha.dataset.variante = item.id;
      // SVG nativo mostra a amostra de cor sem depender de estilos inline ou biblioteca.
      // A amostra é decorativa: o texto ao lado fornece identificação e contagem.
      const amostra = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      amostra.setAttribute("viewBox", "0 0 20 20"); amostra.setAttribute("aria-hidden", "true");
      amostra.setAttribute("focusable", "false");
      const quadrado = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      quadrado.setAttribute("width", "20"); quadrado.setAttribute("height", "20"); quadrado.setAttribute("fill", item.cor);
      amostra.append(quadrado); linha.append(amostra);
      elemento(linha, "span", `${item.nome} — ${item.quantidade} ${item.quantidade === 1 ? "área" : "áreas"}`);
    }
  }

  // ------------------------------------------------------------
  // ATUALIZAÇÃO DE LEITURA E REPRESENTAÇÃO
  // ------------------------------------------------------------
  /** @returns {void} Relê fontes e substitui resumos/camadas; não grava localStorage. */
  function atualizar() {
    const espacos = lerGeometria(6);
    const areas = lerRegistro(CHAVES_LOTE_2[8], validarAreas);
    const decisoes = etapa === 12 ? lerRegistro(CHAVES_LOTE_2[11], validarDecisoes) : { dados: colecaoVazia(11) };
    const avisos = [];
    for (const [numero, fonte] of [[6, espacos], [8, areas], [11, decisoes]]) if (fonte.mensagem) avisos.push(`Etapa ${numero}: ${fonte.mensagem}`);
    aviso.textContent = avisos.join(" ");
    resumos.replaceChildren(); camadas = [];
    // Uma fonte incompatível não é apresentada como se o usuário não tivesse dados.
    if (areas.mensagem || decisoes.mensagem) {
      atualizarMapa(true);
      elemento(resumos, "p", "Não foi possível consolidar os registros. Os dados originais foram preservados.");
      linkEtapa(resumos, "Revisar áreas na Etapa 8", 8);
      return;
    }
    const registros = consolidarMapa(etapa, espacos.dados, areas.dados ?? colecaoVazia(8), decisoes.dados ?? colecaoVazia(11), catalogo);
    atualizarLegenda(registros, Boolean(espacos.mensagem));
    if (!registros.length) {
      elemento(resumos, "p", "Nenhuma área foi cadastrada na Etapa 8.");
      linkEtapa(resumos, "Voltar à Etapa 8", 8);
    }
    const localizados = elemento(resumos, "section"); elemento(localizados, "h3", "Áreas representadas no mapa");
    const semLocal = elemento(resumos, "section"); elemento(semLocal, "h3", etapa === 9 ? "Áreas sem localização no mapa" : "Intervenções sem localização no mapa");
    const semTecnica = etapa === 12 ? elemento(resumos, "section") : null;
    if (semTecnica) elemento(semTecnica, "h3", "Áreas sem técnica definida");
    for (const registro of registros) {
      const nomes = [], regimes = new Set();
      for (const tecnica of registro.tecnicas) {
        const regime = tecnica.infiltracao ? "Com infiltração" : "Sem infiltração";
        nomes.push(`${tecnica.nome} (${regime})`); regimes.add(regime);
      }
      const regime = regimes.size === 2 ? "Com e sem infiltração" : regimes.size ? [...regimes][0] : "Nenhuma técnica indicada";
      const representado = Boolean(registro.vertices && (etapa === 9 || registro.tecnicas.length));
      const destino = etapa === 12 && !registro.tecnicas.length ? semTecnica : representado ? localizados : semLocal;
      const card = elemento(destino, "article", "", "geo-resumo");
      card.dataset.areaId = registro.id;
      elemento(card, "h4", registro.identificacao);
      // O popup e a alternativa textual usam as mesmas informações. A área
      // disponível vem da Etapa 8, sem substituí-la pela área da geometria.
      const linhas = [];
      if (registro.areaDisponivel !== null) linhas.push(`Área disponível: ${String(registro.areaDisponivel).replace(".", ",")} m²`);
      linhas.push(`${etapa === 9 ? "Possibilidades" : "Técnica adotada"}:\n${nomes.join("\n") || "Nenhum SUDS definido."}`);
      if (etapa === 12) {
        linhas.push(`Motivo da escolha: ${registro.motivo || "Não informado"}`);
        linhas.push(`Restrição projetual: ${registro.restricao || "Não informada"}`);
        if (registro.observacoes) linhas.push(`Observações pós-campo: ${registro.observacoes}`);
      }
      const texto = [registro.identificacao, ...linhas].join("\n\n");
      for (const linha of linhas) elemento(card, "p", linha);
      if (registro.semOrigem) elemento(card, "p", "A geometria de origem não está mais disponível. Os dados do levantamento foram preservados.");
      if (!registro.vertices) {
        if (registro.areaExistente) {
          elemento(card, "p", etapa === 9
            ? "Esta área ainda não possui localização no mapa. Associe-a a um espaço livre da Etapa 6 pela Etapa 8 para representá-la espacialmente."
            : "Associe esta área a um espaço da Etapa 6 pela Etapa 8 para representá-la no Cenário 1.");
          const links = elemento(card, "div", "", "geo-acoes");
          linkEtapa(links, "Revisar espaços livres", 6);
          linkEtapa(links, "Associar área", 8, { area: registro.id, associar: "1" });
        } else {
          // Uma decisão sem área de origem não pode receber uma associação direta.
          elemento(card, "p", "A área desta decisão não está mais cadastrada. Os dados foram preservados; revise o levantamento e a decisão antes de representá-los no cenário.");
          linkEtapa(card, "Revisar áreas cadastradas", 8);
        }
      }
      if (representado) {
        // A Etapa 9 mantém traços por possibilidades agregadas; a Etapa 12
        // representa uma variante definitiva por cor e nome, sem legenda de alternativas.
        camadas.push({ ...registro, texto, regime: etapa === 9 ? regime : "",
          cor: etapa === 12 ? cores.get(registro.tecnicas[0].id) : undefined,
          rotulo: `${registro.identificacao} — ${etapa === 9 ? regime : registro.tecnicas[0].nome}` });
        // ------------------------------------------------------------
        // NAVEGAÇÃO DO RESUMO PARA O POLÍGONO
        // ------------------------------------------------------------
        /** @returns {void} Localiza o contorno por teclado/clique; não escreve dados. */
        function localizar() { if (mapa) mapa.localizar(registro.id); else status.textContent = "Mapa indisponível. Consulte o resumo textual desta área."; }
        botao(card, "Localizar no mapa", localizar);
      }
      linkEtapa(card, etapa === 9 ? "Revisar possibilidades" : "Revisar decisão pós-campo", etapa === 9 ? 8 : 11, { area: registro.id });
    }
    for (const secao of [localizados, semLocal, semTecnica]) if (secao && !secao.querySelector("article")) elemento(secao, "p", "Nenhum registro nesta situação.");
    atualizarMapa(Boolean(espacos.mensagem));
  }

  // ------------------------------------------------------------
  // ATUALIZAÇÃO SOMENTE QUANDO UMA FONTE RELEVANTE MUDA
  // ------------------------------------------------------------
  /** @param {Event} evento Storage ou retorno pelo histórico. @returns {void} Refaz leitura sem persistir. */
  function fonteAlterada(evento) {
    if (evento.type !== "storage" || evento.key === null || [CHAVE_ESPACOS, CHAVES_LOTE_2[8], ...(etapa === 12 ? [CHAVES_LOTE_2[11]] : [])].includes(evento.key)) atualizar();
  }
  window.addEventListener("storage", fonteAlterada); window.addEventListener("pageshow", fonteAlterada);
  atualizar();
}
