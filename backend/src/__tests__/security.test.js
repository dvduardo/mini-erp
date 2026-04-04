import { afterEach, describe, expect, it } from 'vitest';
import { getAppUrl, getJwtSecret, validateSecurityConfig } from '../config/security.js';

const originalJwtSecret = process.env.JWT_SECRET;
const originalAppUrl = process.env.APP_URL;

describe('security config', () => {
  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }
  });

  it('retorna o JWT secret configurado', () => {
    process.env.JWT_SECRET = 'super-secret';

    expect(getJwtSecret()).toBe('super-secret');
  });

  it('falha quando JWT_SECRET não está configurada', () => {
    delete process.env.JWT_SECRET;

    expect(() => getJwtSecret()).toThrow('Variável de ambiente obrigatória ausente: JWT_SECRET');
  });

  it('normaliza APP_URL removendo barra final', () => {
    process.env.APP_URL = 'https://app.example.com/';

    expect(getAppUrl()).toBe('https://app.example.com');
  });

  it('falha quando APP_URL não está configurada', () => {
    delete process.env.APP_URL;

    expect(() => getAppUrl()).toThrow('Variável de ambiente obrigatória ausente: APP_URL');
  });

  it('valida a configuração crítica do backend', () => {
    process.env.JWT_SECRET = 'super-secret';
    process.env.APP_URL = 'https://app.example.com';

    expect(() => validateSecurityConfig()).not.toThrow();
  });
});
