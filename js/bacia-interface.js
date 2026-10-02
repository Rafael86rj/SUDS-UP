import { CHAVE_BACIA, CAMPOS_BACIA, lerCamposBacia, errosBacia, validarBacia } from "./dados/lote-1.js";
import { abrirRegistro } from "./dados/armazenamento-lote-1.js";

// ------------------------------------------------------------
// ETAPA 14: ENTRADAS FÍSICAS, VALIDAÇÃO LOCAL E CONFIRMAÇÃO
// ------------------------------------------------------------
// Nenhum cálculo de chuva é iniciado. Limpar afeta apenas o formulário;
// os dados confirmados reaparecem ao recarregar ou retornar à etapa.
export function iniciarBacia(container) {
  const armazenamento = abrirRegistro(CHAVE_BACIA, validarBacia);
  container.className = "card lote-1";
  container.innerHTML = `
    <h2>Parâmetros da bacia de contribuição</h2>
    <p>Informe os dados que serão utilizados posteriormente no cálculo hidrológico da chuva de projeto.</p>
    <form id="bacia-formulario" novalidate><fieldset><legend>Dados físicos obrigatórios</legend><div class="campos">
      ${Object.entries(CAMPOS_BACIA).map(([id, nome]) => `<div class="campo"><label for="bacia-${id}">${nome}</label><input id="bacia-${id}" type="text" inputmode="decimal" required aria-describedby="bacia-decimais bacia-erro-${id}"><small class="lote-erro" id="bacia-erro-${id}"></small></div>`).join("")}
    </div></fieldset><p id="bacia-decimais" class="card__subtitulo">Use vírgula ou ponto decimal, sem separador de milhar. As cotas podem ser negativas; a cota máxima deve ser maior que a mínima.</p>
    <div class="lote-acoes"><button type="submit" class="botao botao--primario">Salvar dados da bacia</button><button type="button" id="bacia-limpar" class="botao botao--secundario">Limpar rascunho</button></div></form>
    <p id="bacia-status" role="status" aria-atomic="true"></p>
    <p class="card__subtitulo">Os dados são salvos neste navegador. Limpar os dados de navegação pode apagar os registros.</p>`;
  const campo = id => container.querySelector(`#bacia-${id}`);
  const status = campo("status");
  if (armazenamento.leitura.dados) {
    for (const id of Object.keys(CAMPOS_BACIA)) campo(id).value = String(armazenamento.leitura.dados[id]).replace(".", ",");
  }
  status.textContent = armazenamento.leitura.mensagem || "Preencha os campos e salve para confirmar os dados da bacia.";
  status.classList.toggle("lote-erro", Boolean(armazenamento.leitura.mensagem));
  function validarFormulario() {
    const dados = lerCamposBacia(Object.fromEntries(Object.keys(CAMPOS_BACIA).map(id => [id, campo(id).value])));
    const erros = errosBacia(dados);
    for (const id of Object.keys(CAMPOS_BACIA)) {
      campo(`erro-${id}`).textContent = erros[id] || "";
      campo(id).setAttribute("aria-invalid", String(Boolean(erros[id])));
    }
    return { dados, erros };
  }
  const formulario = campo("formulario");
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    const { dados, erros } = validarFormulario();
    if (Object.keys(erros).length) {
      status.textContent = "Confira os campos indicados. Os dados não foram salvos.";
      status.classList.add("lote-erro");
      campo(Object.keys(erros)[0]).focus();
      return;
    }
    const resultado = armazenamento.salvar(dados);
    status.textContent = resultado.ok ? "Dados da bacia salvos neste navegador." : resultado.mensagem;
    status.classList.toggle("lote-erro", !resultado.ok);
  });
  formulario.addEventListener("input", () => {
    validarFormulario();
    status.textContent = armazenamento.leitura.mensagem || "Rascunho alterado. Salve para confirmar os dados da bacia.";
  });
  campo("limpar").addEventListener("click", () => {
    formulario.reset();
    for (const id of Object.keys(CAMPOS_BACIA)) {
      campo(id).removeAttribute("aria-invalid");
      campo(`erro-${id}`).textContent = "";
    }
    status.textContent = "Rascunho limpo. Os dados confirmados no navegador foram mantidos.";
    status.classList.remove("lote-erro");
    campo("areaTotal").focus();
  });
}
