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
    objetivo: "Representar o caminho da água até o lote usando relevo, cotas, curvas de nível e drenagem.",
    passos: ["Informar o endereço do terreno", "Reunir plantas e dados topográficos", "Traçar e justificar o contorno da bacia"],
    resultado: "Contorno preliminar da bacia, ponto de saída, cotas e referências territoriais utilizadas.",
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
    titulo: "Condicionantes sanitárias e sociais",
    menu: "Condicionantes iniciais",
    descricao: "Consulte as condições sanitárias e sociais que influenciam a implantação das técnicas.",
    objetivo: "Eliminar alternativas incompatíveis antes das análises físicas e urbanas.",
    passos: ["Selecionar a condição observada", "Consultar a orientação associada", "Registrar restrições relevantes"],
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
    descricao: "Analise o mapa físico e destaque espaços que podem receber intervenções.",
    objetivo: "Produzir uma seleção preliminar de áreas livres para avaliação posterior.",
    passos: ["Sobrepor as informações reunidas", "Identificar espaços livres", "Registrar a justificativa de cada área"],
    resultado: "Mapa preliminar dos espaços livres selecionados.",
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
    descricao: "Preencha as condições físico-urbanas das áreas selecionadas e associe técnicas possíveis.",
    objetivo: "Preparar a ficha que será conferida durante a visita de campo.",
    passos: ["Cadastrar a área", "Preencher dimensões, solo e infraestrutura", "Selecionar e justificar a técnica"],
    resultado: "Tabela de possibilidades pronta para salvar, imprimir ou levar a campo.",
    tipoTela: "tabela-campo"
  },
  {
    numero: 9,
    grupo: "Avaliação em campo",
    titulo: "Mapa das possibilidades de SUDS",
    menu: "Mapa de possibilidades",
    descricao: "Espacialize as alternativas e diferencie técnicas com e sem infiltração.",
    objetivo: "Visualizar a distribuição das possibilidades antes da verificação em campo.",
    passos: ["Localizar as áreas cadastradas", "Aplicar a legenda por tipo de técnica", "Revisar conflitos espaciais"],
    resultado: "Mapa temático das possibilidades de intervenção.",
    tipoTela: "mapa-possibilidades"
  },
  {
    numero: 10,
    grupo: "Avaliação em campo",
    titulo: "Preparação da visita de campo",
    menu: "Preparar visita",
    descricao: "Organize o roteiro, as fichas e os elementos que precisam ser verificados presencialmente.",
    objetivo: "Evitar uma visita incompleta e padronizar o levantamento.",
    passos: ["Gerar a ficha de campo", "Definir o roteiro", "Preparar registros fotográficos e observações"],
    resultado: "Roteiro e ficha de visita prontos para uso.",
    tipoTela: "visita"
  },
  {
    numero: 11,
    grupo: "Avaliação em campo",
    titulo: "Atualização após a visita de campo",
    menu: "Atualizar levantamento",
    descricao: "Atualize a tabela de possibilidades com as constatações realizadas no local.",
    objetivo: "Transformar o levantamento preliminar em uma base confirmada.",
    passos: ["Revisar cada área", "Registrar divergências", "Confirmar ou substituir as técnicas"],
    resultado: "Tabela físico-urbana atualizada e validada em campo.",
    tipoTela: "tabela-revisao"
  },
  {
    numero: 12,
    grupo: "Construção do cenário",
    titulo: "Mapa do Cenário 1",
    menu: "Mapa do Cenário 1",
    descricao: "Represente no mapa as técnicas definidas para cada área selecionada.",
    objetivo: "Consolidar espacialmente a primeira proposta de intervenção.",
    passos: ["Confirmar áreas e técnicas", "Posicionar as intervenções", "Revisar a legenda do cenário"],
    resultado: "Mapa consolidado do Cenário 1.",
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
    passos: ["Revisar entradas", "Confirmar unidades", "Aceitar o volume calculado"],
    resultado: "Volume de referência confirmado para avaliação do cenário.",
    tipoTela: "resumo-volume"
  },
  {
    numero: 17,
    grupo: "Avaliação",
    titulo: "Avaliação do cenário",
    menu: "Resultado do cenário",
    descricao: "Compare a capacidade total das técnicas com o volume de chuva que precisa ser manejado.",
    objetivo: "Decidir se o cenário atende à demanda ou se precisa de novas técnicas e ajustes.",
    passos: ["Comparar os volumes", "Responder se a demanda foi atendida", "Finalizar ou criar nova iteração"],
    resultado: "Decisão final do cenário e resumo preparado para exportação.",
    tipoTela: "resultado"
  }
];
