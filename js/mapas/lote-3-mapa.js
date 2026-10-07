// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/mapas/lote-3-mapa.js
// Módulo: Infraestrutura cartográfica das Etapas 2, 6, 9 e 12
// Objetivo: Disponibilizar Leaflet/OSM sem alterar a Etapa 1.
// Responsabilidade: Carregamento, camadas, acessibilidade e falhas de rede.
// Dependências: Leaflet 1.9.4 já adotado pelo projeto; geometria local.
// Utilizado por: Editor e consulta do Lote 3.
// Criado em: 04/10/2026
// Última revisão: 07/10/2026
// ------------------------------------------------------------
import { coordenadasMapa } from "../dados/lote-3.js";
import { elemento } from "../lote-2-interface.js";
let carregamento;

// ------------------------------------------------------------
// CARREGAMENTO LIMITADO DE RECURSO EXTERNO
// ------------------------------------------------------------
/**
 * Inclui CSS/script versionado e rejeita falha/timeout sem bloquear os formulários.
 * @param {string} tag link ou script.
 * @param {Object} atributos URLs/SRI já usados pela Etapa 1.
 * @returns {Promise<void>} Resultado da carga; altera head, sem localStorage.
 */
function carregarRecurso(tag, atributos) {
  // ------------------------------------------------------------
  // CICLO DE VIDA DA REQUISIÇÃO DO RECURSO
  // ------------------------------------------------------------
  /** @param {Function} resolver Sucesso. @param {Function} rejeitar Falha. @returns {void} Agenda timeout e eventos. */
  function executar(resolver, rejeitar) {
    const recurso = Object.assign(document.createElement(tag), atributos);
    // ------------------------------------------------------------
    // FALHA OU TEMPO EXCEDIDO
    // ------------------------------------------------------------
    /** @returns {void} Remove recurso pendente e rejeita a carga, sem storage. */
    function falhar() { clearTimeout(limite); recurso.remove(); rejeitar(new Error("Leaflet indisponível.")); }
    // ------------------------------------------------------------
    // CONCLUSÃO DA CARGA
    // ------------------------------------------------------------
    /** @returns {void} Cancela timeout e libera a criação do mapa. */
    function concluir() { clearTimeout(limite); resolver(); }
    const limite = setTimeout(falhar, 15000);
    recurso.onload = concluir;
    recurso.onerror = falhar;
    document.head.append(recurso);
  }
  return new Promise(executar);
}

// ------------------------------------------------------------
// INSTÂNCIA LEAFLET COM CAMADAS SEPARADAS
// ------------------------------------------------------------
/**
 * Cria mapa navegável e retorna operações de desenho sem dependência de storage.
 * @param {Element} pai Destino visual.
 * @param {Function|null} aoClicar Recebe coordenada quando há editor.
 * @param {boolean} animarZoom Mantém animação nos editores; consultas podem atualizar imediatamente.
 * @returns {Promise<Object|null>} Adaptador ou null; falha mantém resumos/campos.
 */
export async function criarMapaLote3(pai, aoClicar = null, animarZoom = true) {
  const mensagem = elemento(pai, "p", "Carregando mapa…", "geo-status");
  mensagem.id = "geo-mapa-status";
  mensagem.setAttribute("role", "status");
  mensagem.setAttribute("aria-atomic", "true");
  const container = elemento(pai, "div", "", "geo-mapa");
  container.id = "geo-mapa";
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", "Mapa geográfico: use as setas para mover e mais ou menos para zoom");
  container.tabIndex = 0;
  try {
    const L = await carregarLeaflet();
    const mapa = L.map(container, { doubleClickZoom: false, zoomAnimation: animarZoom }).setView([-22.9068, -43.1729], 15);
    const confirmados = L.featureGroup().addTo(mapa);
    const rascunho = L.layerGroup().addTo(mapa);
    const porId = new Map();
    // ------------------------------------------------------------
    // AVISO DE FUNDO CARTOGRÁFICO INDISPONÍVEL
    // ------------------------------------------------------------
    /** @returns {void} Informa falha de tiles sem desabilitar desenho ou resumos. */
    function falhaTile() { mensagem.textContent = "Não foi possível carregar parte do mapa de fundo. Os registros e as coordenadas continuam disponíveis."; }
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).on("tileerror", falhaTile).addTo(mapa);

    // ------------------------------------------------------------
    // CLIQUE MANUAL SEM GEOCODIFICAÇÃO
    // ------------------------------------------------------------
    /** @param {Object} evento Evento Leaflet. @returns {void} Encaminha posição ao rascunho, sem persistir. */
    function clicar(evento) {
      const ponto = evento.latlng.wrap();
      if (aoClicar) aoClicar({ latitude: ponto.lat, longitude: ponto.lng });
    }
    mapa.on("click", clicar);
    // ------------------------------------------------------------
    // AJUSTE DO MAPA AO CONTÊINER RESPONSIVO
    // ------------------------------------------------------------
    /** @returns {void} Recalcula dimensões visuais; não altera coordenadas. */
    function redimensionar() { mapa.invalidateSize(); }
    new ResizeObserver(redimensionar).observe(container);

    // ------------------------------------------------------------
    // CAMADA DOS REGISTROS CONFIRMADOS
    // ------------------------------------------------------------
    /**
     * Desenha os registros com texto e traço além da cor; não acumula camadas.
     * @param {Array} registros Resumos com id, vertices, texto, regime e cor opcionais.
     * @param {boolean} enquadrar Se deve ajustar o zoom a todos os registros.
     * @returns {void} Atualiza somente o mapa, nunca grava dados.
     */
    function registros(registros, enquadrar = false) {
      confirmados.clearLayers(); porId.clear();
      for (const registro of registros) {
        if (!registro.vertices) continue;
        const regime = registro.regime ?? "";
        const poligono = L.polygon(coordenadasMapa(registro.vertices), {
          // A Etapa 12 fornece a cor da técnica adotada. Sem essa opção,
          // preserva exatamente a apresentação dos editores e da Etapa 9.
          color: registro.cor ?? (regime === "Sem infiltração" ? "#8a4512" : "#125587"),
          dashArray: regime === "Sem infiltração" ? "10 6" : regime === "Com e sem infiltração" ? "3 6" : undefined,
          weight: 3, fillOpacity: .2
        }).addTo(confirmados);
        const texto = document.createElement("p"); texto.textContent = registro.texto;
        poligono.bindPopup(texto);
        // O resumo abaixo é alcançável por teclado, ao contrário de depender do SVG.
        const rotulo = document.createElement("span"); rotulo.textContent = registro.rotulo || registro.texto;
        poligono.bindTooltip(rotulo, { sticky: true });
        porId.set(registro.id, poligono);
      }
      if (enquadrar && confirmados.getLayers().length) mapa.fitBounds(confirmados.getBounds(), { padding: [24, 24], maxZoom: 17 });
    }

    // ------------------------------------------------------------
    // PRÉVIA DO DESENHO AINDA NÃO CONFIRMADO
    // ------------------------------------------------------------
    /** @param {Array} vertices Coordenadas do rascunho. @param {boolean} fechado Fechamento. @returns {void} Atualiza camada provisória. */
    function previa(vertices, fechado) {
      rascunho.clearLayers();
      if (!vertices.length) return;
      const pontos = coordenadasMapa(vertices);
      if (pontos.length > 1) (fechado ? L.polygon(pontos) : L.polyline(pontos)).setStyle({ color: "#914800", dashArray: "5 5" }).addTo(rascunho);
      for (let i = 0; i < pontos.length; i++) {
        const texto = document.createElement("span"); texto.textContent = `Vértice ${i + 1}`;
        L.circleMarker(pontos[i], { radius: 5, color: "#914800" }).addTo(rascunho).bindTooltip(texto);
      }
    }

    // ------------------------------------------------------------
    // LOCALIZAÇÃO POR BOTÃO NATIVO
    // ------------------------------------------------------------
    /** @param {string} id Registro escolhido. @returns {void} Ajusta zoom e abre resumo, sem gravação. */
    function localizar(id) {
      const camada = porId.get(id);
      if (!camada) return;
      mapa.fitBounds(camada.getBounds(), { padding: [24, 24], maxZoom: 18 });
      camada.openPopup();
      container.scrollIntoView({ block: "center" });
      container.focus({ preventScroll: true });
    }

    // ------------------------------------------------------------
    // POSIÇÃO CENTRAL PARA ENTRADA POR TECLADO
    // ------------------------------------------------------------
    /** @returns {Object} Coordenada atual do centro, sem alterar mapa ou dados. */
    function centro() { const p = mapa.getCenter().wrap(); return { latitude: p.lat, longitude: p.lng }; }
    mensagem.textContent = "Mapa pronto. Os dados também estão disponíveis nos resumos e controles abaixo.";
    // As consultas 9/12 podem reapresentar o mapa após um estado vazio.
    // Expõe o ajuste existente para medir o contêiner antes de enquadrá-lo.
    return { registros, previa, localizar, centro, redimensionar };
  } catch {
    mensagem.textContent = "Não foi possível carregar o mapa. Os registros e a entrada de coordenadas continuam disponíveis. Verifique a conexão e recarregue.";
    container.hidden = true;
    return null;
  }
}

// ------------------------------------------------------------
// RECURSO LEAFLET COMPARTILHADO COM O MAPA FINAL
// ------------------------------------------------------------
/** @returns {Promise<Object>} Leaflet 1.9.4 após carga única; altera apenas head, nunca storage. Falha rejeita para manter alternativa textual. */
export async function carregarLeaflet() {
  if (!carregamento) carregamento = Promise.all([
    carregarRecurso("link", { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=", crossOrigin: "" }),
    carregarRecurso("script", { src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=", crossOrigin: "" })
  ]);
  await carregamento;
  return window.L;
}
