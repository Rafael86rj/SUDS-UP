// ------------------------------------------------------------
// SUDS-UP — METADADOS DO ARQUIVO
// Arquivo: js/dados/armazenamento-lote-2.js
// Módulo: Persistência das Etapas 8, 10 e 11
// Objetivo: Gravar somente confirmações sem perder registros anteriores.
// Responsabilidade: Leitura defensiva e comparação das fontes entre abas.
// Dependências: Contratos do Lote 2 e leitor já utilizado pelo Lote 1.
// Utilizado por: Interfaces e testes do Lote 2.
// Criado em: 03/10/2026
// Última revisão: 03/10/2026
// ------------------------------------------------------------
import { lerRegistro } from "./armazenamento-lote-1.js";
import { CHAVES_LOTE_2, colecaoVazia, validarColecao } from "./lote-2.js";

// ------------------------------------------------------------
// SESSÃO DE EDIÇÃO COM ORIGENS PROTEGIDAS
// ------------------------------------------------------------
/**
 * Abre a coleção da etapa e suas fontes: 10 lê 8; 11 lê 8 e 10.
 * Guarda o texto original para recusar gravação baseada em dados desatualizados.
 * Não remove, corrige nem salva automaticamente qualquer chave.
 * @param {number} etapa Etapa proprietária da edição.
 * @param {Map} variantes Índice do catálogo real.
 * @returns {Object} Leituras, dados em memória, erro e métodos verificar/salvar.
 */
export function abrirLote2(etapa, variantes) {
  const etapas = etapa === 8 ? [8] : etapa === 10 ? [8, 10] : [8, 10, 11];
  const leituras = {};
  const dados = {};
  let erro = "";
  for (const origem of etapas) {
    // ------------------------------------------------------------
    // ADAPTAÇÃO DO VALIDADOR À LEITURA COMPARTILHADA
    // ------------------------------------------------------------
    /**
     * Valida esta origem com o catálogo da sessão, sem efeitos colaterais.
     * @param {*} valor JSON recém-lido.
     * @returns {boolean} Compatibilidade da estrutura.
     */
    function validar(valor) { return validarColecao(origem, valor, variantes); }
    const leitura = lerRegistro(CHAVES_LOTE_2[origem], validar);
    leituras[origem] = leitura;
    dados[origem] = leitura.dados ?? colecaoVazia(origem);
    // O estado vazio em memória nunca autoriza substituir uma leitura inválida.
    if (leitura.mensagem) erro += `Etapa ${origem}: ${leitura.mensagem} `;
  }

  // ------------------------------------------------------------
  // DETECÇÃO DE ALTERAÇÃO DA COLEÇÃO OU DAS FONTES
  // ------------------------------------------------------------
  /**
   * Compara todas as chaves utilizadas pela tela antes de qualquer gravação.
   * @returns {string} Mensagem de bloqueio ou vazio; lê localStorage sem gravar.
   */
  function verificar() {
    if (erro) return erro;
    try {
      for (const origem of etapas) {
        if (localStorage.getItem(CHAVES_LOTE_2[origem]) !== leituras[origem].original) {
          return "Os dados foram alterados em outra aba. Recarregue antes de salvar; o rascunho atual foi mantido.";
        }
      }
      return "";
    } catch {
      return "Não foi possível acessar o armazenamento. O rascunho foi mantido; verifique as permissões do navegador.";
    }
  }

  // ------------------------------------------------------------
  // CONFIRMAÇÃO EXPLÍCITA NA CHAVE DA ETAPA ATUAL
  // ------------------------------------------------------------
  /**
   * Grava somente após validar e comparar todas as fontes; falhas preservam tudo.
   * @param {Object} novosDados Coleção candidata à confirmação.
   * @returns {Object} Resultado ok/mensagem; escreve apenas CHAVES_LOTE_2[etapa].
   */
  function salvar(novosDados) {
    const bloqueio = verificar();
    if (bloqueio) return { ok: false, mensagem: bloqueio };
    if (!validarColecao(etapa, novosDados, variantes)) return { ok: false, mensagem: "Confira os campos antes de salvar." };
    try {
      const texto = JSON.stringify(novosDados);
      localStorage.setItem(CHAVES_LOTE_2[etapa], texto);
      // Atualizar a referência só depois de setItem evita confirmar uma falha.
      leituras[etapa].original = texto;
      dados[etapa] = novosDados;
      return { ok: true };
    } catch {
      return { ok: false, mensagem: "Não foi possível salvar. O rascunho foi mantido; verifique espaço e permissões e tente novamente." };
    }
  }
  return { dados, leituras, erro, verificar, salvar };
}
