import { calcularTotalIntervencoes } from "../calculos/pre-dimensionamento.js";

// ------------------------------------------------------------
// CENÁRIO ÚNICO VERSIONADO, INDEPENDENTE DOS PONTOS DE ALAGAMENTO
// ------------------------------------------------------------
// A interface fornece os IDs válidos do catálogo. Validamos IDs, numeração,
// parâmetros e total; valores de volume eventualmente armazenados são ignorados.
export const CHAVE_CENARIO = "suds-up:etapa-13:cenario:v1";
export function validarCenario(dados, variantes) {
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.intervencoes)
      || !Number.isSafeInteger(dados.proximoNumero) || dados.proximoNumero < 1) return false;
  const ids = new Set();
  const numeros = new Set();
  for (const item of dados.intervencoes) {
    if (!item || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id)
        || !Number.isSafeInteger(item.numero) || item.numero < 1 || item.numero >= dados.proximoNumero
        || numeros.has(item.numero) || !variantes.has(item.variante)) return false;
    ids.add(item.id);
    numeros.add(item.numero);
  }
  try { calcularTotalIntervencoes(dados.intervencoes); return true; }
  catch { return false; }
}

function somenteEntradas(dados) {
  return { versao: 1, proximoNumero: dados.proximoNumero,
    intervencoes: dados.intervencoes.map(({ id, numero, variante, area, profundidade, vazios }) => ({ id, numero, variante, area, profundidade, vazios })) };
}

// ------------------------------------------------------------
// LEITURA E GRAVAÇÃO COM CONFIRMAÇÃO ANTES DE ALTERAR A INTERFACE
// ------------------------------------------------------------
// Segue a proteção da Etapa 1, sem alterar seu módulo ou seu armazenamento.
// Dados incompatíveis bloqueiam a gravação; falhas preservam o rascunho.
export function abrirCenario(variantes) {
  let original;
  let erro = "";
  let dados = { versao: 1, proximoNumero: 1, intervencoes: [] };
  try {
    original = localStorage.getItem(CHAVE_CENARIO);
    if (original !== null) {
      const lidos = JSON.parse(original);
      if (!validarCenario(lidos, variantes)) throw new Error("Cenário incompatível");
      dados = somenteEntradas(lidos);
    }
  } catch {
    erro = "Não foi possível ler o cenário: armazenamento indisponível ou dados inválidos/incompatíveis. Os dados existentes não foram alterados. Verifique o armazenamento e recarregue antes de salvar.";
  }
  return {
    dados, erro,
    salvar(novosDados) {
      if (erro) return { ok: false, erro };
      if (!validarCenario(novosDados, variantes)) return { ok: false, erro: "Cenário inválido. Confira os parâmetros, o total e a numeração." };
      try {
        if (localStorage.getItem(CHAVE_CENARIO) !== original) {
          return { ok: false, erro: "O cenário foi alterado em outra aba. Recarregue antes de salvar para preservar essa alteração." };
        }
        const texto = JSON.stringify(somenteEntradas(novosDados));
        localStorage.setItem(CHAVE_CENARIO, texto);
        original = texto;
        return { ok: true };
      } catch {
        return { ok: false, erro: "Não foi possível salvar neste navegador. A alteração não foi aplicada e o rascunho foi mantido. Verifique espaço e permissões e tente novamente." };
      }
    }
  };
}
