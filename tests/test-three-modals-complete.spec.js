const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Função auxiliar para inspecionar um modal
async function inspecionarModal(page, nomeModal, seletorBotao) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 INSPECIONANDO MODAL: ${nomeModal}`);
  console.log('='.repeat(60));
  
  try {
    // Clicar no botão para abrir o modal
    console.log(`Abrindo modal "${nomeModal}"...`);
    await page.waitForSelector(seletorBotao, { timeout: 5000 });
    await page.click(seletorBotao);
    await page.waitForSelector('.modal-content, .modal', { timeout: 5000 });
    await page.waitForTimeout(800);
    
    // Tirar screenshot
    const screenshotPath = `tests/screenshots/${nomeModal.toLowerCase()}-modal-two-columns.png`;
    console.log(`📸 Capturando screenshot: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    
    // Coletar dados do modal
    const modalData = await page.evaluate(() => {
      const modal = document.querySelector('.modal-content, .modal');
      if (!modal) return null;
      
      const rect = modal.getBoundingClientRect();
      const computed = window.getComputedStyle(modal);
      
      // Pegar todos os campos visíveis
      const campos = [];
      const inputs = modal.querySelectorAll('input, textarea, select');
      
      inputs.forEach(field => {
        const isVisible = field.offsetHeight > 0 && field.offsetWidth > 0;
        if (isVisible) {
          let label = field.name || field.id || field.placeholder || 'SEM NOME';
          
          // Tentar encontrar label associado
          const labelElement = field.parentElement?.querySelector('label');
          if (labelElement) {
            label = labelElement.textContent.trim();
          }
          
          campos.push({
            nome: field.name || field.id || 'unknown',
            label: label,
            tipo: field.tagName.toLowerCase(),
            largura: field.offsetWidth,
            altura: field.offsetHeight
          });
        }
      });
      
      const info = {
        // Dimensões
        viewportWidth: rect.width,
        viewportHeight: rect.height,
        scrollHeight: modal.scrollHeight,
        scrollWidth: modal.scrollWidth,
        clientHeight: modal.clientHeight,
        clientWidth: modal.clientWidth,
        
        // CSS
        maxHeight: computed.maxHeight,
        overflowY: computed.overflowY,
        display: computed.display,
        padding: computed.padding,
        gap: computed.gap,
        gridTemplateColumns: computed.gridTemplateColumns,
        
        // Posição
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        
        // Análise
        temScroll: modal.scrollHeight > modal.clientHeight,
        alturaPerdida: modal.scrollHeight - modal.clientHeight,
        camposVisiveis: campos.length,
        campos: campos
      };
      
      return info;
    });
    
    if (!modalData) {
      throw new Error(`Modal ${nomeModal} não encontrado!`);
    }
    
    // Exibir dados coletados
    console.log('\n📊 DADOS COLETADOS:');
    console.log(`├─ Largura do modal: ${Math.round(modalData.viewportWidth)}px`);
    console.log(`├─ Altura visível: ${Math.round(modalData.viewportHeight)}px`);
    console.log(`├─ Altura conteúdo: ${Math.round(modalData.scrollHeight)}px`);
    console.log(`├─ Necessário scroll: ${modalData.temScroll ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`├─ Altura extra (overflow): ${Math.round(modalData.alturaPerdida)}px`);
    console.log(`└─ Total de campos visíveis: ${modalData.camposVisiveis}`);
    
    console.log('\n🎯 CSS DO MODAL:');
    console.log(`├─ max-height: ${modalData.maxHeight}`);
    console.log(`├─ overflow-y: ${modalData.overflowY}`);
    console.log(`├─ display: ${modalData.display}`);
    console.log(`├─ gap: ${modalData.gap}`);
    console.log(`└─ grid-template-columns: ${modalData.gridTemplateColumns}`);
    
    console.log(`\n📋 CAMPOS VISÍVEIS (${modalData.camposVisiveis} campos):`);
    modalData.campos.forEach((campo, idx) => {
      console.log(`  ${idx + 1}. ${campo.label || campo.nome}`);
      console.log(`     └─ Tipo: ${campo.tipo} | ${campo.largura}×${campo.altura}px`);
    });
    
    // Fechar modal
    console.log('\nFechando modal...');
    
    // Tentar clicar no botão de fechar (X)
    const closeButton = await page.locator('.modal-close, [class*="close"], button[aria-label*="close"], button[aria-label*="fechar"]').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      // Ou pressionar Escape
      await page.keyboard.press('Escape');
    }
    
    await page.waitForTimeout(1000);
    
    // Garantir que modal está fechado
    const modalClosed = await page.locator('.modal-content, .modal').isVisible({ timeout: 2000 }).catch(() => false);
    if (modalClosed) {
      console.log('Modal ainda visível, tentando clicar fora...');
      await page.click('body', { position: { x: 100, y: 100 } });
      await page.waitForTimeout(800);
    }
    
    return modalData;
    
  } catch (error) {
    console.error(`❌ ERRO ao inspecionar ${nomeModal}:`, error.message);
    return null;
  }
}

test.setTimeout(180000); // 3 minutos de timeout total

test('Testar os 3 modais com layout em 2 colunas (Pedidos, Clientes, Boletos)', async ({ page, viewport }) => {
  
  // Criar pasta screenshots se não existir
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 TESTE DE MODAIS EM 2 COLUNAS - MINI ERP');
  console.log('='.repeat(70));
  console.log(`Viewport: ${viewport.width}x${viewport.height}`);
  console.log(`Timestamp: ${new Date().toLocaleString('pt-BR')}`);
  
  // 1. Acessar a aplicação
  console.log('\n1️⃣  ACESSANDO http://localhost:3000');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const resultados = {
    timestamp: new Date().toISOString(),
    viewport: `${viewport.width}x${viewport.height}`,
    modais: {}
  };
  
  // 2. TESTE 1 - Modal de Pedidos
  console.log('\n2️⃣  NAVEGANDO PARA PEDIDOS');
  await page.click('text=/Pedidos/i');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const pedidosModal = await inspecionarModal(
    page,
    'PEDIDOS',
    'button:has-text("Novo Pedido")'
  );
  resultados.modais['Pedidos'] = pedidosModal;
  
  console.log('\n⏳ Aguardando antes de navegar para próxima seção...');
  await page.waitForTimeout(2000);
  
  // 3. TESTE 2 - Modal de Clientes
  console.log('\n3️⃣  NAVEGANDO PARA CLIENTES');
  await page.click('text=/Clientes/i');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const clientesModal = await inspecionarModal(
    page,
    'CLIENTES',
    'button:has-text("Novo Cliente")'
  );
  resultados.modais['Clientes'] = clientesModal;
  
  console.log('\n⏳ Aguardando antes de navegar para próxima seção...');
  await page.waitForTimeout(2000);
  
  // 4. TESTE 3 - Modal de Boletos
  console.log('\n4️⃣  NAVEGANDO PARA BOLETOS');
  await page.click('text=/Boletos/i');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  
  const boletosModal = await inspecionarModal(
    page,
    'BOLETOS',
    'button:has-text("Novo Boleto")'
  );
  resultados.modais['Boletos'] = boletosModal;
  
  // 5. Gerar Relatório Consolidado
  console.log('\n' + '='.repeat(70));
  console.log('📋 RELATÓRIO CONSOLIDADO DOS 3 MODAIS');
  console.log('='.repeat(70));
  
  let todosOk = true;
  
  for (const [nomeModal, dados] of Object.entries(resultados.modais)) {
    if (!dados) {
      console.log(`\n❌ ${nomeModal}: ERRO NA COLETA`);
      todosOk = false;
      continue;
    }
    
    const statusScroll = dados.temScroll ? '⚠️  COM SCROLL' : '✅ SEM SCROLL';
    const statusLayout = dados.display === 'grid' ? '✅ 2 COLUNAS' : '⚠️  OUTRO LAYOUT';
    
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📍 ${nomeModal.toUpperCase()}`);
    console.log('─'.repeat(70));
    console.log(`  Dimensões: ${Math.round(dados.viewportWidth)}px × ${Math.round(dados.viewportHeight)}px`);
    console.log(`  Conteúdo: ${Math.round(dados.scrollHeight)}px altura`);
    console.log(`  Campos: ${dados.camposVisiveis} visíveis`);
    console.log(`  Scroll: ${statusScroll}`);
    console.log(`  Layout: ${statusLayout}`);
    console.log(`  CSS: display=${dados.display}; max-height=${dados.maxHeight}`);
    
    console.log(`\n  Campos:`);
    dados.campos.forEach((campo, idx) => {
      console.log(`    ${idx + 1}. ${campo.label}`);
    });
    
    // Validação
    const ehValido = !dados.temScroll && dados.camposVisiveis > 0;
    const statusFinal = ehValido ? '✅ OK' : '⚠️  NECESSÁRIO AJUSTE';
    console.log(`\n  Status Final: ${statusFinal}`);
    
    if (!ehValido) {
      todosOk = false;
    }
  }
  
  // Salvar relatório JSON
  const relatorioPath = path.join(__dirname, 'relatorio-trois-modals.json');
  fs.writeFileSync(relatorioPath, JSON.stringify(resultados, null, 2));
  console.log(`\n✅ Relatório JSON salvo em: ${relatorioPath}`);
  
  // Gerar relatório markdown
  let relatorioMarkdown = `# Relatório de Testes - 3 Modais em 2 Colunas\n\n`;
  relatorioMarkdown += `**Data**: ${new Date().toLocaleString('pt-BR')}\n`;
  relatorioMarkdown += `**Viewport**: ${viewport.width}x${viewport.height}\n\n`;
  
  relatorioMarkdown += `## Status Geral\n\n`;
  relatorioMarkdown += todosOk 
    ? `✅ **TODOS OS MODAIS FUNCIONANDO 100% - SEM SCROLL NECESSÁRIO**\n\n` 
    : `⚠️ **ALGUNS MODAIS PRECISAM DE AJUSTES**\n\n`;
  
  for (const [nomeModal, dados] of Object.entries(resultados.modais)) {
    if (!dados) continue;
    
    relatorioMarkdown += `### ${nomeModal}\n\n`;
    relatorioMarkdown += `| Aspecto | Valor |\n`;
    relatorioMarkdown += `|--------|-------|\n`;
    relatorioMarkdown += `| Dimensão Modal | ${Math.round(dados.viewportWidth)}×${Math.round(dados.viewportHeight)}px |\n`;
    relatorioMarkdown += `| Altura Conteúdo | ${Math.round(dados.scrollHeight)}px |\n`;
    relatorioMarkdown += `| Total Campos | ${dados.camposVisiveis} |\n`;
    relatorioMarkdown += `| Scroll Necessário | ${dados.temScroll ? 'SIM ⚠️' : 'NÃO ✅'} |\n`;
    relatorioMarkdown += `| Layout | ${dados.display === 'grid' ? '2 Colunas ✅' : dados.display} |\n`;
    relatorioMarkdown += `| max-height | ${dados.maxHeight} |\n\n`;
    
    relatorioMarkdown += `**Campos Visíveis:**\n\n`;
    dados.campos.forEach((campo, idx) => {
      relatorioMarkdown += `${idx + 1}. ${campo.label} (${campo.tipo})\n`;
    });
    relatorioMarkdown += `\n`;
  }
  
  const relatorioMdPath = path.join(__dirname, 'relatorio-trois-modals.md');
  fs.writeFileSync(relatorioMdPath, relatorioMarkdown);
  console.log(`✅ Relatório Markdown salvo em: ${relatorioMdPath}`);
  
  // Assertions finais
  expect(resultados.modais.Pedidos).toBeTruthy();
  expect(resultados.modais.Clientes).toBeTruthy();
  expect(resultados.modais.Boletos).toBeTruthy();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ TESTE CONCLUÍDO COM SUCESSO');
  console.log('='.repeat(70));
});
