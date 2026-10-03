"""------------------------------------------------------------
SUDS-UP — METADADOS DO ARQUIVO
Arquivo: tests/validar-lote-2.py
Módulo: Integração das Etapas 8, 10 e 11
Objetivo: Exercitar o fluxo real em desktop, tablet e celular.
Responsabilidade: Navegação, CRUD, teclado, persistência e falhas isoladas.
Dependências: Playwright/Chromium já usados no projeto; servidor Python nativo.
Utilizado por: python -u tests/validar-lote-2.py.
Criado em: 03/10/2026
Última revisão: 03/10/2026
------------------------------------------------------------"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEYS = {8: 'suds-up:etapa-8:possibilidades:v1',
        10: 'suds-up:etapa-10:visita-campo:v1',
        11: 'suds-up:etapa-11:revisao-campo:v1'}


# ------------------------------------------------------------
# SERVIDOR SEM LOG DE CADA RECURSO ESTÁTICO
# ------------------------------------------------------------
class Handler(SimpleHTTPRequestHandler):
    """Serve somente os arquivos do projeto na origem temporária do teste."""

    # ------------------------------------------------------------
    # SUPRESSÃO DO LOG HTTP ROTINEIRO
    # ------------------------------------------------------------
    def log_message(self, *args):
        """Evita ruído de requisições; as falhas são observadas pelo navegador."""


# ------------------------------------------------------------
# ABERTURA DE UMA INTERFACE COMPLETAMENTE CARREGADA
# ------------------------------------------------------------
def visitar(page, base, etapa):
    """Navega e espera a inicialização do módulo; não altera storage diretamente."""
    page.goto(f'{base}?numero={etapa}')
    page.wait_for_selector('#lote-2-conteudo.lote-2')


# ------------------------------------------------------------
# LEITURA DO STORAGE DO CONTEXTO ISOLADO
# ------------------------------------------------------------
def ler(page, etapa):
    """Retorna texto original da chave para comparar preservação byte a byte."""
    return page.evaluate("""
        // ------------------------------------------------------------
        // LEITURA SEM MODIFICAÇÃO NO NAVEGADOR
        // ------------------------------------------------------------
        /** @param {string} chave Chave isolada. @returns {string|null} JSON. */
        (function(chave) { return localStorage.getItem(chave); })
    """, KEYS[etapa])


# ------------------------------------------------------------
# PREPARAÇÃO CONTROLADA DE DADOS OU CORRUPÇÃO
# ------------------------------------------------------------
def escrever(page, etapa, texto):
    """Escreve fixture só no contexto de teste, inclusive JSON inválido deliberado."""
    page.evaluate("""
        // ------------------------------------------------------------
        // FIXTURE ISOLADA DE ARMAZENAMENTO
        // ------------------------------------------------------------
        /** @param {Array} entrada Chave e texto. @returns {void} Grava fixture. */
        (function(entrada) { localStorage.setItem(entrada[0], entrada[1]); })
    """, [KEYS[etapa], texto])


# ------------------------------------------------------------
# CONFIRMAÇÃO POR TECLADO E OBSERVAÇÃO DA REGIÃO VIVA
# ------------------------------------------------------------
def salvar(page, botao, mensagem):
    """Aciona Enter no botão e espera a confirmação, sem sleeps arbitrários."""
    page.get_by_role('button', name=botao, exact=True).focus()
    page.keyboard.press('Enter')
    expect(page.locator('#lote2-status')).to_have_text(mensagem)


# ------------------------------------------------------------
# LAYOUT E ELEMENTOS COMUNS PRESERVADOS
# ------------------------------------------------------------
def conferir_layout(page):
    """Confere ausência de overflow, 17 links, rótulos e orientação por teclado."""
    assert page.evaluate("""
        // ------------------------------------------------------------
        // MEDIÇÃO DA LARGURA REAL DA PÁGINA
        // ------------------------------------------------------------
        /** @returns {boolean} Ausência de rolagem horizontal global. */
        (function() { return document.documentElement.scrollWidth <= innerWidth + 1; })
    """)
    assert page.locator('#lista-etapas a').count() == 17
    assert page.locator('.barra-superior').is_visible()
    assert page.locator('#breadcrumb').is_visible()
    assert page.locator('#botao-anterior').is_visible()
    assert page.locator('#botao-proxima').is_visible()
    assert page.locator('#lote-2-conteudo .mapa-prototipo').count() == 0
    assert 'Exemplo para validação' not in page.locator('#area-trabalho').inner_text()
    # Todos os controles possuem label explícita ou envolvente, inclusive checkbox.
    assert page.evaluate("""
        // ------------------------------------------------------------
        // ASSOCIAÇÃO NATIVA DOS RÓTULOS
        // ------------------------------------------------------------
        /** @returns {boolean} Todos os campos têm rótulo acessível. */
        (function() {
          for (const campo of document.querySelectorAll('.lote-2 input, .lote-2 select, .lote-2 textarea')) {
            if (!campo.labels.length) return false;
          }
          return true;
        })
    """)
    page.locator('#abrir-orientacao-icone').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#modal-orientacao')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.locator('#modal-orientacao')).to_be_hidden()


# ------------------------------------------------------------
# CAPTURA DOS ERROS DO NAVEGADOR
# ------------------------------------------------------------
def observar_erros(page, erros):
    """Registra exceções de página e mensagens console.error para asserção final."""
    # ------------------------------------------------------------
    # EXCEÇÃO JAVASCRIPT NÃO TRATADA
    # ------------------------------------------------------------
    def erro_pagina(erro):
        """Acumula o erro de runtime sem interromper a coleta das demais falhas."""
        erros.append(str(erro))

    # ------------------------------------------------------------
    # MENSAGEM DE ERRO NO CONSOLE
    # ------------------------------------------------------------
    def erro_console(mensagem):
        """Acumula console.error; mensagens informativas não são falhas."""
        if mensagem.type == 'error':
            erros.append(mensagem.text)

    page.on('pageerror', erro_pagina)
    page.on('console', erro_console)


# ------------------------------------------------------------
# CONFIRMAÇÃO DAS EXCLUSÕES PLANEJADAS NO TESTE
# ------------------------------------------------------------
def aceitar(dialog):
    """Aceita somente o diálogo acionado explicitamente pelo caso de teste."""
    dialog.accept()


# ------------------------------------------------------------
# FLUXO COMPLETO NAS TRÊS LARGURAS
# ------------------------------------------------------------
def fluxo(browser, base, largura):
    """Executa 8 → 10 → 11, restauração, edição e exclusão em contexto descartável."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    page = ctx.new_page()
    erros = []
    observar_erros(page, erros)
    visitar(page, base, 10)
    expect(page.get_by_text('Nenhuma área foi cadastrada na Etapa 8.', exact=True)).to_be_visible()
    assert page.get_by_role('link', name='Voltar à Etapa 8').get_attribute('href') == 'etapa.html?numero=8'
    visitar(page, base, 11)
    assert page.locator('#lote2-formulario').count() == 0
    visitar(page, base, 8)
    assert ler(page, 8) is None
    page.get_by_role('button', name='Adicionar área', exact=True).click()
    expect(page.locator('#lote2-identificacao')).to_be_focused()
    expect(page.locator('#lote2-identificacao')).to_have_attribute('aria-invalid', 'true')

    # Os IDs vêm das opções produzidas pelo catálogo real, sem catálogo de teste.
    opcoes = page.locator('#lote2-possiveis input')
    variantes = [opcoes.nth(i).get_attribute('value') for i in range(opcoes.count())]
    assert len(variantes) == 8
    page.locator('#lote2-identificacao').fill('Praça <img src=x onerror=alert(1)>')
    page.locator('#lote2-areaDisponivel').fill('100,25')
    page.locator('#lote2-permeabilidade').fill('Descrição do solo sem categoria imposta')
    opcoes.nth(0).focus()
    page.keyboard.press('Space')
    opcoes.nth(2).check()
    assert ler(page, 8) is None
    salvar(page, 'Adicionar área', 'Área salva neste navegador.')
    page.locator('#lote2-identificacao').fill('Área 2')
    page.locator('#lote2-areaDisponivel').fill('50.5')
    opcoes.nth(1).check()
    salvar(page, 'Adicionar área', 'Área salva neste navegador.')
    inicial = json.loads(ler(page, 8))
    a, b = inicial['areas']
    assert a['numero'] == 1 and b['numero'] == 2
    assert a['largura'] is None and a['areaDisponivel'] == 100.25
    page.get_by_role('button', name='Editar Área 1', exact=True).click()
    page.locator('#lote2-largura').fill('0')
    page.get_by_role('button', name='Salvar alterações', exact=True).click()
    expect(page.locator('#lote2-largura')).to_be_focused()
    assert json.loads(ler(page, 8)) == inicial
    page.locator('#lote2-largura').fill('2,5')
    page.locator('#lote2-observacoes').fill('Pré-campo revisado')
    salvar(page, 'Salvar alterações', 'Área salva neste navegador.')
    page.reload()
    page.wait_for_selector('#lote2-lista')
    assert page.locator('#lote2-lista article').count() == 2
    assert page.locator('#lote-2-conteudo img').count() == 0
    origem8 = ler(page, 8)
    assert json.loads(origem8)['areas'][0]['id'] == a['id']
    assert json.loads(origem8)['areas'][0]['largura'] == 2.5
    conferir_layout(page)

    visitar(page, base, 10)
    page.select_option('#lote2-area', a['id'])
    expect(page.locator('#lote2-origens')).to_contain_text('Pré-campo revisado')
    page.select_option('#lote2-postes', 'Sim')
    page.select_option('#lote2-pocosVisita', 'Não')
    page.select_option('#lote2-pavimentacaoHistorica', 'Não avaliado')
    page.locator('#lote2-larguraCalcada').fill('-1')
    page.get_by_role('button', name='Salvar vistoria', exact=True).click()
    expect(page.locator('#lote2-larguraCalcada')).to_be_focused()
    assert ler(page, 10) is None
    page.locator('#lote2-larguraCalcada').fill('1,2')
    page.locator('#lote2-fluxoPedestres').fill('Pedestres observados durante a visita')
    page.locator('#lote2-observacoes').fill('Campo <script>literal</script>')
    salvar(page, 'Salvar vistoria', 'Vistoria salva neste navegador.')
    # Salvar novamente deve atualizar o mesmo registro, inclusive em cliques repetidos.
    page.locator('#lote2-observacoes').fill('Campo atualizado <script>literal</script>')
    salvar(page, 'Salvar vistoria', 'Vistoria salva neste navegador.')
    assert len(json.loads(ler(page, 10))['vistorias']) == 1
    page.select_option('#lote2-area', b['id'])
    expect(page.locator('#lote2-postes')).to_have_value('Não avaliado')
    page.locator('#lote2-observacoes').fill('Vistoria da segunda área')
    salvar(page, 'Salvar vistoria', 'Vistoria salva neste navegador.')
    page.reload()
    page.wait_for_selector('#lote2-area')
    page.select_option('#lote2-area', b['id'])
    expect(page.locator('#lote2-observacoes')).to_have_value('Vistoria da segunda área')
    origem10 = ler(page, 10)
    assert len(json.loads(origem10)['vistorias']) == 2
    assert ler(page, 8) == origem8
    conferir_layout(page)

    visitar(page, base, 11)
    page.select_option('#lote2-area', a['id'])
    expect(page.locator('#lote2-origens')).to_contain_text('Pré-campo revisado')
    expect(page.locator('#lote2-origens')).to_contain_text('Campo atualizado <script>literal</script>')
    assert page.locator('#lote2-origens script').count() == 0
    expect(page.locator('#lote2-selecionado')).to_have_value('')
    # Seleção fora dos revisados é recusada explicitamente, sem apagá-la.
    page.select_option('#lote2-selecionado', variantes[1])
    page.locator('#lote2-motivo').fill('Justificativa')
    page.get_by_role('button', name='Salvar decisão pós-campo', exact=True).click()
    expect(page.locator('#lote2-selecionado')).to_have_attribute('aria-invalid', 'true')
    expect(page.locator('#lote2-selecionado')).to_be_focused()
    assert ler(page, 11) is None
    page.locator(f'#lote2-possiveis input[value="{variantes[1]}"]').check()
    page.locator('#lote2-motivo').fill(' ')
    page.get_by_role('button', name='Salvar decisão pós-campo', exact=True).click()
    expect(page.locator('#lote2-motivo')).to_be_focused()
    page.locator('#lote2-motivo').fill('Escolha revisada após vistoria')
    page.locator('#lote2-restricaoProjetual').fill('Conferir interferências descritas')
    salvar(page, 'Salvar decisão pós-campo', 'Decisão pós-campo salva neste navegador.')
    confirmado11 = ler(page, 11)
    assert ler(page, 8) == origem8 and ler(page, 10) == origem10
    page.locator('#botao-proxima').click()
    page.locator('#botao-anterior').click()
    page.wait_for_selector('#lote2-selecionado')
    expect(page.locator('#lote2-selecionado')).to_have_value(variantes[1])
    expect(page.locator('#lote2-motivo')).to_have_value('Escolha revisada após vistoria')
    assert ler(page, 11) == confirmado11
    conferir_layout(page)
    # A outra área pode ter decisão sem técnica e sem motivo.
    page.select_option('#lote2-area', b['id'])
    salvar(page, 'Salvar decisão pós-campo', 'Decisão pós-campo salva neste navegador.')
    assert json.loads(ler(page, 11))['decisoes'][1]['selecionado'] is None

    # Exclusão preserva os vínculos antigos e não reutiliza a numeração.
    visitar(page, base, 8)
    page.once('dialog', aceitar)
    page.get_by_role('button', name='Excluir Área 2', exact=True).click()
    page.locator('#lote2-identificacao').fill('Área 3')
    page.locator('#lote2-areaDisponivel').fill('30')
    salvar(page, 'Adicionar área', 'Área salva neste navegador.')
    assert json.loads(ler(page, 8))['areas'][1]['numero'] == 3
    visitar(page, base, 10)
    expect(page.locator('.lote2-aviso')).to_have_text('Existe 1 vistoria associada a uma área que não está mais cadastrada. O registro foi preservado para evitar perda de dados.')
    assert ler(page, 10) == origem10
    visitar(page, base, 11)
    assert page.locator('.lote2-aviso').count() == 2
    expect(page.locator('.lote2-aviso').nth(0)).to_have_text('Existe 1 vistoria associada a uma área que não está mais cadastrada. O registro foi preservado para evitar perda de dados.')
    expect(page.locator('.lote2-aviso').nth(1)).to_have_text('Existe 1 decisão pós-campo associada a uma área que não está mais cadastrada. O registro foi preservado para evitar perda de dados.')
    area3 = json.loads(ler(page, 8))['areas'][1]['id']
    page.select_option('#lote2-area', area3)
    expect(page.locator('#lote2-origens')).to_contain_text('Ainda não há vistoria registrada')
    salvar(page, 'Salvar decisão pós-campo', 'Decisão pós-campo salva neste navegador.')
    assert len(json.loads(ler(page, 11))['decisoes']) == 3
    assert not erros, erros
    # Fixtures reais do fluxo alimentam testes de falha em novos contextos isolados.
    fixtures = {etapa: ler(page, etapa) for etapa in KEYS}
    # Uma segunda exclusão verifica a pluralização dos dois tipos. As coleções
    # preservadas devem permanecer idênticas, sem UUIDs ou termos técnicos no aviso.
    visitar(page, base, 8)
    page.once('dialog', aceitar)
    page.get_by_role('button', name='Excluir Área 1', exact=True).click()
    visitar(page, base, 10)
    expect(page.locator('.lote2-aviso')).to_have_text('Existem 2 vistorias associadas a áreas que não estão mais cadastradas. Os registros foram preservados para evitar perda de dados.')
    visitar(page, base, 11)
    expect(page.locator('.lote2-aviso').nth(0)).to_have_text('Existem 2 vistorias associadas a áreas que não estão mais cadastradas. Os registros foram preservados para evitar perda de dados.')
    expect(page.locator('.lote2-aviso').nth(1)).to_have_text('Existem 2 decisões pós-campo associadas a áreas que não estão mais cadastradas. Os registros foram preservados para evitar perda de dados.')
    assert ler(page, 10) == fixtures[10] and ler(page, 11) == fixtures[11]
    assert not erros, erros
    ctx.close()
    print(f'OK: fluxo 8 -> 10 -> 11 em {largura}px, CRUD, vínculos, teclado, restauração, órfãos e console.')
    return fixtures


# ------------------------------------------------------------
# FALHAS E CONCORRÊNCIA SEM SOBRESCRITA
# ------------------------------------------------------------
def falhas(browser, base, fixtures):
    """Testa incompatibilidade, leitura/escrita bloqueada e alteração de origens."""
    for etapa in KEYS:
        ctx = browser.new_context()
        page = ctx.new_page()
        visitar(page, base, 8)
        for origem, texto in fixtures.items():
            escrever(page, origem, texto)
        original = fixtures[etapa]
        for invalido in ['{', '{"versao":2}', 'null']:
            escrever(page, etapa, invalido)
            visitar(page, base, etapa)
            expect(page.locator('#lote2-armazenamento')).to_contain_text('incompatíveis')
            assert ler(page, etapa) == invalido
            if page.locator('#lote2-formulario').count():
                if etapa == 8:
                    page.locator('#lote2-identificacao').fill('Rascunho protegido')
                    page.locator('#lote2-areaDisponivel').fill('10')
                page.locator('#lote2-formulario button[type=submit]').click()
                expect(page.locator('#lote2-status')).to_contain_text('incompatíveis')
                assert ler(page, etapa) == invalido
        escrever(page, etapa, original)
        visitar(page, base, etapa)
        # setItem é bloqueado depois da carga: a tela deve preservar o rascunho.
        page.evaluate("""
            // ------------------------------------------------------------
            // FALHA DE ESCRITA CONTROLADA
            // ------------------------------------------------------------
            /** @returns {void} Bloqueia storage somente neste contexto de teste. */
            (function() {
              // ------------------------------------------------------------
              // SIMULAÇÃO DE QUOTA OU PERMISSÃO
              // ------------------------------------------------------------
              /** @returns {void} Lança erro intencional sem gravar. */
              Storage.prototype.setItem = function() { throw new Error('Bloqueado pelo teste'); };
            })
        """)
        if etapa == 8:
            page.locator('#lote2-identificacao').fill('Rascunho protegido')
            page.locator('#lote2-areaDisponivel').fill('10')
        else:
            page.locator('#lote2-observacoes').fill('Rascunho protegido')
        page.locator('#lote2-formulario button[type=submit]').click()
        expect(page.locator('#lote2-status')).to_contain_text('Não foi possível salvar')
        assert ler(page, etapa) == original
        campo = '#lote2-identificacao' if etapa == 8 else '#lote2-observacoes'
        expect(page.locator(campo)).to_have_value('Rascunho protegido')
        ctx.close()

    # getItem bloqueado desde o início nunca pode simular um levantamento vazio.
    ctx = browser.new_context()
    ctx.add_init_script("""
        // ------------------------------------------------------------
        // ARMAZENAMENTO INDISPONÍVEL DESDE A ABERTURA
        // ------------------------------------------------------------
        /** @returns {void} Lança falha de leitura apenas neste teste. */
        Storage.prototype.getItem = function() { throw new Error('Leitura bloqueada'); };
    """)
    page = ctx.new_page()
    for etapa in KEYS:
        visitar(page, base, etapa)
        expect(page.locator('#lote2-armazenamento')).to_contain_text('Não foi possível acessar')
        assert page.get_by_text('Nenhuma área foi cadastrada na Etapa 8.', exact=True).count() == 0
    ctx.close()

    # Abrir duas páginas da mesma origem permite disparar StorageEvent real.
    ctx = browser.new_context()
    page = ctx.new_page()
    outra = ctx.new_page()
    visitar(outra, base, 8)
    for origem, texto in fixtures.items():
        escrever(outra, origem, texto)
    for etapa, origem in [(8, 8), (10, 8), (10, 10), (11, 8), (11, 10), (11, 11)]:
        visitar(page, base, etapa)
        if etapa == 8:
            page.locator('#lote2-identificacao').fill('Rascunho concorrente')
            page.locator('#lote2-areaDisponivel').fill('10')
        else:
            page.locator('#lote2-observacoes').fill('Rascunho concorrente')
        antes = ler(outra, origem)
        escrever(outra, origem, antes + ' ')
        expect(page.locator('#lote2-armazenamento')).to_contain_text('outra aba')
        page.locator('#lote2-formulario button[type=submit]').click()
        expect(page.locator('#lote2-status')).to_contain_text('outra aba')
        campo = '#lote2-identificacao' if etapa == 8 else '#lote2-observacoes'
        expect(page.locator(campo)).to_have_value('Rascunho concorrente')
        assert ler(outra, origem) == antes + ' '
    ctx.close()
    print('OK: JSON incompatível, leitura/escrita bloqueada e mudanças em outra aba preservam dados e rascunhos.')


# ------------------------------------------------------------
# EXECUÇÃO E LIMPEZA DOS RECURSOS TEMPORÁRIOS
# ------------------------------------------------------------
def main():
    """Inicia servidor/browser isolados e garante encerramento mesmo após falhas."""
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/etapa.html'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for largura in [1440, 900, 390]:
                fixtures = fluxo(browser, base, largura)
            falhas(browser, base, fixtures)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
