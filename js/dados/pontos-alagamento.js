// ------------------------------------------------------------
// ESTRUTURA E VALIDAÇÃO DO LEVANTAMENTO LOCAL
// ------------------------------------------------------------
// Somente dados simples são persistidos. O contador nunca recua após exclusões.
export const CHAVE_PONTOS = "suds-up:etapa-1:pontos-alagamento:v1";
export function coordenadasValidas(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function validarLevantamento(dados) {
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.pontos)
      || !Number.isSafeInteger(dados.proximoNumero) || dados.proximoNumero < 1) return false;
  const ids = new Set();
  const numeros = new Set();
  return dados.pontos.every(ponto => {
    if (!ponto || typeof ponto.id !== "string" || !ponto.id.trim() || ids.has(ponto.id)
        || !Number.isSafeInteger(ponto.numero) || ponto.numero < 1
        || ponto.numero >= dados.proximoNumero || numeros.has(ponto.numero)
        || typeof ponto.endereco !== "string" || !ponto.endereco.trim()
        || typeof ponto.descricao !== "string"
        || !coordenadasValidas(ponto.latitude, ponto.longitude)) return false;
    ids.add(ponto.id);
    numeros.add(ponto.numero);
    return true;
  });
}

// ------------------------------------------------------------
// LEITURA E GRAVAÇÃO TRANSACIONAL
// ------------------------------------------------------------
// O acesso a localStorage fica dentro de try/catch, inclusive quando o navegador
// bloqueia a própria propriedade. Dados incompatíveis permanecem intactos.
// A comparação do texto original evita sobrescrever mudanças de outra aba.
export function abrirArmazenamentoPontos() {
  let original;
  let bloqueado = false;
  let dados = { versao: 1, proximoNumero: 1, pontos: [] };
  let erro = "";
  try {
    original = localStorage.getItem(CHAVE_PONTOS);
    if (original !== null) {
      const lidos = JSON.parse(original);
      if (!validarLevantamento(lidos)) throw new Error("Estrutura incompatível");
      dados = lidos;
    }
  } catch {
    bloqueado = true;
    erro = "Não foi possível ler o levantamento salvo: os dados podem estar inválidos, incompatíveis ou o armazenamento bloqueado. Os dados existentes não foram alterados. Verifique o armazenamento do navegador e recarregue a página antes de salvar.";
  }
  return {
    dados, erro,
    salvar(novosDados) {
      if (bloqueado) return { ok: false, erro };
      if (!validarLevantamento(novosDados)) return { ok: false, erro: "O registro contém dados inválidos. Confira o endereço e a posição." };
      try {
        if (localStorage.getItem(CHAVE_PONTOS) !== original) {
          return { ok: false, erro: "O levantamento foi alterado em outra aba. Recarregue a página para recuperar a versão salva antes de continuar." };
        }
        const texto = JSON.stringify(novosDados);
        localStorage.setItem(CHAVE_PONTOS, texto);
        original = texto;
        return { ok: true };
      } catch {
        return { ok: false, erro: "Não foi possível salvar neste navegador. A alteração não foi aplicada; seus campos continuam disponíveis. Verifique espaço e permissões e tente novamente antes de sair." };
      }
    }
  };
}
