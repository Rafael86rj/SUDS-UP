"""Verificação local: python tests/validar-tecnicas.py [arquivo-do-pedido.txt].

Requer Playwright para Python e Chromium instalados. O servidor usa apenas
localhost e é encerrado após o teste; nenhum dado de estudo é persistido.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import sys
import shutil
from threading import Thread
from urllib.parse import quote
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect


# ------------------------------------------------------------
# CONSULTA, CONTEXTO DE NAVEGAÇÃO E ISOLAMENTO DO ESTUDO
# ------------------------------------------------------------
def validar_navegacao(browser, base):
    """Confere ida/volta, memória por sessão e ausência de escrita em dados do estudo."""
    for largura in [1440, 390]:
        contexto = browser.new_context(viewport={'width': largura, 'height': 900})
        pagina = contexto.new_page()
        erros = []
        pagina.on('pageerror', lambda erro: erros.append(str(erro)))
        pagina.goto(f'{base}?numero=7')
        expect(pagina.locator('#consulta-tecnica')).to_have_value('')
        expect(pagina.locator('#consulta-variante')).to_be_disabled()
        assert pagina.locator('#consulta-variante option, #consulta-detalhes img, [data-regra]').count() == 0
        # Sentinelas preexistentes: até uma fonte incompatível deve ser preservada
        # integralmente por telas que consultam somente o catálogo, não o estudo.
        fontes = {f'suds-up:etapa-{etapa}:{nome}:v1': f'preservar-{etapa}' for etapa, nome in
                  [(8, 'possibilidades'), (11, 'revisao-campo'), (13, 'cenario')]}
        pagina.evaluate('(dados) => Object.entries(dados).forEach(([k,v]) => localStorage.setItem(k,v))', fontes)
        pagina.goto(f'{base}?numero=3')
        pagina.select_option('#consulta-tecnica', 'jardim-chuva')
        pagina.select_option('#consulta-variante', 'jardim-impermeavel')
        pagina.locator('#consulta-detalhes > a').click()
        expect(pagina.locator('#consulta-tecnica')).to_have_value('jardim-chuva')
        expect(pagina.locator('#consulta-variante')).to_have_value('jardim-impermeavel')
        pagina.select_option('#consulta-tecnica', 'pavimentos-permeaveis')
        pagina.select_option('#consulta-variante', 'pavimento-com-fundo-impermeavel')
        voltar = pagina.get_by_role('link', name='← Voltar ao catálogo na Etapa 3', exact=True)
        voltar.focus()
        pagina.keyboard.press('Enter')
        expect(pagina.locator('#consulta-tecnica')).to_have_value('pavimentos-permeaveis')
        expect(pagina.locator('#consulta-variante')).to_have_value('pavimento-com-fundo-impermeavel')
        pagina.locator('#botao-proxima').click()
        assert 'numero=4' in pagina.url
        pagina.locator('#botao-anterior').click()
        expect(pagina.locator('#consulta-variante')).to_have_value('pavimento-com-fundo-impermeavel')
        pagina.reload()
        expect(pagina.locator('#consulta-variante')).to_have_value('pavimento-com-fundo-impermeavel')
        pagina.goto(f'{base}?numero=6')
        pagina.locator('#botao-proxima').click()
        expect(pagina.locator('#consulta-tecnica')).to_have_value('')
        expect(pagina.locator('#consulta-variante')).to_be_disabled()
        assert pagina.locator('[data-regra], #consulta-detalhes img').count() == 0
        pagina.select_option('#consulta-tecnica', 'jardim-chuva')
        assert pagina.locator('[data-regra]').count() > 0
        pagina.select_option('#consulta-tecnica', '')
        assert pagina.locator('[data-regra], #consulta-detalhes img').count() == 0
        expect(pagina.locator('#consulta-variante')).to_be_disabled()
        expect(pagina.locator('#botao-anterior')).to_have_attribute('href', 'etapa.html?numero=6')
        pagina.locator('#botao-anterior').click()
        assert 'numero=6' in pagina.url
        assert pagina.evaluate('Object.fromEntries(Object.entries(localStorage))') == fontes
        # URL explícita prevalece sobre a sessão; IDs desconhecidos na Etapa 7
        # não podem selecionar a primeira técnica silenciosamente.
        pagina.goto(f'{base}?numero=3&tecnica=bacia-detencao&variante=bacia-impermeavel')
        expect(pagina.locator('#consulta-variante')).to_have_value('bacia-impermeavel')
        pagina.goto(f'{base}?numero=7&tecnica=inexistente&variante=bacia-permeavel')
        expect(pagina.locator('#consulta-tecnica')).to_have_value('')
        pagina.evaluate("sessionStorage.setItem('suds-up:interface:catalogo:consulta:v1', '{')")
        pagina.goto(f'{base}?numero=3')
        expect(pagina.locator('#consulta-tecnica')).to_have_value('bacia-detencao')
        # O bloqueio da sessão não impede consultar nem navegar com contexto.
        pagina.add_init_script("Object.defineProperty(window, 'sessionStorage', {get() { throw new Error('bloqueado'); }});")
        pagina.goto(f'{base}?numero=3&tecnica=jardim-chuva&variante=jardim-impermeavel')
        pagina.locator('#consulta-detalhes > a').click()
        expect(pagina.locator('#consulta-variante')).to_have_value('jardim-impermeavel')
        pagina.get_by_role('link', name='← Voltar ao catálogo na Etapa 3', exact=True).click()
        expect(pagina.locator('#consulta-variante')).to_have_value('jardim-impermeavel')
        assert pagina.evaluate('Object.fromEntries(Object.entries(localStorage))') == fontes
        assert not erros, erros
        contexto.close()
        print(f'OK: navegacao 3/7, estado neutro, sessao, teclado, fontes preservadas e falhas em {largura}px.')


# ------------------------------------------------------------
# SERVIDOR LOCAL E NAVEGADOR
# ------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, outputfile):
        # Blocos pequenos evitam grandes escritas de socket no servidor Windows.
        shutil.copyfileobj(source, outputfile, length=16 * 1024)


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}/etapa.html"

try:
    for image_path in (ROOT / 'assets/images/tecnicas').glob('*.png'):
        with urlopen(f'http://127.0.0.1:{server.server_port}/assets/images/tecnicas/{quote(image_path.name)}', timeout=10) as response:
            assert response.read() == image_path.read_bytes()
    print('OK: seis pranchas servidas integralmente por HTTP.', flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        validar_navegacao(browser, base)
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("requestfailed", lambda request: print(f'Falha de recurso: {request.url}: {request.failure}', flush=True))
        page.on("response", lambda response: print(f'HTTP {response.status}: {response.url}', flush=True) if response.status >= 400 else None)
        page.goto(f"{base}?numero=7")
        techniques = page.evaluate("TECNICAS_SUDS")
        rules = page.evaluate("REGRAS_SUDS")

        # ------------------------------------------------------------
        # INTEGRIDADE E FIDELIDADE DOS DADOS
        # ------------------------------------------------------------
        assert len({r['id'] for r in rules}) == 37
        for category, count in [('geral', 15), ('com-infiltracao', 19), ('sem-infiltracao', 3)]:
            assert sum(r['categoria'] == category for r in rules) == count
        assert all(r['fonte']['arquivo'] == 'SUDS-UP_Final.xlsx' for r in rules)
        assert all(r['fonte']['aba'] == '7 - Restr. Gerais Fis-Urb ' for r in rules)
        if len(sys.argv) > 1:
            source = Path(sys.argv[1]).read_text(encoding='utf-8-sig')
            extracted = dict(re.findall(r'^- ([A-Z]\d+): (.*(?:\n  .*\S)*)', source, re.M))
            assert len(extracted) == 34
            for rule in rules:
                cell = rule['fonte']['celula']
                if cell in extracted:
                    assert rule['texto'] == ' '.join(extracted[cell].split()), cell
                else:
                    assert rule['texto'] == 'Obrigatoriedade de exutório.'
            print('OK: 34 restrições conferidas palavra por palavra contra o pedido.')

        expected = {'bacia-detencao': (1, 3), 'biovaleta': (4, 3),
                    'pavimentos-permeaveis': (2, 4), 'trincheira-infiltracao': (4, 6),
                    'jardim-chuva': (4, 3)}
        for technique in techniques:
            if technique['id'] in ('biovaleta', 'trincheira-infiltracao'):
                assert len(technique['variantes']) == 1
                assert technique['variantes'][0]['infiltracao']
            for variant in technique['variantes']:
                assert (ROOT / 'assets/images/tecnicas' / variant['imagem']).is_file()

        # ------------------------------------------------------------
        # TROCAS DE TÉCNICA, VARIANTES E LINKS DO CATÁLOGO
        # ------------------------------------------------------------
        for width in (1440, 390):
            page.set_viewport_size({'width': width, 'height': 900})
            for stage in (3, 7):
                page.goto(f'{base}?numero={stage}')
                for technique in techniques:
                    page.select_option('#consulta-tecnica', technique['id'])
                    for variant in technique['variantes']:
                        print(f'Verificando: {width}px, etapa {stage}, {variant["id"]}', flush=True)
                        if len(technique['variantes']) > 1:
                            page.select_option('#consulta-variante', variant['id'])
                        assert page.locator('#consulta-detalhes h3').inner_text() == f"{technique['nome']} — {variant['nome']}"
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        # A mesma prancha é atualizada nas duas telas; o link de
                        # navegação continua exclusivo da Etapa 3.
                        image = page.locator('#consulta-detalhes img')
                        assert image.count() == 1
                        page.wait_for_function('document.querySelector("#consulta-detalhes img").complete && document.querySelector("#consulta-detalhes img").naturalWidth > 0')
                        image.evaluate('(img) => img.decode()')
                        assert image.get_attribute('src') == f"assets/images/tecnicas/{quote(variant['imagem'])}"
                        assert image.get_attribute('alt') == f"Prancha de {technique['nome']} — {variant['nome']}, com ilustrações, legendas e atribuições da fonte."
                        assert image.evaluate('(img) => Math.abs(img.width / img.height - img.naturalWidth / img.naturalHeight) < 0.01')
                        zoom = page.locator('.consulta-tecnicas__prancha a')
                        assert zoom.get_attribute('href') == image.get_attribute('src')
                        assert zoom.get_attribute('target') == '_blank'
                        with page.expect_popup() as opened:
                            zoom.click()
                        popup = opened.value
                        popup.wait_for_load_state()
                        assert popup.url == image.evaluate('(img) => img.src')
                        assert popup.locator('img').evaluate('(img) => img.complete && img.naturalWidth > 0')
                        popup.close()
                        if stage == 3:
                            link = page.locator('#consulta-detalhes > a').get_attribute('href')
                            assert f"tecnica={technique['id']}" in link
                            assert f"variante={variant['id']}" in link
                        else:
                            assert page.locator('#consulta-detalhes > a').count() == 0
                            assert page.locator('#consulta-detalhes').evaluate('(el) => Array.from(el.children).map(child => child.tagName)') == ['H3', 'FIGURE', 'SECTION', 'SECTION', 'P', 'P']
                            general, additional = expected[technique['id']]
                            blocks = page.locator('.consulta-tecnicas__bloco')
                            assert blocks.count() == 2
                            assert blocks.nth(0).locator('li').count() == general
                            assert blocks.nth(1).locator('li').count() == (additional if variant['infiltracao'] else 1)
                            displayed = page.locator('[data-regra]').evaluate_all('(items) => items.map(item => item.dataset.regra)')
                            category = 'com-infiltracao' if variant['infiltracao'] else 'sem-infiltracao'
                            assert set(displayed) == {r['id'] for r in rules if r['tecnica'] == technique['id'] and r['categoria'] in ('geral', category)}
                            if not variant['infiltracao']:
                                assert 'Condição obrigatória:' in blocks.nth(1).inner_text()
                                assert 'Não devem ser usados em:' not in blocks.nth(1).inner_text()
                            assert 'Ariza et al. (2019).' in page.locator('#consulta-detalhes').inner_text()
            print(f'OK: todas as técnicas e variantes nas Etapas 3 e 7 em {width}px.')

        page.goto(f'{base}?numero=3')
        page.select_option('#consulta-tecnica', 'bacia-detencao')
        page.select_option('#consulta-variante', 'bacia-impermeavel')
        page.locator('#consulta-detalhes > a').click()
        assert page.locator('#consulta-variante').input_value() == 'bacia-impermeavel'
        assert 'Obrigatoriedade de exutório.' in page.locator('#consulta-detalhes').inner_text()
        page.locator('#consulta-tecnica').focus()
        page.keyboard.press('ArrowDown')
        page.keyboard.press('Enter')
        assert page.locator('#consulta-tecnica').input_value() == 'biovaleta'
        assert 'Obrigatoriedade de exutório.' not in page.locator('#consulta-detalhes').inner_text()
        page.goto(f'{base}?numero=7&tecnica=biovaleta&variante=jardim-impermeavel')
        assert page.locator('#consulta-variante').input_value() == 'biovaleta-infiltracao'

        # ------------------------------------------------------------
        # NAVEGAÇÃO DAS 17 ETAPAS E REGRESSÃO DO MAPA
        # ------------------------------------------------------------
        for stage in range(1, 18):
            page.goto(f'{base}?numero={stage}')
            assert page.locator('#lista-etapas a').count() == 17
            assert page.locator('[aria-current="step"]').get_attribute('href') == f'etapa.html?numero={stage}'
            assert page.locator('#botao-proxima').get_attribute('href') == (f'etapa.html?numero={stage + 1}' if stage < 17 else 'index.html')
            assert page.locator('#botao-anterior').get_attribute('href') == (f'etapa.html?numero={stage - 1}' if stage > 1 else 'index.html')
            if stage == 1:
                assert page.locator('#mapa-etapa-01').count() == 1
                try:
                    page.wait_for_function('document.querySelector("#mapa-etapa-01").classList.contains("leaflet-container")', timeout=20000)
                    page.locator('#mapa-etapa-01').click(position={'x': 120, 'y': 120})
                    assert page.locator('#mapa-latitude').input_value()
                    assert page.locator('#mapa-longitude').input_value()
                    print('OK: Leaflet inicializado e clique preenche coordenadas.')
                except Exception as error:
                    print(f'LIMITAÇÃO: mapa externo não validado integralmente: {type(error).__name__}')
        assert not errors, errors
        print('OK: navegação das 17 etapas, seleção por teclado, links e ausência de erros JavaScript.')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
