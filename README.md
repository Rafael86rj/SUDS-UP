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
A Etapa 15 ainda não está implementada. A comparação com uma demanda disponível
é realizada pela Etapa 17, descrita abaixo.

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

### Contrato futuro da Etapa 15 e painel da Etapa 16

A Etapa 15 **não está implementada** e não recebe dados fictícios deste lote.
Seu futuro produtor deve gravar, na chave `suds-up:etapa-15:chuva-projeto:v1`:

```text
{ versao: 1, volumeChuvaAManejar: <número finito não negativo, em m³> }
```

`volumeChuvaAManejar` deve ser um número JSON, não texto formatado. O contrato
aceita campos extras para futura rastreabilidade. O produtor deverá manter seu
resultado atualizado conforme as entradas; este lote não calcula nem invalida
automaticamente uma chuva de projeto. Os exemplos de volume usados nos testes
ficam exclusivamente em contextos isolados.

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
