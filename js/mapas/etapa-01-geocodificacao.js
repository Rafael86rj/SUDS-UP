// ------------------------------------------------------------
// REFERÊNCIA LEGÍVEL SEM INVENTAR COMPONENTES DO ENDEREÇO
// ------------------------------------------------------------
// As categorias variam conforme o objeto OSM. Nunca usamos as coordenadas da
// resposta reversa: ela pode descrever um objeto próximo da posição selecionada.
export function formatarEndereco(resultado) {
  if (!resultado || resultado.error) return "";
  const texto = valor => typeof valor === "string" ? valor.trim() : "";
  const endereco = resultado.address || {};
  const primeiro = nomes => nomes.map(nome => texto(endereco[nome])).find(Boolean) || "";
  const partes = [
    primeiro(["road", "pedestrian", "residential", "footway", "path", "street"]),
    primeiro(["house_number"]),
    primeiro(["suburb", "neighbourhood", "quarter", "city_district", "borough"]),
    primeiro(["city", "town", "municipality", "village", "hamlet"])
  ].filter(Boolean);
  return [...new Set(partes)].join(", ") || texto(resultado.display_name);
}

// ------------------------------------------------------------
// FILA ÚNICA PARA BUSCA TEXTUAL E CONSULTA REVERSA
// ------------------------------------------------------------
// O intervalo é local à aba, não uma garantia de limite agregado do site.
// Uma requisição em andamento termina antes da próxima; apenas a última pendente
// é mantida. Revisões obsoletas são descartadas antes do envio e da aplicação.
export function criarGeocodificador() {
  const intervalo = 1100;
  const chaveUltima = "suds-up:ultima-busca:v1";
  const chavesCache = { search: "suds-up:enderecos:v1", reverse: "suds-up:enderecos-reversos:v1" };
  const caches = { search: new Map(), reverse: new Map() };
  let ultima = 0;
  let ocupada = false;
  let pendente = null;
  let temporizador;
  let sequencia = 0;
  try {
    const valor = Number(sessionStorage.getItem(chaveUltima));
    if (Number.isFinite(valor)) ultima = valor;
  } catch { /* Sem sessionStorage, o controle continua em memória. */ }
  Object.keys(caches).forEach(tipo => {
    try { caches[tipo] = new Map(JSON.parse(sessionStorage.getItem(chavesCache[tipo]) || "[]")); }
    catch { /* Cache inválido ou bloqueado não impede consultas. */ }
  });

  function vigente(tarefa) {
    return tarefa.sequencia === sequencia && tarefa.atual();
  }

  async function executar() {
    clearTimeout(temporizador);
    if (ocupada || !pendente) return;
    const tarefa = pendente;
    if (!vigente(tarefa)) { pendente = null; return; }
    const cache = caches[tarefa.tipo];
    // Cache não consome requisições. A pausa ainda reúne cliques consecutivos.
    const espera = Math.max(tarefa.pronta - Date.now(), cache.has(tarefa.chave) ? 0 : ultima + intervalo - Date.now());
    if (espera > 0) { temporizador = setTimeout(executar, espera); return; }
    pendente = null;
    if (cache.has(tarefa.chave)) {
      try { tarefa.receber(cache.get(tarefa.chave)); }
      catch (erro) { cache.delete(tarefa.chave); if (vigente(tarefa)) tarefa.falhar(erro); }
      return;
    }
    ocupada = true;
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 12000);
    try {
      const url = new URL(`https://nominatim.openstreetmap.org/${tarefa.tipo}`);
      url.search = new URLSearchParams(tarefa.parametros);
      ultima = Date.now();
      try { sessionStorage.setItem(chaveUltima, String(ultima)); } catch { /* Usa memória. */ }
      const resposta = await fetch(url, {
        signal: controle.signal, referrerPolicy: "strict-origin-when-cross-origin",
        headers: { Accept: "application/json" }
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const resultado = await resposta.json();
      if (tarefa.tipo === "search" ? !Array.isArray(resultado) : !resultado || typeof resultado !== "object" || Array.isArray(resultado)) {
        throw new Error("Resposta inválida.");
      }
      // Preserva o formato do cache textual existente (primeiro resultado ou null).
      const valor = tarefa.tipo === "search" ? resultado[0] || null : resultado;
      if (vigente(tarefa)) tarefa.receber(valor);
      cache.set(tarefa.chave, valor);
      try { sessionStorage.setItem(chavesCache[tarefa.tipo], JSON.stringify([...cache])); } catch { /* Usa memória. */ }
    } catch (erro) {
      // Falhas, timeout e HTTP 429 não geram tentativas automáticas.
      if (vigente(tarefa)) tarefa.falhar(erro);
    } finally {
      clearTimeout(limite);
      ocupada = false;
      executar();
    }
  }

  return {
    solicitar(tarefa) {
      pendente = { ...tarefa, sequencia: ++sequencia, pronta: Date.now() + (tarefa.pausa || 0) };
      executar();
    }
  };
}
