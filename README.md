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
As etapas de chuva de projeto e comparação com demanda continuam fora desta entrega.

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
As demais etapas mantêm seus conteúdos e mapas ilustrativos.

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
8. Nas etapas 2 a 17, confirme ausência de mapa Leaflet e de requisições do módulo,
   CDN, mapas e Nominatim. Observe o Console em todos os testes.
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
