"""Validação de navegador do Lote 1 em perfil isolado, sem dados do usuário."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
COND = 'suds-up:etapa-4:condicionantes:v1'
BACIA = 'suds-up:etapa-14:bacia:v1'
CHUVA = 'suds-up:etapa-15:chuva-projeto:v1'
CENARIO = 'suds-up:etapa-13:cenario:v1'


# ------------------------------------------------------------
# SERVIDOR ISOLADO E DADOS EXCLUSIVOS DOS TESTES
# ------------------------------------------------------------
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, target):
        shutil.copyfileobj(source, target, 16*1024)


server = ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/etapa.html'
values = {'areaTotal':'100,5','areaVegetada':'20.5','comprimentoTalvegue':'10','cotaMaxima':'-1,5','cotaMinima':'-10'}
scenario = {'versao':1,'proximoNumero':2,'intervencoes':[{'id':'teste','numero':1,'variante':'jardim-permeavel','area':100,'profundidade':1.5,'vazios':.3,'volume':9999}], 'total':9999}


def visit(page, stage):
    page.goto(f'{base}?numero={stage}')
    page.wait_for_selector('#lote-1-conteudo.lote-1')


def read(page,key):
    return page.evaluate('(key)=>localStorage.getItem(key)',key)


def write(page,key,data):
    # Lote 4: fixtures de demanda confirmada identificam a bacia utilizada.
    # O contrato mínimo continua aceito, mas sem snapshot a demanda fica pendente.
    if key == CHUVA and data.get('versao') == 1:
        data = {**data, 'baciaUtilizada': json.loads(read(page, BACIA))}
    page.evaluate('([key,data])=>localStorage.setItem(key,JSON.stringify(data))',[key,data])


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={'width':1440,'height':1000})
        page = ctx.new_page()
        errors = []
        page.on('pageerror',lambda error:errors.append(str(error)))
        visit(page,4)
        assert page.locator('#condicionantes-formulario fieldset').count()==4
        assert read(page,COND) is None
        page.select_option('#cond-urbanas-situacao',label='Requer atenção')
        page.locator('#cond-urbanas-observacao').fill('<img src=x onerror=alert(1)> Justificativa literal')
        assert read(page,COND) is None
        page.get_by_role('button',name='Salvar condicionantes',exact=True).focus()
        page.keyboard.press('Enter')
        assert 'salvas' in page.locator('#condicionantes-status').inner_text()
        confirmed = read(page,COND)
        page.reload()
        page.wait_for_selector('#condicionantes-formulario')
        assert page.locator('#cond-urbanas-situacao').input_value()=='Requer atenção'
        assert page.locator('#cond-urbanas-observacao').input_value().startswith('<img')
        assert page.locator('#lote-1-conteudo img').count()==0
        page.locator('#botao-proxima').click()
        page.locator('#botao-anterior').click()
        page.wait_for_selector('#condicionantes-formulario')
        assert read(page,COND)==confirmed
        visit(page,14)
        page.get_by_role('button',name='Salvar dados da bacia',exact=True).click()
        assert page.locator('#bacia-areaTotal').get_attribute('aria-invalid')=='true'
        for field,value in values.items(): page.locator(f'#bacia-{field}').fill(value)
        page.get_by_role('button',name='Salvar dados da bacia',exact=True).click()
        stored = json.loads(read(page,BACIA))
        assert stored['areaTotal']==100.5 and stored['cotaMaxima']==-1.5
        page.locator('#bacia-areaTotal').fill('0')
        page.get_by_role('button',name='Salvar dados da bacia',exact=True).click()
        assert json.loads(read(page,BACIA))==stored
        page.locator('#bacia-limpar').click()
        assert all(page.locator(f'#bacia-{field}').input_value()=='' for field in values)
        assert json.loads(read(page,BACIA))==stored
        page.reload()
        page.wait_for_selector('#bacia-formulario')
        assert page.locator('#bacia-cotaMaxima').input_value()=='-1,5'
        page.locator('#botao-proxima').click()
        page.locator('#botao-anterior').click()
        page.wait_for_selector('#bacia-formulario')
        assert page.locator('#bacia-areaTotal').input_value()=='100,5'
        print('OK: Etapas 4/14 salvam, restauram após F5/navegação, validam e preservam rascunhos e textos seguros.')

        # ------------------------------------------------------------
        # PAINÉIS SEM DADOS, COM DEMANDA E COM CENÁRIO RECALCULADO
        # ------------------------------------------------------------
        visit(page,16)
        assert 'Volume ainda não calculado' in page.locator('#lote-1-conteudo').inner_text()
        assert page.locator('#lote-1-conteudo input').count()==0
        assert read(page,CHUVA) is None
        assert page.get_by_role('link',name='Revisar chuva de projeto',exact=True).get_attribute('href')=='etapa.html?numero=15'
        visit(page,17)
        assert 'Nenhuma intervenção' in page.locator('#avaliacao-resultado').inner_text()
        assert 'ainda não foi calculado' in page.locator('#avaliacao-resultado').inner_text()
        assert page.locator('#avaliacao-finalizar').count()==0
        write(page,CENARIO,scenario)
        visit(page,17)
        assert page.locator('#avaliacao-capacidade').inner_text()=='45,00 m³'
        assert 'Avaliação pendente' in page.locator('#avaliacao-resultado').inner_text()
        for demand,percentage,meets in [(90,'50,00 %',False),(45,'100,00 %',True),(30,'150,00 %',True)]:
            write(page,CHUVA,{'versao':1,'volumeChuvaAManejar':demand})
            old_scenario,old_rain = read(page,CENARIO),read(page,CHUVA)
            visit(page,16)
            assert page.locator('#chuva-volume').inner_text()==f'{demand},00 m³'
            visit(page,17)
            assert page.locator('#avaliacao-percentual').inner_text()==percentage
            assert ('O cenário atende à demanda.' if meets else 'O cenário não atende integralmente à demanda.') in page.locator('#avaliacao-resultado').inner_text()
            assert read(page,CENARIO)==old_scenario and read(page,CHUVA)==old_rain
            if meets:
                page.locator('#avaliacao-finalizar').click()
                assert 'finalizado nesta visualização' in page.locator('#avaliacao-resultado').inner_text()
            else:
                assert page.get_by_role('link',name='Revisar possibilidades',exact=True).get_attribute('href')=='etapa.html?numero=9'
                assert page.get_by_role('link',name='Revisar pré-dimensionamento',exact=True).get_attribute('href')=='etapa.html?numero=13'
        # Recalcula ao receber uma alteração de demanda em outra aba.
        other = ctx.new_page()
        other.goto(base+'?numero=15')
        write(other,CHUVA,{'versao':1,'volumeChuvaAManejar':90})
        page.wait_for_function('document.querySelector("#avaliacao-percentual").textContent==="50,00 %"')
        assert page.locator('#avaliacao-finalizar').count()==0
        other.close()
        write(page,CHUVA,{'versao':1,'volumeChuvaAManejar':0})
        visit(page,17)
        assert 'demanda igual a zero' in page.locator('#avaliacao-percentual').inner_text()
        assert 'O cenário atende à demanda.' in page.locator('#avaliacao-resultado').inner_text()
        write(page,CENARIO,{'versao':1,'proximoNumero':2,'intervencoes':[]})
        visit(page,17)
        assert 'Nenhuma intervenção' in page.locator('#avaliacao-resultado').inner_text()
        write(page,CHUVA,{'versao':9,'volumeChuvaAManejar':10})
        visit(page,16)
        assert 'Volume indisponível' in page.locator('#lote-1-conteudo').inner_text()
        assert page.locator('#chuva-volume').count()==0
        visit(page,17)
        assert 'Etapa 15:' in page.locator('#avaliacao-resultado').inner_text()
        print('OK: ausência/incompatibilidade, demanda zero, comparação menor/igual/maior, percentual e nenhuma gravação pelos painéis.')

        # ------------------------------------------------------------
        # RESPONSIVIDADE, ORIENTAÇÕES E NAVEGAÇÃO DAS QUATRO TELAS
        # ------------------------------------------------------------
        write(page,CENARIO,scenario)
        write(page,CHUVA,{'versao':1,'volumeChuvaAManejar':30})
        for width in (1440,900,390):
            page.set_viewport_size({'width':width,'height':1000})
            for stage in (4,14,16,17):
                visit(page,stage)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                body = page.locator('#area-trabalho').inner_text()
                assert 'Como realizar esta etapa' in body
                for forbidden in ('Os campos definitivos serão ajustados','A definir','Nova linha','Os campos, fórmulas e valores desta tela serão implementados'):
                    assert forbidden not in body
                assert page.locator('#lista-etapas a').count()==17
                assert page.locator('#botao-anterior').get_attribute('href')==f'etapa.html?numero={stage-1}'
                assert page.locator('#botao-proxima').get_attribute('href')==(f'etapa.html?numero={stage+1}' if stage<17 else 'index.html')
                page.locator('#abrir-orientacao-icone').focus()
                page.keyboard.press('Enter')
                assert page.locator('#modal-orientacao').is_visible()
                page.keyboard.press('Escape')
                assert page.locator('#modal-orientacao').is_hidden()
        assert not errors,errors
        ctx.close()

        # ------------------------------------------------------------
        # BLOQUEIOS E FALHAS DE ARMAZENAMENTO EM CONTEXTOS SEPARADOS
        # ------------------------------------------------------------
        for stage,key,button,status in [(4,COND,'Salvar condicionantes','#condicionantes-status'),(14,BACIA,'Salvar dados da bacia','#bacia-status')]:
            for failure in ('invalid','getItem','setItem'):
                ctx = browser.new_context()
                if failure=='invalid': ctx.add_init_script(f'localStorage.setItem({json.dumps(key)},"{{invalido");')
                else: ctx.add_init_script(f'''const old=Storage.prototype.{failure}; Storage.prototype.{failure}=function(key,...args){{ if(key==={json.dumps(key)}) throw new Error('Teste isolado'); return old.call(this,key,...args); }};''')
                tab = ctx.new_page()
                visit(tab,stage)
                if stage==14:
                    for field,value in values.items(): tab.locator(f'#bacia-{field}').fill(value)
                else: tab.locator('#cond-urbanas-observacao').fill('Manter rascunho')
                tab.get_by_role('button',name=button,exact=True).click()
                assert tab.locator(status).evaluate('(el)=>el.classList.contains("lote-erro")')
                assert 'salvos neste navegador' not in tab.locator(status).inner_text()
                if failure=='invalid': assert read(tab,key)=='{invalido'
                assert tab.locator('#bacia-areaTotal' if stage==14 else '#cond-urbanas-observacao').input_value()==('100,5' if stage==14 else 'Manter rascunho')
                ctx.close()
        print('OK: desktop/tablet/celular, teclado, orientações, navegação e falhas de armazenamento sem falsa confirmação.')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
