"""------------------------------------------------------------
SUDS-UP — METADADOS DO ARQUIVO
Arquivo: tests/validar-lote-3.py
Módulo: Integração geoespacial do Lote 3
Objetivo: Exercitar desenho, persistência e integrações em três larguras.
Responsabilidade: Fluxos reais de UI em perfil isolado e falhas controladas.
Dependências: Playwright/Chromium já usados; servidor e helpers do teste Lote 2.
Utilizado por: python -u tests/validar-lote-3.py.
Criado em: 04/10/2026
Última revisão: 05/10/2026
------------------------------------------------------------"""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import math
import runpy
import base64
from playwright.sync_api import sync_playwright, expect

# Reutiliza somente infraestrutura de teste, sem executar o main do Lote 2.
ROOT = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(ROOT / 'tests' / 'validar-lote-2.py'))
Handler = helpers['Handler']
observar_erros = helpers['observar_erros']
aceitar = helpers['aceitar']
KEYS = {2: 'suds-up:etapa-2:bacia:v1', 6: 'suds-up:etapa-6:espacos-livres:v1',
        8: 'suds-up:etapa-8:possibilidades:v1', 10: 'suds-up:etapa-10:visita-campo:v1',
        11: 'suds-up:etapa-11:revisao-campo:v1', 13: 'suds-up:etapa-13:cenario:v1',
        14: 'suds-up:etapa-14:bacia:v1'}
TILE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=')


# ------------------------------------------------------------
# TILES CONTROLADOS SEM CONSULTAR SERVIÇO DE ENDEREÇOS
# ------------------------------------------------------------
def tile(route):
    """Serve imagem mínima para testar Leaflet real sem sobrecarregar OSM."""
    route.fulfill(status=200, content_type='image/png', body=TILE)


# ------------------------------------------------------------
# FALHA DE REDE DELIBERADA
# ------------------------------------------------------------
def abortar(route):
    """Interrompe somente a requisição indicada pelo caso de falha."""
    route.abort()


# ------------------------------------------------------------
# LEITURA DE CHAVE SEM MODIFICAR DADOS
# ------------------------------------------------------------
def ler(page, etapa):
    """Retorna texto original para verificar preservação byte a byte."""
    return page.evaluate("""
        // ------------------------------------------------------------
        // LEITURA DO CONTEXTO DESCARTÁVEL
        // ------------------------------------------------------------
        /** @param {string} chave Chave. @returns {string|null} Texto; sem escrita. */
        (function(chave) { return localStorage.getItem(chave); })
    """, KEYS[etapa])


# ------------------------------------------------------------
# FIXTURE SOMENTE NO PERFIL TEMPORÁRIO
# ------------------------------------------------------------
def escrever(page, etapa, texto):
    """Insere JSON ou texto incompatível exclusivamente no contexto de teste."""
    page.evaluate("""
        // ------------------------------------------------------------
        // PREPARAÇÃO CONTROLADA DA ORIGEM
        // ------------------------------------------------------------
        /** @param {Array} dados Chave e texto. @returns {void} Grava fixture isolada. */
        (function(dados) { localStorage.setItem(dados[0], dados[1]); })
    """, [KEYS[etapa], texto])


# ------------------------------------------------------------
# NAVEGAÇÃO E ESPERA DA INTERFACE
# ------------------------------------------------------------
def visitar(page, base, etapa, mapa=True):
    """Abre etapa e espera seu módulo; mapa=False permite testar rede indisponível."""
    page.goto(f'{base}?numero={etapa}')
    if etapa in [2, 6, 9, 12]:
        page.wait_for_selector('#lote-3-conteudo.lote-3')
        if mapa:
            seletor = '#geo-mapa.leaflet-container'
            if etapa in [9, 12]:
                seletor += ', #geo-estado-vazio:not([hidden])'
            page.wait_for_selector(seletor, timeout=20000)
            # A classe Leaflet surge antes de o adaptador terminar de montar camadas.
            if page.locator('#geo-mapa').is_visible():
                expect(page.locator('#geo-mapa-status')).not_to_contain_text('Carregando mapa', timeout=20000)
    elif etapa in [8, 10, 11]:
        page.wait_for_selector('#lote2-formulario')
    elif etapa == 14:
        page.wait_for_selector('#bacia-formulario')
    else:
        page.wait_for_selector('#pre-formulario')


# ------------------------------------------------------------
# DESENHO REAL POR CAMPOS OU CLIQUES
# ------------------------------------------------------------
def desenhar(page, cliques=False, deslocamento=0):
    """Inicia e fecha contorno por controles nativos, sem gravar diretamente."""
    page.get_by_role('button', name='Iniciar / refazer desenho', exact=True).click()
    if cliques:
        mapa = page.locator('#geo-mapa')
        mapa.scroll_into_view_if_needed()
        tamanho = mapa.bounding_box()
        for x, y in [(.35, .35), (.7, .35), (.7, .7), (.35, .7)]:
            mapa.click(position={'x': tamanho['width'] * x, 'y': tamanho['height'] * y})
    else:
        for lat, lon in [(-22.907, -43.174), (-22.907, -43.173), (-22.906, -43.173), (-22.906, -43.174)]:
            page.locator('#geo-latitude').fill(str(lat + deslocamento).replace('.', ','))
            page.locator('#geo-longitude').fill(str(lon))
            page.get_by_role('button', name='Adicionar coordenadas', exact=True).click()
    page.get_by_role('button', name='Fechar polígono', exact=True).click()
    expect(page.locator('#geo-area')).to_contain_text('Área do rascunho:')


# ------------------------------------------------------------
# ENVIO POR TECLADO
# ------------------------------------------------------------
def salvar(page, nome, status, texto):
    """Aciona Enter no botão e espera confirmação acessível."""
    page.get_by_role('button', name=nome, exact=True).focus()
    page.keyboard.press('Enter')
    expect(page.locator(status)).to_have_text(texto)


# ------------------------------------------------------------
# RESPONSIVIDADE E NAVEGAÇÃO COMUM
# ------------------------------------------------------------
def layout(page):
    """Verifica overflow, atribuição, controles e modal por teclado."""
    assert page.evaluate("""
        // ------------------------------------------------------------
        // LARGURA REAL DA PÁGINA
        // ------------------------------------------------------------
        /** @returns {boolean} Ausência de overflow global, sem efeitos externos. */
        (function() { return document.documentElement.scrollWidth <= innerWidth + 1; })
    """)
    assert page.locator('#lista-etapas a').count() == 17
    # A restauração textual acontece antes da carga assíncrona do Leaflet.
    expect(page.locator('.leaflet-control-attribution')).to_be_visible(timeout=20000)
    assert 'OpenStreetMap' in page.locator('.leaflet-control-attribution').inner_text()
    page.locator('#abrir-orientacao-icone').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#modal-orientacao')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.locator('#modal-orientacao')).to_be_hidden()


# ------------------------------------------------------------
# FLUXO COMPLETO DAS INTEGRAÇÕES
# ------------------------------------------------------------
def fluxo(browser, base, largura):
    """Percorre 2/14/6/8/9/10/11/12/13 em perfil isolado; retorna fixtures."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    ctx.route('https://tile.openstreetmap.org/**', tile)
    page = ctx.new_page()
    erros, consultas = [], []
    observar_erros(page, erros)
    # ------------------------------------------------------------
    # DETECÇÃO DE GEOCODIFICAÇÃO INDEVIDA
    # ------------------------------------------------------------
    def requisicao(request):
        """Acumula chamadas a Nominatim para garantir que os polígonos não buscam endereço."""
        if 'nominatim' in request.url:
            consultas.append(request.url)
    page.on('request', requisicao)
    visitar(page, base, 2)
    assert ler(page, 2) is None
    page.get_by_role('button', name='Iniciar / refazer desenho', exact=True).click()
    page.get_by_role('button', name='Fechar polígono', exact=True).click()
    expect(page.locator('#geo-geometria-erro')).to_contain_text('3 vértices')
    expect(page.locator('#geo-vertices')).to_be_focused()
    page.locator('#geo-latitude').fill('91')
    page.locator('#geo-longitude').fill('0')
    page.get_by_role('button', name='Adicionar coordenadas', exact=True).click()
    expect(page.locator('#geo-latitude')).to_have_attribute('aria-invalid', 'true')
    # O centro do mapa é acionável sem mouse; desfazer/cancelar nunca salva.
    page.locator('#geo-mapa').focus()
    page.keyboard.press('ArrowRight')
    page.get_by_role('button', name='Adicionar vértice no centro do mapa', exact=True).focus()
    page.keyboard.press('Enter')
    assert page.locator('#geo-vertices li').count() == 1
    page.get_by_role('button', name='Desfazer último vértice', exact=True).click()
    assert page.locator('#geo-vertices li').count() == 0
    page.get_by_role('button', name='Cancelar desenho', exact=True).click()
    assert ler(page, 2) is None
    desenhar(page)
    assert ler(page, 2) is None
    salvar(page, 'Salvar delimitação', '#geo-status', 'Delimitação da bacia salva neste navegador.')
    bacia = json.loads(ler(page, 2))
    esperado = 6371008.8 ** 2 * math.radians(.001) * abs(math.sin(math.radians(-22.906)) - math.sin(math.radians(-22.907)))
    assert math.isclose(bacia['areaM2'], esperado, rel_tol=1e-8)
    page.reload()
    page.wait_for_selector('#geo-registros article')
    assert json.loads(ler(page, 2)) == bacia
    page.get_by_role('button', name='Editar delimitação', exact=True).click()
    page.get_by_role('button', name='Cancelar desenho', exact=True).click()
    assert json.loads(ler(page, 2)) == bacia
    layout(page)

    # A integração 2 -> 14 só altera o rascunho do campo total.
    dados14 = {'versao': 1, 'areaTotal': 123, 'areaVegetada': 1, 'comprimentoTalvegue': 10, 'cotaMaxima': 5, 'cotaMinima': -2}
    escrever(page, 14, json.dumps(dados14))
    visitar(page, base, 14)
    original14 = ler(page, 14)
    expect(page.locator('#bacia-areaTotal')).to_have_value('123')
    page.get_by_role('button', name='Usar área delimitada na Etapa 2', exact=True).click()
    assert float(page.locator('#bacia-areaTotal').input_value().replace(',', '.')) == bacia['areaM2']
    for campo in ['areaVegetada', 'comprimentoTalvegue', 'cotaMaxima', 'cotaMinima']:
        assert page.locator('#bacia-' + campo).input_value() == str(dados14[campo])
    assert ler(page, 14) == original14
    salvar(page, 'Salvar dados da bacia', '#bacia-status', 'Dados da bacia salvos neste navegador.')
    confirmado14 = ler(page, 14)
    visitar(page, base, 2)
    desenhar(page, deslocamento=.01)
    salvar(page, 'Salvar delimitação', '#geo-status', 'Delimitação da bacia salva neste navegador.')
    visitar(page, base, 14)
    assert ler(page, 14) == confirmado14

    visitar(page, base, 6)
    for i in [1, 2]:
        page.locator('#geo-identificacao').fill(f'Praça {i} <img src=x>')
        page.locator('#geo-observacao').fill('Texto literal <script>sem execução</script>')
        desenhar(page, cliques=i == 2)
        salvar(page, 'Adicionar espaço', '#geo-status', 'Espaço livre salvo neste navegador.')
    espacos = json.loads(ler(page, 6))
    assert len(espacos['espacos']) == 2
    assert page.locator('#geo-registros img').count() == 0
    page.locator('#geo-registros article').first.get_by_role('button', name='Editar delimitação', exact=True).click()
    page.locator('#geo-identificacao').fill('Praça A revisada')
    salvar(page, 'Salvar alterações', '#geo-status', 'Espaço livre salvo neste navegador.')
    revisados = json.loads(ler(page, 6))
    assert revisados['espacos'][0]['id'] == espacos['espacos'][0]['id']
    assert revisados['espacos'][0]['numero'] == 1
    page.reload()
    page.wait_for_selector('#geo-registros article')
    assert page.locator('#geo-registros article').count() == 2
    # A lista é restaurada antes do mapa: aguarda seus dois contornos após F5.
    expect(page.locator('#geo-mapa path.leaflet-interactive')).to_have_count(2, timeout=20000)
    page.locator('#geo-registros article').first.get_by_role('button', name='Localizar no mapa', exact=True).click()
    expect(page.locator('.leaflet-popup-content')).to_contain_text('Praça A revisada')
    layout(page)

    visitar(page, base, 8)
    page.select_option('#espaco-origem', revisados['espacos'][0]['id'])
    page.get_by_role('button', name='Adicionar espaço da Etapa 6', exact=True).click()
    assert ler(page, 8) is None
    expect(page.locator('#lote2-identificacao')).to_have_value('Praça A revisada')
    assert float(page.locator('#lote2-areaDisponivel').input_value().replace(',', '.')) == revisados['espacos'][0]['areaM2']
    page.locator('#lote2-possiveis input').nth(0).check()
    page.locator('#lote2-possiveis input').nth(1).check()
    salvar(page, 'Adicionar área', '#lote2-status', 'Área salva neste navegador.')
    areas = json.loads(ler(page, 8))
    assert areas['areas'][0]['espacoLivreId'] == revisados['espacos'][0]['id']
    assert areas['areas'][0]['id'] != revisados['espacos'][0]['id']
    page.get_by_role('button', name='Adicionar espaço da Etapa 6', exact=True).click()
    expect(page.locator('#espaco-origem-status')).to_contain_text('já foi aproveitado')
    page.locator('#lote2-identificacao').fill('Área manual sem geometria')
    page.locator('#lote2-areaDisponivel').fill('50')
    page.locator('#lote2-possiveis input').nth(1).check()
    salvar(page, 'Adicionar área', '#lote2-status', 'Área salva neste navegador.')
    areas = json.loads(ler(page, 8))
    assert 'espacoLivreId' not in areas['areas'][1]
    fonte8 = ler(page, 8)
    visitar(page, base, 9)
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 1
    expect(page.locator('#geo-consulta')).to_contain_text('Com infiltração')
    expect(page.locator('#geo-consulta')).to_contain_text('Sem infiltração')
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Área manual sem geometria')
    assert ler(page, 8) == fonte8
    layout(page)

    # Antes da decisão final não deve surgir técnica automática no Cenário 1.
    visitar(page, base, 12)
    assert page.locator('#geo-consulta section').nth(2).locator('article').count() == 2
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 0

    visitar(page, base, 10)
    page.locator('#lote2-observacoes').fill('Vistoria realizada')
    salvar(page, 'Salvar vistoria', '#lote2-status', 'Vistoria salva neste navegador.')
    visitar(page, base, 11)
    for i, area in enumerate(areas['areas']):
        page.select_option('#lote2-area', area['id'])
        variante = area['possiveis'][0]
        page.select_option('#lote2-selecionado', variante)
        page.locator('#lote2-motivo').fill(f'Justificativa {i} <script>literal</script>')
        salvar(page, 'Salvar decisão pós-campo', '#lote2-status', 'Decisão pós-campo salva neste navegador.')
    fonte11 = ler(page, 11)
    visitar(page, base, 12)
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 1
    expect(page.locator('#geo-consulta')).to_contain_text('Justificativa 0 <script>literal</script>')
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Área manual sem geometria')
    assert page.locator('#geo-consulta script').count() == 0
    assert ler(page, 11) == fonte11 and ler(page, 8) == fonte8
    layout(page)
    page.get_by_role('link', name='Prosseguir para o pré-dimensionamento', exact=True).click()
    page.wait_for_selector('#pre-formulario')
    assert ler(page, 13) is None
    # Exclusão de geometria preserva o levantamento e a decisão final.
    visitar(page, base, 6)
    page.once('dialog', aceitar)
    page.locator('#geo-registros article').first.get_by_role('button', name='Excluir delimitação', exact=True).click()
    page.locator('#geo-identificacao').fill('Espaço 3')
    desenhar(page)
    salvar(page, 'Adicionar espaço', '#geo-status', 'Espaço livre salvo neste navegador.')
    assert json.loads(ler(page, 6))['espacos'][-1]['numero'] == 3
    visitar(page, base, 8)
    expect(page.locator('#lote2-lista')).to_contain_text('geometria de origem não está mais disponível')
    assert ler(page, 8) == fonte8
    visitar(page, base, 12)
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Praça A revisada')
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 0
    assert ler(page, 11) == fonte11
    assert not consultas, consultas
    assert not erros, erros
    fixtures = {etapa: ler(page, etapa) for etapa in KEYS}
    ctx.close()
    print(f'OK: fluxo completo, rascunhos, mapas, CRUD, teclado e preservacao em {largura}px; sem erros JS ou Nominatim.')
    return fixtures


# ------------------------------------------------------------
# ASSOCIAÇÃO POSTERIOR E DISTINÇÃO DOS DOIS MAPAS
# ------------------------------------------------------------
def correcao_espacial(browser, base, largura, fixtures):
    """Confere vínculo preservando dados, regimes da Etapa 9 e escolhas/legenda da 12."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    ctx.route('https://tile.openstreetmap.org/**', tile)
    page = ctx.new_page()
    erros = []
    observar_erros(page, erros)
    visitar(page, base, 8)
    opcoes = page.locator('#lote2-possiveis input')
    variantes = [opcoes.nth(i).get_attribute('value') for i in range(opcoes.count())]
    nomes = [opcoes.nth(i).locator('..').inner_text() for i in range(opcoes.count())]
    espacos = {'versao': 1, 'proximoNumero': 5, 'espacos': []}
    origem = json.loads(fixtures[6])['espacos'][0]
    for i in range(4):
        espaco = json.loads(json.dumps(origem))
        espaco.update(id=f'espaco-correcao-{i + 1}', numero=i + 1, identificacao=f'Espaço de origem {i + 1}')
        for ponto in espaco['vertices']:
            ponto['latitude'] += .01 * i
        espacos['espacos'].append(espaco)
    areas = {'versao': 1, 'proximoNumero': 6, 'areas': []}
    modelo = json.loads(fixtures[8])['areas'][1]
    possibilidades = [[variantes[0], variantes[1], variantes[2]], [variantes[0]], [variantes[1]], [variantes[1]], [variantes[0]]]
    for i in range(5):
        area = json.loads(json.dumps(modelo))
        area.pop('espacoLivreId', None)
        area.update(id=f'area-correcao-{i + 1}', numero=i + 1, identificacao=f'Área de teste {i + 1}',
                    areaDisponivel=42.5 + i, largura=2.5, observacoes='Preservar <img src=x>',
                    possiveis=possibilidades[i], campoAdicional={'fonte': 'Dado preexistente'})
        if i in [0, 2, 4]:
            area['espacoLivreId'] = espacos['espacos'][{0: 0, 2: 2, 4: 3}[i]]['id']
        areas['areas'].append(area)
    # Área 2 é manual e será associada pela UI. Área 4 continua sem geometria.
    decisoes = {'versao': 1, 'decisoes': []}
    for i in range(4):
        variante = variantes[0] if i in [0, 1] else variantes[1]
        decisoes['decisoes'].append({'areaId': areas['areas'][i]['id'], 'possiveis': [variante],
                                   'selecionado': variante, 'motivo': f'Motivo {i} <script>literal</script>',
                                   'restricaoProjetual': f'Restrição {i}', 'observacoes': f'Observação pós-campo {i}'})
    escrever(page, 6, json.dumps(espacos))
    escrever(page, 8, json.dumps(areas))
    escrever(page, 10, fixtures[10])
    escrever(page, 11, json.dumps(decisoes))
    fonte6, fonte10, fonte11 = ler(page, 6), ler(page, 10), ler(page, 11)
    fonte8 = ler(page, 8)
    visitar(page, base, 9)
    sem_local = page.locator('#geo-consulta section').nth(1)
    expect(sem_local).to_contain_text('Área de teste 2')
    expect(sem_local).to_contain_text('Associe-a a um espaço livre da Etapa 6')
    assert ler(page, 8) == fonte8
    # O link contextual conduz ao seletor de associação, sem exigir recriação.
    sem_local.locator('article').first.get_by_role('link', name='Associar área', exact=True).click()
    page.wait_for_selector('#associacao-area-2')
    expect(page.locator('#associacao-area-2')).to_be_focused()
    card = page.locator('[data-area-id="area-correcao-2"]')
    card.locator('select').select_option('espaco-correcao-1')
    card.get_by_role('button', name='Associar a espaço da Etapa 6', exact=True).click()
    expect(card.locator('.geo-associacao [role=status]')).to_contain_text('Área 1 — Área de teste 1')
    assert ler(page, 8) == fonte8
    card.locator('select').select_option('espaco-correcao-2')
    # ------------------------------------------------------------
    # CANCELAMENTO DA CONFIRMAÇÃO DO VÍNCULO
    # ------------------------------------------------------------
    def cancelar_dialogo(dialog):
        """Recusa a primeira associação para verificar que nada foi persistido."""
        dialog.dismiss()
    page.once('dialog', cancelar_dialogo)
    card.get_by_role('button', name='Associar a espaço da Etapa 6', exact=True).click()
    assert ler(page, 8) == fonte8
    page.once('dialog', aceitar)
    card.get_by_role('button', name='Associar a espaço da Etapa 6', exact=True).focus()
    page.keyboard.press('Enter')
    expect(card.locator('.geo-associacao [role=status]')).to_contain_text('Associação espacial salva')
    esperado = json.loads(json.dumps(areas))
    esperado['areas'][1]['espacoLivreId'] = 'espaco-correcao-2'
    assert json.loads(ler(page, 8)) == esperado
    assert ler(page, 6) == fonte6 and ler(page, 10) == fonte10 and ler(page, 11) == fonte11
    page.reload()
    page.wait_for_selector('[data-area-id="area-correcao-2"]')
    expect(card.get_by_role('button', name='Remover associação espacial', exact=True)).to_be_visible()
    assert json.loads(ler(page, 8)) == esperado

    visitar(page, base, 9)
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 4
    assert page.locator('#geo-consulta section').nth(0).locator('article').count() == 4
    assert page.locator('#geo-consulta section').nth(1).locator('article').count() == 1
    expect(page.locator('#geo-legenda')).to_contain_text('somente alternativas')
    paths = page.locator('#geo-mapa path.leaflet-interactive')
    assert paths.nth(0).get_attribute('stroke-dasharray') == '3 6'
    assert paths.nth(1).get_attribute('stroke-dasharray') in [None, '']
    assert paths.nth(2).get_attribute('stroke-dasharray') == '10 6'
    primeiro = page.locator('#geo-consulta [data-area-id="area-correcao-1"]')
    primeiro.get_by_role('button', name='Localizar no mapa', exact=True).click()
    popup = page.locator('.leaflet-popup-content')
    for nome in nomes[:3]:
        expect(popup).to_contain_text(nome)
        expect(primeiro).to_contain_text(nome)
    expect(popup).to_contain_text('Área disponível: 42,5 m²')
    expect(popup).to_contain_text('Com infiltração')
    expect(popup).to_contain_text('Sem infiltração')
    layout(page)

    visitar(page, base, 12)
    paths = page.locator('#geo-mapa path.leaflet-interactive')
    assert paths.count() == 3
    assert paths.nth(0).get_attribute('stroke') == paths.nth(1).get_attribute('stroke')
    assert paths.nth(0).get_attribute('stroke') != paths.nth(2).get_attribute('stroke')
    assert paths.nth(2).get_attribute('stroke-dasharray') in [None, '']
    expect(page.locator('#geo-legenda h3')).to_have_text('Técnicas adotadas no Cenário 1')
    assert 'Legenda dos regimes' not in page.locator('#lote-3-conteudo').inner_text()
    itens = page.locator('#geo-legenda li')
    assert itens.count() == 2
    expect(itens.nth(0)).to_contain_text(nomes[0] + ' — 2 áreas')
    expect(itens.nth(1)).to_contain_text(nomes[1] + ' — 1 área')
    assert itens.nth(0).locator('rect').get_attribute('fill') == paths.nth(0).get_attribute('stroke')
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Área de teste 4')
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Associe esta área')
    expect(page.locator('#geo-consulta section').nth(2)).to_contain_text('Área de teste 5')
    primeiro = page.locator('#geo-consulta [data-area-id="area-correcao-1"]')
    primeiro.get_by_role('button', name='Localizar no mapa', exact=True).click()
    for texto in [nomes[0], 'Com infiltração', 'Área disponível: 42,5 m²', 'Motivo 0 <script>literal</script>', 'Restrição 0', 'Observação pós-campo 0']:
        expect(page.locator('.leaflet-popup-content')).to_contain_text(texto)
        expect(primeiro).to_contain_text(texto)
    assert page.locator('.leaflet-popup-content script').count() == 0
    layout(page)
    page.get_by_role('link', name='Prosseguir para o pré-dimensionamento', exact=True).click()
    page.wait_for_selector('#pre-formulario')
    assert ler(page, 13) is None
    # Remover o vínculo devolve somente esta área à seção sem localização.
    visitar(page, base, 8)
    card = page.locator('[data-area-id="area-correcao-2"]')
    page.once('dialog', aceitar)
    card.get_by_role('button', name='Remover associação espacial', exact=True).click()
    expect(card.locator('.geo-associacao [role=status]')).to_contain_text('Associação espacial removida')
    assert json.loads(ler(page, 8)) == areas
    assert ler(page, 6) == fonte6 and ler(page, 10) == fonte10 and ler(page, 11) == fonte11
    page.reload()
    page.wait_for_selector('#associacao-area-2')
    assert json.loads(ler(page, 8)) == areas
    visitar(page, base, 9)
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Área de teste 2')
    # Sem decisões, a legenda não sugere uma técnica e todas as áreas ficam sem escolha.
    escrever(page, 11, json.dumps({'versao': 1, 'decisoes': []}))
    visitar(page, base, 12)
    expect(page.locator('#geo-legenda')).to_be_hidden()
    expect(page.locator('#geo-estado-vazio')).to_contain_text('Nenhuma intervenção do Cenário 1')
    assert page.locator('#geo-legenda li').count() == 0
    assert page.locator('#geo-consulta section').nth(2).locator('article').count() == 5
    assert page.locator('#geo-mapa path.leaflet-interactive').count() == 0
    # Uma decisão somente sem geometria permanece listada, sem entrada na legenda.
    escrever(page, 11, json.dumps({'versao': 1, 'decisoes': [decisoes['decisoes'][3]]}))
    visitar(page, base, 12)
    assert page.locator('#geo-legenda li').count() == 0
    expect(page.locator('#geo-consulta section').nth(1)).to_contain_text('Área de teste 4')
    # Uma origem alterada durante o diálogo não pode gerar vínculo desatualizado.
    outra = ctx.new_page()
    visitar(outra, base, 8)
    visitar(page, base, 8)
    card = page.locator('[data-area-id="area-correcao-2"]')
    card.locator('select').select_option('espaco-correcao-2')
    # ------------------------------------------------------------
    # ALTERAÇÃO CONCORRENTE DURANTE A CONFIRMAÇÃO
    # ------------------------------------------------------------
    def alterar_origem(dialog):
        """Muda somente a fonte da outra aba antes de aceitar a associação."""
        escrever(outra, 6, fonte6 + ' ')
        dialog.accept()
    page.once('dialog', alterar_origem)
    card.get_by_role('button', name='Associar a espaço da Etapa 6', exact=True).click()
    expect(card.locator('.geo-associacao [role=status]')).to_contain_text('mudaram durante a confirmação')
    assert json.loads(ler(page, 8)) == areas
    assert not erros, erros
    ctx.close()
    print(f'OK: associacao/remocao sem alterar campos, regimes da Etapa 9 e legenda/popup definitivos da Etapa 12 em {largura}px.')


# ------------------------------------------------------------
# ESTADO VAZIO, CARGA TARDIA E ENQUADRAMENTO DAS CONSULTAS
# ------------------------------------------------------------
def estados_vazios(browser, base, largura, fixtures):
    """Alterna zero/um/vários polígonos via outra aba, preservando todos os textos."""
    ctx = browser.new_context(viewport={'width': largura, 'height': 1000})
    ctx.route('https://tile.openstreetmap.org/**', tile)
    page, outra = ctx.new_page(), ctx.new_page()
    erros = []
    observar_erros(page, erros)
    visitar(outra, base, 8)
    espaco = json.loads(fixtures[6])['espacos'][0]
    area = json.loads(fixtures[8])['areas'][0]
    decisao = json.loads(fixtures[11])['decisoes'][0]
    espacos, areas, decisoes = [], [], []
    for i in range(2):
        e, a, d = [json.loads(json.dumps(item)) for item in [espaco, area, decisao]]
        e.update(id=f'ux-espaco-{i}', numero=i + 1)
        # Fora do centro genérico do Rio e suficientemente separados para exigir ajuste.
        for ponto in e['vertices']:
            ponto['latitude'] -= 1 + i * .03
            ponto['longitude'] -= 2
        a.update(id=f'ux-area-{i}', numero=i + 1, identificacao=f'Área UX {i}', espacoLivreId=e['id'])
        d.update(areaId=a['id'])
        espacos.append(e); areas.append(a); decisoes.append(d)
    orfa = dict(decisoes[0], areaId='area-excluida', motivo='Decisão preservada UX')
    escrever(outra, 6, json.dumps({'versao': 1, 'proximoNumero': 3, 'espacos': espacos}))
    escrever(outra, 11, json.dumps({'versao': 1, 'decisoes': decisoes + [orfa]}))
    fonte6, fonte11 = ler(outra, 6), ler(outra, 11)
    sem_vinculos = [dict(a) for a in areas]
    for a in sem_vinculos:
        a.pop('espacoLivreId')
    for etapa in [9, 12]:
        escrever(outra, 8, json.dumps({'versao': 1, 'proximoNumero': 3, 'areas': sem_vinculos}))
        visitar(page, base, etapa)
        vazio = page.locator('#geo-estado-vazio')
        expect(vazio).to_be_visible()
        expect(vazio).to_have_attribute('role', 'status')
        assert page.locator('#geo-mapa').count() == 0
        assert page.locator('script[src*="leaflet"]').count() == 0
        expect(page.locator('#geo-legenda')).to_be_hidden()
        for nome, numero in [('Revisar espaços livres', 6), ('Associar áreas', 8)] + ([('Revisar decisões pós-campo', 11)] if etapa == 12 else []):
            link = vazio.get_by_role('link', name=nome, exact=True)
            expect(link).to_have_attribute('href', f'etapa.html?numero={numero}')
            link.focus()
            expect(link).to_be_focused()
        for i in range(2):
            expect(page.locator('#geo-consulta')).to_contain_text(f'Área UX {i}')
        if etapa == 12:
            expect(page.locator('#geo-consulta')).to_contain_text('Decisão preservada UX')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        for quantidade in [1, 2, 0, 2]:
            atuais = areas[:quantidade] + sem_vinculos[quantidade:]
            texto = json.dumps({'versao': 1, 'proximoNumero': 3, 'areas': atuais})
            escrever(outra, 8, texto)
            if not quantidade:
                expect(vazio).to_be_visible()
                expect(page.locator('#geo-mapa')).to_be_hidden()
                expect(page.locator('#geo-legenda')).to_be_hidden()
            else:
                expect(vazio).to_be_hidden()
                expect(page.locator('#geo-mapa')).to_be_visible()
                expect(page.locator('#geo-mapa path.leaflet-interactive')).to_have_count(quantidade)
                expect(page.locator('#geo-legenda')).to_be_visible()
                # Todos os contornos devem caber no mapa, inclusive depois de reapresentá-lo.
                page.wait_for_function('''
                // ------------------------------------------------------------
                // CONTENÇÃO VISUAL DE TODOS OS POLÍGONOS
                // ------------------------------------------------------------
                /** @returns {boolean} Contornos visíveis dentro do mapa, sem mutação. */
                () => {
                    const mapa = document.querySelector('#geo-mapa').getBoundingClientRect();
                    /** @param {Element} p Contorno SVG. @returns {boolean} Cabe no mapa. */
                    return [...document.querySelectorAll('#geo-mapa path.leaflet-interactive')].every(p => {
                        const r = p.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.left >= mapa.left &&
                            r.right <= mapa.right && r.top >= mapa.top && r.bottom <= mapa.bottom;
                    });
                }''')
                assert page.locator('#geo-mapa').count() == 1
                layout(page)
                page.locator('#geo-consulta').get_by_role('button', name='Localizar no mapa').first.click()
                expect(page.locator('.leaflet-popup-content')).to_contain_text('Área UX 0')
            assert ler(page, 8) == texto
            assert ler(page, 6) == fonte6 and ler(page, 11) == fonte11
        assert not erros, erros
    ctx.close()
    print(f'OK: estados vazios, links/teclado, zero/um/varios, enquadramento e transicoes via storage em {largura}px.')


# ------------------------------------------------------------
# REDE E PERSISTÊNCIA INDISPONÍVEIS
# ------------------------------------------------------------
def falhas(browser, base, fixtures):
    """Exercita falhas isoladas, estados vazios, fontes alteradas e nenhuma escrita dos mapas."""
    ctx = browser.new_context()
    ctx.route('https://tile.openstreetmap.org/**', tile)
    page = ctx.new_page()
    visitar(page, base, 9)
    expect(page.get_by_role('link', name='Voltar à Etapa 8', exact=True)).to_be_visible()
    visitar(page, base, 12)
    expect(page.locator('#geo-consulta')).to_contain_text('Nenhuma área foi cadastrada')
    for etapa in [2, 6]:
        for invalido in ['{', '{"versao":2}', 'null']:
            escrever(page, etapa, invalido)
            visitar(page, base, etapa)
            expect(page.locator('#geo-armazenamento')).to_contain_text('incompatíveis')
            if etapa == 6:
                page.locator('#geo-identificacao').fill('Rascunho preservado')
            desenhar(page)
            page.locator('#geo-formulario button[type=submit]').click()
            expect(page.locator('#geo-status')).to_contain_text('incompatíveis')
            assert ler(page, etapa) == invalido
        escrever(page, etapa, fixtures[etapa])
    # Uma outra aba muda a chave enquanto há desenho não confirmado.
    outra = ctx.new_page()
    visitar(outra, base, 2)
    for etapa in [2, 6]:
        visitar(page, base, etapa)
        if etapa == 6:
            page.locator('#geo-identificacao').fill('Rascunho concorrente')
        desenhar(page)
        anterior = ler(outra, etapa)
        escrever(outra, etapa, anterior + ' ')
        expect(page.locator('#geo-armazenamento')).to_contain_text('outra aba')
        page.locator('#geo-formulario button[type=submit]').click()
        expect(page.locator('#geo-status')).to_contain_text('outra aba')
        assert ler(page, etapa) == anterior + ' '
        assert page.locator('#geo-vertices li').count() == 4
    ctx.close()

    # Falha do Leaflet não impede leitura nem entrada alternativa por coordenadas.
    ctx = browser.new_context()
    ctx.route('https://unpkg.com/leaflet@1.9.4/**', abortar)
    page = ctx.new_page()
    for etapa in [2, 6, 9, 12]:
        visitar(page, base, etapa, mapa=False)
        if etapa in [2, 6]:
            expect(page.locator('#geo-mapa-status')).to_contain_text('Não foi possível carregar o mapa', timeout=20000)
            if etapa == 6:
                page.locator('#geo-identificacao').fill('Espaço sem Leaflet')
            desenhar(page)
            page.locator('#geo-formulario button[type=submit]').click()
            expect(page.locator('#geo-status')).to_contain_text('salv')
            assert ler(page, etapa) is not None
        else:
            expect(page.locator('#geo-estado-vazio')).to_be_visible()
            assert page.locator('#geo-mapa').count() == 0
    ctx.close()
    ctx = browser.new_context()
    ctx.route('https://tile.openstreetmap.org/**', abortar)
    page = ctx.new_page()
    visitar(page, base, 2)
    expect(page.locator('#geo-mapa-status')).to_contain_text('mapa de fundo')
    desenhar(page)
    assert ler(page, 2) is None
    ctx.close()
    print('OK: estados vazios, dados incompativeis, concorrencia, falha Leaflet/tiles e alternativa por coordenadas.')


# ------------------------------------------------------------
# EXECUÇÃO EM ORIGEM E PERFIL DESCARTÁVEIS
# ------------------------------------------------------------
def main():
    """Inicia servidor local e Chromium; encerra recursos ao concluir ou falhar."""
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/etapa.html'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for largura in [1440, 900, 390]:
                fixtures = fluxo(browser, base, largura)
                correcao_espacial(browser, base, largura, fixtures)
                estados_vazios(browser, base, largura, fixtures)
            falhas(browser, base, fixtures)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
