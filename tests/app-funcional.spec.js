import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const API = 'http://localhost:5001/api';

// ─── helpers ─────────────────────────────────────────────────────────────────

// Usuário de teste fixo para evitar rate limiting
const TEST_USER = {
  username: 'test_auto',
  password: 'testpass123_auto'
};

async function navTo(page, label) {
  await page.click(`nav a:has-text("${label}")`);
  await page.waitForLoadState('networkidle');
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

// ─── BACKEND DIRETO ──────────────────────────────────────────────────────────

test.describe('API Backend', () => {
  let token;

  test.beforeEach(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test('GET /api/clientes retorna lista', async ({ request }) => {
    const res = await request.get(`${API}/clientes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/clientes cria cliente', async ({ request }) => {
    const res = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Teste Auto',
        email: `auto_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0'),
        telefone: '11999990000'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
  });

  test('POST /api/pedidos cria pedido com data_emissao', async ({ request }) => {
    const cRes = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Pedido Auto',
        email: `pedido_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0')
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await cRes.json();

    const res = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: cliente.id,
        numero_pedido: `PED-AUTO-${Date.now()}`,
        data_emissao: '2026-04-01',
        data_entrega: '2026-04-30',
        total_pedido: 500.00
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.data_emissao).toBeTruthy();
  });

  test('POST /api/produtos cria produto no pedido', async ({ request }) => {
    const cRes = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Produto Auto',
        email: `prod_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0')
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await cRes.json();

    const pRes = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: cliente.id,
        numero_pedido: `PED-PROD-${Date.now()}`,
        data_emissao: '2026-04-01'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pRes.json();

    const res = await request.post(`${API}/produtos`, {
      data: {
        pedido_id: pedido.id,
        produto_receber: 'Produto Teste Automatizado',
        quantidade: 5,
        valor_unitario: 100.00,
        valor_item: 500.00
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.produto_receber).toBe('Produto Teste Automatizado');
  });

  test('GET /api/pedidos/:id retorna produtos e boletos', async ({ request }) => {
    const cRes = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Detalhe Auto',
        email: `det_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0')
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await cRes.json();

    const pRes = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: cliente.id,
        numero_pedido: `PED-DET-${Date.now()}`,
        data_emissao: '2026-04-02'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pRes.json();

    await request.post(`${API}/produtos`, {
      data: {
        pedido_id: pedido.id,
        produto_receber: 'Produto Detalhe',
        quantidade: 2,
        valor_unitario: 50,
        valor_item: 100
      },
      headers: { Authorization: `Bearer ${token}` }
    });

    const res = await request.get(`${API}/pedidos/${pedido.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.produtos).toBeDefined();
    expect(body.produtos.length).toBeGreaterThan(0);
    expect(body.boletos).toBeDefined();
    expect(body.data_emissao).toBeTruthy();
  });

  test('PUT /api/pedidos/:id atualiza data_emissao', async ({ request }) => {
    const cRes = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Update Auto',
        email: `upd_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0')
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await cRes.json();

    const pRes = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: cliente.id,
        numero_pedido: `PED-UPD-${Date.now()}`
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pRes.json();

    const res = await request.put(`${API}/pedidos/${pedido.id}`, {
      data: { data_emissao: '2026-03-15', status: 'em_preparacao' },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data_emissao).toContain('2026-03-15');
    expect(body.status).toBe('em_preparacao');
  });

  test('DELETE /api/pedidos/:id deleta pedido', async ({ request }) => {
    const cRes = await request.post(`${API}/clientes`, {
      data: {
        nome: 'Cliente Del Auto',
        email: `del_${Date.now()}@teste.com`,
        cpf_cnpj: `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0')
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const cliente = await cRes.json();

    const pRes = await request.post(`${API}/pedidos`, {
      data: {
        cliente_id: cliente.id,
        numero_pedido: `PED-DEL-${Date.now()}`
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    const pedido = await pRes.json();

    const res = await request.delete(`${API}/pedidos/${pedido.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(200);

    const getRes = await request.get(`${API}/pedidos/${pedido.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(getRes.status()).toBe(404);
  });

  test('POST /api/pedidos retorna erro sem campos obrigatórios', async ({ request }) => {
    const res = await request.post(`${API}/pedidos`, {
      data: { observacoes: 'incompleto' },
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.status()).toBe(400);
  });
});

// ─── FRONTEND E2E ────────────────────────────────────────────────────────────

test.describe('Frontend - Navegação', () => {
  test('carrega a página inicial', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('nav, header')).toBeVisible();
  });

  test('navega para Clientes', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Clientes');
    await expect(page.locator('h2:has-text("Clientes")')).toBeVisible();
  });

  test('navega para Pedidos', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Pedidos');
    await expect(page.locator('h2:has-text("Pedidos")')).toBeVisible();
  });

  test('navega para Boletos', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Boletos');
    await expect(page.locator('h2:has-text("Boletos")')).toBeVisible();
  });
});

test.describe('Frontend - Clientes', () => {
  test('abre modal de novo cliente', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Clientes');
    await page.click('button:has-text("Novo Cliente")');
    await expect(page.locator('.modal.active, [role="dialog"]')).toBeVisible();
    await expect(page.locator('label:has-text("Nome / Contato")')).toBeVisible();
  });

  test('cria um cliente pelo formulário', async ({ page, request }) => {
    const token = await getAuthToken(request);
    
    await page.goto(BASE);
    await page.click('text=Clientes');
    await page.click('button:has-text("Novo Cliente")');

    const nomeUnico = `Cliente UI ${Date.now()}`;

    const nomeSection = page.locator('.form-group').filter({ has: page.locator('label:has-text("Nome / Contato")') });
    await nomeSection.locator('input').fill(nomeUnico);

    const cnpjSection = page.locator('.form-group').filter({ has: page.locator('label:has-text("CNPJ")') });
    await cnpjSection.locator('input').fill(`${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-14).padStart(14, '0'));

    await page.click('button.success, button:has-text("Salvar")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`td:has-text("${nomeUnico}")`)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Frontend - Pedidos', () => {
  test('modal de novo pedido tem campo Data de Emissão', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Pedidos');
    await page.click('button:has-text("Novo Pedido")');
    await expect(page.locator('.modal.active, [role="dialog"]')).toBeVisible();
    await expect(page.locator('label:has-text("Data de Emissão")')).toBeVisible();
  });

  test('modal de novo pedido tem seção de Produtos', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Pedidos');
    await page.click('button:has-text("Novo Pedido")');
    await expect(page.locator('text=Produtos do Pedido')).toBeVisible();
    await expect(page.locator('label:has-text("Produto a Receber")')).toBeVisible();
    await expect(page.locator('label:has-text("Quantidade")')).toBeVisible();
    await expect(page.locator('label:has-text("Valor Unitário")')).toBeVisible();
  });

  test('botão + Adicionar Produto adiciona novo bloco de produto', async ({ page }) => {
    await page.goto(BASE);
    await page.click('text=Pedidos');
    await page.click('button:has-text("Novo Pedido")');

    await page.click('button:has-text("+ Adicionar Produto")');
    await expect(page.locator('text=Produto 2')).toBeVisible();
  });
});
