const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.setTimeout(120000);

test('Advanced Modal CSS Debug - Pedidos', async ({ page }) => {
  const results = {
    timestamp: new Date().toISOString(),
    url: '',
    modalFound: false,
    modalContent: {
      computed: {},
      scrollProperties: {},
      inlineStyle: {},
      classList: []
    },
    modalParent: {
      computed: {},
      classList: []
    },
    scrollTest: {
      initialScrollTop: 0,
      scrollAttempted: false,
      scrollAchieved: false,
      finalScrollTop: 0,
      scrollableHeight: 0
    },
    cssRules: {},
    issues: [],
    recommendations: []
  };

  try {
    // 1. Navigate to Pedidos page
    console.log('📍 Step 1: Navigating to http://localhost:3000/');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
    results.url = page.url();
    await page.waitForTimeout(2000);

    // 2. Try to navigate to Pedidos
    console.log('📍 Step 2: Navigating to Pedidos page');
    
    // Try clicking the Pedidos button in the navigation
    const pedidosButton = page.locator('button').filter({ hasText: /Pedidos/i }).first();
    
    if (await pedidosButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Found Pedidos button, clicking it');
      await pedidosButton.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('⚠ Pedidos button not found, trying direct navigation');
      // Try direct hash navigation
      await page.evaluate(() => {
        window.location.hash = '#/pedidos';
      });
      await page.waitForTimeout(2000);
    }

    // 3. Take screenshot of page before modal
    console.log('📍 Step 3: Taking screenshot of Pedidos page');
    await page.screenshot({ path: path.join(__dirname, 'screenshots', '01-pedidos-page.png') });

    // 4. Open modal - try to find and click "Novo" or "Editar" button
    console.log('📍 Step 4: Opening modal');
    
    // Try to find "Novo" button
    const novoButton = page.locator('button').filter({ hasText: /Novo|Adicionar|New/i }).first();
    let modalOpened = false;

    if (await novoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Found "Novo" button, clicking it');
      await novoButton.click();
      await page.waitForTimeout(1500);
      modalOpened = true;
    }

    // If no "Novo" button, try to find and click an edit button
    if (!modalOpened) {
      console.log('⚠ "Novo" button not found, trying to find edit button');
      const editButtons = page.locator('button').filter({ hasText: /Editar|Edit/i });
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        console.log(`✓ Found ${editCount} edit buttons, clicking first one`);
        await editButtons.first().click();
        await page.waitForTimeout(1500);
        modalOpened = true;
      }
    }

    if (!modalOpened) {
      console.log('⚠ Could not find button to open modal, searching for existing modal');
    }

    // Take screenshot with modal
    await page.screenshot({ path: path.join(__dirname, 'screenshots', '02-modal-open.png') });

    // 5. Check if modal exists
    console.log('📍 Step 5: Checking for modal element');
    const modalElement = page.locator('.modal.active').first();
    const modalExists = await modalElement.isVisible({ timeout: 5000 }).catch(() => false);

    if (!modalExists) {
      results.issues.push('Modal with class "modal.active" not found. Checking for any visible modal...');
      console.log('⚠ Modal not found with .modal.active selector');
      
      // Try to find any modal
      const anyModal = page.locator('[role="dialog"], .modal, .Modal, [class*="modal"]').first();
      const anyModalVisible = await anyModal.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (!anyModalVisible) {
        results.issues.push('No modal element found on page');
        throw new Error('Modal not found after trying to open it');
      }
    }

    results.modalFound = true;
    console.log('✓ Modal found');

    // 6. Inspect modal structure and CSS
    console.log('📍 Step 6: Inspecting modal CSS properties');
    
    const modalDebugInfo = await page.evaluate(() => {
      // Get the active modal
      const modal = document.querySelector('.modal.active');
      if (!modal) {
        return { error: 'Modal not found in DOM', foundElements: document.querySelectorAll('[class*="modal"]').length };
      }

      // Get modal-content
      const modalContent = modal.querySelector('.modal-content');
      if (!modalContent) {
        return { error: 'modal-content not found in DOM' };
      }

      // Get computed styles for modal-content
      const computedStyle = window.getComputedStyle(modalContent);
      
      // Get inline styles
      const inlineStyles = {};
      if (modalContent.style.length > 0) {
        for (let i = 0; i < modalContent.style.length; i++) {
          const prop = modalContent.style[i];
          inlineStyles[prop] = modalContent.style.getPropertyValue(prop);
        }
      }

      // Get scroll properties BEFORE any scroll attempt
      const scrollPropertiesBefore = {
        scrollHeight: modalContent.scrollHeight,
        clientHeight: modalContent.clientHeight,
        offsetHeight: modalContent.offsetHeight,
        scrollWidth: modalContent.scrollWidth,
        clientWidth: modalContent.clientWidth,
        scrollTop: modalContent.scrollTop,
        scrollLeft: modalContent.scrollLeft
      };

      // Get relevant CSS properties
      const cssProperties = {
        'overflow-y': computedStyle.getPropertyValue('overflow-y'),
        'overflow-x': computedStyle.getPropertyValue('overflow-x'),
        'overflow': computedStyle.getPropertyValue('overflow'),
        'max-height': computedStyle.getPropertyValue('max-height'),
        'height': computedStyle.getPropertyValue('height'),
        'width': computedStyle.getPropertyValue('width'),
        'max-width': computedStyle.getPropertyValue('max-width'),
        'padding': computedStyle.getPropertyValue('padding'),
        'border': computedStyle.getPropertyValue('border'),
        'position': computedStyle.getPropertyValue('position'),
        'display': computedStyle.getPropertyValue('display')
      };

      // Get parent modal properties
      const parentModal = modal;
      const parentComputedStyle = window.getComputedStyle(parentModal);
      const parentCSSProperties = {
        'display': parentComputedStyle.getPropertyValue('display'),
        'position': parentComputedStyle.getPropertyValue('position'),
        'width': parentComputedStyle.getPropertyValue('width'),
        'height': parentComputedStyle.getPropertyValue('height'),
        'align-items': parentComputedStyle.getPropertyValue('align-items'),
        'justify-content': parentComputedStyle.getPropertyValue('justify-content'),
        'z-index': parentComputedStyle.getPropertyValue('z-index'),
        'background': parentComputedStyle.getPropertyValue('background')
      };

      return {
        modalContentFound: true,
        modalContent: {
          tag: modalContent.tagName,
          className: modalContent.className,
          id: modalContent.id || 'none',
          computedCSS: cssProperties,
          inlineStyles: inlineStyles,
          scrollProperties: scrollPropertiesBefore,
          clientRect: {
            top: modalContent.getBoundingClientRect().top,
            left: modalContent.getBoundingClientRect().left,
            bottom: modalContent.getBoundingClientRect().bottom,
            right: modalContent.getBoundingClientRect().right,
            width: modalContent.getBoundingClientRect().width,
            height: modalContent.getBoundingClientRect().height
          }
        },
        parentModal: {
          tag: parentModal.tagName,
          className: parentModal.className,
          computedCSS: parentCSSProperties,
          clientRect: {
            top: parentModal.getBoundingClientRect().top,
            left: parentModal.getBoundingClientRect().left,
            width: parentModal.getBoundingClientRect().width,
            height: parentModal.getBoundingClientRect().height
          }
        }
      };
    });

    if (modalDebugInfo.error) {
      results.issues.push(`Error getting modal info: ${modalDebugInfo.error}`);
      console.log('❌ Error:', modalDebugInfo.error);
    } else {
      results.modalContent = modalDebugInfo.modalContent;
      results.modalParent = modalDebugInfo.parentModal;
      
      console.log('📊 Modal Content Information:');
      console.log('  Tag:', modalDebugInfo.modalContent.tag);
      console.log('  Classes:', modalDebugInfo.modalContent.className);
      console.log('  Inline Styles:', JSON.stringify(modalDebugInfo.modalContent.inlineStyles, null, 2));
      console.log('\n📐 CSS Properties (computed):');
      Object.entries(modalDebugInfo.modalContent.computedCSS).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('\n📏 Scroll Properties (BEFORE scroll):');
      Object.entries(modalDebugInfo.modalContent.scrollProperties).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('\n📍 Bounding Rect:');
      Object.entries(modalDebugInfo.modalContent.clientRect).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    // 7. Test scroll
    console.log('\n📍 Step 7: Testing programmatic scroll');
    
    const scrollTest = await page.evaluate(() => {
      const modalContent = document.querySelector('.modal.active .modal-content');
      if (!modalContent) {
        return { error: 'Could not find modal-content for scroll test' };
      }

      const initialScrollTop = modalContent.scrollTop;
      const scrollableHeight = modalContent.scrollHeight - modalContent.clientHeight;
      
      console.log(`Initial scrollTop: ${initialScrollTop}`);
      console.log(`Scrollable height: ${scrollableHeight}`);

      // Try to scroll down
      if (scrollableHeight > 0) {
        modalContent.scrollTop = scrollableHeight / 2;
        const finalScrollTop = modalContent.scrollTop;
        
        return {
          scrollableHeight: scrollableHeight,
          initialScrollTop: initialScrollTop,
          attempted: true,
          finalScrollTop: finalScrollTop,
          scrollAchieved: finalScrollTop > initialScrollTop,
          maxScroll: scrollableHeight
        };
      } else {
        return {
          scrollableHeight: scrollableHeight,
          initialScrollTop: initialScrollTop,
          attempted: false,
          issue: 'Modal not scrollable - content fits within container'
        };
      }
    });

    results.scrollTest = scrollTest;

    if (scrollTest.error) {
      results.issues.push(`Scroll test error: ${scrollTest.error}`);
      console.log('❌ Scroll test error:', scrollTest.error);
    } else {
      console.log('✓ Scroll test completed');
      console.log('  Initial scrollTop:', scrollTest.initialScrollTop);
      console.log('  Scrollable height:', scrollTest.scrollableHeight);
      console.log('  Attempted to scroll: Yes');
      console.log('  Final scrollTop:', scrollTest.finalScrollTop);
      console.log('  Scroll achieved:', scrollTest.scrollAchieved);
    }

    // 8. Check for discrepancies and issues
    console.log('\n📍 Step 8: Analyzing for CSS issues');

    if (results.modalContent.computedCSS) {
      const overflowY = results.modalContent.computedCSS['overflow-y'];
      const maxHeight = results.modalContent.computedCSS['max-height'];
      const inlineStyles = results.modalContent.inlineStyles;

      // Check if overflow-y is properly set
      if (overflowY !== 'auto' && overflowY !== 'scroll') {
        results.issues.push(`CSS Issue: overflow-y is "${overflowY}", expected "auto" or "scroll"`);
      }

      // Check if there's a conflict between CSS and inline styles
      if (inlineStyles && inlineStyles.overflowY && inlineStyles.overflowY !== overflowY) {
        results.issues.push(`CSS Conflict: Inline overflow-y="${inlineStyles.overflowY}" vs computed="${overflowY}"`);
      }

      // Check if modal is scrollable based on dimensions
      if (scrollTest.scrollableHeight !== undefined && scrollTest.scrollableHeight > 0) {
        console.log('✓ Modal is scrollable (content > container)');
      } else if (scrollTest.scrollableHeight !== undefined && scrollTest.scrollableHeight === 0) {
        console.log('ℹ Modal is not scrollable (content fits or scrollHeight = clientHeight)');
      }

      // Check max-height
      if (maxHeight === 'none' || maxHeight === '0px') {
        results.issues.push(`CSS Issue: max-height is "${maxHeight}", might prevent proper sizing`);
      }
    }

    // 9. Check CSS rules from stylesheet
    console.log('\n📍 Step 9: Checking CSS rules in stylesheets');
    
    const cssRulesInfo = await page.evaluate(() => {
      const rules = {};
      
      // Check all stylesheets
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const sheetRules = sheet.cssRules || sheet.rules;
          for (let j = 0; j < sheetRules.length; j++) {
            const rule = sheetRules[j];
            if (rule.selectorText && rule.selectorText.includes('modal')) {
              rules[rule.selectorText] = {
                cssText: rule.style.cssText,
                overflow: rule.style.overflow || rule.style.getPropertyValue('overflow'),
                overflowY: rule.style.overflowY || rule.style.getPropertyValue('overflow-y'),
                maxHeight: rule.style.maxHeight || rule.style.getPropertyValue('max-height'),
                height: rule.style.height || rule.style.getPropertyValue('height')
              };
            }
          }
        } catch (e) {
          // Cross-origin stylesheets can't be accessed
        }
      }
      
      return rules;
    });

    results.cssRules = cssRulesInfo;
    console.log('📋 CSS Rules for modal selectors:', JSON.stringify(cssRulesInfo, null, 2));

    // 10. Generate recommendations
    console.log('\n📍 Step 10: Generating recommendations');

    if (results.scrollTest.scrollableHeight !== undefined && results.scrollTest.scrollableHeight > 0) {
      if (!results.scrollTest.scrollAchieved) {
        results.recommendations.push('Scroll is possible but mechanism may not be working as expected - check JavaScript event handlers');
      } else {
        results.recommendations.push('✓ Scroll is working correctly');
      }
    } else if (results.scrollTest.scrollableHeight === 0) {
      results.recommendations.push('Content fits within modal - consider if more fields will be added in the future');
    }

    // Check if there might be a CSS issue preventing scroll
    if (results.modalContent.computedCSS['overflow-y'] === 'hidden') {
      results.recommendations.push('ERROR: overflow-y is set to "hidden" - change to "auto" in App.css .modal-content rule');
    }

    if (results.modalContent.computedCSS['overflow-y'] === 'visible') {
      results.recommendations.push('WARNING: overflow-y is "visible" - content will overflow. Change to "auto"');
    }

    if (Object.keys(results.modalContent.inlineStyles).length > 0) {
      results.recommendations.push(`⚠ Inline styles detected: ${Object.keys(results.modalContent.inlineStyles).join(', ')} - these override stylesheet rules`);
    }

    if (results.issues.length === 0) {
      results.recommendations.push('✓ No CSS issues detected - modal should work correctly');
    }

  } catch (error) {
    results.issues.push(`Test error: ${error.message}`);
    console.error('❌ Test failed:', error);
  }

  // Save report
  console.log('\n📁 Saving report...');
  const reportPath = path.join(__dirname, 'debug-modal-css-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`✓ Report saved to ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Modal Found: ${results.modalFound}`);
  console.log(`Issues: ${results.issues.length}`);
  results.issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
  console.log(`Recommendations: ${results.recommendations.length}`);
  results.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
  console.log('='.repeat(70));

  expect(results.modalFound).toBe(true);
});
