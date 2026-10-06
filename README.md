# SUDS-UP — Protótipo da primeira versão

Estrutura inicial do site que transforma o fluxo da dissertação em uma aplicação web orientada.

## Como executar

1. Abra a pasta `projeto-suds-up` no VS Code.
2. Instale a extensão **Live Server**, caso ainda não esteja instalada.
3. Clique com o botão direito em `index.html`.
4. Selecione **Open with Live Server**.

Não execute `etapa.js` com `node`, porque ele utiliza `document`, objeto fornecido pelo navegador.

## Estrutura

```text
SUDS-UP/
├── assets/
│   └── images/
│       ├── mapas/
│       └── tecnicas/
│       └── capa/
├── css/
│   ├── responsive.css
│   ├── style.css
│   └── variables.css
├── js/
│   ├── calculos/
│   │   ├── chuva-projeto.js
│   │   └── pre-dimensionamento.js
│   ├── dados-etapas.js
│   └── etapa.js
├── etapa.html
├── index.html
└── README.md
```

## Como abrir uma etapa diretamente

Use o parâmetro `numero` na URL:

```text
etapa.html?numero=1
etapa.html?numero=2
etapa.html?numero=17
```

O arquivo `etapa.html` é reutilizado nas 17 etapas. Os textos ficam centralizados em `js/dados-etapas.js`.

## Etapa 13 — Pré-dimensionamento

Abra `etapa.html?numero=13` pelo Live Server. Cadastre manualmente intervenções
para um único cenário: escolha uma das oito variantes, informe a área em m² e
confira profundidade em metros e fração de vazios. São aceitos ponto ou vírgula
decimal, sem separador de milhar. `0,30` significa 30% de vazios; zero é válido.

Os padrões são ajustáveis. Trocar a variante aplica seus padrões, com confirmação
se substituir valores personalizados. **Restaurar parâmetros padrão** atua apenas
no rascunho. **Editar** recupera os valores efetivamente salvos; **Cancelar edição**
mantém o registro anterior. A exclusão pede confirmação e não renumera os demais.
Várias intervenções da mesma variante são independentes.

O cálculo é **V = A × H × n**. A prévia não integra o total até a confirmação.
Entradas inválidas removem a prévia e indicam os campos a corrigir. O total soma
todas as intervenções, sem arredondamento intermediário; a exibição dos volumes
usa duas casas decimais em pt-BR. Não são calculadas infiltração, descarga ou chuva.
Pontos de alagamento e seleções do catálogo não viram intervenções automaticamente.

Os padrões estão em `js/dados/parametros-pre-dimensionamento.js`, associados aos IDs
do catálogo existente. Fonte informada na especificação: `SUDS-UP_Final.xlsx`, aba
“13 - Pré-dimensionamento”, B5:D12; dissertação de Fabiana Carvalho, páginas impressas
96–97, Etapa 13 e Tabela 18. Esses documentos não foram abertos nesta implementação.

**Divergência na especificação:** uma intervenção de 100 m² de cada variante, com
os oito padrões fornecidos, soma **533,60 m³**, e não 633,60 m³. Foram preservados
os parâmetros e a fórmula: 45 + 45 + 36 + 13,80 + 13,80 + 140 + 140 + 100.

A chave local exclusiva é `suds-up:etapa-13:cenario:v1`:

```json
{
  "versao": 1,
  "proximoNumero": 2,
  "intervencoes": [{
    "id": "UUID", "numero": 1, "variante": "jardim-permeavel",
    "area": 100, "profundidade": 1.5, "vazios": 0.3
  }]
}
```

Volumes são recalculados a partir das entradas ao restaurar. Dados incompatíveis
não são sobrescritos e falhas de gravação preservam o rascunho sem confirmar a
alteração. A chave da Etapa 1 não é modificada. Para recuperar o cenário, use o
mesmo navegador e a mesma origem, inclusive a porta do Live Server. Limpar os dados
de navegação pode apagar o cenário.

Conferência rápida:

1. Adicione jardim de chuva com área 100 e padrões: 45,00 m³.
2. Adicione trincheira com área 100 e padrões: 36,00 m³; total 81,00 m³.
3. Edite o jardim para profundidade 2,00 e vazios 0,40: prévia 80,00 m³.
   O total só muda após salvar. Cancele uma nova edição e confira o registro.
4. Exclua uma intervenção, adicione outra e recarregue: números não se repetem.
5. Confira erros de campos vazios/negativos e índice zero. Teste também no celular.

Testes isolados deste incremento:

```text
node tests/pre-dimensionamento.test.mjs
python -u tests/validar-pre-dimensionamento.py
```

O teste de navegador usa Playwright/Chromium já instalados e um perfil temporário.
Não acessa cenários reais; as consultas Nominatim da regressão são simuladas.
A Etapa 15 foi implementada no Lote 4, descrito ao final deste documento.
A comparação com a demanda confirmada e atual é realizada pela Etapa 17.

## Lote 1 — Etapas 4, 14, 16 e 17

As quatro telas mantêm `etapa.html?numero=N`, as orientações, o menu e a navegação.
Não foram adicionadas dependências, APIs ou cálculos de chuva.

### Etapa 4 — Condicionantes iniciais

Registra situação e observação/justificativa nos grupos de condicionantes urbanas
gerais, ambientais, sanitárias e socioeconômicas. As situações são **Não avaliada**,
**Sem restrição registrada**, **Requer atenção** e **Restrição relevante identificada**.
São registros do projetista, sem critérios internos ou aprovação automática.
O botão **Salvar condicionantes** confirma os dados; alterações ainda não salvas
permanecem apenas no formulário.

Chave: `suds-up:etapa-4:condicionantes:v1`. Estrutura: `{ versao: 1, grupos }`,
com as chaves `urbanas`, `ambientais`, `sanitarias`, `socioeconomicas`; cada grupo
contém `situacao` (um dos textos acima) e `observacao` (texto).

### Etapa 14 — Dados da bacia de contribuição

Os cinco campos são obrigatórios: área total e área vegetada em m², comprimento
do talvegue e cotas máxima/mínima em metros. Aceita vírgula ou ponto decimal,
sem separadores de milhar, usando o leitor decimal existente da Etapa 13.
Área total e talvegue devem ser positivos; área vegetada deve ficar entre zero
e área total. As cotas podem ser negativas, mas a máxima deve superar a mínima.
Todos os valores devem ser números finitos. Não há cálculo hidrológico nesta tela.

Chave: `suds-up:etapa-14:bacia:v1`. Estrutura:

```text
{ versao: 1, areaTotal, areaVegetada, comprimentoTalvegue, cotaMaxima, cotaMinima }
```

**Salvar dados da bacia** confirma os valores numéricos sem arredondá-los.
**Limpar rascunho** esvazia os campos sem apagar o registro confirmado, que volta
ao recarregar ou retornar à etapa. Os dois formulários restauram dados na mesma
origem/navegador e preservam rascunhos em falhas de gravação. Registros incompatíveis
bloqueiam a gravação; alterações em outra aba exigem recarregar antes de salvar.

### Contrato da Etapa 15 e painel da Etapa 16

A Etapa 15 produz dados reais a partir da bacia confirmada e dos parâmetros do
projetista. Mantém o contrato mínimo na chave `suds-up:etapa-15:chuva-projeto:v1`:

```text
{ versao: 1, volumeChuvaAManejar: <número finito não negativo, em m³> }
```

`volumeChuvaAManejar` deve ser um número JSON, não texto formatado. O contrato
aceita campos extras de rastreabilidade. O Lote 4 compara o snapshot da bacia com
a Etapa 14 atual antes de consumir a demanda. Resultados sem snapshot ou com
origem alterada ficam pendentes de recálculo, preservados no armazenamento.
Os exemplos de volume usados nos testes ficam exclusivamente em contextos isolados.

A Etapa 16 apenas lê esse contrato. Sem registro, mostra **Volume ainda não
calculado** e o link **Revisar chuva de projeto** para a Etapa 15. Dados incompatíveis
ou armazenamento bloqueado são informados sem apresentar zero como substituto.
Um volume válido é exibido em pt-BR com duas casas decimais; o registro não é alterado.

### Etapa 17 — Avaliação do cenário

A capacidade vem da chave existente `suds-up:etapa-13:cenario:v1`, validada pelo
módulo da Etapa 13. O total é recalculado pela mesma função
`calcularTotalIntervencoes`, ignorando eventuais volumes/total armazenados. Não há
nova chave de capacidade nem mudança do formato da Etapa 13.

Com intervenções confirmadas e demanda válida, compara os valores completos:
capacidade ≥ demanda significa **O cenário atende à demanda.**; capacidade menor
significa **O cenário não atende integralmente à demanda.** O percentual é
`(capacidade / demanda) × 100`, sem limitar valores acima de 100%. Só a apresentação
é arredondada. Se a demanda explicitamente calculada for zero, a comparação ainda
é possível e o percentual aparece como **não se aplica**, evitando divisão por zero.
Um percentual que exceda a faixa numérica é informado sem exibir infinito.

Ausência de cenário, coleção vazia, ausência da chuva, incompatibilidade e falha
de leitura não geram avaliação fictícia. Capacidade zero de intervenções existentes
é distinguida de ausência de intervenções. Quando não atende, há links para as
Etapas 9 e 13; a chuva também pode ser revisada. Quando atende, **Finalizar cenário**
confirma apenas a visualização atual: não persiste outra avaliação, não cria projetos
e não gera PDF. Alterações em outra aba atualizam os painéis e removem a finalização
visual anterior. As demais etapas fora do escopo mantêm seu estado atual de protótipo.

### Testes do Lote 1

```text
node tests/lote-1.test.mjs
python -u tests/validar-lote-1.py
```

O teste de navegador requer o Playwright/Chromium já utilizado pelo projeto;
usa origem e contexto isolados. Cobre salvamento/restauração, erros, textos seguros,
painéis com e sem resultados, comparação e layouts de desktop, tablet e celular.
As regressões existentes continuam em `tests/validar-pontos.py`,
`tests/pre-dimensionamento.test.mjs`, `tests/validar-pre-dimensionamento.py`
e `tests/validar-tecnicas.py`.

## Lote 2 — Pré-campo, visita e decisão por área

As Etapas **8 → 10 → 11** utilizam `etapa.html` e o catálogo existente
`TECNICAS_SUDS`. Não há recomendação automática: as alternativas e a escolha
final pertencem ao projetista. Os dados confirmados são recuperados ao recarregar
ou navegar na mesma origem (protocolo, domínio e porta). Rascunhos não são salvos
automaticamente, e não existem mapas, uploads ou exportação PDF neste lote.

### Etapa 8 — Possibilidades preliminares

Cadastre manualmente cada área candidata, com identificação e área disponível
obrigatórias. Dimensões, declividade, distâncias e área de contribuição são
opcionais; vazio é `null`, diferente de zero. Largura/comprimento preenchidos
devem ser positivos; declividade/distâncias/contribuição aceitam zero. A leitura
decimal reutiliza o leitor estrito da Etapa 13, aceitando vírgula ou ponto, sem
separadores de milhar nem sufixos inválidos. Nenhum cálculo da Etapa 13 foi alterado.

Permeabilidade, uso do solo, interferências, restrições e observações são textos
livres. As possibilidades são seleções múltiplas de variantes reais do catálogo,
com links contextuais para as restrições da Etapa 7. Não são aplicados critérios
técnicos de viabilidade nem categorias de solo automáticas.

**Adicionar área**, **Editar**, **Salvar alterações** e **Excluir** confirmam as
operações na chave `suds-up:etapa-8:possibilidades:v1`. Limpar/cancelar afeta apenas
o rascunho. A exclusão exige confirmação e não renumera as demais áreas.

```json
{
  "versao": 1,
  "proximoNumero": 2,
  "areas": [{
    "id": "UUID", "numero": 1,
    "identificacao": "Área candidata", "areaDisponivel": 100.25,
    "largura": null, "comprimento": null, "declividade": null,
    "permeabilidade": "", "distanciaLencol": null,
    "distanciaRocha": null, "distanciaFundacoes": null,
    "usoSolo": "", "redeAgua": "", "redeEsgoto": "", "drenagem": "",
    "postes": "", "metro": "", "outrasInterferencias": "",
    "areaContribuicao": null, "restricoes": "",
    "possiveis": ["bacia-permeavel", "jardim-permeavel"], "observacoes": ""
  }]
}
```

O ID interno permanece estável em edições. `proximoNumero` é um inteiro seguro
crescente e não volta após exclusões. Os números não são usados como vínculo.
`possiveis` contém IDs únicos de variantes, que também identificam sua técnica
no catálogo original. Os nomes são resolvidos na apresentação, sem segundo catálogo.

### Etapa 10 — Registro da visita de campo

A tela lê exclusivamente as áreas confirmadas na Etapa 8 e apresenta o resumo
pré-campo. Não permite criar áreas. Sem áreas, informa o estado vazio e oferece
retorno à Etapa 8. Cada área pode ter uma única vistoria atual: salvar novamente
atualiza o mesmo vínculo, sem duplicar registros.

Postes, poços de visita e pavimentação histórica admitem exatamente `Não avaliado`,
`Sim` e `Não`. Fluxo de pedestres e observações são textos livres. Largura útil
da calçada é opcional, finita e maior ou igual a zero quando preenchida.

Chave: `suds-up:etapa-10:visita-campo:v1`.

```json
{
  "versao": 1,
  "vistorias": [{
    "areaId": "UUID",
    "postes": "Não avaliado", "pocosVisita": "Não avaliado",
    "pavimentacaoHistorica": "Não avaliado", "fluxoPedestres": "",
    "larguraCalcada": null, "observacoes": ""
  }]
}
```

### Etapa 11 — Revisão pós-campo e escolha do SUDS

Três blocos distinguem os dados pré-campo, a visita de campo e a decisão editável.
A ausência de vistoria é informada; não impede registrar uma decisão. Os dados
das Etapas 8 e 10 aparecem como resumos completos, sem redigitação ou alteração
silenciosa, com links para revisar as fontes.

Na primeira revisão de uma área, as possibilidades preliminares preenchem apenas
o rascunho revisado. Nenhuma técnica final é selecionada automaticamente. Uma
decisão já confirmada restaura suas próprias alternativas, mesmo que o pré-campo
tenha sido editado posteriormente.

Chave: `suds-up:etapa-11:revisao-campo:v1`.

```json
{
  "versao": 1,
  "decisoes": [{
    "areaId": "UUID", "restricaoProjetual": "",
    "possiveis": ["jardim-permeavel"], "selecionado": null,
    "motivo": "", "observacoes": ""
  }]
}
```

`possiveis` contém variantes revisadas. `selecionado` é `null` ou um ID pertencente
a esse conjunto. Quando preenchido, exige `motivo` não vazio. Remover uma variante
dos possíveis não apaga silenciosamente a escolha final: o formulário solicita
correção ao salvar. A ausência de escolha final é válida.

### Preservação dos dados e arquitetura

`js/dados/lote-2.js` concentra contratos, validações e operações imutáveis.
`js/dados/armazenamento-lote-2.js` reutiliza a leitura defensiva do Lote 1 e
verifica também as fontes antes de salvar: 10 depende de 8; 11 depende de 8 e 10.
Falhas de leitura, JSON inválido ou versão incompatível bloqueiam a sobrescrita.
Falhas de gravação preservam o rascunho e os registros confirmados. Alterações
em outra aba exibem aviso e exigem recarregar antes de salvar. A comparação
otimista segue o padrão existente; localStorage não oferece transações entre abas.

Excluir uma área na Etapa 8 **não exclui** suas vistorias ou decisões. Registros
órfãos permanecem no armazenamento, com avisos por tipo e quantidade, sem exibir IDs nas telas seguintes. Salvar
outro registro mantém os órfãos. Não há ferramenta de migração, exclusão de órfãos
ou recuperação automática de dados incompatíveis neste lote.

As três interfaces compartilham apenas componentes DOM em `js/lote-2-interface.js`,
além dos dados/persistência. Textos livres entram por `textContent`/`value`.
`css/lote-2.css` limita estilos a `.lote-2`; cards e resumos substituem tabelas
largas. Controles nativos, labels, fieldsets, erros associados, foco no primeiro
campo inválido e regiões de status permitem operação por teclado.

### Integrações e limites

O cadastro manual continua disponível. O Lote 3 acrescentou o aproveitamento
explícito **6 → 8**, a representação **8 + 6 → 9** e a consolidação **11 + 6 → 12**,
documentados abaixo. Os cálculos e o contrato da Etapa 13 permanecem inalterados.
As Etapas 5 e 15 não foram implementadas por esses lotes.

### Testes do Lote 2

```text
node tests/lote-2.test.mjs
python -u tests/validar-lote-2.py
```

O teste de lógica verifica entradas, catálogo, CRUD, vínculos, órfãos e persistência
isolada. O teste de navegador usa Playwright/Chromium já instalados e uma origem
temporária: percorre o fluxo completo em 1440, 900 e 390 px, valida restauração,
teclado, segurança textual, console, JSON incompatível, falhas e concorrência.
Não acessa registros reais do usuário. As suítes anteriores do Lote 1,
pré-dimensionamento, pontos e técnicas continuam como regressões do projeto.

## Lote 3 — Delimitações manuais e mapas do levantamento

As Etapas **2, 6, 9 e 12** possuem mapas Leaflet 1.9.4 com OpenStreetMap na mesma
`etapa.html`. A infraestrutura `js/mapas/lote-3-mapa.js` é exclusiva dessas novas
telas: a implementação da Etapa 1 não foi refatorada. Não há Leaflet.Draw,
outra biblioteca geográfica, framework, backend ou nova página HTML.

### Etapa 2 — Bacia de contribuição

Use **Iniciar / refazer desenho**, clique na ordem dos vértices e escolha
**Fechar polígono**. É possível desfazer o último vértice, cancelar o rascunho,
editar/refazer uma delimitação confirmada ou excluí-la após confirmação.
Pelo teclado, use as setas para mover o mapa e **Adicionar vértice no centro do
mapa**, ou informe latitude/longitude nos campos e use **Adicionar coordenadas**.
Os campos aceitam vírgula ou ponto decimal pelo leitor estrito já utilizado no projeto.

Fechar calcula uma prévia em m² e hectares, mas **Salvar delimitação** é a ação
que confirma a bacia no navegador. Cancelar mantém a geometria anterior. Não há
delimitação por relevo, consulta de altitude nem análise hidrológica automática.

Chave: `suds-up:etapa-2:bacia:v1`.

```json
{
  "versao": 1,
  "vertices": [
    { "latitude": -22.907, "longitude": -43.174 },
    { "latitude": -22.907, "longitude": -43.173 },
    { "latitude": -22.906, "longitude": -43.173 }
  ],
  "areaM2": 5694.654534580061
}
```

O valor de área é derivado: a aplicação sempre recalcula o resultado do modelo
a partir dos vértices. O último vértice não
repete o primeiro: o fechamento é implícito. Latitude/longitude precisam ser
finitas e estar em [-90, 90]/[-180, 180]. São exigidos pelo menos três vértices
distintos e área finita positiva. Contornos cruzados, com contatos não adjacentes
ou arestas sobrepostas são rejeitados, evitando uma área ambígua.

### Algoritmo de área e precisão

`calcularArea` em `js/dados/lote-3.js` usa uma aproximação esférica de
Chamberlain–Duquette (JPL Publication 07-03, 2007), também referenciada pela
[implementação de área do Turf](https://github.com/Turfjs/turf/blob/master/packages/turf-area/index.ts).
Nenhuma dependência do Turf foi adicionada. Para latitudes φ e longitudes λ
em radianos, aplica:

```text
A = abs(R² / 2 × soma((λ[i+1] − λ[i]) × (sin(φ[i]) + sin(φ[i+1]))))
R = 6.371.008,8 m
hectares = A / 10.000
```

A implementação desenrola longitudes no antimeridiano e subtrai uma constante
dos senos para reduzir cancelamento numérico em áreas pequenas. Esse termo
constante se anula no anel fechado. Coordenadas e área usam a precisão de
`Number`; somente os textos exibidos são arredondados. Pixels, zoom e projeção
visual do mapa não entram no cálculo. A área armazenada é um valor derivado:
leituras e importações recalculam pela geometria, sem confiar em um cache antigo.
O recálculo em memória não regrava silenciosamente a chave.

É uma estimativa esférica para polígonos locais simples, sem furos ou múltiplos
anéis. Polos e extensão longitudinal igual ou superior a 180° não são suportados.
Não é medição cadastral elipsoidal nem área corrigida pela inclinação do terreno.

### Integração 2 → 14

**Usar área delimitada na Etapa 2** relê a bacia válida e preenche somente o
rascunho de **Área total de contribuição**. Área vegetada, talvegue e cotas são
mantidos. O projetista precisa salvar explicitamente a Etapa 14. Alterar/excluir
a bacia da Etapa 2 não modifica a Etapa 14; esta continua aceitando entrada manual.

### Etapa 6 — Espaços livres

O mesmo editor manual permite vários espaços. Cada um possui identificação
obrigatória, contorno, área calculada e observação opcional. Os cards permitem
localizar no mapa, editar identificação/observação, refazer geometria e excluir.
IDs e números permanecem estáveis em edição; exclusões não reutilizam números.
A seleção é do projetista e não aplica automaticamente as regras da Etapa 7.

Chave: `suds-up:etapa-6:espacos-livres:v1`.

```text
{
  versao: 1,
  proximoNumero: 2,
  espacos: [{
    id: "UUID", numero: 1, identificacao: "Praça A",
    vertices: [{ latitude, longitude }, ...],
    areaM2: número recalculado, observacao: ""
  }]
}
```

`armazenamento-lote-3.js` protege leitura, gravação e exclusão: estruturas
incompatíveis não são sobrescritas; falhas preservam o rascunho; mudanças em
outra aba exigem recarregar antes de confirmar. A comparação otimista segue o
padrão existente, sem prometer transações que localStorage não oferece.

### Integração 6 → 8

Na Etapa 8, selecione um espaço confirmado e use **Adicionar espaço da Etapa 6**.
A ação prepara um novo rascunho com identificação, área recalculada e o vínculo
opcional `espacoLivreId`. Complete as demais informações e confirme em
**Adicionar área**: só então será criado um registro com **ID próprio da Etapa 8**.
Reimportar um espaço já aproveitado é bloqueado com aviso para editar a área existente.
Se a origem mudar entre a cópia e a confirmação, a importação é bloqueada e o
rascunho é preservado.

Registros manuais antigos, sem `espacoLivreId`, continuam válidos, sem migração.
Editar uma área vinculada conserva esse vínculo, mas não atualiza automaticamente
a área disponível copiada. Excluir um espaço da Etapa 6 mantém o levantamento e
as decisões; a Etapa 8 informa que a geometria de origem não está mais disponível.

Uma área manual já existente pode receber geometria sem ser excluída ou recriada.
No seu card, selecione um espaço confirmado e acione **Associar a espaço da
Etapa 6**. Após confirmação, somente `espacoLivreId` é acrescentado: ID, número,
identificação, área disponível, dimensões, possibilidades, observações e demais
campos existentes são preservados. Não são copiados valores do espaço nessa ação.
**Remover associação espacial** também exige confirmação e remove somente esse
vínculo; mantém a área, a geometria da Etapa 6 e os registros posteriores intactos.

Nesta versão, um espaço pode estar associado a no máximo uma área da Etapa 8.
Essa é uma decisão arquitetural, não uma regra metodológica: tentativas de usar
um espaço ocupado são bloqueadas com identificação da área que já o utiliza.
A importação para criar **uma nova área** continua disponível separadamente.
Alterações em outra aba ou falhas de armazenamento não confirmam a associação.

### Etapas 9 e 12 — consultas sem novas chaves

A Etapa 9 é o mapa das **possibilidades preliminares**: responde o que ainda pode
ser utilizado em cada área. Lê geometria da Etapa 6 e possibilidades da Etapa 8.
Polígonos usam
texto/legenda além de cor: traço contínuo para alternativas com infiltração,
tracejado para sem infiltração e pontilhado para conjunto misto. Clicar abre resumo;
o mesmo conteúdo está abaixo do mapa, com botão nativo para localizar cada área.
Áreas manuais ou com origem excluída aparecem em **Áreas sem localização no mapa**.
Popup e resumo mostram identificação, área disponível e todas as variantes com
seus regimes. Nenhuma área ou alternativa é ocultada por não possuir geometria.
As áreas sem localização recebem orientação e links **Revisar espaços livres**
e **Associar área**. Após associar pela Etapa 8, passam a ser representadas no mapa.
Sem áreas com geometria, a Etapa 9 apresenta orientação e links para as Etapas 6
e 8, sem mapa vazio nem legenda dos regimes. Com geometria, exibe mapa e legenda.

A Etapa 12 é o mapa das **técnicas definitivas do Cenário 1**: responde o que foi
escolhido. Relaciona Etapas 6/8/11 e representa apenas escolhas finais com geometria
disponível. Cada variante do catálogo original recebe uma cor estável, independente
da ordem das áreas e das decisões. Nomes no popup, rótulo e resumo complementam a cor.
A legenda **Técnicas adotadas no Cenário 1** agrupa variantes presentes no mapa e
conta suas áreas sem duplicar entradas da mesma variante. Não utiliza a legenda
agregada de alternativas da Etapa 9. Sem técnica final com geometria, informa o
estado vazio com links para as Etapas 6, 8 e 11, sem mapa nem legenda vazios;
decisões sem geometria permanecem nas listas abaixo. Nas duas consultas, o Leaflet
só é inicializado quando há polígonos a representar. O enquadramento automático
abrange todas as geometrias, com zoom limitado para áreas pequenas; mudanças das
fontes alternam entre orientação e mapa sem alterar os registros.

Popup e resumo mostram identificação, técnica/variante, regime, área disponível
da Etapa 8 quando existente, motivo, restrição projetual e observações pós-campo.
Há listas de **Intervenções sem localização no mapa** e **Áreas sem
técnica definida**; decisões preservadas após exclusão de área continuam visíveis.
Há orientação e links para associar as áreas existentes; decisões cuja área foi
excluída recebem orientação para revisar os registros preservados.
Ausência de escolha não produz uma solução automática.

Ambas as consultas atualizam as fontes quando outra aba muda os registros e não
criam chaves próprias, cópias persistidas ou intervenções. **Prosseguir para o
pré-dimensionamento** é apenas navegação: a Etapa 13 exige seu próprio cadastro
confirmado e mantém seus cálculos intactos.

### Limitações e validação do Lote 3

Leaflet e tiles exigem rede. Falhas são informadas sem bloquear os registros,
resumos ou a entrada alternativa de vértices por coordenadas. Há atribuição OSM,
zoom, navegação por teclado, foco visível e mensagens de status. O módulo não
consulta Nominatim. Não há IA, shapefile, importação GeoJSON/KML, curvas de nível
automáticas, altitude automática ou delimitação hidrológica automática.
As Etapas 5 e 15 continuam fora deste lote.

```text
node tests/lote-3.test.mjs
python -u tests/validar-lote-3.py
```

O teste puro compara a área a um retângulo esférico analítico e cobre contratos,
CRUD, concorrência, recálculo, importação, associação/remoção e consolidação.
Verifica também contagens e cores estáveis da legenda por variante final.
O teste de navegador usa
Leaflet real e tiles controlados em perfil temporário, percorre as integrações em
1440, 900 e 390 px e exercita falhas de Leaflet/tiles sem consultar Nominatim.
Inclui preservação integral dos campos ao associar/remover, bloqueio de espaço
ocupado, cancelamento, recarga, estilos por regime, popups completos e legenda
dinâmica com técnicas diferentes, repetidas e sem geometria.
As suítes anteriores dos Lotes 1/2, pontos, técnicas e pré-dimensionamento permanecem
como regressões. Não há teste manual com leitor de tela nem validação cadastral
da precisão geográfica.

## Mapa interativo da Etapa 1

Abra `index.html` com Live Server e selecione **Iniciar estudo**, ou acesse
`etapa.html?numero=1` no mesmo servidor. O mapa começa no Rio de Janeiro.
Busque um endereço pelo botão **Buscar endereço** ou clique no mapa para selecionar
uma posição provisória (marcador laranja com “?”). Confira o endereço ou referência,
preencha a descrição opcional e clique em **Adicionar ponto de alagamento**.
Ao clicar no mapa ou selecionar seu centro, o endereço anterior é limpo e uma
sugestão é consultada após uma pausa de 400 ms. Confira a rua e o número; o serviço
pode retornar o endereço de um objeto próximo. As coordenadas selecionadas não mudam.
O campo continua editável, inclusive em caso de falha, e uma referência manual
válida permite cadastrar sem esperar a consulta. Respostas antigas não substituem
texto digitado, outra seleção ou operações de edição, cancelamento e salvamento.
Somente essa confirmação cadastra o ponto. Latitude e longitude são de leitura;
o armazenamento mantém a precisão original das coordenadas.

Cada ponto cadastrado recebe um marcador azul numerado e uma linha na tabela.
**Localizar** destaca o marcador; **Editar** permite corrigir endereço, descrição
e posição; **Cancelar edição** preserva o registro anterior. **Excluir** pede
confirmação e não renumera os demais pontos. Para selecionar pelo teclado, mova
o mapa com as setas e use **Selecionar centro do mapa**.

Os pontos são salvos neste navegador. Limpar os dados de navegação pode apagar o levantamento.
Use a mesma origem (protocolo, domínio e porta) para recuperá-los no Live Server.
A chave exclusiva é `suds-up:etapa-1:pontos-alagamento:v1`, com estrutura:

```json
{
  "versao": 1,
  "proximoNumero": 2,
  "pontos": [{
    "id": "UUID", "numero": 1, "endereco": "Referência do local",
    "latitude": -22.9068, "longitude": -43.1729, "descricao": ""
  }]
}
```

`js/dados/pontos-alagamento.js` centraliza validação, leitura e gravação.
`js/mapas/etapa-01-levantamento.js` mantém a coleção e sincroniza tabela e mapa.
O contador permanece crescente após exclusões. Falhas de gravação mantêm os
campos para nova tentativa, sem confirmar a alteração. Dados incompatíveis ou
ilegíveis não são sobrescritos; a página informa o problema. Mudanças feitas em
outra aba exigem recarregar antes de salvar. Existe apenas um levantamento local.

`js/etapa.js` cria o card e importa `js/mapas/etapa-01-mapa.js` somente na Etapa 1.
O módulo carrega Leaflet 1.9.4 (CSS e JavaScript via CDN), os mapas do OpenStreetMap
e consulta o Nominatim. É necessário acesso à internet. Não há instalação,
compilação ou servidor de aplicação; os caminhos relativos funcionam no GitHub Pages.
As Etapas 2, 6, 9 e 12 usam a infraestrutura cartográfica independente do Lote 3.

A busca textual acontece somente pelo botão, sem autocomplete. Ela compartilha
com a consulta reversa uma fila com intervalo mínimo de 1,1 segundo entre inícios
e uma única requisição em andamento. Apenas a última solicitação pendente é mantida.
Resultados são reutilizados no cache da aba (`sessionStorage`), com alternativa
em memória: `suds-up:enderecos:v1` para buscas e `suds-up:enderecos-reversos:v1`
para posições exatas. Falhas de conexão, timeout e HTTP 429 não geram novas tentativas
automáticas. Não há consultas ao restaurar, localizar, abrir uma edição, mover ou
ampliar o mapa. A busca textual aproveita o endereço recebido sem consulta reversa.

Consulte a [política do Nominatim](https://operations.osmfoundation.org/policies/nominatim/):
o limite de uma requisição por segundo é agregado por aplicação. O controle deste
protótipo estático vale por aba e não coordena usuários simultâneos; para ampliar
o uso público, será necessário um serviço que controle o tráfego agregado ou um
provedor adequado. O navegador envia o Referer HTTP(S) para identificar a origem.
Os endpoints `search` e `reverse` são usados em `js/mapas/etapa-01-geocodificacao.js`.
A consulta reversa usa os [parâmetros documentados pelo Nominatim](https://nominatim.org/release-docs/latest/api/Reverse/).
Observe também a
[política de mapas do OSM](https://operations.osmfoundation.org/policies/tiles/).

### Roteiro de testes no navegador

1. Verifique o centro no Rio, zoom, movimentação e atribuição OpenStreetMap.
2. Selecione e adicione três pontos: confira os três marcadores e linhas da tabela.
   Um novo clique deve criar apenas um rascunho, sem adicionar outro registro.
3. Digite um endereço: não deve haver requisição enquanto digita ou ao usar Enter
   no campo. Acione o botão, confira a posição provisória e adicione explicitamente.
4. Repita a busca variando maiúsculas/espaços: o painel Network não deve registrar
   outra chamada ao Nominatim. Consultas distintas aguardam o intervalo de 1,1 segundo.
5. Teste campo vazio, endereço inexistente e modo Offline do DevTools durante a busca.
   Verifique as mensagens e a possibilidade de tentar novamente após restabelecer a conexão.
6. Recarregue sem internet: a falha do mapa deve ser informada, sem impedir a navegação.
7. Confira larguras de celular e desktop, atribuição visível e modal de orientações
   acima do mapa. Navegue pelas 17 etapas, pelos botões anterior/próxima e volte à capa.
8. Fora da Etapa 1, confirme ausência de requisições ao módulo da Etapa 1 e ao
   Nominatim. As Etapas 2, 6, 9 e 12 também usam Leaflet/OSM pelo Lote 3;
   nas demais etapas não há mapa Leaflet. Observe o Console em todos os testes.
9. Localize e edite um ponto. Cancele outra edição e confira os dados anteriores.
   Exclua um ponto, recarregue e adicione outro: o número excluído não deve voltar.
10. Avance à Etapa 2, retorne e depois feche/reabra o site na mesma origem:
    os registros confirmados devem permanecer. Rascunhos não são persistidos.
11. Clique uma vez no mapa e aguarde a sugestão. Confira rua/número e corrija se
    necessário. Digite uma referência durante outra consulta: ela deve permanecer.
    A consulta real depende da cobertura e disponibilidade do Nominatim.

Teste automatizado deste incremento: `python -u tests/validar-pontos.py`, com
Playwright e Chromium instalados. Usa um perfil temporário e respostas de busca
simuladas (busca e reversa, incluindo os cenários de `tests/validar_reversa.py`)
para não acessar levantamentos existentes nem enviar endereços de teste
ao Nominatim. O carregamento do Leaflet ainda precisa de internet.

O mapa serve exclusivamente para localização e marcação manual. Não calcula
bacia de contribuição, altitude, declividade, curvas de nível ou caminho da água.

## Lote 4 — Inventário técnico e chuva de projeto (06/10/2026)

### Etapa 5 — Inventário manual

Registra **Hidrografia**, **Rede de drenagem**, **Infraestrutura existente**,
**Uso do solo** e **Patrimônio**. Categoria, identificação e fonte/órgão são
obrigatórios. Referência temporal e observações são livres; a lacuna de informação
é indicada pelo projetista. Não interpreta bases nem classifica aptidão para SUDS.

Adicionar, editar e excluir (com confirmação) são ações explícitas. Cancelar
afeta somente o rascunho. Edição conserva ID/número; exclusão não reutiliza números.
Reload restaura os registros confirmados na mesma origem/navegador.

Chave: `suds-up:etapa-5:mapeamento-tecnico:v1`.

```text
{
  versao: 1,
  proximoNumero: inteiro positivo crescente,
  registros: [{ id, numero, categoria, identificacao, fonte,
                referenciaTemporal, observacoes, lacuna: boolean }]
}
```

### Etapa 15 — Origem, metodologia e unidades

Lê exclusivamente os cinco números **confirmados** da Etapa 14. Sem bacia válida,
não calcula nem assume volume zero. Dados de origem são apresentados como texto,
não como novas entradas manuais. Coeficientes, TR e runoff alimentam uma prévia;
somente **Confirmar chuva de projeto** persiste o resultado. Rascunho inválido
ou não salvo não modifica a demanda usada nas Etapas 16 e 17.

As funções puras estão em `js/calculos/chuva-projeto.js`:

```text
P = areaVegetada / areaTotal                            [fração 0–1]
L_km = comprimentoTalvegue / 1000                       [km]
S = (cotaMaxima - cotaMinima) / comprimentoTalvegue      [m/m]
tcMin = 16 * L_km / ((1.05 - 0.2 * P) * (100 * S)^0.04) [min]
tcHoras = tcMin / 60                                   [h]
i = a * TR^b / (tcMin + c)^d                            [mm/h]
alturaMm = i * tcHoras                                 [mm]
alturaM = alturaMm / 1000                               [m]
areaUrbana = areaTotal - areaVegetada                   [m²]
volumeChuvaAManejar = runoff * alturaM * areaUrbana      [m³]
```

A implementação da relação IDF segue a Equação 3 da dissertação:
i = a × TR^b / (t + c)^d.

A fórmula encontrada na planilha original diverge dessa equação e não foi utilizada como fonte normativa para o site.

Nenhuma etapa do cálculo arredonda valores. Números são armazenados com a precisão
de `Number`; somente a apresentação usa pt-BR, em geral com duas casas decimais.
Frações, declividade, km e altura em metros mostram precisão adicional para auditoria.
Entradas usam o leitor decimal estrito já adotado na Etapa 13, sem transformar
vazio em zero nem aceitar parcialmente textos. Resultados intermediários não
finitos, overflow e `tcMin + c <= 0` impedem confirmação.

**TR** inicia em 10 anos e deve ser finito e positivo. **Runoff** inicia em 0,40,
é editável entre 0 e 1 e não é reiniciado pela troca de posto ou modo. Área urbana
zero e runoff zero produzem demanda zero válida, sem confundi-la com ausência.

### Postos cadastrados e modo manual

`js/dados/postos-pluviometricos.js` conserva exatamente os valores fornecidos:

| Posto | a | b | c | d | Fonte |
|---|---:|---:|---:|---:|---|
| Santa Cruz | 711.3 | 0.18 | 7 | 0.687 | PCRJ - Cohidro |
| Campo Grande | 891.6 | 0.18 | 14 | 0.689 | PCRJ - Cohidro |
| Mendanha | 843.7 | 0.17 | 12 | 0.698 | PCRJ - Cohidro |
| Bangu | 1208 | 0.17 | 14 | 0.788 | PCRJ - Cohidro |
| Jardim Botânico | 1239 | 0.15 | 20 | 0.74 | Ulysses Alcântara |
| Capela Mayrink | 921.3 | 0.16 | 15.4 | 0.673 | Rio Águas (2003) |
| Via 11 | 1423 | 0.19 | 14.5 | 0.796 | Rio Águas (2005) |
| Sabóia Lima | 1782 | 0.17 | 16.6 | 0.841 | Rio Águas (2006) |
| Benfica | 7032 | 0.15 | 26.6 | 0.141 | Rio Águas (2006) |
| Realengo | 1164 | 0.14 | 6.96 | 0.769 | Rio Águas (2006) |
| Irajá | 5986 | 0.15 | 29.7 | 1.05 | Rio Águas (2007) |
| Eletrobrás - Taquara | 1660 | 0.15 | 14.7 | 0.841 | Rio Águas (2009) |

Nenhum posto é selecionado automaticamente. No modo cadastrado, identificação,
fonte e coeficientes são visíveis e somente leitura. O modo manual exige nome,
fonte e a/b/c/d finitos (a positivo) e utiliza **a mesma função IDF**. Não são
inventadas faixas técnicas adicionais para b/c/d. Seleção e aplicabilidade
dos parâmetros permanecem responsabilidade do projetista.

### Persistência, rastreabilidade e integração 14 → 15 → 16 → 17

A chave `suds-up:etapa-15:chuva-projeto:v1` mantém `versao: 1` e
`volumeChuvaAManejar` finito não negativo, incluindo zero. O produtor acrescenta:

```text
{
  versao: 1, metodo: "dissertacao-eq3-v1",
  modo: "posto" | "manual", postoId: string | null, nome, fonte,
  a, b, c, d, TR, runoff,
  baciaUtilizada: { versao: 1, areaTotal, areaVegetada,
                   comprimentoTalvegue, cotaMaxima, cotaMinima },
  P, L_km, S, tcMin, tcHoras, intensidade,
  alturaMm, alturaM, areaUrbana, volumeChuvaAManejar
}
```

O método novo tem seus resultados conferidos por recálculo durante a validação.
`lerChuvaAtual` compõe os leitores existentes e compara numericamente os cinco
campos do snapshot com a bacia confirmada atual. Mudanças físicas, origem ausente
ou incompatível tornam o resultado **desatualizado**. O registro original não é
apagado. Legados com apenas o contrato mínimo são lidos e preservados, mas sem
snapshot não podem ser tratados como demanda atual; é necessária confirmação
explícita na Etapa 15. Não há migração silenciosa.

A Etapa 16 informa recálculo necessário, com link para 15. A Etapa 17 fica com
**Avaliação pendente**, sem aprovação/reprovação baseada na demanda antiga.
Com resultado válido e atual, mantém capacidade recalculada da Etapa 13,
`capacidade >= demanda` e `capacidade / demanda × 100`; demanda zero mostra
percentual **Não se aplica**. Os painéis permanecem somente leitura e acompanham
alterações relevantes em outra aba ou retorno pelo histórico.

As confirmações de 5/15 reutilizam `abrirRegistro` do Lote 1: ausência, dados
incompatíveis, bloqueio de leitura/escrita e alteração concorrente são distintos.
Em falha, o rascunho e o registro antigo são preservados. A Etapa 15 também relê
a bacia antes da prévia/confirmação, impedindo salvar com origem alterada enquanto
o formulário estava aberto. Não é preciso apagar resultados em `bacia-interface.js`.

### Validação do Lote 4

```text
node tests/lote-4.test.mjs
python -u tests/validar-lote-4.py
```

Referência: área total 1039587 m², área vegetada 276339 m², talvegue 1292,2 m,
cotas 209,9/2,84 m, Jardim Botânico, TR 10 e runoff 0,40. Resultados:
P = 0,2658161366004; S ≈ 0,1602383531961 m/m; tc ≈ 18,5624377391 min;
i ≈ 117,3031274299 mm/h; altura ≈ 36,2905333253 mm; área urbana 763248 m²;
volume **11079,470791775657 m³**, apresentado como **11.079,47 m³**.
O teste rejeita a intensidade divergente de aproximadamente 124,53 mm/h.

Os testes cobrem precisão, unidades, zeros, coeficientes, overflow, contratos,
CRUD/IDs/numeração, armazenamento bloqueado/incompatível, concorrência, modos IDF,
prévia/confirmação/reload, snapshot e comparação menor/igual/maior. O navegador
produz o fluxo normal pela UI, sem injetar resultados. Fixtures de falha ficam
exclusivamente nos perfis descartáveis. Larguras: 1440, 900 e 390 px, com teclado.
As regressões dos Lotes 1–3, pré-dimensionamento e técnicas permanecem executáveis;
as fixtures de chuva válida do Lote 1 agora identificam a bacia utilizada.

### Limitações deste lote

Inventário documental manual, sem upload, mapas técnicos automáticos ou seleção
automática de posto. Nenhuma API foi adicionada. O cálculo usa as equações e os
coeficientes fornecidos, sem verificação automática de validade regional da IDF.
Armazenamento local depende da origem/navegador. Relatório final da Etapa 17,
impressão/PDF, exportações geoespaciais e demais ampliações ficam fora deste lote.
