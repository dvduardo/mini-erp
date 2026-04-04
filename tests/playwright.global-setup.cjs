const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const E2E_HOST = process.env.E2E_HOST || '127.0.0.1';
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || '3000');
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || '5001');
const E2E_BASE_URL = process.env.E2E_BASE_URL || `http://${E2E_HOST}:${E2E_FRONTEND_PORT}`;
const E2E_API_URL = process.env.E2E_API_URL || `http://${E2E_HOST}:${E2E_BACKEND_PORT}/api`;

const repoRoot = path.join(__dirname, '..');
const backendDir = path.join(repoRoot, 'backend');
const frontendDir = path.join(repoRoot, 'frontend');
const stateFile = path.join(os.tmpdir(), 'mini-erp-playwright-servers.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Servidor ainda subindo
    }

    await sleep(500);
  }

  throw new Error(`Timeout aguardando ${url}`);
}

function spawnDetached(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: true,
    stdio: 'ignore'
  });

  child.unref();
  return child.pid;
}

module.exports = async () => {
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-erp-uploads-'));

  const backendPid = spawnDetached(process.execPath, ['server.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(E2E_BACKEND_PORT),
      HOST: E2E_HOST,
      PLAYWRIGHT_TEST: 'true',
      UPLOADS_DIR: uploadsDir
    }
  });

  await waitForUrl(`${E2E_API_URL}/health`);

  const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const frontendPid = spawnDetached(process.execPath, [viteBin, '--host', E2E_HOST, '--port', String(E2E_FRONTEND_PORT)], {
    cwd: frontendDir,
    env: {
      ...process.env,
      PLAYWRIGHT_TEST: 'true',
      VITE_API_URL: E2E_API_URL
    }
  });

  await waitForUrl(E2E_BASE_URL);

  fs.writeFileSync(stateFile, JSON.stringify({
    backendPid,
    frontendPid,
    uploadsDir
  }));
};
