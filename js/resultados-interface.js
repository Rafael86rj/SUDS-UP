import { CHAVE_CHUVA, validarChuva, avaliarCenario } from "./dados/lote-1.js";
import { CHAVE_CENARIO, validarCenario } from "./dados/cenario-pre-dimensionamento.js";
import { lerRegistro } from "./dados/armazenamento-lote-1.js";

// ------------------------------------------------------------
// PAINÉIS SOMENTE DE LEITURA: DEMANDA E AVALIAÇÃO DO CENÁRIO
// ------------------------------------------------------------
// Não criam resultados nem duplicam totais no armazenamento. A capacidade usa
// a validação e a função de cálculo da Etapa 13 por meio de avaliarCenario.
export function iniciarResultados(container, numero, catalogo) {
  const variantes = new Set(catalogo.flatMap(tecnica => tecnica.variantes.map(variante => variante.id)));
  const formatar = valor => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  container.className = "card lote-1";

  function texto(pai, tag, conteudo, classe) {
    const elemento = document.createElement(tag);
    elemento.textContent = conteudo;
    if (classe) elemento.className = classe;
    pai.append(elemento);
    return elemento;
  }
  function acao(pai, rotulo, etapa) {
    const link = texto(pai, "a", rotulo, "botao botao--secundario");
    link.href = `etapa.html?numero=${etapa}`;
  }
  function metrica(pai, rotulo, valor, id) {
    const bloco = document.createElement("div");
    texto(bloco, "dt", rotulo);
    texto(bloco, "dd", valor).id = id;
    pai.append(bloco);
  }
  function renderizar() {
    container.replaceChildren();
    const chuva = lerRegistro(CHAVE_CHUVA, validarChuva);
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

    const cenario = lerRegistro(CHAVE_CENARIO, dados => validarCenario(dados, variantes));
    const avaliacao = avaliarCenario(cenario.dados, chuva.dados, variantes);
    texto(container, "h2", "Capacidade e demanda do cenário");
    texto(container, "p", "Comparação dos volumes confirmados nas Etapas 13 e 15. A capacidade é recalculada a partir de todas as intervenções cadastradas.");
    const metricas = document.createElement("dl");
    metricas.className = "lote-metricas";
    container.append(metricas);
    metrica(metricas, "Volume disponível pelas técnicas SUDS (m³)", avaliacao.capacidade === null ? "Indisponível" : `${formatar(avaliacao.capacidade)} m³`, "avaliacao-capacidade");
    metrica(metricas, "Volume de chuva a manejar (m³)", avaliacao.demanda === null ? "Indisponível" : `${formatar(avaliacao.demanda)} m³`, "avaliacao-demanda");
    let percentual = "Indisponível";
    if (!avaliacao.pendencias.length) {
      percentual = avaliacao.demanda === 0 ? "Não se aplica: demanda igual a zero."
        : avaliacao.percentual === null ? "Percentual fora da faixa numérica representável."
          : `${formatar(avaliacao.percentual)} %`;
    }
    metrica(metricas, "Percentual atendido (%)", percentual, "avaliacao-percentual");
    const resultado = texto(container, "div", "", "lote-resultado");
    resultado.id = "avaliacao-resultado";
    resultado.setAttribute("role", "status");
    resultado.setAttribute("aria-atomic", "true");
    if (avaliacao.pendencias.length) {
      texto(resultado, "h3", "Avaliação pendente");
      if (avaliacao.capacidade === null) texto(resultado, "p", cenario.mensagem ? `Etapa 13: ${cenario.mensagem}` : "Nenhuma intervenção foi confirmada na Etapa 13.");
      if (avaliacao.demanda === null) texto(resultado, "p", chuva.mensagem ? `Etapa 15: ${chuva.mensagem}` : "O volume de chuva ainda não foi calculado na Etapa 15.");
    } else {
      texto(resultado, "h3", avaliacao.atende ? "O cenário atende à demanda." : "O cenário não atende integralmente à demanda.");
    }
    const acoes = texto(container, "div", "", "lote-acoes");
    if (avaliacao.atende === false) acao(acoes, "Revisar possibilidades", 9);
    acao(acoes, "Revisar pré-dimensionamento", 13);
    acao(acoes, "Revisar chuva de projeto", 15);
    if (avaliacao.atende === true) {
      const finalizar = texto(acoes, "button", "Finalizar cenário", "botao botao--primario");
      finalizar.type = "button";
      finalizar.id = "avaliacao-finalizar";
      // Finalização visual desta consulta: não cria projetos nem um resultado
      // persistido que poderia ficar desatualizado após revisão das entradas.
      finalizar.addEventListener("click", () => {
        texto(resultado, "p", "Cenário finalizado nesta visualização. Os dados permanecem disponíveis para revisão.");
        finalizar.disabled = true;
        resultado.tabIndex = -1;
        resultado.focus();
      });
    }
  }
  renderizar();
  // Uma alteração em outra aba invalida também uma finalização apenas visual.
  window.addEventListener("storage", evento => {
    if ([null, CHAVE_CHUVA, CHAVE_CENARIO].includes(evento.key)) renderizar();
  });
  window.addEventListener("pageshow", evento => { if (evento.persisted) renderizar(); });
}
