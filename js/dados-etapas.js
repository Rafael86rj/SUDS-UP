/*
  DADOS DAS ETAPAS
  ----------------
  Este arquivo concentra os textos da metodologia.
  A interface lê esses dados e monta a tela correspondente.
*/

const ETAPAS = [
  {
    numero: 1,
    grupo: "Diagnóstico inicial",
    titulo: "Reconhecimento do local",
    menu: "Reconhecimento do local",
    descricao: "Levante informações sobre o local e registre as ocorrências de alagamento que sustentam o estudo.",
    objetivo: "Construir um diagnóstico inicial rastreável antes de delimitar a área de contribuição.",
    passos: ["Consultar fontes confiáveis", "Identificar e descrever os pontos de alagamento", "Localizar as ocorrências no mapa"],
    resultado: "Mapa inicial dos pontos de alagamento e relação das evidências consultadas.",
    tipoTela: "mapa-evidencias"
  },
  {
    numero: 2,
    grupo: "Diagnóstico inicial",
    titulo: "Bacia de contribuição do terreno",
    menu: "Bacia de contribuição",
    descricao: "Delimite a área do entorno cujo escoamento superficial contribui para o terreno estudado.",
    // Revisão 04/10/2026: delimitação manual, sem inferência topográfica automática.
    objetivo: "Registrar o contorno manual da bacia e estimar sua área pelas coordenadas geográficas.",
    passos: ["Iniciar o desenho manual no mapa", "Adicionar vértices e fechar um contorno sem cruzamentos", "Conferir a área e salvar a delimitação"],
    resultado: "Bacia delimitada manualmente, com área em m² e hectares disponível para aproveitamento explícito na Etapa 14.",
    tipoTela: "mapa-bacia"
  },
  {
    numero: 3,
    grupo: "Seleção de técnicas",
    titulo: "Catálogo das técnicas SUDS",
    menu: "Catálogo de SUDS",
    descricao: "Conheça as técnicas contempladas, suas aplicações, características e limitações.",
    objetivo: "Apoiar uma escolha informada antes da análise detalhada das condicionantes.",
    passos: ["Consultar as técnicas disponíveis", "Comparar funcionamento e necessidade de infiltração", "Marcar técnicas de interesse"],
    resultado: "Lista inicial de técnicas candidatas para o terreno.",
    tipoTela: "catalogo"
  },
  {
    numero: 4,
    grupo: "Seleção de técnicas",
    titulo: "Condicionantes iniciais",
    menu: "Condicionantes iniciais",
    descricao: "Registre a análise preliminar das condicionantes urbanas, ambientais, sanitárias e socioeconômicas.",
    objetivo: "Documentar a análise do projetista e as justificativas que poderão influenciar a implantação das técnicas.",
    passos: ["Revisar os quatro grupos de condicionantes", "Informar a situação e a justificativa da análise", "Salvar condicionantes"],
    resultado: "Conjunto de condicionantes iniciais associado ao estudo.",
    tipoTela: "consulta"
  },
  {
    numero: 5,
    grupo: "Leitura territorial",
    titulo: "Mapeamento técnico do entorno",
    menu: "Mapeamento técnico",
    descricao: "Mapeie hidrografia, drenagem, infraestrutura, uso do solo e áreas de patrimônio.",
    objetivo: "Orientar a busca das bases territoriais necessárias para a análise.",
    passos: ["Consultar fontes oficiais", "Registrar arquivos e datas", "Identificar lacunas de informação"],
    resultado: "Inventário das bases e documentos técnicos do entorno.",
    tipoTela: "checklist"
  },
  {
    numero: 6,
    grupo: "Leitura territorial",
    titulo: "Espaços livres com vocação para SUDS",
    menu: "Espaços livres",
    // Revisão 04/10/2026: cadastro geográfico manual sem classificar aptidão.
    descricao: "Delimite manualmente espaços livres para análise posterior das possibilidades de SUDS.",
    objetivo: "Registrar identificação, contorno e área de cada espaço, sem determinar automaticamente sua aptidão.",
    passos: ["Identificar o espaço livre", "Desenhar e fechar seu polígono no mapa", "Conferir a área calculada e salvar o espaço"],
    resultado: "Espaços livres cadastrados com geometria e área, disponíveis para aproveitamento na Etapa 8.",
    tipoTela: "mapa-areas"
  },
  {
    numero: 7,
    grupo: "Leitura territorial",
    titulo: "Restrições físico-urbanas das técnicas",
    menu: "Restrições das técnicas",
    descricao: "Compare as exigências de implantação das técnicas com as condições do terreno.",
    objetivo: "Evitar a seleção de técnicas incompatíveis com solo, declividade, dimensões ou infraestrutura.",
    passos: ["Selecionar uma técnica", "Consultar seus limites", "Comparar com as áreas candidatas"],
    resultado: "Matriz preliminar de compatibilidade entre técnicas e áreas.",
    tipoTela: "matriz"
  },
  {
    numero: 8,
    grupo: "Avaliação em campo",
    titulo: "Possibilidades de SUDS por área",
    menu: "Possibilidades por área",
    // Revisão 03/10/2026: possibilidades preliminares, sem escolha automática/final.
    descricao: "Cadastre as áreas candidatas e registre as condições e possibilidades preliminares antes da visita de campo.",
    objetivo: "Preparar um levantamento por área para conferência em campo, com alternativas indicadas pelo projetista.",
    passos: ["Identificar a área e informar a área disponível", "Registrar dimensões, solo, infraestrutura e restrições conhecidas", "Marcar os SUDS preliminarmente possíveis e salvar a área"],
    resultado: "Áreas e possibilidades preliminares salvas neste navegador para a visita de campo.",
    tipoTela: "tabela-campo"
  },
  {
    numero: 9,
    grupo: "Avaliação em campo",
    titulo: "Mapa das possibilidades de SUDS",
    menu: "Mapa de possibilidades",
    descricao: "Espacialize as alternativas e diferencie técnicas com e sem infiltração.",
    objetivo: "Visualizar a distribuição das possibilidades antes da verificação em campo.",
    // Revisão 04/10/2026: leitura das possibilidades, inclusive áreas sem geometria.
    passos: ["Consultar áreas vinculadas aos espaços da Etapa 6", "Conferir possibilidades e regimes de infiltração nos resumos", "Revisar na Etapa 8 as áreas com ou sem localização"],
    resultado: "Mapa e resumos das possibilidades preliminares, sem novo cadastro de técnicas.",
    tipoTela: "mapa-possibilidades"
  },
  {
    numero: 10,
    grupo: "Avaliação em campo",
    // Revisão 03/10/2026: esta etapa registra a visita, não prepara exportações.
    titulo: "Visita de campo",
    menu: "Visita de campo",
    descricao: "Registre as constatações in loco para as áreas cadastradas na Etapa 8.",
    objetivo: "Documentar postes, poços de visita, pavimentação histórica, pedestres, calçada e observações de campo.",
    passos: ["Selecionar uma área e conferir o levantamento preliminar", "Registrar as constatações realizadas no local", "Salvar a vistoria vinculada à área"],
    resultado: "Uma vistoria atual por área, salva neste navegador para revisão pós-campo.",
    tipoTela: "visita"
  },
  {
    numero: 11,
    grupo: "Avaliação em campo",
    // Revisão 03/10/2026: decisão própria, preservando os registros das fontes.
    titulo: "Revisão pós-campo e escolha do SUDS",
    menu: "Revisão pós-campo",
    descricao: "Consolide os dados preliminares e de campo, revise as possibilidades e registre a escolha final do projetista.",
    objetivo: "Documentar a decisão pós-campo por área sem alterar os levantamentos das Etapas 8 e 10.",
    passos: ["Conferir os dados pré-campo e a vistoria disponível", "Revisar restrições e SUDS possíveis", "Selecionar um SUDS e justificar, ou manter a escolha vazia, e salvar"],
    resultado: "Decisão pós-campo salva por área, com seleção final opcional e justificativa quando houver escolha.",
    tipoTela: "tabela-revisao"
  },
  {
    numero: 12,
    grupo: "Construção do cenário",
    titulo: "Mapa do Cenário 1",
    menu: "Mapa do Cenário 1",
    // Revisão 04/10/2026: consolidação de leitura, sem criar intervenções na Etapa 13.
    descricao: "Consulte no mapa as escolhas pós-campo confirmadas na Etapa 11 e vinculadas aos espaços da Etapa 6.",
    objetivo: "Consolidar espacialmente as decisões do projetista e explicitar registros sem geometria ou técnica definida.",
    passos: ["Conferir técnicas selecionadas e justificativas", "Consultar também registros sem localização ou sem técnica definida", "Prosseguir para o pré-dimensionamento e cadastrar suas intervenções explicitamente"],
    resultado: "Mapa e resumos do Cenário 1, sem criação automática de intervenções de pré-dimensionamento.",
    tipoTela: "mapa-cenario"
  },
  {
    numero: 13,
    grupo: "Cálculos",
    titulo: "Pré-dimensionamento das técnicas",
    menu: "Pré-dimensionamento",
    descricao: "Informe a área de cada intervenção e calcule o volume que poderá ser manejado.",
    objetivo: "Calcular o volume individual e total das técnicas inseridas no cenário.",
    passos: ["Selecionar a técnica", "Informar a área", "Revisar profundidade e índice de vazios"],
    resultado: "Volume manejado por intervenção e volume total do cenário.",
    tipoTela: "pre-dimensionamento"
  },
  {
    numero: 14,
    grupo: "Cálculos",
    titulo: "Dados da bacia de contribuição",
    menu: "Área de contribuição",
    descricao: "Informe a área e os parâmetros físicos necessários para o cálculo hidrológico.",
    objetivo: "Preparar os dados de entrada do tempo de concentração e da chuva de projeto.",
    passos: ["Informar área total e área vegetada", "Informar comprimento do talvegue", "Informar cotas máxima e mínima"],
    resultado: "Parâmetros físicos validados para o cálculo da chuva.",
    tipoTela: "dados-bacia"
  },
  {
    numero: 15,
    grupo: "Cálculos",
    titulo: "Chuva de projeto",
    menu: "Chuva de projeto",
    descricao: "Calcule tempo de concentração, intensidade, altura pluviométrica e volume de chuva.",
    objetivo: "Determinar o volume de chuva que deverá ser comparado com a capacidade do cenário.",
    passos: ["Selecionar ou editar os coeficientes IDF", "Definir TR e runoff", "Executar e revisar o cálculo"],
    resultado: "Tempo de concentração, intensidade, altura e volume pelo método racional.",
    tipoTela: "chuva-projeto"
  },
  {
    numero: 16,
    grupo: "Avaliação",
    titulo: "Volume de chuva a ser manejado",
    menu: "Volume a manejar",
    descricao: "Revise o volume calculado e os parâmetros que determinaram a demanda do cenário.",
    objetivo: "Apresentar a demanda hidrológica de forma clara antes da comparação final.",
    passos: ["Consultar o volume disponível da Etapa 15", "Conferir a unidade em metros cúbicos", "Revisar a chuva de projeto quando necessário"],
    resultado: "Volume de referência apresentado para avaliação do cenário, quando disponível.",
    tipoTela: "resumo-volume"
  },
  {
    numero: 17,
    grupo: "Avaliação",
    titulo: "Avaliação do cenário",
    menu: "Resultado do cenário",
    descricao: "Compare a capacidade total das técnicas com o volume de chuva que precisa ser manejado.",
    objetivo: "Decidir se o cenário atende à demanda ou se precisa de novas técnicas e ajustes.",
    passos: ["Conferir capacidade e demanda confirmadas", "Consultar o percentual e o resultado da comparação", "Revisar as intervenções ou finalizar a visualização do cenário"],
    resultado: "Comparação dos volumes do cenário, com indicação das revisões necessárias ou finalização visual.",
    tipoTela: "resultado"
  }
];
