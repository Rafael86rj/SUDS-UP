// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/dados/armazenamento-lote-3.js
// Módulo: Persistência geoespacial
// Objetivo: Preservar geometrias confirmadas e impedir sobrescrita desatualizada.
// Responsabilidade: Leitura validada, recálculo em memória e gravação explícita.
// Dependências: Leitor do Lote 1 e contratos do Lote 3.
// Utilizado por: Editores, mapas de leitura e integrações nas Etapas 8/14.
// Criado em: 04/10/2026
// Última revisão: 04/10/2026
// ------------------------------------------------------------
import { lerRegistro } from "./armazenamento-lote-1.js";
import { CHAVE_BACIA_MAPA, CHAVE_ESPACOS, validarBaciaMapa, validarEspacos, recalcularRegistro } from "./lote-3.js";

// ------------------------------------------------------------
// LEITURA SEM CORRIGIR AUTOMATICAMENTE O ARMAZENAMENTO
// ------------------------------------------------------------
/**
 * Retorna área recalculada e texto original, distinguindo ausência de falha.
 * @param {number} etapa 2 ou 6.
 * @returns {Object} Estado, dados e mensagem; lê uma chave, nunca grava.
 */
export function lerGeometria(etapa) {
  const leitura = lerRegistro(etapa === 2 ? CHAVE_BACIA_MAPA : CHAVE_ESPACOS, etapa === 2 ? validarBaciaMapa : validarEspacos);
  return { ...leitura, dados: recalcularRegistro(etapa, leitura.dados) };
}

// ------------------------------------------------------------
// EDIÇÃO COM COMPARAÇÃO OTIMISTA DO REGISTRO
// ------------------------------------------------------------
/**
 * Protege dados incompatíveis e alterações externas, inclusive antes de excluir.
 * @param {number} etapa Proprietária da chave, 2 ou 6.
 * @returns {Object} Leitura e métodos verificar/salvar; grava só por ação explícita.
 */
export function abrirGeometria(etapa) {
  const chave = etapa === 2 ? CHAVE_BACIA_MAPA : CHAVE_ESPACOS;
  const validar = etapa === 2 ? validarBaciaMapa : validarEspacos;
  const leitura = lerGeometria(etapa);
  let original = leitura.original;

  // ------------------------------------------------------------
  // PROTEÇÃO CONTRA FONTE ALTERADA OU INDISPONÍVEL
  // ------------------------------------------------------------
  /** @returns {string} Aviso ou vazio; apenas lê localStorage da etapa. */
  function verificar() {
    if (leitura.mensagem) return leitura.mensagem;
    try {
      if (localStorage.getItem(chave) !== original) return "Os dados foram alterados em outra aba. Recarregue antes de salvar; o rascunho foi mantido.";
      return "";
    } catch { return "Não foi possível acessar o armazenamento. O rascunho foi mantido."; }
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO OU EXCLUSÃO DA BACIA
  // ------------------------------------------------------------
  /**
   * Recalcula antes de salvar; null exclui somente a bacia, após confirmação na UI.
   * @param {Object|null} dados Próximo estado da etapa.
   * @returns {Object} ok/mensagem/dados; falha não confirma mudanças na interface.
   */
  function salvar(dados) {
    const bloqueio = verificar();
    if (bloqueio) return { ok: false, mensagem: bloqueio };
    if (!(etapa === 2 && dados === null) && !validar(dados)) return { ok: false, mensagem: "Confira a geometria e os campos antes de salvar." };
    try {
      const normalizados = recalcularRegistro(etapa, dados);
      const texto = normalizados === null ? null : JSON.stringify(normalizados);
      if (texto === null) localStorage.removeItem(chave);
      else localStorage.setItem(chave, texto);
      original = texto;
      return { ok: true, dados: normalizados };
    } catch { return { ok: false, mensagem: "Não foi possível salvar. Os registros confirmados e o rascunho foram mantidos; verifique espaço e permissões." }; }
  }
  return { leitura, verificar, salvar };
}
