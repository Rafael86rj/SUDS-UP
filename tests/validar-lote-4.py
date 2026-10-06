"""Arquivo: tests/validar-lote-4.py — 06/10/2026.
Objetivo: Exercitar CRUD e fluxo hidrológico real, falhas e responsividade.
Responsabilidade: Chromium/servidor/perfis isolados; nunca usa dados do usuário.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import math
import shutil
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
CHAVES = {5: 'suds-up:etapa-5:mapeamento-tecnico:v1', 14: 'suds-up:etapa-14:bacia:v1', 15: 'suds-up:etapa-15:chuva-projeto:v1'}
BACIA = {'areaTotal': '1039587', 'areaVegetada': '276339', 'comprimentoTalvegue': '1292,2', 'cotaMaxima': '209,9', 'cotaMinima': '2,84'}


# ------------------------------------------------------------
# SERVIDOR LOCAL SEM LOG DE ROTINA
# ------------------------------------------------------------
class Handler(SimpleHTTPRequestHandler):
    """Serve o repositório somente na origem temporária de teste."""
    def log_message(self, *args):
        """Suprime logs HTTP de rotina; sem efeito na aplicação."""
    def copyfile(self, origem, destino):
        """Copia em blocos pequenos; tolera encerramento de navegação do teste."""
        try:
            shutil.copyfileobj(origem, destino, 16384)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass


# ------------------------------------------------------------
# LEITURA E NAVEGAÇÃO DO PERFIL ISOLADO
# ------------------------------------------------------------
def ler(page, etapa):
    """Retorna texto bruto para conferir preservação, sem escrita."""
    return page.evaluate('(chave) => localStorage.getItem(chave)', CHAVES[etapa])


def visitar(page, base, etapa):
    """Navega e espera a interface funcional correspondente."""
    page.goto(f'{base}?numero={etapa}')
    seletor = {5: '#mapeamento-formulario', 14: '#bacia-formulario', 15: '#chuva-formulario', 16: '#lote-1-conteudo.lote-1', 17: '#avaliacao-resultado', 13: '#pre-formulario'}[etapa]
    page.wait_for_selector(seletor)


def confirmar_bacia(page, base, valores=None):
    """Preenche e confirma a Etapa 14 pela UI, sem injetar storage."""
    visitar(page, base, 14)
    for campo, valor in (valores or BACIA).items():
        page.locator(f'#bacia-{campo}').fill(valor)
    page.get_by_role('button', name='Salvar dados da bacia', exact=True).click()
    expect(page.locator('#bacia-status')).to_contain_text('salvos neste navegador')


def preencher_inventario(page, nome='Base <script>literal</script>'):
    """Preenche campos manuais com texto seguro; não confirma."""
    page.select_option('#mapeamento-categoria', label='Hidrografia')
    page.locator('#mapeamento-identificacao').fill(nome)
    page.locator('#mapeamento-fonte').fill('Órgão municipal')
    page.locator('#mapeamento-referenciaTemporal').fill('Outubro de 2026')
    page.locator('#mapeamento-observacoes').fill('Lacuna a verificar')
    page.locator('#mapeamento-lacuna').check()


def layout(page):
    """Confere ausência de overflow, navegação e acesso ao modal por teclado."""
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert page.locator('#lista-etapas a').count() == 17
    page.locator('#abrir-orientacao-icone').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#modal-orientacao')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.locator('#modal-orientacao')).to_be_hidden()


# ------------------------------------------------------------
# CRUD E FLUXO 14 → 15 → 16 → 17 SEM INJEÇÃO DE DADOS
# ------------------------------------------------------------
def fluxo(browser, base, largura):
    """Produz todos os dados pela UI e valida rastreabilidade em cada largura."""
    contexto = browser.new_context(viewport={'width': largura, 'height': 1000})
    page = contexto.new_page()
    erros = []
    page.on('pageerror', lambda erro: erros.append(str(erro)))
    visitar(page, base, 5)
    expect(page.locator('#mapeamento-lista')).to_contain_text('Nenhuma informação')
    assert ler(page, 5) is None
    preencher_inventario(page)
    page.locator('#mapeamento-salvar').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#mapeamento-status')).to_contain_text('salvo neste navegador')
    inicial = json.loads(ler(page, 5))
    assert page.locator('#mapeamento-lista script').count() == 0
    page.get_by_role('button', name='Editar registro', exact=True).click()
    page.locator('#mapeamento-identificacao').fill('Cancelar')
    page.locator('#mapeamento-cancelar').click()
    assert json.loads(ler(page, 5)) == inicial
    page.get_by_role('button', name='Editar registro', exact=True).click()
    page.locator('#mapeamento-identificacao').fill('Base revisada')
    page.locator('#mapeamento-salvar').click()
    revisado = json.loads(ler(page, 5))
    assert revisado['registros'][0]['id'] == inicial['registros'][0]['id']
    assert revisado['registros'][0]['numero'] == 1
    page.reload()
    expect(page.locator('#mapeamento-lista')).to_contain_text('Base revisada')
    layout(page)
    page.once('dialog', lambda dialogo: dialogo.dismiss())
    page.get_by_role('button', name='Excluir registro', exact=True).click()
    assert json.loads(ler(page, 5)) == revisado
    page.once('dialog', lambda dialogo: dialogo.accept())
    page.get_by_role('button', name='Excluir registro', exact=True).click()
    preencher_inventario(page, 'Segundo registro')
    page.locator('#mapeamento-salvar').click()
    assert json.loads(ler(page, 5))['registros'][0]['numero'] == 2

    visitar(page, base, 15)
    expect(page.locator('#chuva-origem')).to_contain_text('Etapa 14')
    assert page.locator('#chuva-previa-volume').count() == 0
    assert ler(page, 15) is None
    visitar(page, base, 16)
    expect(page.locator('#lote-1-conteudo')).to_contain_text('Volume ainda não calculado')
    visitar(page, base, 17)
    expect(page.locator('#avaliacao-resultado')).to_contain_text('Avaliação pendente')
    confirmar_bacia(page, base)
    page.locator('#botao-proxima').click()
    page.wait_for_selector('#chuva-formulario')
    assert page.locator('#chuva-bacia input').count() == 0
    expect(page.locator('#chuva-posto')).to_have_value('')
    expect(page.locator('#chuva-TR')).to_have_value('10')
    expect(page.locator('#chuva-runoff')).to_have_value('0,40')
    page.select_option('#chuva-posto', 'jardim-botanico')
    expect(page.locator('#chuva-a')).to_have_value('1239')
    expect(page.locator('#chuva-fonte')).to_have_value('Ulysses Alcântara')
    expect(page.locator('#chuva-a')).to_have_attribute('readonly', '')
    expect(page.locator('#chuva-previa-volume')).to_have_text('11.079,47 m³')
    assert ler(page, 15) is None
    layout(page)
    page.locator('#chuva-salvar').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#chuva-status')).to_contain_text('confirmada neste navegador')
    resultado = json.loads(ler(page, 15))
    demanda = resultado['volumeChuvaAManejar']
    assert math.isclose(demanda, 11079.4707917757, abs_tol=1e-8)
    assert demanda != round(demanda, 2)
    confirmado = ler(page, 15)
    page.locator('#chuva-TR').fill('20')
    page.locator('#chuva-runoff').fill('0,65')
    page.select_option('#chuva-posto', 'benfica')
    expect(page.locator('#chuva-d')).to_have_value('0,141')
    expect(page.locator('#chuva-runoff')).to_have_value('0,65')
    expect(page.locator('#chuva-TR')).to_have_value('20')
    assert ler(page, 15) == confirmado
    page.locator('#chuva-TR').fill('inválido')
    page.locator('#chuva-salvar').click()
    assert ler(page, 15) == confirmado
    page.reload()
    expect(page.locator('#chuva-TR')).to_have_value('10')
    expect(page.locator('#chuva-runoff')).to_have_value('0,4')
    expect(page.locator('#chuva-posto')).to_have_value('jardim-botanico')
    page.select_option('#chuva-modo', 'manual')
    page.locator('#chuva-nome').fill('Posto manual <img src=x>')
    page.locator('#chuva-fonte').fill('Fonte.example')
    expect(page.locator('#chuva-previa-volume')).to_have_text('11.079,47 m³')
    page.locator('#chuva-salvar').click()
    page.reload()
    expect(page.locator('#chuva-fonte')).to_have_value('Fonte.example')
    page.locator('#botao-proxima').click()
    expect(page.locator('#chuva-volume')).to_have_text('11.079,47 m³')
    layout(page)
    page.locator('#botao-proxima').click()
    expect(page.locator('#avaliacao-resultado')).to_contain_text('Avaliação pendente')

    # Capacidade confirmada pela Etapa 13: menor, igual e maior que a demanda.
    for fator in [.5, 1, 2]:
        visitar(page, base, 13)
        if fator != .5:
            page.get_by_role('button', name='Editar intervenção 1', exact=True).click()
        else:
            page.select_option('#pre-variante', 'jardim-permeavel')
        page.locator('#pre-area').fill(str(demanda * fator))
        page.locator('#pre-profundidade').fill('1')
        page.locator('#pre-vazios').fill('1')
        page.locator('#pre-salvar').click()
        visitar(page, base, 17)
        expect(page.locator('#avaliacao-percentual')).to_have_text({.5: '50,00 %', 1: '100,00 %', 2: '200,00 %'}[fator])
        expect(page.locator('#avaliacao-resultado')).to_contain_text('não atende integralmente' if fator < 1 else 'O cenário atende à demanda.')
        layout(page)

    antigo = ler(page, 15)
    outra = contexto.new_page()
    confirmar_bacia(outra, base, {**BACIA, 'areaTotal': '1100000'})
    expect(page.locator('#avaliacao-resultado')).to_contain_text('Avaliação pendente')
    expect(page.locator('#avaliacao-resultado')).to_contain_text('desatualizada')
    assert ler(page, 15) == antigo
    visitar(page, base, 16)
    assert page.locator('#chuva-volume').count() == 0
    expect(page.locator('#lote-1-conteudo')).to_contain_text('desatualizada')
    visitar(page, base, 15)
    expect(page.locator('#chuva-confirmado')).to_contain_text('anterior preservado')
    page.locator('#chuva-salvar').click()
    expect(page.locator('#chuva-confirmado')).to_contain_text('confirmado e atual')
    assert json.loads(ler(page, 15))['baciaUtilizada']['areaTotal'] == 1100000
    # Zero é confirmado e consumido, tanto por runoff zero como por área urbana zero.
    for vegetada in [False, True]:
        if vegetada:
            confirmar_bacia(page, base, {**BACIA, 'areaVegetada': BACIA['areaTotal']})
            visitar(page, base, 15)
        page.locator('#chuva-runoff').fill('0,4' if vegetada else '0')
        page.locator('#chuva-salvar').click()
        assert json.loads(ler(page, 15))['volumeChuvaAManejar'] == 0
        visitar(page, base, 16)
        expect(page.locator('#chuva-volume')).to_have_text('0,00 m³')
        visitar(page, base, 17)
        expect(page.locator('#avaliacao-percentual')).to_contain_text('Não se aplica')
        expect(page.locator('#avaliacao-resultado')).to_contain_text('O cenário atende à demanda.')
    assert not erros, erros
    contexto.close()
    print(f'OK: CRUD, teclado, fluxo real 14/15/16/17, precisão, manual, zero e desatualização em {largura}px.')


# ------------------------------------------------------------
# FALHAS DE STORAGE E CONCORRÊNCIA EM PERFIS DESCARTÁVEIS
# ------------------------------------------------------------
def falhas(browser, base):
    """Injeta somente falhas/fixtures no perfil de teste; verifica ausência de sobrescrita."""
    for etapa in [5, 15]:
        prefixo = 'mapeamento' if etapa == 5 else 'chuva'
        for falha in ['invalido', 'getItem', 'setItem', 'concorrencia']:
            contexto = browser.new_context()
            page = contexto.new_page()
            if etapa == 15:
                confirmar_bacia(page, base)
            else:
                visitar(page, base, etapa)
            if falha == 'invalido':
                page.evaluate('chave => localStorage.setItem(chave, "{invalido")', CHAVES[etapa])
            elif falha in ['getItem', 'setItem']:
                contexto.add_init_script(f"const original=Storage.prototype.{falha}; Storage.prototype.{falha}=function(chave,...args){{if(chave==={json.dumps(CHAVES[etapa])}) throw new Error('bloqueado'); return original.call(this,chave,...args);}};")
            visitar(page, base, etapa)
            if etapa == 5:
                preencher_inventario(page, 'Rascunho preservado')
            else:
                page.select_option('#chuva-posto', 'jardim-botanico')
                page.locator('#chuva-runoff').fill('0,7')
            if falha == 'concorrencia':
                outra = contexto.new_page()
                visitar(outra, base, etapa)
                outra.evaluate('chave => localStorage.setItem(chave, "{concorrente")', CHAVES[etapa])
            page.locator(f'#{prefixo}-salvar').click()
            expect(page.locator(f'#{prefixo}-status')).to_have_class('lote-erro')
            assert 'confirmada neste navegador' not in page.locator(f'#{prefixo}-status').inner_text()
            if falha in ['invalido', 'concorrencia']:
                assert ler(page, etapa) == ('{invalido' if falha == 'invalido' else '{concorrente')
            expect(page.locator('#mapeamento-identificacao' if etapa == 5 else '#chuva-runoff')).to_have_value('Rascunho preservado' if etapa == 5 else '0,7')
            contexto.close()
    # A bacia também pode mudar enquanto a prévia da Etapa 15 está aberta.
    contexto = browser.new_context()
    page = contexto.new_page()
    confirmar_bacia(page, base)
    visitar(page, base, 15)
    page.select_option('#chuva-posto', 'jardim-botanico')
    page.locator('#chuva-salvar').click()
    confirmado = ler(page, 15)
    outra = contexto.new_page()
    confirmar_bacia(outra, base, {**BACIA, 'comprimentoTalvegue': '1500'})
    expect(page.locator('#chuva-previa')).to_contain_text('mudaram')
    page.locator('#chuva-salvar').click()
    assert ler(page, 15) == confirmado
    assert page.locator('#chuva-previa-volume').count() == 0
    page.reload()
    page.select_option('#chuva-modo', 'manual')
    for campo, valor in [('TR', ''), ('c', '-1000'), ('a', '1e308')]:
        anterior = page.locator(f'#chuva-{campo}').input_value()
        page.locator(f'#chuva-{campo}').fill(valor)
        page.locator('#chuva-salvar').click()
        assert ler(page, 15) == confirmado
        assert page.locator('#chuva-previa-volume').count() == 0
        assert 'Infinity' not in page.locator('#chuva-resultados').inner_text()
        page.locator(f'#chuva-{campo}').fill(anterior)
    contexto.close()
    # Legado sem snapshot e origem inválida nunca viram demanda atual.
    contexto = browser.new_context()
    page = contexto.new_page()
    confirmar_bacia(page, base)
    page.evaluate('chave => localStorage.setItem(chave, JSON.stringify({versao:1,volumeChuvaAManejar:123}))', CHAVES[15])
    for etapa in [15, 16, 17]:
        visitar(page, base, etapa)
        expect(page.locator('#area-trabalho')).to_contain_text('desatualizada')
    page.evaluate('chave => localStorage.setItem(chave, "{invalido")', CHAVES[14])
    visitar(page, base, 15)
    assert page.locator('#chuva-previa-volume').count() == 0
    assert json.loads(ler(page, 15))['volumeChuvaAManejar'] == 123
    page.evaluate('chave => localStorage.setItem(chave, "{invalido")', CHAVES[15])
    for etapa in [16, 17]:
        visitar(page, base, etapa)
        expect(page.locator('#area-trabalho')).to_contain_text('incompatíveis')
    contexto.close()
    print('OK: JSON incompatível, leitura/gravação bloqueadas, concorrência, legado e origem inválida sem perda de rascunho ou resultado.')


# ------------------------------------------------------------
# EXECUÇÃO E ENCERRAMENTO DOS RECURSOS DE TESTE
# ------------------------------------------------------------
def main():
    """Executa Chromium isolado em três larguras e encerra o servidor mesmo em falha."""
    servidor = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
    Thread(target=servidor.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{servidor.server_port}/etapa.html'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for largura in [1440, 900, 390]:
                fluxo(browser, base, largura)
            falhas(browser, base)
            browser.close()
    finally:
        servidor.shutdown()
        servidor.server_close()


if __name__ == '__main__':
    main()
