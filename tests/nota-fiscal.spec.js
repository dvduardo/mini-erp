import { test, expect } from '@playwright/test';
import { E2E_API_URL, E2E_BASE_URL } from './e2e-env.js';

const BASE = E2E_BASE_URL;
const API = E2E_API_URL;

// PDF mínimo válido em bytes
const PDF_CONTENT = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
  '3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
  '0000000058 00000 n\n0000000115 00000 n\n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
);

// ─── helpers ─────────────────────────────────────────────────────────────────

// Usuário de teste fixo para evitar rate limiting
const TEST_USER = {
  username: 'test_auto',
  password: 'testpass123_auto'
};

function uid() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function getAuthToken(request) {
  // Primeiro tenta fazer login com usuário de teste
  let loginRes = await request.post(`${API}/auth/login`, {
    data: {
      username: TEST_USER.username,
      password: TEST_USER.password
    }
  });
  
  // Se login falha (usuário não existe), registra
  if (loginRes.status() === 401) {
    const registerRes = await request.post(`${API}/auth/register`, {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password,
        email: `test_auto_${Date.now()}@teste.com`
      }
    });
    
    if (registerRes.status() === 201) {
      const body = await registerRes.json();
      return body.token;
    }
    
    // Se não conseguiu registrar, tenta login novamente
    loginRes = await request.post(`${API}/auth/login`, {
      data: {
        username: TEST_USER.username,
        password: TEST_USER.password
      }
    });
  }
  
  if (loginRes.status() === 200) {
    const body = await loginRes.json();
    return body.token;
  }
  
  throw new Error(`Falha na autenticação: login retornou ${loginRes.status()}`);
}

async function openAuthenticatedApp(page, token) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem('authToken', authToken);
  }, token);
  await page.goto(BASE);
  await expect(page.locator('nav')).toBeVisible();
}

async function criarCliente(request, token) {
  const id = uid();
  const res = await request.post(`${API}/clientes`, {
    data: {
      nome: `Cliente NF ${id}`,
      email: `nf_${id}@teste.com`,
      cpf_cnpj: id.replace('-', '').slice(-14).padStart(14, '0')
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await res.json()).id;
}

async function criarPedido(request, clienteId, token) {
  const res = await request.post(`${API}/pedidos`, {
    data: {
      cliente_id: clienteId,
      numero_pedido: `PED-NF-${uid()}`,
      data_emissao: '2026-04-01'
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  return (await res.json()).id;
}

async function uploadPDF(request, pedidoId, numeroNota = null, token = null) {
  const formData = {
    arquivo: {
      name: 'nota_fiscal_teste.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT
    },
    pedido_id: String(pedidoId)
  };
  if (numeroNota) formData.numero_nota_fiscal = numeroNota;

  const options = { multipart: formData };
  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  return request.post(`${API}/notas-fiscais/upload`, options);
}

// ─── BACKEND: API Notas Fiscais ───────────────────────────────────────────────

test.describe('API Backend - Notas Fiscais', () => {
  let token;

  test.beforeEach(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test('POST /upload com PDF válido retorna 201 com dados da nota', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    const res = await uploadPDF(request, pedidoId, 'NF-001', token);

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.message).toBe('Nota fiscal enviada com sucesso');
    expect(body.nota).toBeDefined();
    expect(body.nota.pedido_id).toBe(pedidoId);
    expect(body.nota.numero_nota_fiscal).toBe('NF-001');
    expect(body.nota.caminho_arquivo).toMatch(/^uploads\/.+\.pdf$/);
  });

  test('POST /upload sem arquivo retorna 400', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    const res = await request.post(`${API}/notas-fiscais/upload`, {
      multipart: { pedido_id: String(pedidoId) },
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('POST /upload sem pedido_id retorna 400', async ({ request }) => {
    const res = await request.post(`${API}/notas-fiscais/upload`, {
      multipart: {
        arquivo: {
          name: 'nota.pdf',
          mimeType: 'application/pdf',
          buffer: PDF_CONTENT
        }
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /upload com arquivo não-PDF retorna erro', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    const res = await request.post(`${API}/notas-fiscais/upload`, {
      multipart: {
        arquivo: {
          name: 'documento.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('isso nao e um pdf')
        },
        pedido_id: String(pedidoId)
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    // Multer rejeita o arquivo - espera erro (400 ou 500)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /upload com pedido inexistente retorna 404', async ({ request }) => {
    const res = await uploadPDF(request, 999999, null, token);
    expect(res.status()).toBe(404);
  });

  test('POST /upload substitui nota fiscal anterior do mesmo pedido', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    // Primeiro upload
    const res1 = await uploadPDF(request, pedidoId, 'NF-ORIGINAL', token);
    expect(res1.status()).toBe(201);
    const nota1 = (await res1.json()).nota;

    // Segundo upload (substitui)
    const res2 = await uploadPDF(request, pedidoId, 'NF-SUBSTITUTA', token);
    expect(res2.status()).toBe(201);
    const nota2 = (await res2.json()).nota;

    // Deve ser uma nota diferente
    expect(nota2.id).not.toBe(nota1.id);
    expect(nota2.numero_nota_fiscal).toBe('NF-SUBSTITUTA');

    // GET no pedido deve retornar apenas a nota nova
    const pedidoRes = await request.get(`${API}/pedidos/${pedidoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pedidoRes.json();
    expect(pedido.notaFiscal.numero_nota_fiscal).toBe('NF-SUBSTITUTA');
  });

  test('POST /upload sem numero_nota_fiscal ainda funciona', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    const res = await uploadPDF(request, pedidoId, null, token); // sem número

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.nota).toBeDefined();
    expect(body.nota.numero_nota_fiscal).toBeNull();
  });

  test('GET /api/pedidos/:id inclui notaFiscal após upload', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);

    // Antes do upload
    const antes = await (await request.get(`${API}/pedidos/${pedidoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();
    expect(antes.notaFiscal).toBeNull();

    // Upload
    await uploadPDF(request, pedidoId, 'NF-TESTE-GET', token);

    // Depois do upload
    const depois = await (await request.get(`${API}/pedidos/${pedidoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();
    expect(depois.notaFiscal).not.toBeNull();
    expect(depois.notaFiscal.numero_nota_fiscal).toBe('NF-TESTE-GET');
    expect(depois.notaFiscal.caminho_arquivo).toMatch(/^uploads\//);
  });

  test('GET /api/notas-fiscais lista todas as notas', async ({ request }) => {
    const res = await request.get(`${API}/notas-fiscais`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/notas-fiscais?pedidoId=X filtra por pedido', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);
    await uploadPDF(request, pedidoId, 'NF-FILTRO', token);

    const res = await request.get(`${API}/notas-fiscais?pedidoId=${pedidoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].pedido_id).toBe(pedidoId);
  });

  test('GET /api/notas-fiscais/:id retorna nota por ID', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);
    const uploadRes = await uploadPDF(request, pedidoId, 'NF-BY-ID', token);
    const notaId = (await uploadRes.json()).nota.id;

    const res = await request.get(`${API}/notas-fiscais/${notaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(notaId);
    expect(body.numero_nota_fiscal).toBe('NF-BY-ID');
  });

  test('DELETE /api/notas-fiscais/:id remove a nota', async ({ request }) => {
    const clienteId = await criarCliente(request, token);
    const pedidoId = await criarPedido(request, clienteId, token);
    const uploadRes = await uploadPDF(request, pedidoId, 'NF-DELETE', token);
    const notaId = (await uploadRes.json()).nota.id;

    const delRes = await request.delete(`${API}/notas-fiscais/${notaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(delRes.status()).toBe(200);

    // Nota não existe mais no pedido
    const pedidoRes = await request.get(`${API}/pedidos/${pedidoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pedidoRes.json();
    expect(pedido.notaFiscal).toBeNull();
  });

  test('DELETE /api/notas-fiscais/:id com ID inexistente retorna 404', async ({ request }) => {
    const res = await request.delete(`${API}/notas-fiscais/999999`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(404);
  });
});

// ─── FRONTEND E2E - Nota Fiscal ──────────────────────────────────────────────

test.describe('Frontend E2E - Nota Fiscal no Pedido', () => {

  // Cria cliente e pedido via API antes dos testes de UI
  let pedidoNumero;
  let token;

  test.beforeEach(async ({ request }) => {
    token = await getAuthToken(request);
    const clienteId = await criarCliente(request, token);
    const res = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: clienteId,
        numero_pedido: `PED-NF-UI-${uid()}`,
        data_emissao: '2026-04-01'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await res.json();
    pedidoNumero = pedido.numero_pedido;
  });

  async function abrirDetalhesDoPedido(page) {
    await openAuthenticatedApp(page, token);
    await page.click('text=Pedidos');
    await page.waitForLoadState('networkidle');

    // Localizar a linha do pedido criado e clicar em Detalhes
    const row = page.locator(`tr:has-text("${pedidoNumero}")`);
    await expect(row).toBeVisible({ timeout: 5000 });
    await row.locator('button:has-text("Detalhes")').click();
    await expect(page.locator('.modal.active')).toBeVisible();
  }

  test('modal de detalhes exibe seção Nota Fiscal', async ({ page }) => {
    await abrirDetalhesDoPedido(page);
    await expect(page.locator('h4:has-text("Nota Fiscal")')).toBeVisible();
  });

  test('seção Nota Fiscal exibe campo de número da nota', async ({ page }) => {
    await abrirDetalhesDoPedido(page);
    await expect(page.locator('input[placeholder*="Número da nota fiscal"]')).toBeVisible();
  });

  test('seção Nota Fiscal exibe input de arquivo aceitando apenas PDF', async ({ page }) => {
    await abrirDetalhesDoPedido(page);
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
    await expect(fileInput).toBeVisible();
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('application/pdf');
  });

  test('botão Anexar Nota Fiscal está visível', async ({ page }) => {
    await abrirDetalhesDoPedido(page);
    await expect(page.locator('button:has-text("Anexar Nota Fiscal")')).toBeVisible();
  });

  test('upload de PDF aparece link de download e botão Remover', async ({ page }) => {
    await abrirDetalhesDoPedido(page);

    // Preencher número
    await page.locator('input[placeholder*="Número da nota fiscal"]').fill('NF-UI-001');

    // Selecionar arquivo PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'nota_teste.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT
    });

    // Clicar em Anexar
    await page.locator('button:has-text("Anexar Nota Fiscal")').click();
    await page.waitForLoadState('networkidle');

    // Link de download deve aparecer
    await expect(page.locator('a:has-text("Baixar Nota Fiscal")')).toBeVisible({ timeout: 7000 });

    // Número da nota deve aparecer
    await expect(page.locator('text=NF-UI-001')).toBeVisible();

    // Botão Remover deve aparecer
    await expect(page.locator('button:has-text("Remover")')).toBeVisible();
  });

  test('após upload o botão muda para Substituir Nota Fiscal', async ({ page }) => {
    await abrirDetalhesDoPedido(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'nota.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT
    });

    await page.locator('button:has-text("Anexar Nota Fiscal")').click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("Substituir Nota Fiscal")')).toBeVisible({ timeout: 7000 });
  });

  test('botão Remover deleta a nota fiscal e volta ao estado inicial', async ({ page }) => {
    await abrirDetalhesDoPedido(page);

    // Upload primeiro
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'nota.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT
    });
    await page.locator('button:has-text("Anexar Nota Fiscal")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a:has-text("Baixar Nota Fiscal")')).toBeVisible({ timeout: 7000 });

    // Remover
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("Remover")').click();
    await page.waitForLoadState('networkidle');

    // Link de download deve sumir
    await expect(page.locator('a:has-text("Baixar Nota Fiscal")')).not.toBeVisible({ timeout: 5000 });

    // Botão volta a "Anexar"
    await expect(page.locator('button:has-text("Anexar Nota Fiscal")')).toBeVisible();
  });

  test('alerta ao clicar Anexar sem selecionar arquivo', async ({ page }) => {
    await abrirDetalhesDoPedido(page);

    let alertMessage = '';
    page.once('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });
    await page.locator('button:has-text("Anexar Nota Fiscal")').click();
    expect(alertMessage).toContain('PDF');
  });
});
