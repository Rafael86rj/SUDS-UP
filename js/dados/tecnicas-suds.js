// ------------------------------------------------------------
// CADASTRO COMPARTILHADO E RASTREABILIDADE
// ------------------------------------------------------------
// Dados independentes do DOM, reutilizáveis na Etapa 13 sem executar cálculos.
// A aba conserva inclusive o espaço final do nome informado na fonte.
const FONTE_TECNICAS = {
  arquivo: "SUDS-UP_Final.xlsx",
  aba: "7 - Restr. Gerais Fis-Urb "
};

const REFERENCIA_TECNICAS = {
  texto: "Fonte: Elaborado pela autora a partir de Louisiana (2010); California (2011); Water by Design (2014); Baptista, Nascimento, Barraud (2015); CIRIA (2015); Ariza et al. (2019).",
  fonte: { ...FONTE_TECNICAS, celula: "B38" }
};

// ------------------------------------------------------------
// TÉCNICAS, VARIANTES E PRANCHAS
// ------------------------------------------------------------
// IDs representam conceitos, nunca nomes de arquivos. Cada variante aponta para
// sua prancha original; jardim e pavimentos compartilham imagens entre variantes.
// Não há descrições textuais sem fonte. As legendas permanecem nas pranchas.
const TECNICAS_SUDS = [
  {
    id: "bacia-detencao", nome: "Bacia de detenção",
    variantes: [
      { id: "bacia-permeavel", nome: "Fundo permeável", infiltracao: true, imagem: "Bacia de Dentenção com fundo permeável.png" },
      { id: "bacia-impermeavel", nome: "Fundo impermeável", infiltracao: false, imagem: "Bacia de Dentenção com fundo impermeável.png" }
    ]
  },
  {
    id: "biovaleta", nome: "Biovaleta",
    variantes: [{ id: "biovaleta-infiltracao", nome: "Com infiltração", infiltracao: true, imagem: "Biovaleta.png" }]
  },
  {
    id: "pavimentos-permeaveis", nome: "Pavimentos permeáveis",
    variantes: [
      { id: "pavimento-sem-fundo-impermeavel", nome: "Sem fundo impermeável", infiltracao: true, imagem: "Pavimento permeável com e sem fundo impermeável.png" },
      { id: "pavimento-com-fundo-impermeavel", nome: "Com fundo impermeável", infiltracao: false, imagem: "Pavimento permeável com e sem fundo impermeável.png" }
    ]
  },
  {
    id: "trincheira-infiltracao", nome: "Trincheira de infiltração",
    variantes: [{ id: "trincheira-infiltracao", nome: "Com infiltração", infiltracao: true, imagem: "Trincheira de infiltração.png" }]
  },
  {
    id: "jardim-chuva", nome: "Jardim de chuva",
    variantes: [
      { id: "jardim-permeavel", nome: "Permeável", infiltracao: true, imagem: "Jardim de Chuva.png" },
      { id: "jardim-impermeavel", nome: "Impermeável", infiltracao: false, imagem: "Jardim de Chuva.png" }
    ]
  }
];

// ------------------------------------------------------------
// REGRAS TRANSCRITAS DA PLANILHA
// ------------------------------------------------------------
// A fábrica acrescenta metadados a cada texto sem alterar o conteúdo técnico.
// Nas condições, a primeira célula identifica o cabeçalho e a segunda o texto.
function cadastrarRegras(tecnica, categoria, linhas) {
  return linhas.map(([celula, texto]) => ({
    id: `restricao-${celula.toLowerCase().replaceAll("/", "-")}`,
    texto, categoria, tecnica,
    fonte: { ...FONTE_TECNICAS, celula }
  }));
}

const REGRAS_SUDS = [
  ...cadastrarRegras("bacia-detencao", "geral", [
    ["B7", "Regiões onde o serviço de limpeza urbana seja deficiente."]
  ]),
  ...cadastrarRegras("biovaleta", "geral", [
    ["E7", "Grandes áreas de drenagem."],
    ["E8", "Solos com entrada contínua de água."],
    ["E9", "Solos com alto declive, que indica uma alta velocidade da água."],
    ["E10", "Situações em que o sistema não pode ser facilmente acessado para a realização de manutenção."]
  ]),
  ...cadastrarRegras("pavimentos-permeaveis", "geral", [
    ["H7", "Áreas a jusante de áreas erodíveis."],
    ["H8", "Áreas de alto tráfego de veículos."]
  ]),
  ...cadastrarRegras("trincheira-infiltracao", "geral", [
    ["K7", "Grandes áreas de drenagem."],
    ["K8", "Locais com solo não estabilizado ou atividade de construção a montante."],
    ["K9", "Terrenos com declive acentuado."],
    ["K10", "Solos com entrada contínua de água."]
  ]),
  ...cadastrarRegras("jardim-chuva", "geral", [
    ["N7", "Solos com entrada contínua de água."],
    ["N8", "Solos com alto declive, que indica uma alta velocidade da água e provoca erosão."],
    ["N9", "Situações em que o sistema não pode ser facilmente acessado para a realização de manutenção."],
    ["N10", "Áreas a jusante de área onde grandes quantidades de sedimentos podem obstruir o sistema, como por exemplo na base encostas."]
  ]),
  ...cadastrarRegras("bacia-detencao", "com-infiltracao", [
    ["B18", "Solos com influência de maré."],
    ["B19", "Solos que recebem escoamento de dejetos tóxicos."],
    ["B20", "Locais onde não há distância segura do lençol freático, fundações de edificações do entorno, outras infraestruturas presentes no subsolo."]
  ]),
  ...cadastrarRegras("biovaleta", "com-infiltracao", [
    ["E18", "Solos com influência de maré."],
    ["E19", "Solos que recebem escoamento de dejetos tóxicos."],
    ["E20", "Locais onde não há distância segura do lençol freático, fundações de edificações do entorno, outras infraestruturas presentes no subsolo."]
  ]),
  ...cadastrarRegras("pavimentos-permeaveis", "com-infiltracao", [
    ["H18", "Áreas a jusante de área com alta probabilidade de derramamento de poluentes."],
    ["H19", "Áreas industriais ou alto tráfego de veículos (> 25.000 por dia)."],
    // H20 permanece incompleta como na fonte; não inferir uma regra adicional.
    ["H20", "Áreas onde questões geotécnicas como solos com baixas taxas de infiltração."],
    ["H21", "Locais onde não há distância segura do lençol freático, fundações de edificações do entorno, outras infraestruturas presentes no subsolo."]
  ]),
  ...cadastrarRegras("trincheira-infiltracao", "com-infiltracao", [
    ["K18", "Solos com influência de maré."],
    ["K19", "Solos que recebem escoamento de dejetos tóxicos."],
    ["K20", "Locais industriais ou locais onde podem ocorrer derramamentos de materiais tóxicos."],
    ["K21", "Locais com lençóis freáticos altos ou taxas de infiltração de solo excessivamente altas, onde os poluentes podem afetar a qualidade da água subterrânea."],
    ["K22", "Locais com taxas de infiltração de solo muito baixas."],
    ["K23", "Locais onde não há distância segura do lençol freático, fundações de edificações do entorno, outras infraestruturas presentes no subsolo."]
  ]),
  ...cadastrarRegras("jardim-chuva", "com-infiltracao", [
    ["N18", "Solos com influência de maré."],
    ["N19", "Solos que recebem escoamento de dejetos tóxicos."],
    ["N20", "Locais onde não há distância segura do lençol freático, fundações de edificações do entorno, outras infraestruturas presentes no subsolo."]
  ]),
  ...cadastrarRegras("bacia-detencao", "sem-infiltracao", [["B28/B29", "Obrigatoriedade de exutório."]]),
  // E28 diz “Biorretenção e Jardim de Chuva”: esta condição não se aplica à biovaleta.
  ...cadastrarRegras("jardim-chuva", "sem-infiltracao", [["E28/E29", "Obrigatoriedade de exutório."]]),
  ...cadastrarRegras("pavimentos-permeaveis", "sem-infiltracao", [["H28/H29", "Obrigatoriedade de exutório."]])
];

// ------------------------------------------------------------
// COMBINAÇÃO DAS RESTRIÇÕES GERAIS E ESPECÍFICAS
// ------------------------------------------------------------
// A consulta exige uma variante cadastrada para a técnica. Retorna os dois blocos
// separadamente, sem substituir regras gerais e sem avaliar qualquer terreno.
function consultarRegrasSuds(tecnicaId, varianteId) {
  const tecnica = TECNICAS_SUDS.find(item => item.id === tecnicaId);
  const variante = tecnica?.variantes.find(item => item.id === varianteId);
  if (!variante) return null;
  const categoria = variante.infiltracao ? "com-infiltracao" : "sem-infiltracao";
  return {
    gerais: REGRAS_SUDS.filter(item => item.tecnica === tecnicaId && item.categoria === "geral"),
    adicionais: REGRAS_SUDS.filter(item => item.tecnica === tecnicaId && item.categoria === categoria)
  };
}
