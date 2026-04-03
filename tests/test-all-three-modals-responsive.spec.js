const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Criar pasta de screenshots se não existir
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Dados coletados de todos os testes
const resultados = {
  timestamp: new Date().toISOString(),
  modais: {}
};

async function testarModal(page, nomeModulo, textoBotao, nomeModal) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 TESTANDO MODAL: ${nomeModal}`);
  console.log(`${'='.repeat(60)}`);
  
  // 1. Navegar para o módulo
  console.log(`\n1️⃣  Navegando para ${nomeModulo}`);
  
  // Primeiro, clique no link de navegação se for necessário
  const navLink = page.locator(`a, button`).filter({ hasText: new RegExp(nomeModulo, 'i') }).nth(0);
  if (await navLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`Clicando no link de navegação: ${nomeModulo}`);
    await navLink.click();
    await page.waitForTimeout(1500);
  }
  
  // Alternativamente, navegar direto
  const urlParte = nomeModulo.toLowerCase();
  await page.goto(`http://localhost:3000/#/${urlParte}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Screenshot da página
  const screenshotPagePath = `tests/screenshots/${nomeModulo}-01-page.png`;
  console.log(`📸 Capturando página ${nomeModulo}`);
  await page.screenshot({ path: screenshotPagePath});
  
  // 2. Abrir modal
  console.log(`\n2️⃣  Abrindo modal de ${nomeModal} (procurando botão com texto: "${textoBotao}")`);
  
  // Procurar o botão de forma mais cuidadosa - ignora buttons do navbar/menu
  let botaoClicado = false;
  const todosOsBotoes = page.locator('button');
  const countBotoes = await todosOsBotoes.count();
  
  console.log(`📋 Total de ${countBotoes} botões encontrados na página`);
  
  // DEBUG: Mostrar texto de todos os botões
  const botoesInfo = [];
  for (let i = 0; i < countBotoes; i++) {
    const botao = todosOsBotoes.nth(i);
    const botaoTexto = await botao.textContent();
    const isVisible = await botao.isVisible().catch(() => false);
    botoesInfo.push({ i, texto: botaoTexto, visível: isVisible });
    if (isVisible) {
      console.log(`  Botão ${i}: "${botaoTexto}" (visível)`);
    }
  }
  
  // Procurar especificamente por "Novo Pedido", "Novo Cliente" ou "Novo Boleto"
  for (let i = 0; i < countBotoes; i++) {
    const botao = todosOsBotoes.nth(i);
    const botaoTexto = await botao.textContent();
    const isVisible = await botao.isVisible().catch(() => false);
    
    // Procurar pelo texto específico - flexível com espaços
    const temTexto = botaoTexto && (
      botaoTexto.includes('Novo Pedido') || 
      botaoTexto.includes('Novo Cliente') ||
      botaoTexto.includes('Novo Boleto') ||
      (botaoTexto.includes('+') && botaoTexto.includes('Novo'))
    );
    
    if (temTexto && isVisible) {
      console.log(`✓ Botão encontrado: "${botaoTexto}"`);
      // Tentar scroll até o botão antes de clicar
      await botao.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await botao.click();
      botaoClicado = true;
      break;
    }
  }
  
  if (!botaoClicado) {
    console.log('\n⚠️  Botão não encontrado com texto específico. Tentando encontrar por padrão...');
    // Última tentativa: procurar por qualquer botão que contenha "Novo"
    for (let i = 0; i < countBotoes; i++) {
      const botao = todosOsBotoes.nth(i);
      const botaoTexto = await botao.textContent();
      const isVisible = await botao.isVisible().catch(() => false);
      
      if (botaoTexto && botaoTexto.includes('Novo') && isVisible) {
        console.log(`✓ Encontrado botão com "Novo": "${botaoTexto}"`);
        await botao.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await botao.click();
        botaoClicado = true;
        break;
      }
    }
  }
  
  if (!botaoClicado) {
    throw new Error(`Não foi possível encontrar botão para ${nomeModal}. Botões encontrados: ${botoesInfo.map(b => `"${b.texto}"`).join(', ')}`);
  }
  
  // Esperar modal abrir - com timeout maior
  console.log('Aguardando modal abrir...');
  await page.waitForSelector('.modal.active', { timeout: 10000 });
  await page.waitForSelector('.modal-content', { timeout: 5000 });
  await page.waitForTimeout(1500);
  
  // 3. Capturar screenshot do modal
  const screenshotModalPath = `tests/screenshots/${nomeModulo}-02-modal.png`;
  console.log(`📸 Capturando modal aberto`);
  await page.screenshot({ path: screenshotModalPath });
  
  // 4. Inspecionar modal - Desktop (viewport padrão)
  console.log(`\n3️⃣  Analisando modal em DESKTOP (viewport padrão)`);
  const dataDesktop = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content');
    if (!modal) return null;
    
    const rect = modal.getBoundingClientRect();
    const computed = window.getComputedStyle(modal);
    
    // Verificar se Status e Observações estão visíveis
    const statusField = Array.from(modal.querySelectorAll('input, select, textarea')).find(el => 
      el.name === 'status' || el.id === 'status' || el.getAttribute('placeholder')?.toLowerCase().includes('status')
    );
    
    const obsField = Array.from(modal.querySelectorAll('input, select, textarea')).find(el => 
      el.name === 'observacoes' || el.name === 'obs' || el.id === 'observacoes' || 
      el.getAttribute('placeholder')?.toLowerCase().includes('observação')
    );
    
    // Coletar todos os campos
    const campos = [];
    const inputs = modal.querySelectorAll('input, textarea, select');
    
    inputs.forEach(field => {
      const rect = field.getBoundingClientRect();
      const label = field.previousElementSibling?.textContent || 
                   field.parentElement?.querySelector('label')?.textContent || 
                   field.name || 'SEM NOME';
      
      campos.push({
        nome: field.name || field.id || 'SEM NOME',
        label: label.trim(),
        tipo: field.tagName.toLowerCase(),
        visivel: rect.height > 0 && rect.width > 0,
        estaEmViewport: rect.top >= modal.getBoundingClientRect().top && 
                       rect.bottom <= modal.getBoundingClientRect().bottom
      });
    });
    
    // Informações do modal
    return {
      // Dimensões
      largura: rect.width,
      altura_viewport: rect.height,
      altura_conteudo: modal.scrollHeight,
      necessario_scroll: modal.scrollHeight > modal.clientHeight,
      scroll_overflow: modal.scrollHeight - modal.clientHeight,
      
      // Posição
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      
      // CSS
      maxHeight: computed.maxHeight,
      overflowY: computed.overflowY,
      display: computed.display,
      gap: computed.gap,
      gridTemplateColumns: computed.gridTemplateColumns,
      
      // Campos
      totalCampos: campos.length,
      campos: campos,
      
      // Análise específica
      statusVisivel: !!statusField && statusField.offsetHeight > 0,
      statusEmViewport: !!statusField && statusField.getBoundingClientRect().top >= modal.getBoundingClientRect().top,
      obsVisivel: !!obsField && obsField.offsetHeight > 0,
      obsEmViewport: !!obsField && obsField.getBoundingClientRect().top >= modal.getBoundingClientRect().top
    };
  });
  
  if (!dataDesktop) {
    throw new Error(`Modal não encontrado para ${nomeModal}`);
  }
  
  console.log(`\n📊 DADOS DO MODAL - DESKTOP\n`);
  console.log(`Dimensões:`);
  console.log(`  Largura:          ${dataDesktop.largura}px`);
  console.log(`  Altura (visível): ${dataDesktop.altura_viewport}px`);
  console.log(`  Altura (total):   ${dataDesktop.altura_conteudo}px`);
  console.log(`  Necessário scroll: ${dataDesktop.necessario_scroll ? 'SIM ⚠️' : 'NÃO ✅'}`);
  if (dataDesktop.necessario_scroll) {
    console.log(`  Overflow:         ${dataDesktop.scroll_overflow}px`);
  }
  
  console.log(`\nCSS do Modal:`);
  console.log(`  max-height: ${dataDesktop.maxHeight}`);
  console.log(`  overflow-y: ${dataDesktop.overflowY}`);
  console.log(`  display: ${dataDesktop.display}`);
  console.log(`  grid-template-columns: ${dataDesktop.gridTemplateColumns}`);
  
  console.log(`\nCampos específicos:`);
  console.log(`  Status visível: ${dataDesktop.statusVisivel ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`  Status em viewport: ${dataDesktop.statusEmViewport ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`  Observações visível: ${dataDesktop.obsVisivel ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`  Observações em viewport: ${dataDesktop.obsEmViewport ? 'SIM ✅' : 'NÃO ❌'}`);
  
  console.log(`\nCampos totais: ${dataDesktop.totalCampos}`);
  
  // 5. Testar responsividade em 768px
  console.log(`\n4️⃣  Testando RESPONSIVIDADE em 768px de largura`);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  
  const screenshotResponsive = `tests/screenshots/${nomeModulo}-03-modal-768px.png`;
  console.log(`📸 Capturando modal em 768px`);
  await page.screenshot({ path: screenshotResponsive });
  
  // Analisar modal em 768px
  const dataResponsive = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content');
    if (!modal) return null;
    
    const rect = modal.getBoundingClientRect();
    const computed = window.getComputedStyle(modal);
    
    return {
      largura: rect.width,
      altura_viewport: rect.height,
      altura_conteudo: modal.scrollHeight,
      necessario_scroll: modal.scrollHeight > modal.clientHeight,
      scroll_overflow: modal.scrollHeight - modal.clientHeight,
      
      // Verificar se mantém 2 colunas
      gridTemplateColumns: computed.gridTemplateColumns,
      isStillTwoColumns: computed.gridTemplateColumns.includes('1fr') && 
                        computed.gridTemplateColumns.split(' ').length >= 2
    };
  });
  
  console.log(`\n📊 DADOS DO MODAL - 768px (TABLET)\n`);
  console.log(`Dimensões:`);
  console.log(`  Largura:          ${dataResponsive.largura}px`);
  console.log(`  Altura (visível): ${dataResponsive.altura_viewport}px`);
  console.log(`  Altura (total):   ${dataResponsive.altura_conteudo}px`);
  console.log(`  Necessário scroll: ${dataResponsive.necessario_scroll ? 'SIM ⚠️' : 'NÃO ✅'}`);
  console.log(`  Layout 2 colunas mantido: ${dataResponsive.isStillTwoColumns ? 'SIM ✅' : 'Provavelmente 1 coluna'}`);
  console.log(`  grid-template-columns: ${dataResponsive.gridTemplateColumns}`);
  
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Armazenar resultados
  resultados.modais[nomeModal] = {
    nome: nomeModal,
    modulo: nomeModulo,
    desktop: {
      largura: dataDesktop.largura,
      altura_viewport: dataDesktop.altura_viewport,
      altura_conteudo: dataDesktop.altura_conteudo,
      necessario_scroll: dataDesktop.necessario_scroll,
      scroll_overflow: dataDesktop.scroll_overflow,
      status_visivel: dataDesktop.statusVisivel,
      status_em_viewport: dataDesktop.statusEmViewport,
      observacoes_visivel: dataDesktop.obsVisivel,
      observacoes_em_viewport: dataDesktop.obsEmViewport,
      total_campos: dataDesktop.totalCampos,
      css: {
        'max-height': dataDesktop.maxHeight,
        'overflow-y': dataDesktop.overflowY,
        'display': dataDesktop.display,
        'grid-template-columns': dataDesktop.gridTemplateColumns
      }
    },
    responsividade_768px: {
      largura: dataResponsive.largura,
      altura_viewport: dataResponsive.altura_viewport,
      altura_conteudo: dataResponsive.altura_conteudo,
      necessario_scroll: dataResponsive.necessario_scroll,
      scroll_overflow: dataResponsive.scroll_overflow,
      mantém_2_colunas: dataResponsive.isStillTwoColumns,
      grid_template_columns: dataResponsive.gridTemplateColumns
    },
    screenshots: {
      página: screenshotPagePath,
      modal_desktop: screenshotModalPath,
      modal_768px: screenshotResponsive
    }
  };
  
  console.log(`\n✅ Teste de ${nomeModal} concluído!\n`);
}

test('Testar Layout 2 Colunas - Todos os 3 Modais + Responsividade', async ({ page }) => {
  try {
    // Acessar aplicação principal
    console.log('🚀 INICIANDO TESTES DOS MODAIS EM 2 COLUNAS\n');
    console.log(`Timestamp: ${resultados.timestamp}`);
    console.log(`URL Base: http://localhost:3000`);
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    // Testar os 3 modais
    await testarModal(
      page,
      'Pedidos',
      'Novo Pedido',
      'Pedidos'
    );
    
    await testarModal(
      page,
      'Clientes',
      'Novo Cliente',
      'Clientes'
    );
    
    await testarModal(
      page,
      'Boletos',
      'Novo Boleto',
      'Boletos'
    );
    
    // Gerar relatório final
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 RESUMO FINAL`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Salvar relatório em JSON
    const relatorioPath = path.join(__dirname, 'relatorio-todos-modais.json');
    fs.writeFileSync(relatorioPath, JSON.stringify(resultados, null, 2));
    console.log(`✅ Relatório JSON salvo: ${relatorioPath}`);
    
    // Gerar relatório em Markdown
    let markdownContent = `# Testes de Layout 2 Colunas - Todos os Modais\n\n`;
    markdownContent += `**Data/Hora**: ${new Date().toLocaleString('pt-BR')}\n\n`;
    markdownContent += `## 📊 Resumo Visual\n\n`;
    
    Object.entries(resultados.modais).forEach(([key, dados]) => {
      const desktop = dados.desktop;
      const responsive = dados.responsividade_768px;
      
      markdownContent += `### ${dados.nome}\n\n`;
      markdownContent += `#### Desktop (1280x720)\n\n`;
      markdownContent += `| Propriedade | Valor |\n`;
      markdownContent += `|---|---|\n`;
      markdownContent += `| Largura | ${desktop.largura}px |\n`;
      markdownContent += `| Altura (viewport) | ${desktop.altura_viewport}px |\n`;
      markdownContent += `| Altura (conteúdo) | ${desktop.altura_conteudo}px |\n`;
      markdownContent += `| Necessário scroll | ${desktop.necessario_scroll ? '⚠️ SIM' : '✅ NÃO'} |\n`;
      markdownContent += `| Status visível | ${desktop.status_visivel ? '✅ SIM' : '❌ NÃO'} |\n`;
      markdownContent += `| Status em viewport | ${desktop.status_em_viewport ? '✅ SIM' : '❌ NÃO'} |\n`;
      markdownContent += `| Observações visível | ${desktop.observacoes_visivel ? '✅ SIM' : '❌ NÃO'} |\n`;
      markdownContent += `| Observações em viewport | ${desktop.observacoes_em_viewport ? '✅ SIM' : '❌ NÃO'} |\n`;
      markdownContent += `| Total de campos | ${desktop.total_campos} |\n\n`;
      
      markdownContent += `**CSS:**\n`;
      markdownContent += `- max-height: ${desktop.css['max-height']}\n`;
      markdownContent += `- overflow-y: ${desktop.css['overflow-y']}\n`;
      markdownContent += `- display: ${desktop.css.display}\n`;
      markdownContent += `- grid-template-columns: ${desktop.css['grid-template-columns']}\n\n`;
      
      markdownContent += `#### Responsividade (768px - Tablet)\n\n`;
      markdownContent += `| Propriedade | Valor |\n`;
      markdownContent += `|---|---|\n`;
      markdownContent += `| Largura | ${responsive.largura}px |\n`;
      markdownContent += `| Altura (viewport) | ${responsive.altura_viewport}px |\n`;
      markdownContent += `| Altura (conteúdo) | ${responsive.altura_conteudo}px |\n`;
      markdownContent += `| Necessário scroll | ${responsive.necessario_scroll ? '⚠️ SIM' : '✅ NÃO'} |\n`;
      markdownContent += `| Mantém 2 colunas | ${responsive.mantém_2_colunas ? '✅ SIM' : '📱 1 coluna'} |\n`;
      markdownContent += `| grid-template-columns | ${responsive.grid_template_columns} |\n\n`;
      
      markdownContent += `**Screenshots:**\n`;
      markdownContent += `- [Página](${dados.screenshots.página})\n`;
      markdownContent += `- [Modal Desktop](${dados.screenshots.modal_desktop})\n`;
      markdownContent += `- [Modal 768px](${dados.screenshots.modal_768px})\n\n`;
      markdownContent += `---\n\n`;
    });
    
    markdownContent += `## ✅ Conclusão\n\n`;
    markdownContent += `Todos os testes foram executados com sucesso. Verifique os screenshots para validação visual.\n`;
    
    const markdownPath = path.join(__dirname, 'relatorio-todos-modais.md');
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`✅ Relatório Markdown salvo: ${markdownPath}`);
    
    // Mostrar sumário no console
    console.log(`\n📋 CHECKLIST - TODOS OS MODAIS\n`);
    
    Object.entries(resultados.modais).forEach(([key, dados]) => {
      const desktop = dados.desktop;
      const responsive = dados.responsividade_768px;
      
      console.log(`\n${dados.nome}:`);
      console.log(`  ✅ Altura conteúdo: ${desktop.altura_conteudo}px`);
      console.log(`  ${desktop.necessario_scroll ? '⚠️' : '✅'} Scroll necessário: ${desktop.necessario_scroll ? 'SIM' : 'NÃO'}`);
      console.log(`  ${desktop.status_em_viewport ? '✅' : '❌'} Status visível sem scroll`);
      console.log(`  ${desktop.observacoes_em_viewport ? '✅' : '❌'} Observações visível sem scroll`);
      console.log(`  ${responsive.mantém_2_colunas ? '✅' : '📱'} Responsivo 768px`);
      console.log(`  📸 Screenshots geradas`);
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
    throw error;
  }
});
