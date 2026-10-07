"""------------------------------------------------------------
SUDS-UP — METADADOS DO ARQUIVO
------------------------------------------------------------
Arquivo: tests/validar-lote-5.py
Módulo: Testes de navegador do Lote 5.
Objetivo: fluxo confirmado, mapa e impressão da Etapa 17.
Responsabilidade: Chromium e storage descartáveis; não usa dados do usuário.
Dependências: Playwright e helpers dos Lotes 3/4.
Utilizado por: python tests/validar-lote-5.py.
Criado em: 07/10/2026
Última revisão: 07/10/2026
------------------------------------------------------------"""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import runpy
import json
from urllib.parse import unquote
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
L3 = runpy.run_path(str(ROOT / 'tests/validar-lote-3.py'))
L4 = runpy.run_path(str(ROOT / 'tests/validar-lote-4.py'))


# ------------------------------------------------------------
# NAVEGAÇÃO E SNAPSHOT SOMENTE DO PERFIL DESCARTÁVEL
# ------------------------------------------------------------
def visitar(page, base, etapa):
    """Abre etapa e aguarda o módulo funcional, sem alterar fontes."""
    page.goto(f'{base}?numero={etapa}')
    page.wait_for_selector('#titulo-etapa')
    if etapa == 17:
        page.wait_for_selector('#resumo-imprimir')


def snapshot(page):
    """Retorna os valores brutos para verificar ausência de escrita."""
    return page.evaluate('Object.fromEntries(Object.entries(localStorage))')


# ------------------------------------------------------------
# ENQUADRAMENTO VISUAL SEM DEPENDER DOS TILES
# ------------------------------------------------------------
def enquadramento(page):
    """Confere todos os vetores dentro do mapa após redimensionar ou imprimir."""
    page.wait_for_function('''() => {
        const mapa = document.querySelector('#resumo-mapa').getBoundingClientRect();
        return [...document.querySelectorAll('#resumo-mapa path.leaflet-interactive')].every(el => {
            const r = el.getBoundingClientRect();
            return r.left >= mapa.left && r.top >= mapa.top && r.right <= mapa.right && r.bottom <= mapa.bottom;
        });
    }''')


# ------------------------------------------------------------
# FLUXO REAL DE CONFIRMAÇÃO NAS FONTES
# ------------------------------------------------------------
def fluxo(browser, base, largura):
    """Confirma todas as fontes pela UI e verifica resumo, teclado e impressão."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    ctx.route('https://tile.openstreetmap.org/**', L3['tile'])
    ctx.route('https://nominatim.openstreetmap.org/**', lambda route: route.fulfill(json={'display_name': 'Referência de teste'}))
    page = ctx.new_page()
    erros = []
    page.on('pageerror', lambda erro: erros.append(str(erro)))
    page.on('console', lambda msg: erros.append(msg.text) if msg.type == 'error' and 'favicon' not in msg.text else None)
    visitar(page, base, 1)
    page.wait_for_function('document.querySelector("#mapa-buscar")?.disabled === false')
    page.locator('#mapa-etapa-01').click(position={'x': 100, 'y': 100})
    page.locator('#ponto-endereco').fill('Rua de teste')
    page.locator('#ponto-descricao').fill('Alagamento observado <script>literal</script>')
    page.locator('#ponto-salvar').click()
    expect(page.locator('#ponto-salvamento')).to_contain_text('salvo')
    for etapa in [2, 6]:
        L3['visitar'](page, base, etapa)
        if etapa == 6:
            page.locator('#geo-identificacao').fill('Praça final')
        L3['desenhar'](page)
        page.get_by_role('button', name='Salvar delimitação' if etapa == 2 else 'Adicionar espaço', exact=True).click()
        expect(page.locator('#geo-status')).to_contain_text('salv')
    visitar(page, base, 4)
    page.locator('#cond-urbanas-observacao').fill('Verificar acesso')
    page.get_by_role('button', name='Salvar condicionantes', exact=True).click()
    expect(page.locator('#condicionantes-status')).to_contain_text('salvas')
    L4['visitar'](page, base, 5)
    L4['preencher_inventario'](page)
    page.locator('#mapeamento-salvar').click()
    expect(page.locator('#mapeamento-status')).to_contain_text('salvo')
    L3['visitar'](page, base, 8)
    page.select_option('#espaco-origem', index=1)
    page.get_by_role('button', name='Adicionar espaço da Etapa 6', exact=True).click()
    variante = page.locator('#lote2-possiveis input').first.get_attribute('value')
    page.locator('#lote2-possiveis input').first.check()
    page.get_by_role('button', name='Adicionar área', exact=True).click()
    expect(page.locator('#lote2-status')).to_contain_text('Área salva')
    L3['visitar'](page, base, 10)
    page.locator('#lote2-observacoes').fill('Visita confirmada')
    page.get_by_role('button', name='Salvar vistoria', exact=True).click()
    L3['visitar'](page, base, 11)
    page.select_option('#lote2-selecionado', variante)
    page.locator('#lote2-motivo').fill('Decisão do projetista')
    page.get_by_role('button', name='Salvar decisão pós-campo', exact=True).click()
    L3['visitar'](page, base, 12)
    expect(page.locator('#geo-mapa path.leaflet-interactive')).to_have_count(1)
    L4['visitar'](page, base, 13)
    page.select_option('#pre-variante', 'jardim-permeavel')
    page.locator('#pre-area').fill('100')
    page.locator('#pre-profundidade').fill('0,5')
    page.locator('#pre-vazios').fill('0,9')
    page.locator('#pre-salvar').click()
    L4['confirmar_bacia'](page, base)
    L4['visitar'](page, base, 15)
    page.select_option('#chuva-posto', 'jardim-botanico')
    page.locator('#chuva-salvar').click()
    expect(page.locator('#chuva-status')).to_contain_text('confirmad')
    L4['visitar'](page, base, 16)
    expect(page.locator('#chuva-volume')).to_have_text('11.079,47 m³')
    fontes = snapshot(page)
    visitar(page, base, 17)
    expect(page.locator('#resumo-mapa .resumo-ponto')).to_have_count(1)
    expect(page.locator('#resumo-mapa .resumo-bacia')).to_have_count(1)
    expect(page.locator('#resumo-mapa .resumo-tecnica')).to_have_count(1)
    expect(page.locator('#avaliacao-capacidade')).to_have_text('45,00 m³')
    expect(page.locator('#resumo-deficit')).to_contain_text('11.034,47 m³')
    expect(page.locator('#resumo-area')).to_contain_text('Verificar acesso')
    expect(page.locator('#resumo-area')).to_contain_text('1 com lacuna')
    expect(page.locator('#resumo-tecnicas')).to_contain_text('Decisão do projetista')
    expect(page.locator('#resumo-chuva')).to_contain_text('117,30 mm/h')
    expect(page.locator('#resumo-chuva')).to_contain_text('10 anos')
    assert page.locator('#resumo-area script').count() == 0
    assert snapshot(page) == fontes
    assert page.evaluate('() => { const ids = [...document.querySelectorAll("[id]")].map(el => el.id); return ids.length === new Set(ids).size; }')
    enquadramento(page)
    L4['layout'](page)
    page.evaluate('() => { window.impressoes = 0; window.print = () => { window.impressoes++; }; }')
    page.locator('#resumo-imprimir').focus()
    expect(page.locator('#resumo-imprimir')).to_be_focused()
    page.keyboard.press('Enter')
    page.wait_for_function('window.impressoes === 1')
    page.emulate_media(media='print')
    page.set_viewport_size({'width': 794, 'height': 1123})
    expect(page.locator('.menu-lateral')).to_be_hidden()
    expect(page.locator('.rodape-etapa')).to_be_hidden()
    expect(page.locator('#resumo-imprimir')).to_be_hidden()
    expect(page.locator('.leaflet-control-zoom')).to_be_hidden()
    for secao in ['avaliacao', 'mapa', 'area', 'tecnicas', 'chuva', 'conclusao', 'disponibilidade']:
        expect(page.locator('#resumo-' + secao)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    enquadramento(page)
    page.emulate_media(media='screen')
    page.set_viewport_size({'width': largura, 'height': 1000})
    assert snapshot(page) == fontes
    # Alteração confirmada na fonte física invalida somente a avaliação atual.
    L4['confirmar_bacia'](page, base, {**L4['BACIA'], 'areaTotal': '1039588'})
    visitar(page, base, 17)
    expect(page.locator('#avaliacao-resultado')).to_contain_text('Avaliação pendente')
    expect(page.locator('#resumo-chuva')).to_contain_text('desatualizada')
    assert not erros, erros
    ctx.close()
    return fontes


# ------------------------------------------------------------
# COMBINAÇÕES PARCIAIS, REDE E AUDITORIA DAS 17 TELAS
# ------------------------------------------------------------
def parciais(browser, base, fontes):
    """Retira fontes em fixtures isoladas; verifica oito estados e leitura segura."""
    for mask in range(8):
        ctx = browser.new_context()
        ctx.route('https://tile.openstreetmap.org/**', L3['tile'])
        page = ctx.new_page()
        page.goto(base)
        dados = {k: v for k, v in fontes.items() if not (
            (':etapa-1:' in k and not mask & 1) or
            (':etapa-2:' in k and not mask & 2) or
            (':etapa-11:' in k and not mask & 4))}
        page.evaluate('(dados) => { localStorage.clear(); for (const [k,v] of Object.entries(dados)) localStorage.setItem(k,v); }', dados)
        visitar(page, base, 17)
        if mask:
            expect(page.locator('#resumo-mapa path.leaflet-interactive')).to_have_count(mask.bit_count())
        else:
            expect(page.locator('#resumo-mapa-status')).to_have_text('Não há informações geográficas confirmadas para compor o mapa final.')
            assert page.locator('script[src*="leaflet"]').count() == 0
        assert snapshot(page) == dados
        ctx.close()
    ctx = browser.new_context()
    ctx.route('https://unpkg.com/**', lambda route: route.abort())
    page = ctx.new_page()
    page.goto(base)
    page.evaluate('(dados) => { for (const [k,v] of Object.entries(dados)) localStorage.setItem(k,v); }', fontes)
    visitar(page, base, 17)
    expect(page.locator('#resumo-mapa-status')).to_contain_text('Não foi possível')
    expect(page.locator('#resumo-area')).to_contain_text('Rua de teste')
    expect(page.locator('#avaliacao-capacidade')).to_have_text('45,00 m³')
    assert snapshot(page) == fontes
    ctx.close()
    ctx = browser.new_context()
    ctx.route('https://tile.openstreetmap.org/**', L3['tile'])
    page = ctx.new_page()
    erros = []
    page.on('pageerror', lambda erro: erros.append(str(erro)))
    for etapa in range(1, 18):
        visitar(page, base, etapa)
        expect(page.locator('#area-trabalho')).not_to_contain_text('Carregando')
        texto = page.locator('#area-trabalho').inner_text()
        assert 'Nova linha' not in texto and 'A definir' not in texto, (etapa, texto)
        anterior = 'index.html' if etapa == 1 else f'etapa.html?numero={etapa - 1}'
        proxima = 'index.html' if etapa == 17 else f'etapa.html?numero={etapa + 1}'
        assert page.locator('#botao-anterior').get_attribute('href') == anterior
        assert page.locator('#botao-proxima').get_attribute('href') == proxima
        L4['layout'](page)
    assert not erros, erros
    ctx.close()


# ------------------------------------------------------------
# PRANCHAS, REGIMES, TEXTO SEGURO E TR DECIMAL
# ------------------------------------------------------------
def ilustracoes(browser, base, fontes, largura):
    """Confere variantes reais e impressão; fixtures alteram só o perfil de teste."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    ctx.route('https://tile.openstreetmap.org/**', L3['tile'])
    page = ctx.new_page()
    page.goto(base)
    page.evaluate('(dados) => { for (const [k,v] of Object.entries(dados)) localStorage.setItem(k,v); }', fontes)
    variantes = page.evaluate('TECNICAS_SUDS.flatMap(t => t.variantes.map(v => ({...v, nome: t.nome + " — " + v.nome})))')
    for variante in variantes:
        decisoes = json.loads(fontes[L3['KEYS'][11]])
        decisoes['decisoes'][0].update(selecionado=variante['id'], possiveis=[variante['id']],
            motivo='Motivo <script>literal</script>', restricaoProjetual='Restrição preservada', observacoes='Anotação pós-campo')
        page.evaluate('([k,v]) => localStorage.setItem(k,v)', [L3['KEYS'][11], json.dumps(decisoes)])
        antes = snapshot(page)
        visitar(page, base, 17)
        card = page.locator('.resumo-tecnica-card')
        expect(card).to_have_count(1)
        img = card.locator('img')
        expect(img).to_have_attribute('alt', variante['nome'])
        assert unquote(img.get_attribute('src')) == 'assets/images/tecnicas/' + variante['imagem']
        page.wait_for_function('document.querySelector(".resumo-tecnica-card img")?.naturalWidth > 0')
        expect(card.locator('h5')).to_have_text(variante['nome'])
        expect(card).to_contain_text('Descrição técnica: consulte a prancha da técnica.')
        expect(card).to_contain_text('Observação: ' + ('Com' if variante['infiltracao'] else 'Sem') + ' infiltração.')
        for texto in ['Motivo <script>literal</script>', 'Restrição preservada', 'Observações pós-campo: Anotação pós-campo', 'Área: Área 1']:
            expect(card).to_contain_text(texto)
        assert card.locator('script').count() == 0
        assert page.locator('.resumo-intervencao img').count() == 0
        assert img.evaluate('(el) => getComputedStyle(el).objectFit') == 'contain'
        imagem, texto = img.bounding_box(), card.locator('.resumo-tecnica-texto').bounding_box()
        assert imagem['x'] < texto['x'] if largura > 1050 else imagem['y'] + imagem['height'] <= texto['y']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert snapshot(page) == antes
    page.emulate_media(media='print')
    page.set_viewport_size({'width': 794, 'height': 1123})
    expect(card).to_be_visible()
    expect(img).to_be_visible()
    assert card.evaluate('(el) => getComputedStyle(el).breakInside') == 'avoid'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.emulate_media(media='screen')
    # TR fracionário confirmado pela própria Etapa 15, sem alterar sua fórmula.
    L4['visitar'](page, base, 15)
    page.locator('#chuva-TR').fill('10,123456789')
    page.locator('#chuva-salvar').click()
    expect(page.locator('#chuva-status')).to_contain_text('confirmad')
    antes = snapshot(page)
    visitar(page, base, 17)
    expect(page.locator('#resumo-chuva')).to_contain_text('10,123456789 anos')
    assert snapshot(page) == antes
    assert json.loads(antes[L4['CHAVES'][15]])['TR'] == 10.123456789
    # Falha de imagem não oculta a identificação nem qualquer campo da decisão.
    ctx.route('**/assets/images/tecnicas/**', lambda route: route.abort())
    page.reload()
    expect(page.locator('.resumo-tecnica-card figcaption')).to_contain_text('Prancha indisponível')
    for texto in ['Anotação pós-campo', 'Restrição preservada', 'Motivo <script>literal</script>']:
        expect(page.locator('.resumo-tecnica-card')).to_contain_text(texto)
    page.emulate_media(media='print')
    expect(page.locator('.resumo-tecnica-card')).to_be_visible()
    assert snapshot(page) == antes
    ctx.close()
    print(f'OK: oito variantes, pranchas/alt/regimes, campos, TR decimal, falha de imagem e impressão em {largura}px.', flush=True)


# ------------------------------------------------------------
# EXECUÇÃO LOCAL COM LIBERAÇÃO DOS RECURSOS
# ------------------------------------------------------------
def main():
    """Executa fluxo nas três larguras e encerra servidor/navegador."""
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(L4['Handler'], directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/etapa.html'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for largura in [1440, 900, 390]:
                fontes = fluxo(browser, base, largura)
                ilustracoes(browser, base, fontes, largura)
                print(f'OK: fluxo confirmado, resumo/mapa/print/teclado e storage em {largura}px', flush=True)
            parciais(browser, base, fontes)
            browser.close()
            print('OK: oito combinações, falha de CDN e auditoria das 17 etapas.', flush=True)
    finally:
        server.shutdown()


if __name__ == '__main__':
    main()
