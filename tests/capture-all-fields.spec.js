const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, 'screenshots');

test('Capture All Fields Including Hidden', async ({ page }) => {
  try {
    console.log('Acessando http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Clicar em Pedidos
    const pedidosLink = page.locator('a, button').filter({ hasText: /Pedidos/i }).first();
    if (await pedidosLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pedidosLink.click();
      await page.waitForTimeout(1500);
    }

    // Clicar em Novo Pedido
    const newButton = page.locator('button').filter({ hasText: /Novo Pedido/i });
    if (await newButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newButton.click();
      await page.waitForTimeout(2000);
    }

    // Encontrar o modal
    let modal = page.locator('[role="dialog"]').first();
    let modalFound = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!modalFound) {
      modal = page.locator('.modal, .Modal').first();
      modalFound = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (modalFound) {
      console.log('Modal encontrado! Capturando TODOS os campos...');
      
      // Obter TODOS os campos, visíveis ou não
      const allFields = await modal.evaluate(() => {
        const fields = [];
        const formGroups = document.querySelectorAll('.form-group');
        
        formGroups.forEach((group, idx) => {
          const labelElement = group.querySelector('label');
          const labelText = labelElement ? labelElement.textContent.trim() : '';
          
          // Input
          const input = group.querySelector('input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="password"], input:not([type])');
          if (input && labelText) {
            const rect = input.getBoundingClientRect();
            fields.push({
              fieldNumber: fields.length + 1,
              type: 'input',
              inputType: input.getAttribute('type') || 'text',
              label: labelText,
              boundingBox: {
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
            return;
          }
          
          // Select
          const select = group.querySelector('select');
          if (select && labelText) {
            const rect = select.getBoundingClientRect();
            fields.push({
              fieldNumber: fields.length + 1,
              type: 'select',
              label: labelText,
              optionCount: select.options.length,
              boundingBox: {
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
            return;
          }
          
          // Textarea
          const textarea = group.querySelector('textarea');
          if (textarea && labelText) {
            const rect = textarea.getBoundingClientRect();
            fields.push({
              fieldNumber: fields.length + 1,
              type: 'textarea',
              label: labelText,
              rows: textarea.getAttribute('rows') || '1',
              boundingBox: {
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
          }
        });
        
        return fields;
      });

      console.log(`\n✅ TOTAL DE CAMPOS ENCONTRADOS: ${allFields.length}\n`);
      
      // Classificar por visibilidade
      const modalHeight = 720; // Altura do modal
      const visibleFields = allFields.filter(f => f.boundingBox.bottom <= modalHeight);
      const hiddenFields = allFields.filter(f => f.boundingBox.top >= modalHeight);
      
      console.log(`📊 CAMPOS VISÍVEIS: ${visibleFields.length}`);
      visibleFields.forEach((field) => {
        console.log(`   ${field.fieldNumber}. [${field.type.toUpperCase()}] ${field.label}`);
      });
      
      console.log(`\n🔒 CAMPOS OCULTOS (fora da viewport): ${hiddenFields.length}`);
      hiddenFields.forEach((field) => {
        console.log(`   ${field.fieldNumber}. [${field.type.toUpperCase()}] ${field.label}`);
      });
      
      console.log(`\n📐 ANÁLISE DE ALTURA DO MODAL:`);
      console.log(`   Altura da viewport: ${modalHeight}px`);
      if (allFields.length > 0) {
        console.log(`   Última coordenada Y de campo: ${allFields[allFields.length - 1].boundingBox.bottom}px`);
        console.log(`   Campos que extrapolam: ${hiddenFields.length}`);
      }
      
      // Salvar relatório completo
      const fullReport = {
        timestamp: new Date().toISOString(),
        totalFields: allFields.length,
        visibleFields: visibleFields.length,
        hiddenFields: hiddenFields.length,
        fields: allFields,
        analysis: {
          modalHeight: modalHeight,
          lastFieldBottom: allFields.length > 0 ? allFields[allFields.length - 1].boundingBox.bottom : 0,
          requiresScroll: hiddenFields.length > 0
        }
      };
      
      const reportPath = path.join(__dirname, 'relatorio-campos-completo.json');
      fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
      console.log(`\n✅ Relatório completo salvo em: ${reportPath}`);
      
    } else {
      console.log('❌ Modal não encontrado');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  }
});
