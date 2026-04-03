const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Criar pasta de screenshots se não existir
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

let reportData = {
  timestamp: new Date().toISOString(),
  initialFields: [],
  fieldsAfterScroll: [],
  scrollOccurred: false,
  modalDimensions: {},
  modalOverflow: {},
  screenshots: [],
  errors: [],
  pageUrl: '',
  notes: ''
};

test.setTimeout(120000); // Aumentar timeout global

test('Inspect and Document Pedidos Modal', async ({ page }) => {
  try {
    // 1. Acessar http://localhost:3001
    console.log('1. Acessando http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 30000 });
    reportData.pageUrl = page.url();
    
    // Aguardar por um tempo para a página carregar completamente
    await page.waitForTimeout(2000);

    // 2. Clicar na seção "Pedidos" no menu lateral
    console.log('2. Procurando pela seção Pedidos no menu');
    
    // Tentar encontrar o link/botão de Pedidos
    const pedidosLink = page.locator('a, button').filter({ hasText: /Pedidos/i }).first();
    
    if (await pedidosLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Link de Pedidos encontrado, clicando...');
      await pedidosLink.click();
      await page.waitForTimeout(1500);
    } else {
      reportData.errors.push('Link de Pedidos não encontrado visível');
      reportData.notes += 'Tentando acessar Pedidos diretamente pela URL\n';
      await page.goto('http://localhost:3001/#/pedidos', { waitUntil: 'load' });
      await page.waitForTimeout(1500);
    }

    // 3 & 4. Verificar se há pedidos existentes
    console.log('3-4. Verificando se há pedidos existentes');
    
    // Procurar por botão de editar ou novo pedido
    const editButtons = page.locator('button').filter({ hasText: /Editar|Edit/i });
    const newButton = page.locator('button').filter({ hasText: /\+ Novo Pedido|\+ New Order|Novo Pedido/i });
    
    let modalOpened = false;
    const editButtonCount = await editButtons.count().catch(() => 0);
    const newButtonVisible = await newButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (editButtonCount > 0) {
      console.log(`Encontrados ${editButtonCount} botões de editar. Clicando no primeiro...`);
      await editButtons.first().click();
      modalOpened = true;
    } else if (newButtonVisible) {
      console.log('Nenhum pedido existente. Clicando em "+ Novo Pedido"');
      await newButton.click();
      modalOpened = true;
    } else {
      reportData.errors.push('Nenhum botão de editar ou novo pedido encontrado');
    }

    if (modalOpened) {
      await page.waitForTimeout(2000);
    }

    // 5. Inspecionar modal e listar campos visíveis
    console.log('5. Inspecionando modal e campos visíveis');
    
    // Procurar por um modal/dialog com várias seletoras possíveis
    let modal = page.locator('[role="dialog"]').first();
    let modalFound = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!modalFound) {
      modal = page.locator('.modal, .Modal, [data-testid="modal"]').first();
      modalFound = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (modalFound) {
      console.log('Modal encontrado!');
      
      // Obter dimensões do modal
      const boundingBox = await modal.boundingBox().catch(() => null);
      if (boundingBox) {
        reportData.modalDimensions = {
          width: Math.round(boundingBox.width),
          height: Math.round(boundingBox.height),
          x: Math.round(boundingBox.x),
          y: Math.round(boundingBox.y)
        };
      }

      // Verificar propriedades de overflow
      const overflowProperties = await modal.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          overflow: computed.overflow,
          overflowY: computed.overflowY,
          overflowX: computed.overflowX,
          maxHeight: computed.maxHeight,
          height: computed.height,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          hasVerticalScroll: el.scrollHeight > el.clientHeight,
          hasHorizontalScroll: el.scrollWidth > el.clientWidth
        };
      });

      reportData.modalOverflow = overflowProperties;
      console.log(`Modal scroll properties:`, overflowProperties);

      // 6. Fazer screenshot do modal aberto ANTES do scroll
      console.log('6. Capturando screenshot do modal');
      const screenshotPath = path.join(screenshotsDir, '01-modal-antes-scroll.png');
      await modal.screenshot({ path: screenshotPath });
      reportData.screenshots.push({
        name: '01-modal-antes-scroll.png',
        path: screenshotPath,
        timing: 'before-scroll'
      });
      console.log(`Screenshot salvo: ${screenshotPath}`);

      // Listar campos visíveis ANTES do scroll
      console.log('Listando todos os campos de input/select/textarea...');
      
      const fieldsInfo = await modal.evaluate(() => {
        const fields = [];
        
        // Buscar todos os form-groups (estrutura com label + input/select/textarea)
        const formGroups = document.querySelectorAll('.form-group');
        
        formGroups.forEach((group, idx) => {
          // Procurar label
          const labelElement = group.querySelector('label');
          const labelText = labelElement ? labelElement.textContent.trim() : '';
          
          // Procurar input
          const input = group.querySelector('input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input:not([type])');
          if (input && labelText) {
            const rect = input.getBoundingClientRect();
            const modalRect = input.closest('[role="dialog"], .modal, .Modal, [data-testid="modal"]')?.getBoundingClientRect();
            
            const isVisible = modalRect ? 
              (rect.top >= modalRect.top && rect.left >= modalRect.left && 
               rect.bottom <= modalRect.bottom && rect.right <= modalRect.right) :
              (rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth);
            
            fields.push({
              fieldNumber: idx,
              type: 'input',
              inputType: input.getAttribute('type') || 'text',
              name: input.getAttribute('name') || '',
              id: input.getAttribute('id') || '',
              placeholder: input.getAttribute('placeholder') || '',
              label: labelText,
              isVisible: isVisible,
              boundingBox: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
            return; // Skip to next form-group
          }
          
          // Procurar select
          const select = group.querySelector('select');
          if (select && labelText) {
            const rect = select.getBoundingClientRect();
            const modalRect = select.closest('[role="dialog"], .modal, .Modal, [data-testid="modal"]')?.getBoundingClientRect();
            
            const isVisible = modalRect ? 
              (rect.top >= modalRect.top && rect.left >= modalRect.left && 
               rect.bottom <= modalRect.bottom && rect.right <= modalRect.right) :
              (rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth);
            
            fields.push({
              fieldNumber: idx,
              type: 'select',
              name: select.getAttribute('name') || '',
              id: select.getAttribute('id') || '',
              label: labelText,
              optionCount: select.options.length,
              isVisible: isVisible,
              boundingBox: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
            return; // Skip to next form-group
          }
          
          // Procurar textarea
          const textarea = group.querySelector('textarea');
          if (textarea && labelText) {
            const rect = textarea.getBoundingClientRect();
            const modalRect = textarea.closest('[role="dialog"], .modal, .Modal, [data-testid="modal"]')?.getBoundingClientRect();
            
            const isVisible = modalRect ? 
              (rect.top >= modalRect.top && rect.left >= modalRect.left && 
               rect.bottom <= modalRect.bottom && rect.right <= modalRect.right) :
              (rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth);
            
            fields.push({
              fieldNumber: idx,
              type: 'textarea',
              name: textarea.getAttribute('name') || '',
              id: textarea.getAttribute('id') || '',
              placeholder: textarea.getAttribute('placeholder') || '',
              label: labelText,
              rows: textarea.getAttribute('rows') || '1',
              isVisible: isVisible,
              boundingBox: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
          }
        });

        return fields;
      });

      reportData.initialFields = fieldsInfo.filter(f => f.isVisible);
      console.log(`Encontrados ${fieldsInfo.length} campos no total, ${reportData.initialFields.length} visíveis`);
      
      // 7. Tentar fazer scroll dentro do modal
      console.log('7. Tentando fazer scroll dentro do modal');
      
      const scrollResult = await modal.evaluate((el) => {
        const initialScrollTop = el.scrollTop;
        const canScroll = el.scrollHeight > el.clientHeight;
        
        if (canScroll) {
          el.scrollTop = el.scrollHeight;
          return {
            couldScroll: true,
            initialScrollTop: initialScrollTop,
            finalScrollTop: el.scrollTop,
            scrollDistance: el.scrollTop - initialScrollTop
          };
        }
        return { couldScroll: false };
      });

      reportData.scrollOccurred = scrollResult.couldScroll;
      
      if (scrollResult.couldScroll) {
        console.log(`Scroll executado: ${scrollResult.scrollDistance}px`);
        await page.waitForTimeout(500);

        // 8. Fazer screenshot APÓS scroll
        const screenshotPathAfter = path.join(screenshotsDir, '02-modal-apos-scroll.png');
        await modal.screenshot({ path: screenshotPathAfter });
        reportData.screenshots.push({
          name: '02-modal-apos-scroll.png',
          path: screenshotPathAfter,
          timing: 'after-scroll',
          scrollDistance: scrollResult.scrollDistance
        });
        console.log(`Screenshot pós-scroll salvo: ${screenshotPathAfter}`);

        // Listar campos após scroll
        const fieldsAfterScroll = await modal.evaluate(() => {
          const fields = [];
          
          const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input:not([type])');
          inputs.forEach((input, idx) => {
            const label = input.getAttribute('placeholder') || input.getAttribute('name') || '(sem identificador)';
            fields.push({
              type: 'input',
              label: label
            });
          });

          const selects = document.querySelectorAll('select');
          selects.forEach((select) => {
            fields.push({
              type: 'select',
              label: select.getAttribute('name') || '(sem identificador)'
            });
          });

          const textareas = document.querySelectorAll('textarea');
          textareas.forEach((textarea) => {
            fields.push({
              type: 'textarea',
              label: textarea.getAttribute('placeholder') || textarea.getAttribute('name') || '(sem identificador)'
            });
          });

          return fields;
        });

        reportData.fieldsAfterScroll = fieldsAfterScroll;
        console.log(`Campos encontrados após scroll: ${fieldsAfterScroll.length}`);
      } else {
        console.log('Modal não possui scroll ou não é necessário');
        reportData.fieldsAfterScroll = reportData.initialFields;
      }

      // Screenshot da página inteira para referência
      const fullPageScreenshot = path.join(screenshotsDir, '00-pagina-completa.png');
      await page.screenshot({ path: fullPageScreenshot, fullPage: false });
      reportData.screenshots.push({
        name: '00-pagina-completa.png',
        path: fullPageScreenshot,
        timing: 'full-page'
      });

    } else {
      reportData.errors.push('Modal não encontrado após tentar abrir');
    }

  } catch (error) {
    reportData.errors.push({
      message: error.message,
      stack: error.stack.split('\n')[0]
    });
    console.error('Erro durante o teste:', error.message);
  }

  // Salvar relatório em JSON
  const reportPath = path.join(__dirname, 'relatorio-modal.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n✅ Relatório salvo em: ${reportPath}`);
  
  // Salvar relatório em Markdown também
  const markdownPath = path.join(__dirname, 'relatorio-modal.md');
  const markdownContent = generateMarkdownReport(reportData);
  fs.writeFileSync(markdownPath, markdownContent);
  console.log(`✅ Relatório Markdown salvo em: ${markdownPath}`);
  
  // Imprimir resumo
  printSummary(reportData);
});

function printSummary(data) {
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO DO TESTE - INSPEÇÃO MODAL PEDIDOS');
  console.log('='.repeat(60));
  
  console.log(`\n📅 Timestamp: ${data.timestamp}`);
  console.log(`📍 URL: ${data.pageUrl}`);
  console.log(`\n📊 ESTATÍSTICAS:`);
  console.log(`   • Campos inicialmente visíveis: ${data.initialFields.length}`);
  console.log(`   • Scroll ocorreu: ${data.scrollOccurred ? 'SIM' : 'NÃO'}`);
  console.log(`   • Campos após scroll: ${data.fieldsAfterScroll.length}`);
  console.log(`   • Screenshots capturadas: ${data.screenshots.length}`);
  console.log(`   • Erros encontrados: ${data.errors.length}`);
  
  if (data.modalDimensions.width) {
    console.log(`\n📐 DIMENSÕES DO MODAL:`);
    console.log(`   • Largura: ${data.modalDimensions.width}px`);
    console.log(`   • Altura: ${data.modalDimensions.height}px`);
    console.log(`   • Posição X: ${data.modalDimensions.x}px`);
    console.log(`   • Posição Y: ${data.modalDimensions.y}px`);
  }

  if (Object.keys(data.modalOverflow).length > 0) {
    console.log(`\n⬆️  PROPRIEDADES DE OVERFLOW:`);
    console.log(`   • CSS Overflow: ${data.modalOverflow.overflow}`);
    console.log(`   • CSS Overflow-Y: ${data.modalOverflow.overflowY}`);
    console.log(`   • CSS Overflow-X: ${data.modalOverflow.overflowX}`);
    console.log(`   • Max Height: ${data.modalOverflow.maxHeight}`);
    console.log(`   • Altura CSS: ${data.modalOverflow.height}`);
    console.log(`   • Scroll Height: ${data.modalOverflow.scrollHeight}px`);
    console.log(`   • Client Height: ${data.modalOverflow.clientHeight}px`);
    console.log(`   • Tem scroll vertical: ${data.modalOverflow.hasVerticalScroll ? 'SIM' : 'NÃO'}`);
    console.log(`   • Tem scroll horizontal: ${data.modalOverflow.hasHorizontalScroll ? 'SIM' : 'NÃO'}`);
  }

  if (data.errors.length > 0) {
    console.log(`\n❌ ERROS ENCONTRADOS:`);
    data.errors.forEach((err, idx) => {
      if (typeof err === 'string') {
        console.log(`   ${idx + 1}. ${err}`);
      } else {
        console.log(`   ${idx + 1}. ${err.message}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('CAMPOS ENCONTRADOS - ANTES DO SCROLL');
  console.log('='.repeat(60));
  
  if (data.initialFields.length > 0) {
    data.initialFields.forEach((field, idx) => {
      console.log(`\n${idx + 1}. [${field.type.toUpperCase()}] ${field.label}`);
      if (field.name) console.log(`   Nome: ${field.name}`);
      if (field.id) console.log(`   ID: ${field.id}`);
      if (field.inputType && field.inputType !== 'text') console.log(`   Tipo de Input: ${field.inputType}`);
      if (field.optionCount) console.log(`   Opções: ${field.optionCount}`);
      if (field.placeholder && field.placeholder !== field.label) console.log(`   Placeholder: ${field.placeholder}`);
    });
  } else {
    console.log('(Nenhum campo encontrado)');
  }

  if (data.scrollOccurred && data.fieldsAfterScroll.length > data.initialFields.length) {
    console.log('\n' + '='.repeat(60));
    console.log('NOVOS CAMPOS ENCONTRADOS - APÓS SCROLL');
    console.log('='.repeat(60));
    
    data.fieldsAfterScroll.slice(data.initialFields.length).forEach((field, idx) => {
      console.log(`\n${data.initialFields.length + idx + 1}. [${field.type.toUpperCase()}] ${field.label}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SCREENSHOTS CAPTURADAS');
  console.log('='.repeat(60));
  
  data.screenshots.forEach((screenshot, idx) => {
    console.log(`${idx + 1}. ${screenshot.name} (${screenshot.timing})`);
    console.log(`   Caminho: ${screenshot.path}`);
  });

  console.log('\n');
}

function generateMarkdownReport(data) {
  let md = `# Relatório de Inspeção do Modal de Pedidos\n\n`;
  
  md += `**Data/Hora:** ${data.timestamp}\n`;
  md += `**URL:** ${data.pageUrl}\n\n`;
  
  md += `## 📊 Resumo Executivo\n\n`;
  md += `| Métrica | Valor |\n`;
  md += `|--------|-------|\n`;
  md += `| Campos Visíveis Inicialmente | ${data.initialFields.length} |\n`;
  md += `| Scroll Ocorreu | ${data.scrollOccurred ? 'Sim' : 'Não'} |\n`;
  md += `| Campos Após Scroll | ${data.fieldsAfterScroll.length} |\n`;
  md += `| Screenshots | ${data.screenshots.length} |\n`;
  md += `| Erros | ${data.errors.length} |\n\n`;
  
  if (Object.keys(data.modalDimensions).length > 0) {
    md += `## 📐 Dimensões do Modal\n\n`;
    md += `| Propriedade | Valor |\n`;
    md += `|-------------|-------|\n`;
    md += `| Largura | ${data.modalDimensions.width}px |\n`;
    md += `| Altura | ${data.modalDimensions.height}px |\n`;
    md += `| Posição X | ${data.modalDimensions.x}px |\n`;
    md += `| Posição Y | ${data.modalDimensions.y}px |\n\n`;
  }

  if (Object.keys(data.modalOverflow).length > 0) {
    md += `## ⬆️  Propriedades de Overflow\n\n`;
    md += `| Propriedade | Valor |\n`;
    md += `|-------------|-------|\n`;
    md += `| CSS overflow | ${data.modalOverflow.overflow} |\n`;
    md += `| CSS overflow-y | ${data.modalOverflow.overflowY} |\n`;
    md += `| CSS overflow-x | ${data.modalOverflow.overflowX} |\n`;
    md += `| max-height | ${data.modalOverflow.maxHeight} |\n`;
    md += `| height | ${data.modalOverflow.height} |\n`;
    md += `| scrollHeight | ${data.modalOverflow.scrollHeight}px |\n`;
    md += `| clientHeight | ${data.modalOverflow.clientHeight}px |\n`;
    md += `| Tem scroll vertical | ${data.modalOverflow.hasVerticalScroll ? 'Sim' : 'Não'} |\n`;
    md += `| Tem scroll horizontal | ${data.modalOverflow.hasHorizontalScroll ? 'Sim' : 'Não'} |\n\n`;
  }

  md += `## 📋 Campos Encontrados - Antes do Scroll\n\n`;
  
  if (data.initialFields.length > 0) {
    data.initialFields.forEach((field, idx) => {
      md += `### ${idx + 1}. ${field.label}\n\n`;
      md += `| Atributo | Valor |\n`;
      md += `|----------|-------|\n`;
      md += `| Tipo | ${field.type} |\n`;
      if (field.inputType) md += `| Input Type | ${field.inputType} |\n`;
      if (field.name) md += `| Name | ${field.name} |\n`;
      if (field.id) md += `| ID | ${field.id} |\n`;
      if (field.optionCount) md += `| Opções (Select) | ${field.optionCount} |\n`;
      if (field.placeholder && field.placeholder !== field.label) md += `| Placeholder | ${field.placeholder} |\n`;
      md += `\n`;
    });
  } else {
    md += `Nenhum campo foi encontrado no modal.\n\n`;
  }

  if (data.scrollOccurred && data.fieldsAfterScroll.length > data.initialFields.length) {
    md += `## 📋 Novos Campos Encontrados - Após Scroll\n\n`;
    
    data.fieldsAfterScroll.slice(data.initialFields.length).forEach((field, idx) => {
      md += `${data.initialFields.length + idx + 1}. **[${field.type.toUpperCase()}]** ${field.label}\n\n`;
    });
  }

  md += `## 📸 Screenshots Capturadas\n\n`;
  
  data.screenshots.forEach((screenshot, idx) => {
    md += `${idx + 1}. **${screenshot.name}** (${screenshot.timing})\n`;
    md += `   ![${screenshot.name}](screenshots/${screenshot.name})\n\n`;
  });

  if (data.errors.length > 0) {
    md += `## ❌ Erros Encontrados\n\n`;
    data.errors.forEach((err, idx) => {
      if (typeof err === 'string') {
        md += `${idx + 1}. ${err}\n`;
      } else {
        md += `${idx + 1}. ${err.message}\n`;
      }
    });
    md += `\n`;
  }

  md += `## 📝 Notas Adicionais\n\n`;
  md += data.notes || 'Nenhuma nota adicional.';
  
  return md;
}
