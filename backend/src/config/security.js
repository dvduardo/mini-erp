function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export function getJwtSecret() {
  return getRequiredEnv('JWT_SECRET');
}

export function getAppUrl() {
  return getRequiredEnv('APP_URL').replace(/\/+$/, '');
}

export function validateSecurityConfig() {
  getJwtSecret();
  getAppUrl();
}
