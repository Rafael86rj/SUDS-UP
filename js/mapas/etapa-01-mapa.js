/*
 * ETAPA 1 — LOCALIZAÇÃO E MARCAÇÃO MANUAL
 * Não realiza análises territoriais. Importado somente pelo card da Etapa 1.
 */
import { iniciarLevantamento } from "./etapa-01-levantamento.js";
import { criarGeocodificador, formatarEndereco } from "./etapa-01-geocodificacao.js";

let inicializacao;

// 1. CARREGAMENTO — CSS e JS versionados, apenas quando o mapa é solicitado.
function carregarRecurso(tag, atributos) {
  return new Promise((resolve, reject) => {
    const recurso = Object.assign(document.createElement(tag), atributos);
    const limite = setTimeout(() => {
      recurso.remove();
      reject(new Error("Tempo de carregamento excedido."));
    }, 15000);
    recurso.onload = () => { clearTimeout(limite); resolve(); };
    recurso.onerror = () => {
      clearTimeout(limite);
      recurso.remove();
      reject(new Error("Falha ao carregar Leaflet."));
    };
    document.head.append(recurso);
  });
}

export function iniciarMapaEtapa01() {
  // Evita criar duas instâncias se o controlador solicitar a inicialização novamente.
  if (!document.querySelector("#mapa-etapa-01")) return Promise.resolve();
  if (!inicializacao) inicializacao = montarMapa();
  return inicializacao;
}

async function montarMapa() {
  // ------------------------------------------------------------
  // RESTAURAÇÃO INDEPENDENTE DO SERVIÇO CARTOGRÁFICO
  // ------------------------------------------------------------
  // Tabela e armazenamento são iniciados antes de carregar o Leaflet externo.
  const levantamento = iniciarLevantamento();
  await Promise.all([
    carregarRecurso("link", {
      rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=", crossOrigin: ""
    }),
    carregarRecurso("script", {
      src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=", crossOrigin: ""
    })
  ]);

  const L = window.L;
  const container = document.querySelector("#mapa-etapa-01");
  const endereco = document.querySelector("#mapa-endereco");
  const botao = document.querySelector("#mapa-buscar");
  const mensagem = document.querySelector("#mapa-mensagem");
  const mapa = L.map(container).setView([-22.9068, -43.1729], 12);
  let provisorio;
  const marcadores = new Map();
  const camadaRegistros = L.layerGroup().addTo(mapa);
  const geocodificador = criarGeocodificador();

  function informar(texto, tipo = "info") {
    mensagem.textContent = texto; // Texto externo nunca é inserido como HTML.
    mensagem.dataset.tipo = tipo;
  }

  // 2. CAMADA CARTOGRÁFICA — imagens OSM, zoom e atribuição visível obrigatória.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).on("tileerror", () => {
    informar("Não foi possível carregar parte do mapa. Verifique sua conexão e recarregue a página.", "erro");
  }).addTo(mapa);

  // ------------------------------------------------------------
  // MARCADORES CADASTRADOS E SELEÇÃO PROVISÓRIA
  // ------------------------------------------------------------
  // A camada é reconstruída da coleção confirmada, sem acumular marcadores.
  // O rascunho usa camada separada e nunca entra na coleção por um clique.
  function icone(texto, provisoria = false) {
    const rotulo = document.createElement("span");
    rotulo.textContent = texto;
    return L.divIcon({ html: rotulo, className: `ponto-marcador${provisoria ? " ponto-marcador--provisorio" : ""}`, iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  const restaurados = levantamento.conectarMapa({
    registros(pontos) {
      camadaRegistros.clearLayers();
      marcadores.clear();
      pontos.forEach(ponto => {
        const texto = document.createElement("div");
        texto.textContent = `Ponto ${ponto.numero} — ${ponto.endereco}${ponto.descricao ? ` — ${ponto.descricao}` : ""}`;
        const marcador = L.marker([ponto.latitude, ponto.longitude], {
          icon: icone(String(ponto.numero)), title: `Ponto ${ponto.numero}`, alt: `Ponto de alagamento ${ponto.numero}`
        }).addTo(camadaRegistros).bindPopup(texto);
        marcadores.set(ponto.id, marcador);
      });
    },
    provisorio(posicao) {
      if (provisorio) { mapa.removeLayer(provisorio); provisorio = null; }
      if (posicao) provisorio = L.marker([posicao.latitude, posicao.longitude], {
        icon: icone("?", true), title: "Posição provisória — ainda não salva", zIndexOffset: 1000
      }).addTo(mapa);
    },
    localizar(id) {
      const marcador = marcadores.get(id);
      if (!marcador) return;
      mapa.setView(marcador.getLatLng(), 16);
      marcador.openPopup();
      container.scrollIntoView({ block: "center" });
      container.focus({ preventScroll: true });
    }
  });
  if (restaurados.length) mapa.fitBounds(restaurados.map(ponto => [ponto.latitude, ponto.longitude]), { padding: [30, 30], maxZoom: 16 });

  function selecionarPonto(posicao) {
    const ponto = posicao.wrap();
    // ------------------------------------------------------------
    // SELEÇÃO IMEDIATA E SUGESTÃO REVERSA APÓS UMA BREVE PAUSA
    // ------------------------------------------------------------
    // Somente clique/seleção do centro passa aqui. Restaurar, localizar, editar,
    // mover/ ampliar o mapa e receber a busca textual não disparam consulta reversa.
    if (!levantamento.selecionar(ponto.lat, ponto.lng)) return;
    const origem = levantamento.revisao;
    levantamento.informarConsulta(origem, "Consultando endereço…");
    geocodificador.solicitar({
      tipo: "reverse", chave: `${ponto.lat},${ponto.lng}`, pausa: 400,
      parametros: { lat: String(ponto.lat), lon: String(ponto.lng), format: "jsonv2", addressdetails: "1", "accept-language": "pt-BR", zoom: "18", layer: "address" },
      atual: () => levantamento.revisao === origem,
      receber: resultado => levantamento.sugerirEndereco(origem, formatarEndereco(resultado)),
      falhar: () => levantamento.informarConsulta(origem, "Não foi possível identificar o endereço. Informe uma referência manualmente.", true)
    });
  }
  mapa.on("click", evento => selecionarPonto(evento.latlng));
  const selecionarCentro = document.querySelector("#mapa-selecionar-centro");
  selecionarCentro.disabled = false;
  selecionarCentro.addEventListener("click", () => selecionarPonto(mapa.getCenter()));
  const observador = new ResizeObserver(() => mapa.invalidateSize());
  observador.observe(container);

  // ------------------------------------------------------------
  // BUSCA TEXTUAL NO MESMO CONTROLE DA CONSULTA REVERSA
  // ------------------------------------------------------------
  // A busca explícita substitui a solicitação pendente, aproveita o endereço
  // recebido e só aplica resultados/erros se o rascunho ainda for o mesmo.
  function buscarEndereco() {
    const consulta = endereco.value.trim().replace(/\s+/g, " ");
    const origem = levantamento.iniciarConsulta();
    if (!consulta) {
      levantamento.informarConsulta(origem, "Digite um endereço antes de buscar.", true);
      endereco.focus();
      return;
    }
    levantamento.informarConsulta(origem, "Buscando endereço…");
    geocodificador.solicitar({
      tipo: "search", chave: consulta.normalize("NFC").toLocaleLowerCase("pt-BR"),
      parametros: { q: consulta, format: "jsonv2", limit: "1", "accept-language": "pt-BR" },
      atual: () => levantamento.revisao === origem,
      receber(resultado) {
        if (!resultado) {
          levantamento.informarConsulta(origem, "Endereço não encontrado. Tente incluir bairro, cidade e número.", true);
          return;
        }
        const lat = Number(resultado.lat);
        const lon = Number(resultado.lon);
        if (resultado.lat == null || resultado.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
          throw new Error("Coordenadas inválidas na resposta.");
        }
        mapa.setView([lat, lon], 16);
        levantamento.selecionar(lat, lon, typeof resultado.display_name === "string" ? resultado.display_name : formatarEndereco(resultado));
        levantamento.informarConsulta(levantamento.revisao, "Posição encontrada. Confira o endereço ou informe uma referência antes de adicionar ou salvar o ponto.");
      },
      falhar(erro) {
        levantamento.informarConsulta(origem, erro.name === "AbortError"
          ? "A pesquisa demorou demais. Tente novamente."
          : "Não foi possível buscar o endereço. Verifique sua conexão e tente novamente.", true);
      }
    });
  }

  // Sem autocomplete ou pesquisa ao digitar/pressionar Enter no campo.
  // O botão também pode ser ativado por teclado, mantendo a acessibilidade.
  botao.addEventListener("click", buscarEndereco);
  botao.disabled = false;
  informar("Mapa pronto. Clique para selecionar um ponto de alagamento.");
}
