/*
  CÁLCULOS DA CHUVA DE PROJETO
  ----------------------------
  Funções puras: não acessam diretamente o HTML e poderão ser testadas separadamente.
*/

function calcularIntensidadeIDF(a, b, c, d, tempoRetorno, duracaoMinutos) {
  return a * (tempoRetorno ** b) / ((duracaoMinutos + c) ** d);
}
