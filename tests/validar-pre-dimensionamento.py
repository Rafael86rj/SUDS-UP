"""Playwright/Chromium já instalados: python -u tests/validar-pre-dimensionamento.py.
Usa servidor e perfil temporários, sem acessar os levantamentos do usuário.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import json
import shutil
from playwright.sync_api import sync_playwright


# ------------------------------------------------------------
# SERVIDOR LOCAL E PERFIL ISOLADO
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
KEY = 'suds-up:etapa-13:cenario:v1'
POINTS = 'suds-up:etapa-1:pontos-alagamento:v1'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, target):
        shutil.copyfileobj(source, target, 16 * 1024)


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/etapa.html'
url = base + '?numero=13'


def ready(page):
    page.wait_for_selector('#pre-formulario')


def saved(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)


def fill(page, variant, area='100'):
    page.select_option('#pre-variante', variant)
    page.locator('#pre-area').fill(area)


try:
    with TemporaryDirectory(prefix='suds-pre-') as profile, sync_playwright() as pw:
        ctx = pw.chromium.launch_persistent_context(profile, headless=True, viewport={'width':1440, 'height':1000})
        page = ctx.pages[0]
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        ready(page)
        assert page.locator('#pre-variante option').count() == 9
        assert saved(page) is None
        page.evaluate('(key) => localStorage.setItem(key, "preservar")', POINTS)
        fill(page, 'jardim-permeavel')
        assert '45,00 m³' in page.locator('#pre-previa').inner_text()
        assert '0,00 m³' in page.locator('#pre-total').inner_text()
        page.locator('#pre-salvar').click()
        fill(page, 'trincheira-infiltracao')
        assert '36,00 m³' in page.locator('#pre-previa').inner_text()
        page.locator('#pre-salvar').click()
        assert '81,00 m³' in page.locator('#pre-total').inner_text()
        original = saved(page)
        page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        page.locator('#pre-profundidade').fill('2,00')
        page.locator('#pre-vazios').fill('0,40')
        assert '80,00 m³' in page.locator('#pre-previa').inner_text()
        assert '81,00 m³' in page.locator('#pre-total').inner_text()
        page.once('dialog', lambda dialog: dialog.dismiss())
        page.select_option('#pre-variante', 'bacia-permeavel')
        assert page.locator('#pre-variante').input_value() == 'jardim-permeavel'
        assert page.locator('#pre-profundidade').input_value() == '2,00'
        page.locator('#pre-salvar').click()
        edited = saved(page)
        assert edited['intervencoes'][0]['id'] == original['intervencoes'][0]['id']
        assert edited['intervencoes'][0]['numero'] == 1
        assert '116,00 m³' in page.locator('#pre-total').inner_text()
        page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        assert page.locator('#pre-profundidade').input_value() == '2'
        page.once('dialog', lambda dialog: dialog.accept())
        page.select_option('#pre-variante', 'bacia-permeavel')
        assert page.locator('#pre-profundidade').input_value() == '1,4'
        page.locator('#pre-profundidade').fill('3')
        page.locator('#pre-restaurar').click()
        assert page.locator('#pre-profundidade').input_value() == '1,4'
        # Confirmação local, repetida e cancelável sem mudar área ou persistência.
        confirmation = 'Profundidade e índice de vazios restaurados para o padrão da técnica.'
        notice = page.locator('#pre-restauracao-status')
        page.wait_for_function('(text) => document.querySelector("#pre-restauracao-status").textContent === text', arg=confirmation)
        assert notice.is_visible()
        assert notice.get_attribute('role') == 'status'
        assert notice.get_attribute('aria-live') == 'polite'
        assert notice.get_attribute('aria-atomic') == 'true'
        assert page.locator('#pre-restaurar').evaluate('(el) => el.nextElementSibling.id') == 'pre-restauracao-status'
        page.evaluate('''() => {
          window.avisosRestauracao = [];
          new MutationObserver(() => window.avisosRestauracao.push(document.querySelector('#pre-restauracao-status').textContent))
            .observe(document.querySelector('#pre-restauracao-status'), {childList:true});
        }''')
        page.locator('#pre-restaurar').click()
        page.wait_for_function('(text) => window.avisosRestauracao.includes("") && window.avisosRestauracao.includes(text)', arg=confirmation)
        assert page.locator('#pre-area').input_value() == '100'
        assert saved(page) == edited
        for parameter in ('profundidade', 'vazios'):
            page.locator(f'#pre-{parameter}').fill('0,8')
            assert notice.inner_text() == ''
            page.locator('#pre-restaurar').click()
            page.wait_for_function('(text) => document.querySelector("#pre-restauracao-status").textContent === text', arg=confirmation)
        # Editar antes do timer terminar também não deixa ressurgir a confirmação.
        page.evaluate('''() => {
          document.querySelector('#pre-restaurar').click();
          const field = document.querySelector('#pre-profundidade');
          field.value = '3'; field.dispatchEvent(new Event('input', {bubbles:true}));
        }''')
        page.wait_for_timeout(250)
        assert notice.inner_text() == ''
        page.locator('#pre-cancelar').click()
        assert saved(page) == edited
        page.reload()
        ready(page)
        page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        assert page.locator('#pre-profundidade').input_value() == '2'
        page.locator('#pre-cancelar').click()
        page.locator('#botao-proxima').click()
        page.locator('#botao-anterior').click()
        ready(page)
        assert saved(page) == edited
        ctx.close()

        ctx = pw.chromium.launch_persistent_context(profile, headless=True, viewport={'width':390,'height':844})
        page = ctx.pages[0]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        ready(page)
        assert saved(page) == edited
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.once('dialog', lambda dialog: dialog.dismiss())
        page.get_by_role('button', name='Excluir intervenção 2', exact=True).click()
        assert saved(page) == edited
        page.once('dialog', lambda dialog: dialog.accept())
        page.get_by_role('button', name='Excluir intervenção 2', exact=True).click()
        page.reload()
        ready(page)
        fill(page, 'jardim-permeavel')
        page.locator('#pre-salvar').focus()
        page.keyboard.press('Enter')
        assert [item['numero'] for item in saved(page)['intervencoes']] == [1,3]
        assert len({item['id'] for item in saved(page)['intervencoes']}) == 2
        assert '125,00 m³' in page.locator('#pre-total').inner_text()
        print('OK: 45/36/81/80 m³, rascunhos, duplicatas, editar/cancelar/excluir, padrões, recarga, reabertura e teclado/móvel.')

        # ------------------------------------------------------------
        # OITO VARIANTES, VALIDAÇÃO VISÍVEL E PRECISÃO DO TOTAL
        # ------------------------------------------------------------
        page.evaluate('(key) => localStorage.removeItem(key)', KEY)
        page.reload()
        ready(page)
        options = page.locator('#pre-variante option').evaluate_all('(items) => items.map(i => i.value).filter(Boolean)')
        for variant in options:
            fill(page, variant)
            page.locator('#pre-salvar').click()
        assert page.locator('#pre-registros tr[data-id]').count() == 8
        assert '533,60 m³' in page.locator('#pre-total').inner_text()
        snapshot = saved(page)
        page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        page.locator('#pre-profundidade').fill('3')
        page.locator('#pre-salvar').click()
        customized = saved(page)
        page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        page.locator('#pre-restaurar').click()
        page.wait_for_function('(text) => document.querySelector("#pre-restauracao-status").textContent === text', arg=confirmation)
        assert page.locator('#pre-restauracao-status').is_visible()
        assert saved(page) == customized
        assert page.locator('#pre-area').input_value() == '100'
        page.locator('#pre-salvar').click()
        assert saved(page) == snapshot
        assert page.locator('#pre-restauracao-status').inner_text() == ''
        print('OK: restauração com status local, cliques repetidos, limpeza ao editar e alteração persistida somente após salvar.')
        fill(page, 'jardim-permeavel')
        for field, value in [('area',''), ('area','-1'), ('area','1.000,50'), ('profundidade','0'), ('vazios','1,01'), ('vazios',''), ('area','1e309')]:
            page.locator('#pre-area').fill('100')
            page.locator('#pre-profundidade').fill('1,50')
            page.locator('#pre-vazios').fill('0,30')
            page.locator(f'#pre-{field}').fill(value)
            page.locator('#pre-salvar').click()
            assert page.locator(f'#pre-{field}').get_attribute('aria-invalid') == 'true'
            assert 'indisponível' in page.locator('#pre-previa').inner_text()
            assert saved(page) == snapshot
        page.locator('#pre-area').fill('1e308')
        page.locator('#pre-profundidade').fill('2')
        page.locator('#pre-vazios').fill('1')
        assert 'indisponível' in page.locator('#pre-previa').inner_text()
        page.locator('#pre-vazios').fill('0')
        assert '0,00 m³' in page.locator('#pre-previa').inner_text()
        page.locator('#pre-salvar').click()
        assert saved(page)['intervencoes'][-1]['vazios'] == 0
        assert '533,60 m³' in page.locator('#pre-total').inner_text()
        assert page.evaluate('(key) => localStorage.getItem(key)', POINTS) == 'preservar'
        # Injetar volumes falsos não muda os resultados restaurados.
        page.evaluate('''key => { const d=JSON.parse(localStorage.getItem(key)); d.total=99999;
          d.intervencoes.forEach(i => i.volume=99999); localStorage.setItem(key, JSON.stringify(d)); }''', KEY)
        page.reload()
        ready(page)
        assert '533,60 m³' in page.locator('#pre-total').inner_text()
        print('OK: oito padrões = 533,60 m³; campos inválidos rejeitados, zero aceito, volumes restaurados recalculados.')
        ctx.close()

        # ------------------------------------------------------------
        # ARMAZENAMENTO INVÁLIDO OU INDISPONÍVEL NÃO CONFIRMA ALTERAÇÕES
        # ------------------------------------------------------------
        browser = pw.chromium.launch()
        for failure in ('json', 'version', 'getItem', 'setItem'):
            ctx = browser.new_context()
            if failure in ('json', 'version'):
                raw = '{invalido' if failure == 'json' else '{"versao":9}'
                ctx.add_init_script(f'localStorage.setItem({json.dumps(KEY)}, {json.dumps(raw)});')
            else:
                ctx.add_init_script(f'''const old=Storage.prototype.{failure};
                  Storage.prototype.{failure}=function(key,...args) {{
                    if(key==={json.dumps(KEY)}) throw new Error('Teste isolado');
                    return old.call(this,key,...args);
                  }};''')
            tab = ctx.new_page()
            tab.goto(url)
            ready(tab)
            fill(tab, 'jardim-permeavel')
            tab.locator('#pre-salvar').click()
            assert 'Alteração não confirmada' in tab.locator('#pre-mensagem').inner_text()
            assert tab.locator('#pre-area').input_value() == '100'
            assert tab.locator('#pre-registros tr[data-id]').count() == 0
            if failure in ('json','version'):
                assert tab.evaluate('(key) => localStorage.getItem(key)', KEY) == raw
            ctx.close()
        ctx = browser.new_context()
        ctx.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={}))
        tab = ctx.new_page()
        tab.on('pageerror', lambda error: errors.append(str(error)))
        for stage in range(1,18):
            tab.goto(base + f'?numero={stage}')
            assert tab.locator('#lista-etapas a').count() == 17
            assert tab.locator('[aria-current="step"]').get_attribute('href') == f'etapa.html?numero={stage}'
            assert tab.locator('#botao-proxima').get_attribute('href') == (f'etapa.html?numero={stage+1}' if stage<17 else 'index.html')
            if stage == 1:
                tab.wait_for_function('document.querySelector("#mapa-selecionar-centro").disabled === false')
                tab.locator('#mapa-selecionar-centro').click()
                tab.locator('#ponto-endereco').fill('Ponto de teste isolado')
                tab.locator('#ponto-salvar').click()
                assert tab.locator('#pontos-corpo tr[data-id]').count() == 1
            if stage in (3,7):
                tab.select_option('#consulta-tecnica','jardim-chuva')
                tab.select_option('#consulta-variante','jardim-impermeavel')
                assert tab.locator('#consulta-detalhes img').count() == 1
                if stage == 7:
                    assert 'Obrigatoriedade de exutório.' in tab.locator('#consulta-detalhes').inner_text()
        assert not errors, errors
        browser.close()
        print('OK: falhas de armazenamento, navegação das 17 etapas e regressão das Etapas 1, 3 e 7.')
finally:
    server.shutdown()
    server.server_close()
