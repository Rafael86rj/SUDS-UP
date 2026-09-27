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

## Mapa interativo da Etapa 1

Abra `index.html` com Live Server e selecione **Iniciar estudo**, ou acesse
`etapa.html?numero=1` no mesmo servidor. O mapa começa no Rio de Janeiro.
Busque um endereço pelo botão **Buscar endereço** e clique no mapa para marcar
manualmente um ponto de alagamento. Cada novo clique move o único marcador e
atualiza Latitude e Longitude, que são somente para leitura. A pesquisa apenas
centraliza o mapa; não seleciona automaticamente um ponto de alagamento.
A seleção não é salva ao sair ou recarregar a página.

`js/etapa.js` cria o card e importa `js/mapas/etapa-01-mapa.js` somente na Etapa 1.
O módulo carrega Leaflet 1.9.4 (CSS e JavaScript via CDN), os mapas do OpenStreetMap
e consulta o Nominatim. É necessário acesso à internet. Não há instalação,
compilação ou servidor de aplicação; os caminhos relativos funcionam no GitHub Pages.
As demais etapas mantêm seus conteúdos e mapas ilustrativos.

A busca acontece somente pelo botão, sem autocomplete, com intervalo mínimo de
1,1 segundo entre requisições e uma única consulta em andamento. Resultados,
inclusive endereços não encontrados, são reutilizados por consulta normalizada
no cache da aba (`sessionStorage`), com alternativa em memória se indisponível.
Falhas de conexão não são armazenadas como resultados.

Consulte a [política do Nominatim](https://operations.osmfoundation.org/policies/nominatim/):
o limite de uma requisição por segundo é agregado por aplicação. O controle deste
protótipo estático vale por aba e não coordena usuários simultâneos; para ampliar
o uso público, será necessário um serviço que controle o tráfego agregado ou um
provedor adequado. O navegador envia o Referer HTTP(S) para identificar a origem.
O endpoint está centralizado em `NOMINATIM_URL`. Observe também a
[política de mapas do OSM](https://operations.osmfoundation.org/policies/tiles/).

### Roteiro de testes no navegador

1. Verifique o centro no Rio, zoom, movimentação e atribuição OpenStreetMap.
2. Clique em dois locais: deve existir um único marcador, com o popup
   “Ponto de alagamento selecionado” e coordenadas atualizadas, não editáveis.
3. Digite um endereço: não deve haver requisição enquanto digita ou ao usar Enter
   no campo. Acione o botão e confirme a localização; marque o ponto manualmente.
4. Repita a busca variando maiúsculas/espaços: o painel Network não deve registrar
   outra chamada ao Nominatim. Buscas distintas em menos de 1,1 segundo devem ser bloqueadas.
5. Teste campo vazio, endereço inexistente e modo Offline do DevTools durante a busca.
   Verifique as mensagens e a possibilidade de tentar novamente após restabelecer a conexão.
6. Recarregue sem internet: a falha do mapa deve ser informada, sem impedir a navegação.
7. Confira larguras de celular e desktop, atribuição visível e modal de orientações
   acima do mapa. Navegue pelas 17 etapas, pelos botões anterior/próxima e volte à capa.
8. Nas etapas 2 a 17, confirme ausência de mapa Leaflet e de requisições do módulo,
   CDN, mapas e Nominatim. Observe o Console em todos os testes.

O mapa serve exclusivamente para localização e marcação manual. Não calcula
bacia de contribuição, altitude, declividade, curvas de nível ou caminho da água.
