const fs = require('fs');
const os = require('os');
const path = require('path');

const stateFile = path.join(os.tmpdir(), 'mini-erp-playwright-servers.json');

function safeKill(pid) {
  if (!pid) return;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Processo já finalizado ou indisponível
  }
}

module.exports = async () => {
  if (!fs.existsSync(stateFile)) {
    return;
  }

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

  safeKill(state.frontendPid);
  safeKill(state.backendPid);

  if (state.uploadsDir) {
    fs.rmSync(state.uploadsDir, { recursive: true, force: true });
  }

  fs.rmSync(stateFile, { force: true });
};
