// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// ------------------------------------------------------------
// Arquivo: js/mapas/resumo-final-mapa.js
// Módulo: Mapa consolidado — Lote 5
// Objetivo: Representar pontos, bacia e escolhas definitivas em leitura.
// Responsabilidade: Camadas, enquadramento e ajuste visual para impressão.
// Dependências: Carregador Leaflet existente, cores e coordenadas do Lote 3.
// Utilizado por: resumo-final-interface.js.
// Criado em: 07/10/2026
// Última revisão: 07/10/2026
// ------------------------------------------------------------
import { carregarLeaflet } from "./lote-3-mapa.js";
import { coresDasTecnicas, coordenadasMapa } from "../dados/lote-3.js";
import { elemento } from "../lote-2-interface.js";

// ------------------------------------------------------------
// MAPA SOB DEMANDA COM UMA ÚNICA INSTÂNCIA
// ------------------------------------------------------------
/**
 * Monta controlador somente visual; os dados recebidos já foram validados.
 * @param {Element} pai Região persistente da interface.
 * @param {Array} catalogo Catálogo original para cores estáveis.
 * @returns {Object} atualizar/enquadrar; lê nenhum storage e não cria geometria.
 */
export function criarMapaResumo(pai, catalogo) {
  const aviso = elemento(pai, "p", ""); aviso.id = "resumo-mapa-status"; aviso.setAttribute("role", "status");
  const container = elemento(pai, "div", "", "resumo-mapa"); container.id = "resumo-mapa";
  container.setAttribute("role", "region"); container.setAttribute("aria-label", "Mapa final: pontos de alagamento, bacia e técnicas definitivas");
  container.tabIndex = 0; container.hidden = true;
  const cores = coresDasTecnicas(catalogo);
  let mapa = null, camadas = null, carga = null, atual = null, L = null;

  // ------------------------------------------------------------
  // AJUSTE A TODAS AS CAMADAS, INCLUSIVE EM IMPRESSÃO
  // ------------------------------------------------------------
  /** @returns {void} Atualiza tamanho/enquadramento sem animação, com zoom máximo 16; não altera dados. */
  function enquadrar() {
    if (!mapa || container.hidden || !camadas.getLayers().length) return;
    mapa.stop(); mapa.invalidateSize({ pan: false, animate: false });
    mapa.fitBounds(camadas.getBounds(), { padding: [24, 24], maxZoom: 16, animate: false });
  }

  // ------------------------------------------------------------
  // POPUP E RÓTULO SEM INTERPRETAR CONTEÚDO LIVRE
  // ------------------------------------------------------------
  /** @param {Object} camada Camada Leaflet. @param {string} rotulo Rótulo. @param {string} conteudo Texto confirmado. @returns {void} Adiciona camada/popup seguros; sem storage. */
  function apresentar(camada, rotulo, conteudo) {
    const popup = document.createElement("p"); popup.textContent = conteudo;
    const nome = document.createElement("span"); nome.textContent = rotulo;
    camada.bindPopup(popup).bindTooltip(nome).addTo(camadas);
  }

  // ------------------------------------------------------------
  // SUBSTITUIÇÃO DAS CAMADAS A PARTIR DA ÚLTIMA LEITURA
  // ------------------------------------------------------------
  /** @returns {void} Desenha fontes atuais; nenhuma cópia de geometria é persistida. */
  function desenhar() {
    if (!mapa) return;
    camadas.clearLayers();
    if (!atual.temGeografia) return;
    // Bacia sem preenchimento deixa visíveis áreas menores sobrepostas.
    if (atual.baciaMapa) {
      const area = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(atual.baciaMapa.areaM2);
      apresentar(L.polygon(coordenadasMapa(atual.baciaMapa.vertices), { color: "#202c37", weight: 4, dashArray: "10 6", fill: false, className: "resumo-bacia" }),
        "Bacia de contribuição — Etapa 2", `Área delimitada no mapa — Etapa 2: ${area} m².`);
    }
    for (const item of atual.espacializados) {
      const tecnica = item.tecnicas[0];
      const regime = tecnica.infiltracao ? "Com infiltração" : "Sem infiltração";
      apresentar(L.polygon(coordenadasMapa(item.vertices), { color: cores.get(tecnica.id), weight: 3, fillOpacity: .2, className: "resumo-tecnica" }),
        `${item.identificacao} — ${tecnica.nome}`, `${item.identificacao}\n${tecnica.nome}\n${regime}\nMotivo da escolha: ${item.motivo || "Não informado"}`);
    }
    // Marcadores circulares e rótulos identificam pontos sem depender da cor.
    for (const ponto of atual.pontos) apresentar(L.circleMarker([ponto.latitude, ponto.longitude],
      { radius: 7, color: "#202c37", fillColor: "#ffffff", fillOpacity: 1, weight: 3, className: "resumo-ponto" }),
      `Ponto ${ponto.numero}`, `Ponto ${ponto.numero} — ${ponto.endereco}\n${ponto.descricao || "Descrição não informada."}`);
    enquadrar();
  }

  // ------------------------------------------------------------
  // INICIALIZAÇÃO DA INFRAESTRUTURA EXISTENTE
  // ------------------------------------------------------------
  /** @returns {Promise<void>} Carrega Leaflet uma vez e cria mapa de leitura; falha é tratada por atualizar. */
  async function iniciar() {
    L = await carregarLeaflet();
    mapa = L.map(container, { zoomAnimation: false, fadeAnimation: false });
    camadas = L.featureGroup().addTo(mapa);
    // ------------------------------------------------------------
    // FALHA DO FUNDO SEM DESCARTAR VETORES OU TEXTO
    // ------------------------------------------------------------
    /** @returns {void} Informa limitação de rede; relatório textual permanece completo. */
    function falhaTile() { aviso.textContent = "Parte do mapa de fundo está indisponível. Consulte as geometrias e o resumo textual abaixo; a impressão depende dos tiles disponíveis."; }
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on("tileerror", falhaTile).addTo(mapa);
    new ResizeObserver(enquadrar).observe(container);
  }

  // ------------------------------------------------------------
  // ATUALIZAÇÃO DO MAPA OU ESTADO VAZIO
  // ------------------------------------------------------------
  /** @param {Object} resumo Última agregação validada. @returns {Promise<void>} Atualiza somente DOM/Leaflet; carga tardia usa sempre o resumo mais recente. */
  async function atualizar(resumo) {
    atual = resumo;
    container.hidden = !atual.temGeografia;
    if (!atual.temGeografia) {
      aviso.textContent = "Não há informações geográficas confirmadas para compor o mapa final.";
      if (camadas) camadas.clearLayers();
      return;
    }
    aviso.textContent = mapa ? "Mapa consolidado. Os dados também estão no resumo textual." : "Carregando mapa consolidado…";
    try {
      if (!carga) carga = iniciar();
      await carga;
      desenhar();
      if (atual.temGeografia) aviso.textContent = "Mapa consolidado. Os dados também estão no resumo textual.";
    } catch {
      container.hidden = true;
      if (atual.temGeografia) aviso.textContent = "Não foi possível carregar o mapa. Todas as informações confirmadas continuam disponíveis no resumo textual e na impressão.";
    }
  }
  // Mídia de impressão muda dimensões antes da composição do navegador.
  // O mesmo ajuste atende impressão nativa, emulação print e retorno à tela.
  window.matchMedia("print").addEventListener("change", enquadrar);
  window.addEventListener("beforeprint", enquadrar); window.addEventListener("afterprint", enquadrar);
  return { atualizar, enquadrar };
}
