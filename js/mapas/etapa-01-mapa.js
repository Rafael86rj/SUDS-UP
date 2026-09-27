/*
 * ETAPA 1 — LOCALIZAÇÃO E MARCAÇÃO MANUAL
 * Não realiza análises territoriais. Importado somente pelo card da Etapa 1.
 */
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const INTERVALO_MS = 1100; // Margem acima do mínimo de um segundo entre consultas.
const CHAVE_CACHE = "suds-up:enderecos:v1";
const CHAVE_ULTIMA_BUSCA = "suds-up:ultima-busca:v1";
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
  const latitude = document.querySelector("#mapa-latitude");
  const longitude = document.querySelector("#mapa-longitude");
  const mapa = L.map(container).setView([-22.9068, -43.1729], 12);
  let marcador;
  let buscando = false;
  let ultimaBusca = 0;
  let cache = new Map();

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

  // 3. MARCADOR E COORDENADAS — reutiliza um único marcador a cada seleção.
  function selecionarPonto(posicao) {
    const ponto = posicao.wrap(); // Normaliza longitude após mover o mapa pelo mundo.
    if (marcador) marcador.setLatLng(ponto);
    else marcador = L.marker(ponto).addTo(mapa).bindPopup("Ponto de alagamento selecionado");
    marcador.openPopup();
    latitude.value = ponto.lat.toFixed(6);
    longitude.value = ponto.lng.toFixed(6);
    informar("Ponto de alagamento selecionado. Coordenadas atualizadas.", "sucesso");
  }

  // 4. EVENTO DE CLIQUE — somente a escolha manual define o ponto de alagamento.
  mapa.on("click", evento => selecionarPonto(evento.latlng));
  const observador = new ResizeObserver(() => mapa.invalidateSize());
  observador.observe(container);

  // 5. PESQUISA — cache da aba também evita repetir consultas ao voltar da Etapa 2.
  // sessionStorage pode estar indisponível; nesse caso, o cache em memória continua ativo.
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CACHE) || "[]");
    cache = new Map(salvo);
    ultimaBusca = Number(sessionStorage.getItem(CHAVE_ULTIMA_BUSCA)) || 0;
  } catch { /* A busca continua funcionando sem armazenamento local. */ }

  function mostrarResultado(resultado) {
    if (!resultado) {
      informar("Endereço não encontrado. Tente incluir bairro, cidade e número.", "erro");
      return;
    }
    const lat = Number(resultado.lat);
    const lon = Number(resultado.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error("Coordenadas inválidas na resposta.");
    }
    mapa.setView([lat, lon], 16);
    informar(`Endereço encontrado: ${resultado.display_name}. Clique no mapa para selecionar o ponto de alagamento.`, "sucesso");
  }

  async function buscarEndereco() {
    if (buscando) return;
    const consulta = endereco.value.trim().replace(/\s+/g, " ");
    const chave = consulta.normalize("NFC").toLocaleLowerCase("pt-BR");
    if (!consulta) {
      informar("Digite um endereço antes de buscar.", "erro");
      endereco.focus();
      return;
    }
    if (cache.has(chave)) {
      try { mostrarResultado(cache.get(chave)); }
      catch { cache.delete(chave); informar("Resultado armazenado inválido. Busque novamente.", "erro"); }
      return;
    }
    if (Date.now() - ultimaBusca < INTERVALO_MS) {
      informar("Aguarde pelo menos um segundo entre pesquisas e selecione Buscar endereço novamente.", "erro");
      return;
    }

    buscando = true;
    botao.disabled = true;
    informar("Buscando endereço…");
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 12000);
    try {
      const url = new URL(NOMINATIM_URL);
      url.search = new URLSearchParams({ q: consulta, format: "jsonv2", limit: "1", "accept-language": "pt-BR" });
      ultimaBusca = Date.now();
      try { sessionStorage.setItem(CHAVE_ULTIMA_BUSCA, String(ultimaBusca)); } catch { /* Usa memória. */ }
      const resposta = await fetch(url, {
        signal: controle.signal,
        referrerPolicy: "strict-origin-when-cross-origin",
        headers: { Accept: "application/json" }
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const resultados = await resposta.json();
      if (!Array.isArray(resultados)) throw new Error("Resposta inválida.");
      const resultado = resultados[0] || null;
      mostrarResultado(resultado);
      cache.set(chave, resultado); // Inclui pesquisas sem resultados; falhas permitem tentar novamente.
      try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify([...cache])); } catch { /* Usa memória. */ }
    } catch (erro) {
      // 6. ERROS — timeout, conexão, resposta inválida e indisponibilidade HTTP.
      informar(erro.name === "AbortError"
        ? "A pesquisa demorou demais. Tente novamente."
        : "Não foi possível buscar o endereço. Verifique sua conexão e tente novamente.", "erro");
    } finally {
      clearTimeout(limite);
      buscando = false;
      botao.disabled = false;
    }
  }

  // Sem autocomplete ou pesquisa ao digitar/pressionar Enter no campo.
  // O botão também pode ser ativado por teclado, mantendo a acessibilidade.
  botao.addEventListener("click", buscarEndereco);
  botao.disabled = false;
  informar("Mapa pronto. Clique para selecionar um ponto de alagamento.");
}
