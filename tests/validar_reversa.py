"""Cenários adicionais chamados por validar-pontos.py; Nominatim sempre simulado."""
import json
from urllib.parse import urlparse, parse_qs


# ------------------------------------------------------------
# CONSULTAS CONTROLADAS E PROTEÇÃO DO RASCUNHO
# ------------------------------------------------------------
def validar_reversa(pw, url, key):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000})
    # Registro dos instantes no navegador evita incluir latência do processo Python.
    ctx.add_init_script('''window.consultasTeste = [];
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = 'html { scroll-behavior: auto !important; }';
        document.head.append(style);
      });
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (String(args[0]).includes('nominatim.openstreetmap.org')) {
          window.consultasTeste.push({url: String(args[0]), instante: performance.now()});
        }
        return originalFetch(...args);
      };''')
    routes = []
    ctx.route('https://nominatim.openstreetmap.org/**', lambda route: routes.append(route))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url)
    page.wait_for_function('document.querySelector("#mapa-buscar").disabled === false')
    address = page.locator('#ponto-endereco')
    message = page.locator('#ponto-mensagem')
    index = 0

    def next_route():
        nonlocal index
        for _ in range(100):
            if len(routes) > index:
                route = routes[index]
                index += 1
                return route
            page.wait_for_timeout(50)
        raise AssertionError(f'Consulta esperada não ocorreu: {message.inner_text()}, coordenadas={coords()}, consultas={len(routes)}')

    def click(x=240, y=180):
        # Durante a animação de zoom iniciada por Editar, Leaflet ignora cliques.
        page.wait_for_timeout(350)
        # O popup aberto por Localizar/Editar pode cobrir a posição de teste.
        # Fechamos também popups em transição de saída, sem selecionar um deles
        # por índice enquanto o Leaflet troca o conteúdo da camada.
        page.locator('.leaflet-popup-close-button').evaluate_all('(buttons) => buttons.forEach(button => button.click())')
        page.locator('#mapa-etapa-01').click(position={'x': x, 'y': y})

    def coords():
        return [page.locator('#mapa-latitude').input_value(), page.locator('#mapa-longitude').input_value()]

    def settle():
        page.wait_for_timeout(150)

    def fill_result(route, payload, expected):
        route.fulfill(json=payload)
        page.wait_for_function('(text) => document.querySelector("#ponto-endereco").value === text', arg=expected)
        settle()

    # A posição é imediata, e só a referência recebe o resultado do serviço.
    click()
    selected = coords()
    assert address.input_value() == ''
    assert message.inner_text() == 'Consultando endereço…'
    route = next_route()
    params = parse_qs(urlparse(route.request.url).query)
    for name, value in {'format': 'jsonv2', 'addressdetails': '1', 'accept-language': 'pt-BR', 'zoom': '18', 'layer': 'address'}.items():
        assert params[name] == [value]
    assert round(float(params['lat'][0]), 6) == float(selected[0])
    assert round(float(params['lon'][0]), 6) == float(selected[1])
    fill_result(route, {'lat': '40', 'lon': '10', 'address': {'road': 'Rua A', 'house_number': '12', 'suburb': 'Centro', 'city': 'Cidade'}}, 'Rua A, 12, Centro, Cidade')
    assert coords() == selected
    assert message.inner_text() == 'Endereço sugerido pela posição. Confira o nome da rua e o número.'
    assert page.evaluate('(key) => localStorage.getItem(key)', key) is None
    count = len(routes)
    page.locator('#ponto-cancelar').click()
    click()  # Mesma posição: consulta atendida pelo cache.
    page.wait_for_function('document.querySelector("#ponto-endereco").value.startsWith("Rua A")')
    assert len(routes) == count

    click(280)
    fill_result(next_route(), {'address': {'pedestrian': 'Passagem B', 'neighbourhood': 'Bairro', 'town': 'Município'}}, 'Passagem B, Bairro, Município')
    click(310)
    fill_result(next_route(), {'display_name': 'Referência alternativa'}, 'Referência alternativa')
    click(340)
    next_route().fulfill(json={})
    page.wait_for_function('document.querySelector("#ponto-mensagem").textContent.startsWith("Não foi possível identificar")')
    assert address.input_value() == ''
    # Cliques síncronos representam uma sequência rápida, antes do debounce.
    before = len(routes)
    page.locator('#mapa-etapa-01').evaluate('''el => {
      const r = el.getBoundingClientRect();
      for (const x of [370, 400, 430]) el.dispatchEvent(new MouseEvent('click', {bubbles:true, clientX:r.x+x, clientY:r.y+180}));
    }''')
    latest = coords()
    fill_result(next_route(), {'display_name': 'Última posição'}, 'Última posição')
    assert len(routes) == before + 1
    assert coords() == latest

    # Não há simultaneidade: a seleção seguinte espera o término da anterior.
    click(460)
    old = next_route()
    click(490)
    page.wait_for_timeout(1200)
    assert len(routes) == index
    old.fulfill(status=429, json={'error': 'old'})
    current = next_route()
    assert message.inner_text() == 'Consultando endereço…'
    fill_result(current, {'display_name': 'Atual'}, 'Atual')

    # Digitação, cancelamento e salvamento tornam obsoletos sucesso e erro.
    click(520)
    held = next_route()
    address.fill('Minha referência')
    held.fulfill(json={'display_name': 'Não aplicar'})
    settle()
    assert address.input_value() == 'Minha referência'
    click(550)
    held = next_route()
    page.locator('#ponto-cancelar').click()
    text = message.inner_text()
    held.fulfill(status=429, json={})
    settle()
    assert address.input_value() == '' and message.inner_text() == text
    click(580)
    held = next_route()
    address.fill('Ponto salvo')
    page.locator('#ponto-descricao').fill('Descrição original')
    page.locator('#ponto-salvar').click()
    saved = page.evaluate('(key) => localStorage.getItem(key)', key)
    text = message.inner_text()
    held.fulfill(json={'display_name': 'Não substituir salvo'})
    settle()
    assert address.input_value() == '' and message.inner_text() == text
    assert page.evaluate('(key) => localStorage.getItem(key)', key) == saved

    # Criar outro registro manualmente cancela a pendência antes de enviá-la.
    click(610)
    address.fill('Segundo ponto')
    page.locator('#ponto-salvar').click()
    page.wait_for_timeout(1200)
    assert len(routes) == index
    page.get_by_role('button', name='Editar ponto 1', exact=True).click()
    count = len(routes)
    page.wait_for_timeout(500)
    assert len(routes) == count
    page.locator('#mapa-etapa-01').focus()
    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(400)
    page.locator('#mapa-selecionar-centro').click()
    held = next_route()
    page.once('dialog', lambda dialog: dialog.accept())
    page.get_by_role('button', name='Editar ponto 2', exact=True).click()
    text = message.inner_text()
    held.fulfill(json={'display_name': 'Outra edição'})
    settle()
    assert address.input_value() == 'Segundo ponto' and message.inner_text() == text
    page.locator('#ponto-cancelar').click()
    page.get_by_role('button', name='Editar ponto 1', exact=True).click()
    page.locator('#mapa-etapa-01').focus()
    page.keyboard.press('ArrowLeft')
    page.wait_for_timeout(400)
    page.locator('#mapa-selecionar-centro').click()
    fill_result(next_route(), {'address': {'road': 'Rua corrigida'}}, 'Rua corrigida')
    assert page.locator('#ponto-titulo').inner_text() == 'Editando ponto 1'
    assert page.locator('#ponto-descricao').input_value() == 'Descrição original'
    assert json.loads(page.evaluate('(key) => localStorage.getItem(key)', key))['pontos'][0]['endereco'] == 'Ponto salvo'
    page.locator('#ponto-salvar').click()

    # Busca textual usa a mesma fila e aproveita a própria referência.
    page.locator('#mapa-endereco').fill('Consulta textual')
    page.locator('#mapa-buscar').click()
    forward = next_route()
    assert urlparse(forward.request.url).path == '/search'
    fill_result(forward, [{'lat': '-22', 'lon': '-43', 'display_name': 'Busca textual'}], 'Busca textual')
    count = len(routes)
    page.wait_for_timeout(600)
    assert len(routes) == count
    page.locator('#mapa-buscar').click()
    assert len(routes) == count
    page.locator('#mapa-selecionar-centro').click()
    fill_result(next_route(), {'display_name': 'Centro sugerido'}, 'Centro sugerido')
    starts = page.evaluate('window.consultasTeste')
    assert all(b['instante'] - a['instante'] >= 1090 for a, b in zip(starts, starts[1:])), starts
    # Há uma margem de 10 ms para arredondamento entre relógios; o agendador usa 1100 ms.
    print('OK: sugestão, componentes ausentes, coordenadas, debounce, cache, fila compartilhada e proteção do rascunho.')

    # Sem consulta ao restaurar, localizar, editar ou mover/ampliar o mapa.
    page.reload()
    page.wait_for_function('document.querySelector("#mapa-buscar").disabled === false')
    count = len(routes)
    page.get_by_role('button', name='Localizar ponto 1', exact=True).click()
    page.get_by_role('button', name='Editar ponto 1', exact=True).click()
    page.locator('#mapa-etapa-01').focus()
    page.keyboard.press('ArrowRight')
    page.locator('.leaflet-control-zoom-in').click()
    page.wait_for_timeout(1200)
    assert len(routes) == count
    assert page.locator('#pontos-corpo tr[data-id]').count() == 2
    page.locator('#ponto-cancelar').click()

    # Falhas não se repetem automaticamente e permitem referência manual.
    for offset, failure in enumerate(('network', '429', 'timeout')):
        # O mapa restaurado contém marcadores que interceptam cliques. Usamos
        # uma nova posição do centro para testar falhas, sem clicar num registro.
        page.locator('#mapa-etapa-01').focus()
        page.keyboard.press('ArrowUp')
        page.wait_for_timeout(400)
        page.locator('#mapa-selecionar-centro').click()
        held = next_route()
        if failure == 'network':
            held.abort('failed')
        elif failure == '429':
            held.fulfill(status=429, json={'error': 'limite'})
        # No timeout, a resposta fica retida até o AbortController de produção.
        page.wait_for_function('document.querySelector("#ponto-mensagem").textContent.startsWith("Não foi possível identificar")', timeout=15000)
        if failure == 'timeout':
            # O AbortController já foi observado; libera também a interceptação
            # do Playwright para não deixar callbacks pendentes ao fechar o teste.
            held.abort('timedout')
        count = len(routes)
        page.wait_for_timeout(1200)
        assert len(routes) == count
        address.fill(f'Referência manual {failure}')
        page.locator('#ponto-salvar').click()
        assert 'salvo neste navegador' in message.inner_text()
    assert not errors, errors
    ctx.close()
    browser.close()
    print('OK: restauração/localização sem consultas; rede, timeout e HTTP 429 sem repetição e com cadastro manual.')
