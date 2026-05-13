/**
 * Regression tests for api/kimi/auth.ts
 *
 * The key invariant: the JWKS client (jose.createRemoteJWKSet) must NOT be
 * instantiated at module-load time. If it were, any environment that doesn't
 * set KIMI_AUTH_URL (e.g. SSR cold-start before env injection, CI test runs)
 * would crash immediately on import.
 *
 * The lazy `getJwks()` getter was introduced to fix that SSR crash. These
 * tests pin that behavior as a regression guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to control env.kimiAuthUrl before the module under test is imported.
// vi.mock is hoisted, so we use a factory to set the value we want.

const mockEnv = {
  appId: 'test-app-id',
  appSecret: 'test-secret',
  isProduction: false,
  databaseUrl: '',
  kimiAuthUrl: '', // intentionally empty — simulates SSR env before injection
  kimiOpenUrl: '',
  ownerUnionId: '',
};

vi.mock('../lib/env', () => ({ env: mockEnv }));

// Also stub jose so we can verify it's NOT called during module init.
const createRemoteJWKSetMock = vi.fn(() => 'jwks-instance' as any);
vi.mock('jose', () => ({
  createRemoteJWKSet: createRemoteJWKSetMock,
  jwtVerify: vi.fn(),
}));

// Stub everything else auth.ts imports so the module loads cleanly.
vi.mock('../lib/cookies', () => ({ getSessionCookieOptions: vi.fn(() => ({})) }));
vi.mock('@contracts/constants', () => ({ Session: { cookieName: 'session', maxAgeMs: 3600000 } }));
vi.mock('@contracts/errors', () => ({ Errors: { forbidden: (msg: string) => new Error(msg) } }));
vi.mock('./session', () => ({
  signSessionToken: vi.fn(async () => 'token'),
  verifySessionToken: vi.fn(async () => null),
}));
vi.mock('./platform', () => ({ users: { getProfile: vi.fn(async () => null) } }));
vi.mock('../queries/users', () => ({
  findUserByUnionId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => undefined),
}));

describe('auth.ts — lazy JWKS init', () => {
  beforeEach(() => {
    createRemoteJWKSetMock.mockClear();
    // Reset kimiAuthUrl to empty for each test.
    mockEnv.kimiAuthUrl = '';
  });

  it('does not call jose.createRemoteJWKSet at module load time', async () => {
    // The mere act of importing the module must not call the JWKS factory.
    // This is the SSR crash scenario: env.kimiAuthUrl is empty at import time.
    await import('./auth');

    // If the module eagerly called createRemoteJWKSet, this would have been
    // called during the import. It must not be.
    expect(createRemoteJWKSetMock).not.toHaveBeenCalled();
  });

  it('throws a descriptive error when getJwks() is called with empty kimiAuthUrl', async () => {
    mockEnv.kimiAuthUrl = '';
    const { verifyAccessToken } = await import('./auth');

    // Calling verifyAccessToken triggers getJwks(), which should throw
    // because kimiAuthUrl is empty — not throw a cryptic URL parse error.
    await expect(verifyAccessToken('any-token')).rejects.toThrow('KIMI_AUTH_URL is not configured');
  });

  it('creates the JWKS client lazily on first real call when kimiAuthUrl is set', async () => {
    mockEnv.kimiAuthUrl = 'https://auth.example.com';
    createRemoteJWKSetMock.mockReturnValueOnce('jwks-instance' as any);

    // Import fresh — but module may be cached from previous test; reset mock counts.
    // The important thing: after setting kimiAuthUrl and calling verifyAccessToken,
    // createRemoteJWKSet should have been called exactly once.
    const jose = await import('jose');
    const { jwtVerify } = jose as any;
    // Make jwtVerify resolve so we can get past the JWKS call.
    (jwtVerify as any).mockResolvedValueOnce({
      payload: { user_id: 'u1', client_id: 'c1' },
    });

    const { verifyAccessToken } = await import('./auth');
    await verifyAccessToken('dummy-jwt');

    expect(createRemoteJWKSetMock).toHaveBeenCalledWith(
      new URL('https://auth.example.com/api/.well-known/jwks.json'),
    );
  });
});
