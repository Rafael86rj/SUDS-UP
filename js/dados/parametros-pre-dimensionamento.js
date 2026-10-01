// ------------------------------------------------------------
// PADRÕES RASTREÁVEIS POR VARIANTE DO CATÁLOGO EXISTENTE
// ------------------------------------------------------------
// Valores fornecidos na especificação; os documentos não foram abertos nesta
// implementação. Nomes e imagens continuam exclusivamente em tecnicas-suds.js.
export const FONTE_PRE_DIMENSIONAMENTO = {
  arquivo: "SUDS-UP_Final.xlsx", aba: "13 - Pré-dimensionamento", celulas: "B5:D12",
  documento: "Dissertação de Fabiana Carvalho", paginas: "96–97 (impressas)", referencia: "Etapa 13 e Tabela 18"
};

export const PARAMETROS_PRE_DIMENSIONAMENTO = Object.freeze({
  "jardim-permeavel": { profundidade: 1.50, vazios: 0.30 },
  "jardim-impermeavel": { profundidade: 1.50, vazios: 0.30 },
  "trincheira-infiltracao": { profundidade: 1.20, vazios: 0.30 },
  "pavimento-sem-fundo-impermeavel": { profundidade: 0.46, vazios: 0.30 },
  "pavimento-com-fundo-impermeavel": { profundidade: 0.46, vazios: 0.30 },
  "bacia-permeavel": { profundidade: 1.40, vazios: 1.00 },
  "bacia-impermeavel": { profundidade: 1.40, vazios: 1.00 },
  "biovaleta-infiltracao": { profundidade: 1.00, vazios: 1.00 }
});

// Cada associação aponta para a mesma fonte; não duplicamos o cadastro de técnicas.
export function obterPadrao(variante) {
  if (!Object.hasOwn(PARAMETROS_PRE_DIMENSIONAMENTO, variante)) return null;
  return { ...PARAMETROS_PRE_DIMENSIONAMENTO[variante], fonte: FONTE_PRE_DIMENSIONAMENTO };
}
