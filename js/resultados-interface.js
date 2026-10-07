// ------------------------------------------------------------
// Arquivo: js/resultados-interface.js — revisão 07/10/2026
// Objetivo: Exibir demanda e comparar capacidade somente com chuva atual.
// Responsabilidade: Leitura e avaliação; não grava nem migra registros.
// ------------------------------------------------------------
import { CHAVE_CHUVA, CHAVE_BACIA } from "./dados/lote-1.js";
import { lerChuvaAtual } from "./dados/armazenamento-lote-4.js";

import { iniciarResumoFinal } from "./resumo-final-interface.js";

// ------------------------------------------------------------
// PAINÉIS SOMENTE DE LEITURA: DEMANDA E AVALIAÇÃO DO CENÁRIO
// ------------------------------------------------------------
// Não criam resultados nem duplicam totais no armazenamento. A Etapa 17 delega
// a leitura e o cálculo oficiais ao resumo compartilhado, sem outra avaliação.
/** @param {Element} container Destino. @param {number} numero Etapa 16 ou 17. @param {Array} catalogo Técnicas. @returns {void} Monta painéis somente de leitura e observa fontes. */
export function iniciarResultados(container, numero, catalogo) {
  // O resumo agrega fontes sem duplicar persistência.
  if (numero === 17) { iniciarResumoFinal(container, catalogo); return; }
  // ------------------------------------------------------------
  // FORMATAÇÃO VISUAL SEM ALTERAR PRECISÃO DO CÁLCULO
  // ------------------------------------------------------------
  /** @param {number} valor Volume. @returns {string} Texto pt-BR, sem mutação. */
  const formatar = valor => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  container.className = "card lote-1";

  // ------------------------------------------------------------
  // INSERÇÃO SEGURA DE TEXTO
  // ------------------------------------------------------------
  /** @param {Element} pai Destino. @param {string} tag Tag. @param {string} conteudo Texto. @param {string} classe Classe opcional. @returns {HTMLElement} Elemento inserido, sem storage. */
  function texto(pai, tag, conteudo, classe) {
    const elemento = document.createElement(tag);
    elemento.textContent = conteudo;
    if (classe) elemento.className = classe;
    pai.append(elemento);
    return elemento;
  }
  // ------------------------------------------------------------
  // LINK DE REVISÃO DA ORIGEM
  // ------------------------------------------------------------
  /** @param {Element} pai Destino. @param {string} rotulo Texto. @param {number} etapa Etapa. @returns {void} Insere link; sem persistência. */
  function acao(pai, rotulo, etapa) {
    const link = texto(pai, "a", rotulo, "botao botao--secundario");
    link.href = `etapa.html?numero=${etapa}`;
  }
  // ------------------------------------------------------------
  // RELEITURA DAS FONTES E AVALIAÇÃO SOMENTE COM DEMANDA ATUAL
  // ------------------------------------------------------------
  /** @returns {void} Substitui painel; chuva inválida/desatualizada mantém avaliação pendente, sem escrita. */
  function renderizar() {
    container.replaceChildren();
    // O leitor conserva o registro antigo e impede que uma demanda desatualizada
    // produza avaliação positiva ou negativa. Zero confirmado continua válido.
    const chuva = lerChuvaAtual();
    if (numero === 16) {
      texto(container, "h2", "VOLUME DE CHUVA A SER MANEJADO");
      if (chuva.estado === "valido") {
        texto(container, "p", `${formatar(chuva.dados.volumeChuvaAManejar)} m³`, "lote-volume").id = "chuva-volume";
        texto(container, "p", "Resultado confirmado disponível da Etapa 15. O valor é arredondado somente para apresentação.");
      } else {
        texto(container, "h3", chuva.estado === "ausente" ? "Volume ainda não calculado" : "Volume indisponível");
        texto(container, "p", chuva.mensagem || "Conclua a Etapa 15 para obter a demanda do cenário.").setAttribute("role", "status");
      }
      acao(container, "Revisar chuva de projeto", 15);
      return;
    }

  }
  renderizar();
  // Uma alteração nas fontes em outra aba atualiza a demanda exibida.
  window.addEventListener("storage", evento => {
    if ([null, CHAVE_CHUVA, CHAVE_BACIA].includes(evento.key)) renderizar();
  });
  window.addEventListener("pageshow", evento => { if (evento.persisted) renderizar(); });
}
