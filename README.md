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
projeto-suds-up/
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
