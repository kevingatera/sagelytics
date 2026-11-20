import { afterEach, describe, expect, it, vi } from 'vitest';

const valid = {
  AUTH_SECRET: 'secret',
  AUTH_GOOGLE_CLIENT_ID: 'id',
  AUTH_GOOGLE_CLIENT_SECRET: 'secret',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  MICROSERVICE_HOST: '127.0.0.1',
  MICROSERVICE_PORT: '3001',
  SKIP_ENV_VALIDATION: '',
  NEXT_PHASE: '',
  CLIENT_IP_HEADER: '',
  TRUSTED_PROXY_HOPS: '',
};

async function loadEnv(vars: Record<string, string>) {
  for (const [name, value] of Object.entries({ ...valid, ...vars })) vi.stubEnv(name, value);
  vi.resetModules();
  return import('./env.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('client IP source in src/env.js', () => {
  it('refuses to start in production without CLIENT_IP_HEADER or TRUSTED_PROXY_HOPS', async () => {
    await expect(loadEnv({ NODE_ENV: 'production' })).rejects.toThrow(/CLIENT_IP_HEADER or TRUSTED_PROXY_HOPS/);
    await expect(loadEnv({ NODE_ENV: 'production', CLIENT_IP_HEADER: '  ' })).rejects.toThrow();
  });

  it('starts in production with either source', async () => {
    await expect(loadEnv({ NODE_ENV: 'production', CLIENT_IP_HEADER: 'fly-client-ip' })).resolves.toBeDefined();
    await expect(loadEnv({ NODE_ENV: 'production', TRUSTED_PROXY_HOPS: '1' })).resolves.toBeDefined();
  });

  it('rejects a TRUSTED_PROXY_HOPS that would leave every client unknown', async () => {
    await expect(loadEnv({ NODE_ENV: 'production', TRUSTED_PROXY_HOPS: '0' })).rejects.toThrow();
    await expect(loadEnv({ NODE_ENV: 'development', TRUSTED_PROXY_HOPS: 'one' })).rejects.toThrow();
  });

  it('does not require a source outside production, or when validation is skipped', async () => {
    await expect(loadEnv({ NODE_ENV: 'development' })).resolves.toBeDefined();
    await expect(loadEnv({ NODE_ENV: 'production', SKIP_ENV_VALIDATION: '1' })).resolves.toBeDefined();
  });

  it('leaves the check to server start during next build', async () => {
    await expect(loadEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).resolves.toBeDefined();
  });
});
