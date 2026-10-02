import { CHAVE_CONDICIONANTES, GRUPOS_CONDICIONANTES, SITUACOES_CONDICIONANTES, condicionantesVazias, validarCondicionantes } from "./dados/lote-1.js";
import { abrirRegistro } from "./dados/armazenamento-lote-1.js";

// ------------------------------------------------------------
// ETAPA 4: REGISTRO DA ANÁLISE DO PROJETISTA, SEM REGRAS INVENTADAS
// ------------------------------------------------------------
export function iniciarCondicionantes(container) {
  const armazenamento = abrirRegistro(CHAVE_CONDICIONANTES, validarCondicionantes);
  const dados = armazenamento.leitura.dados || condicionantesVazias();
  container.className = "card lote-1";
  container.innerHTML = `
    <h2>Análise preliminar das condicionantes</h2>
    <p>Registre a situação da análise e sua justificativa em cada grupo. As situações abaixo são registros do projetista e não constituem aprovação automática das técnicas.</p>
    <form id="condicionantes-formulario"><div class="lote-grade">
      ${Object.entries(GRUPOS_CONDICIONANTES).map(([id, nome]) => `
        <fieldset><legend>${nome}</legend>
          <div class="campo"><label for="cond-${id}-situacao">Situação da análise</label><select id="cond-${id}-situacao">${SITUACOES_CONDICIONANTES.map(situacao => `<option>${situacao}</option>`).join("")}</select></div>
          <div class="campo"><label for="cond-${id}-observacao">Observação / justificativa do projetista</label><textarea id="cond-${id}-observacao"></textarea></div>
        </fieldset>`).join("")}
    </div><button class="botao botao--primario" type="submit">Salvar condicionantes</button></form>
    <p id="condicionantes-status" role="status" aria-atomic="true"></p>
    <p class="card__subtitulo">As condicionantes são salvas neste navegador. Limpar os dados de navegação pode apagar os registros.</p>`;
  const campo = (id, propriedade) => container.querySelector(`#cond-${id}-${propriedade}`);
  for (const id of Object.keys(GRUPOS_CONDICIONANTES)) {
    campo(id, "situacao").value = dados.grupos[id].situacao;
    // value mantém observações como texto, inclusive conteúdo semelhante a HTML.
    campo(id, "observacao").value = dados.grupos[id].observacao;
  }
  const status = container.querySelector("#condicionantes-status");
  status.textContent = armazenamento.leitura.mensagem || "Confirme as informações em Salvar condicionantes.";
  status.classList.toggle("lote-erro", Boolean(armazenamento.leitura.mensagem));
  container.querySelector("form").addEventListener("submit", evento => {
    evento.preventDefault();
    const novos = { versao: 1, grupos: Object.fromEntries(Object.keys(GRUPOS_CONDICIONANTES)
      .map(id => [id, { situacao: campo(id, "situacao").value, observacao: campo(id, "observacao").value }])) };
    const resultado = armazenamento.salvar(novos);
    status.textContent = resultado.ok ? "Condicionantes salvas neste navegador." : resultado.mensagem;
    status.classList.toggle("lote-erro", !resultado.ok);
  });
  container.querySelector("form").addEventListener("input", () => {
    status.textContent = armazenamento.leitura.mensagem || "Rascunho alterado. Salve para confirmar as condicionantes.";
  });
}
