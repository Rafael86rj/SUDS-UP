// ------------------------------------------------------------
// LEITURA COMPARTILHADA DOS REGISTROS VERSIONADOS DO LOTE 1
// ------------------------------------------------------------
// Ausência, incompatibilidade e bloqueio do navegador são estados distintos.
// A leitura é usada também pelos painéis e nunca grava nem remove dados.
export function lerRegistro(chave, validar) {
  let original;
  try { original = localStorage.getItem(chave); }
  catch { return { estado: "erro", dados: null, mensagem: "Não foi possível acessar o armazenamento deste navegador." }; }
  if (original === null) return { estado: "ausente", dados: null, original };
  try {
    const dados = JSON.parse(original);
    if (!validar(dados)) throw new Error("Estrutura incompatível");
    return { estado: "valido", dados, original };
  } catch {
    return { estado: "invalido", dados: null, original,
      mensagem: "Os dados salvos são inválidos ou incompatíveis. Eles foram preservados; verifique o armazenamento antes de continuar." };
  }
}

// ------------------------------------------------------------
// GRAVAÇÃO EXPLÍCITA SOMENTE PARA CONDICIONANTES E BACIA
// ------------------------------------------------------------
// Abstração pequena para os dois formulários: valida antes de gravar, preserva
// rascunhos em falhas e não sobrescreve dados incompatíveis ou de outra aba.
export function abrirRegistro(chave, validar) {
  const leitura = lerRegistro(chave, validar);
  let original = leitura.original;
  return {
    leitura,
    salvar(dados) {
      if (!["valido", "ausente"].includes(leitura.estado)) return { ok: false, mensagem: leitura.mensagem };
      if (!validar(dados)) return { ok: false, mensagem: "Confira os campos antes de salvar." };
      try {
        if (localStorage.getItem(chave) !== original) return { ok: false, mensagem: "Os dados foram alterados em outra aba. Recarregue antes de salvar para preservar a versão confirmada." };
        const texto = JSON.stringify(dados);
        localStorage.setItem(chave, texto);
        original = texto;
        return { ok: true };
      } catch {
        return { ok: false, mensagem: "Não foi possível salvar. O rascunho foi mantido; verifique espaço e permissões do navegador e tente novamente." };
      }
    }
  };
}
