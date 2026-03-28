import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('isAiServiceConfigured', () => {
  const originalUrl = process.env.AI_SERVICE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalUrl;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns false when AI_SERVICE_URL is unset and NODE_ENV is not development', async () => {
    delete process.env.AI_SERVICE_URL;
    process.env.NODE_ENV = 'test';
    const { isAiServiceConfigured } = await import('@/lib/ai-deployment');
    expect(isAiServiceConfigured()).toBe(false);
  });

  it('returns true when AI_SERVICE_URL is non-empty', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AI_SERVICE_URL = 'http://localhost:8001';
    const { isAiServiceConfigured } = await import('@/lib/ai-deployment');
    expect(isAiServiceConfigured()).toBe(true);
  });

  it('returns false for whitespace-only URL when not in development', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AI_SERVICE_URL = '   ';
    const { isAiServiceConfigured } = await import('@/lib/ai-deployment');
    expect(isAiServiceConfigured()).toBe(false);
  });

  it('returns true in development even without AI_SERVICE_URL', async () => {
    delete process.env.AI_SERVICE_URL;
    process.env.NODE_ENV = 'development';
    const { isAiServiceConfigured } = await import('@/lib/ai-deployment');
    expect(isAiServiceConfigured()).toBe(true);
  });
});

describe('getEffectiveAiServiceUrl', () => {
  const originalUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalUrl;
  });

  it('defaults to localhost when unset', async () => {
    delete process.env.AI_SERVICE_URL;
    const { getEffectiveAiServiceUrl } = await import('@/lib/ai-deployment');
    expect(getEffectiveAiServiceUrl()).toBe('http://localhost:8001');
  });

  it('uses trimmed AI_SERVICE_URL when set', async () => {
    process.env.AI_SERVICE_URL = '  https://ai.example.com  ';
    const { getEffectiveAiServiceUrl } = await import('@/lib/ai-deployment');
    expect(getEffectiveAiServiceUrl()).toBe('https://ai.example.com');
  });
});
