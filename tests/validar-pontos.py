"""Executar: python -u tests/validar-pontos.py (Playwright e Chromium instalados).

Perfil temporário e origem dedicada: não acessa o levantamento do usuário.
A busca usa respostas simuladas; Leaflet é carregado da dependência existente.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import json
import shutil
import sys
sys.dont_write_bytecode = True
from validar_reversa import validar_reversa
from playwright.sync_api import sync_playwright


# ------------------------------------------------------------
# SERVIDOR E PERFIL ISOLADOS
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
KEY = 'suds-up:etapa-1:pontos-alagamento:v1'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, output):
        shutil.copyfileobj(source, output, 16 * 1024)


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/etapa.html?numero=1'


def ready(page):
    page.wait_for_function('document.querySelector("#mapa-buscar")?.disabled === false')


def data(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)


def select(page, x=130, y=130):
    page.locator('#mapa-etapa-01').click(position={'x': x, 'y': y})


def save(page, address):
    page.locator('#ponto-endereco').fill(address)
    page.locator('#ponto-salvar').click()


try:
    # Permite repetir apenas os cenários da melhoria após ajustar este teste.
    if '--reversa' in sys.argv:
        with sync_playwright() as pw:
            validar_reversa(pw, url, KEY)
        sys.exit(0)
    with TemporaryDirectory(prefix='suds-pontos-') as profile, sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(profile, headless=True, viewport={'width': 1440, 'height': 1000})
        context.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
        page = context.pages[0]
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        ready(page)
        assert data(page) is None
        page.locator('#ponto-salvar').click()
        assert 'Selecione primeiro' in page.locator('#ponto-mensagem').inner_text()

        # ------------------------------------------------------------
        # CADASTRO EXPLÍCITO, SEGURANÇA DE TEXTO E PRECISÃO
        # ------------------------------------------------------------
        select(page)
        assert data(page) is None
        assert page.locator('.ponto-marcador--provisorio').count() == 1
        save(page, '<img src=x onerror=alert(1)> Referência 1')
        assert page.locator('#pontos-corpo img').count() == 0
        for number in (2, 3):
            select(page, 130 + number * 50, 160)
            save(page, f'Referência {number}')
        original = data(page)
        assert [p['numero'] for p in original['pontos']] == [1, 2, 3]
        assert page.locator('#pontos-corpo tr[data-id]').count() == 3
        assert page.locator('.ponto-marcador:not(.ponto-marcador--provisorio)').count() == 3
        select(page, 330, 200)
        assert data(page) == original
        page.get_by_role('button', name='Localizar ponto 2', exact=True).click()
        assert 'Ponto 2' in page.locator('.leaflet-popup-content').inner_text()
        page.locator('.leaflet-popup-close-button').click()
        page.get_by_role('button', name='Editar ponto 2', exact=True).click()
        select(page, 290, 180)
        assert page.locator('#ponto-endereco').input_value() == ''
        page.locator('#ponto-descricao').fill('Descrição corrigida')
        save(page, 'Referência corrigida')
        edited = data(page)
        assert edited['pontos'][1]['id'] == original['pontos'][1]['id']
        assert edited['pontos'][1]['numero'] == 2
        assert edited['pontos'][1]['latitude'] != original['pontos'][1]['latitude']
        assert edited['pontos'][1]['descricao'] == 'Descrição corrigida'
        page.get_by_role('button', name='Editar ponto 2', exact=True).click()
        select(page, 350, 200)
        page.locator('#ponto-endereco').fill('Não salvar')
        page.locator('#ponto-cancelar').click()
        assert data(page) == edited

        page.once('dialog', lambda dialog: dialog.dismiss())
        page.get_by_role('button', name='Excluir ponto 2', exact=True).click()
        assert data(page) == edited
        page.once('dialog', lambda dialog: dialog.accept())
        page.get_by_role('button', name='Excluir ponto 2', exact=True).click()
        assert [p['numero'] for p in data(page)['pontos']] == [1, 3]
        page.reload()
        ready(page)
        select(page)
        save(page, 'Referência 4')
        saved = data(page)
        assert [p['numero'] for p in saved['pontos']] == [1, 3, 4]
        assert len({p['id'] for p in original['pontos'] + [saved['pontos'][-1]]}) == 4
        page.locator('#botao-proxima').click()
        page.locator('#botao-anterior').click()
        ready(page)
        assert data(page) == saved
        context.close()
        context = pw.chromium.launch_persistent_context(profile, headless=True, viewport={'width': 390, 'height': 844})
        context.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
        page = context.pages[0]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        ready(page)
        assert data(page) == saved
        assert page.locator('#pontos-corpo tr[data-id]').count() == 3
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('#mapa-etapa-01').focus()
        page.keyboard.press('ArrowRight')
        page.locator('#mapa-selecionar-centro').focus()
        page.keyboard.press('Enter')
        assert page.locator('.ponto-marcador--provisorio').count() == 1
        assert data(page) == saved
        print('OK: três pontos, localizar, editar/cancelar, excluir, numeração, recarga, reabertura e teclado/móvel.')

        # ------------------------------------------------------------
        # BUSCA SIMULADA: RASCUNHO, CACHE E RESPOSTAS ATRASADAS
        # ------------------------------------------------------------
        calls = []
        def search(route):
            calls.append(route.request.url)
            route.fulfill(json=[{'lat': '-22.9123456789123', 'lon': '-43.1234567891234', 'display_name': 'Endereço da pesquisa'}])
        page.route('https://nominatim.openstreetmap.org/search?*', search)
        page.locator('#mapa-endereco').fill('Teste busca')
        page.locator('#mapa-buscar').click()
        page.wait_for_function('document.querySelector("#ponto-endereco").value === "Endereço da pesquisa"')
        assert data(page) == saved
        page.locator('#mapa-buscar').click()
        assert len(calls) == 1
        # A fila agora aguarda o intervalo compartilhado; os cenários de consulta
        # reversa abaixo medem os inícios de ambas as modalidades.
        save(page, 'Endereço da pesquisa')
        assert data(page)['pontos'][-1]['latitude'] == -22.9123456789123
        select(page)
        assert page.locator('#ponto-endereco').input_value() == ''
        page.unroute('https://nominatim.openstreetmap.org/search?*')
        page.route('https://nominatim.openstreetmap.org/search?*', lambda route: route.fulfill(json=[{'lat': '-23', 'lon': '-44'}]))
        page.wait_for_timeout(1150)
        page.locator('#mapa-endereco').fill('Sem endereço')
        page.locator('#mapa-buscar').click()
        page.wait_for_function('document.querySelector("#mapa-latitude").value === "-23.000000"')
        assert page.locator('#ponto-endereco').input_value() == ''
        save(page, 'Referência manual')
        assert data(page)['pontos'][-1]['endereco'] == 'Referência manual'
        page.unroute('https://nominatim.openstreetmap.org/search?*')
        pending = []
        page.route('https://nominatim.openstreetmap.org/search?*', lambda route: pending.append(route))
        page.wait_for_timeout(1150)
        page.locator('#mapa-endereco').fill('Busca atrasada')
        page.locator('#mapa-buscar').click()
        page.wait_for_timeout(100)
        select(page)
        latitude = page.locator('#mapa-latitude').input_value()
        assert pending
        pending[0].fulfill(json=[{'lat': '10', 'lon': '20', 'display_name': 'Antigo'}])
        page.wait_for_function('document.querySelector("#mapa-buscar").disabled === false')
        assert page.locator('#mapa-latitude').input_value() == latitude
        assert page.locator('#ponto-endereco').input_value() == ''
        print('OK: busca simulada, cache, intervalo, precisão, referência manual e resposta atrasada.')
        context.close()

        # ------------------------------------------------------------
        # DADOS INVÁLIDOS E FALHAS DE ARMAZENAMENTO
        # ------------------------------------------------------------
        browser = pw.chromium.launch()
        for invalid in ('{invalido', json.dumps({'versao': 9}), json.dumps({'versao': 1, 'proximoNumero': 1, 'pontos': [{'latitude': 91}]})):
            ctx = browser.new_context()
            ctx.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
            ctx.add_init_script(f'localStorage.setItem({json.dumps(KEY)}, {json.dumps(invalid)});')
            tab = ctx.new_page()
            tab.goto(url)
            ready(tab)
            assert 'não foram alterados' in tab.locator('#ponto-salvamento').inner_text()
            select(tab)
            save(tab, 'Não sobrescrever')
            assert tab.evaluate('(key) => localStorage.getItem(key)', KEY) == invalid
            assert tab.locator('#pontos-corpo tr[data-id]').count() == 0
            ctx.close()
        for operation in ('getItem', 'setItem'):
            ctx = browser.new_context()
            ctx.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
            ctx.add_init_script(f'''const original = Storage.prototype.{operation};
                Storage.prototype.{operation} = function(key, ...args) {{
                  if (key === {json.dumps(KEY)}) throw new DOMException('Teste isolado', 'SecurityError');
                  return original.call(this, key, ...args);
                }};''')
            tab = ctx.new_page()
            tab.goto(url)
            ready(tab)
            select(tab)
            save(tab, 'Manter rascunho')
            assert tab.locator('#ponto-salvamento').get_attribute('data-tipo') == 'erro'
            assert tab.locator('#ponto-endereco').input_value() == 'Manter rascunho'
            assert tab.locator('#pontos-corpo tr[data-id]').count() == 0
            ctx.close()
        print('OK: JSON inválido, versão/estrutura incompatíveis e falhas de leitura/gravação sem sobrescrever dados.')

        # Validação pura exercita limites, finitude e colisões sem dados reais.
        ctx = browser.new_context()
        ctx.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
        tab = ctx.new_page()
        tab.goto(url)
        result = tab.evaluate('''async () => {
          const m = await import('./js/dados/pontos-alagamento.js');
          const p = { id: 'a', numero: 1, endereco: 'Rua', descricao: '', latitude: 0, longitude: 0 };
          const d = { versao: 1, proximoNumero: 2, pontos: [p] };
          return m.validarLevantamento(d) && !m.coordenadasValidas(NaN, 0)
            && !m.coordenadasValidas(0, Infinity) && !m.coordenadasValidas(91, 0)
            && !m.coordenadasValidas(0, -181) && !m.coordenadasValidas('0', 0)
            && !m.validarLevantamento({...d, pontos: [p, p]})
            && !m.validarLevantamento({...d, proximoNumero: 1});
        }''')
        assert result
        for stage in range(1, 18):
            tab.goto(url.replace('numero=1', f'numero={stage}'))
            assert tab.locator('#lista-etapas a').count() == 17
            assert tab.locator('[aria-current="step"]').get_attribute('href') == f'etapa.html?numero={stage}'
            assert tab.locator('#botao-proxima').get_attribute('href') == (f'etapa.html?numero={stage + 1}' if stage < 17 else 'index.html')
            assert tab.locator('#botao-anterior').get_attribute('href') == (f'etapa.html?numero={stage - 1}' if stage > 1 else 'index.html')
        for stage in (3, 7):
            tab.goto(url.replace('numero=1', f'numero={stage}'))
            assert tab.locator('#lista-etapas a').count() == 17
            tab.select_option('#consulta-tecnica', 'jardim-chuva')
            tab.select_option('#consulta-variante', 'jardim-impermeavel')
            assert tab.locator('#consulta-detalhes img').count() == 1
            if stage == 7:
                assert 'Obrigatoriedade de exutório.' in tab.locator('#consulta-detalhes').inner_text()
        assert not errors, errors
        browser.close()
        print('OK: validação de coordenadas/colisões, menu de 17 etapas e regressão das Etapas 3 e 7.')
        validar_reversa(pw, url, KEY)
finally:
    server.shutdown()
    server.server_close()
