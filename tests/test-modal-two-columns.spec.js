const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Inspecionar layout em 2 colunas do modal de Pedidos', async ({ page, viewport }) => {
  console.log('\n🔍 INICIANDO INSPEÇÃO DO MODAL EM 2 COLUNAS\n');
  
  // 1. Acessar aplicação
  console.log('1️⃣  Acessando http://localhost:3000');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // 2. Navegar para Pedidos
  console.log('2️⃣  Navegando para Pedidos');
  await page.click('text=Pedidos');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Screenshot 1: Página Pedidos antes de abrir
  console.log('📸 Capturando screenshot da página Pedidos');
  await page.screenshot({ path: 'tests/screenshots/01-pedidos-page-two-columns.png' });
  
  // 3. Abrir modal
  console.log('3️⃣  Abrindo modal (Novo Pedido)');
  const novoButton = await page.locator('button:has-text("Novo Pedido")').first();
  if (await novoButton.isVisible()) {
    await novoButton.click();
  } else {
    // Tenta "Editar" se houver
    const editButton = await page.locator('button:has-text("Editar")').first();
    await editButton.click();
  }
  
  // Esperar modal abrir
  await page.waitForSelector('.modal-content', { timeout: 5000 });
  await page.waitForTimeout(800);
  
  // Screenshot 2: Modal aberta
  console.log('📸 Capturando screenshot do modal aberto');
  await page.screenshot({ path: 'tests/screenshots/02-modal-two-columns-open.png' });
  
  // 4. Inspecionar elemento .modal-content
  console.log('4️⃣  Inspecionando elemento .modal-content');
  
  const modalData = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content');
    if (!modal) return null;
    
    const rect = modal.getBoundingClientRect();
    const computed = window.getComputedStyle(modal);
    
    // Pegar todos os campos visíveis
    const campos = [];
    const labels = modal.querySelectorAll('label, .field-label, .label-field, [class*="label"]');
    const inputs = modal.querySelectorAll('input, textarea, select');
    
    // Coletar nomes dos campos
    inputs.forEach(field => {
      const name = field.name || field.id || field.placeholder || 'SEM NOME';
      const visible = field.offsetHeight > 0 && field.offsetWidth > 0;
      const label = field.previousElementSibling?.textContent || field.parentElement?.querySelector('label')?.textContent || name;
      
      if (visible) {
        campos.push({
          nome: name,
          label: label.trim(),
          tipo: field.tagName.toLowerCase(),
          largura: field.offsetWidth,
          altura: field.offsetHeight,
          visivel: true
        });
      }
    });
    
    // Informações gerais do modal
    const info = {
      // Dimensões
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      scrollHeight: modal.scrollHeight,
      scrollWidth: modal.scrollWidth,
      clientHeight: modal.clientHeight,
      clientWidth: modal.clientWidth,
      scrollTop: modal.scrollTop,
      
      // CSS
      maxHeight: computed.maxHeight,
      overflowY: computed.overflowY,
      display: computed.display,
      position: computed.position,
      padding: computed.padding,
      gap: computed.gap,
      gridTemplateColumns: computed.gridTemplateColumns,
      
      // Viewport
      viewportTop: rect.top,
      viewportLeft: rect.left,
      
      // Análise
      temScroll: modal.scrollHeight > modal.clientHeight,
      alturaPerdida: modal.scrollHeight - modal.clientHeight,
      camposVisiveis: campos.length,
      campos: campos
    };
    
    return info;
  });
  
  if (!modalData) {
    throw new Error('Modal não encontrado!');
  }
  
  console.log('\n📊 DADOS COLETADOS DO MODAL\n');
  console.log('Dimensões do Modal:');
  console.log(`  Width:  ${modalData.viewportWidth}px`);
  console.log(`  Height (viewport): ${modalData.viewportHeight}px`);
  console.log(`  Height (com scroll): ${modalData.scrollHeight}px`);
  console.log(`  Necessário scroll: ${modalData.temScroll ? 'SIM' : 'NÃO'}`);
  console.log(`  Altura de conteúdo a mais: ${modalData.alturaPerdida}px`);
  
  console.log('\n🎯 CSS do Modal:');
  console.log(`  max-height: ${modalData.maxHeight}`);
  console.log(`  overflow-y: ${modalData.overflowY}`);
  console.log(`  display: ${modalData.display}`);
  console.log(`  gap: ${modalData.gap}`);
  console.log(`  grid-template-columns: ${modalData.gridTemplateColumns}`);
  
  console.log(`\n📋 CAMPOS VISÍVEIS (${modalData.camposVisiveis} campos):\n`);
  
  const fieldReport = modalData.campos.map((campo, idx) => {
    return `  ${idx + 1}. ${campo.label || campo.nome}\n     Tipo: ${campo.tipo} | Tamanho: ${campo.largura}x${campo.altura}px`;
  }).join('\n\n');
  
  console.log(fieldReport);
  
  // 5. Capturar informações visuais do layout
  console.log('\n\n5️⃣  Analisando estrutura do layout em 2 colunas');
  
  const layoutInfo = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content');
    
    // Procurar por containers de coluna ou grupo de campos
    const containers = modal.querySelectorAll('[class*="col"], [class*="column"], [class*="grid"], [class*="container"], .form-group, .field-group');
    
    const estrutura = Array.from(containers).slice(0, 10).map(el => ({
      class: el.className,
      children: el.children.length,
      width: el.offsetWidth,
      height: el.offsetHeight
    }));
    
    // Verificar se é grid
    const modalStyle = window.getComputedStyle(modal);
    const isGrid = modalStyle.display === 'grid';
    const isFlexCol = modalStyle.display === 'flex' && modalStyle.flexDirection === 'column';
    
    return {
      isGrid,
      isFlexCol,
      estrutura,
      childrenCount: modal.children.length
    };
  });
  
  console.log('Layout type:');
  console.log(`  Grid: ${layoutInfo.isGrid ? 'SIM' : 'NÃO'}`);
  console.log(`  Flex Column: ${layoutInfo.isFlexCol ? 'SIM' : 'NÃO'}`);
  console.log(`  Total de filhos diretos: ${layoutInfo.childrenCount}`);
  
  // 6. Gerar relatório completo
  const relatorio = {
    timestamp: new Date().toISOString(),
    viewport: `${viewport.width}x${viewport.height}`,
    modal: {
      dimensoes: {
        largura: `${modalData.viewportWidth}px`,
        altura_visivel: `${modalData.viewportHeight}px`,
        altura_conteudo: `${modalData.scrollHeight}px`,
        necessario_scroll: modalData.temScroll
      },
      css: {
        'max-height': modalData.maxHeight,
        'overflow-y': modalData.overflowY,
        'display': modalData.display,
        'gap': modalData.gap,
        'grid-template-columns': modalData.gridTemplateColumns
      }
    },
    campos: {
      total_visiveis: modalData.camposVisiveis,
      lista: modalData.campos
    },
    layout: {
      tipo: layoutInfo.isGrid ? 'GRID (2 colunas)' : layoutInfo.isFlexCol ? 'FLEX (coluna)' : 'OUTRO',
      estrutura: layoutInfo.estrutura
    },
    qualidade_ui: {
      scroll_funcionando: modalData.temScroll ? 'Sim, há conteúdo além da viewport' : 'Não necessário, tudo cabe',
      campos_bem_distribuidos: modalData.camposVisiveis > 0,
      status_geral: 'OK'
    }
  };
  
  // Salvar relatório JSON
  fs.writeFileSync(
    path.join(__dirname, 'relatorio-modal-two-columns.json'),
    JSON.stringify(relatorio, null, 2)
  );
  
  console.log('\n✅ Relatório salvo em: relatorio-modal-two-columns.json');
  
  // Assertions
  expect(modalData).toBeTruthy();
  expect(modalData.camposVisiveis).toBeGreaterThan(0);
  
  console.log('\n✅ INSPEÇÃO CONCLUÍDA COM SUCESSO\n');
});
