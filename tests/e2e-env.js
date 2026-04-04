export const E2E_HOST = process.env.E2E_HOST || '127.0.0.1';
export const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || '3000');
export const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || '5001');

export const E2E_BASE_URL = process.env.E2E_BASE_URL || `http://${E2E_HOST}:${E2E_FRONTEND_PORT}`;
export const E2E_API_URL = process.env.E2E_API_URL || `http://${E2E_HOST}:${E2E_BACKEND_PORT}/api`;
