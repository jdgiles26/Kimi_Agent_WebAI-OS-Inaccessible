import { describe, it, expect, vi } from 'vitest';
import { getLanAddresses } from './lan';
import app from '../boot';

describe('getLanAddresses', () => {
  it('returns an array (may be empty in some sandboxes)', () => {
    const addrs = getLanAddresses(3000);
    expect(Array.isArray(addrs)).toBe(true);
    for (const a of addrs) {
      expect(a.url).toMatch(/^http:\/\/.+:3000\/$/);
      expect(a.address).not.toMatch(/^127\./);
      // Should never include internal addresses.
      expect(a.address).not.toBe('::1');
    }
  });

  it('lists IPv4 addresses before IPv6 so the QR defaults to a phone-reachable URL', async () => {
    // Mock os.networkInterfaces so the test is deterministic across machines.
    vi.resetModules();
    vi.doMock('node:os', () => ({
      networkInterfaces: () => ({
        en0: [
          {
            address: '2603:900a:1a00:3056::1',
            family: 'IPv6',
            internal: false,
            cidr: '2603:900a:1a00:3056::1/64',
            mac: '00:00:00:00:00:00',
            netmask: 'ffff:ffff:ffff:ffff::',
            scopeid: 0,
          },
          {
            address: '192.168.1.29',
            family: 'IPv4',
            internal: false,
            cidr: '192.168.1.29/24',
            mac: '00:00:00:00:00:00',
            netmask: '255.255.255.0',
          },
        ],
        lo0: [
          { address: '127.0.0.1', family: 'IPv4', internal: true, cidr: '127.0.0.1/8', mac: '', netmask: '255.0.0.0' },
        ],
      }),
    }));
    const { getLanAddresses: get } = await import('./lan');
    const addrs = get(3000);
    expect(addrs.length).toBeGreaterThanOrEqual(2);
    expect(addrs[0].family).toBe('IPv4');
    expect(addrs[0].address).toBe('192.168.1.29');
    vi.doUnmock('node:os');
  });

  it('skips IPv6 link-local (fe80::) addresses', async () => {
    vi.resetModules();
    vi.doMock('node:os', () => ({
      networkInterfaces: () => ({
        en0: [
          { address: 'fe80::1234', family: 'IPv6', internal: false, cidr: 'fe80::1234/64', mac: '', netmask: '', scopeid: 4 },
          { address: '10.0.0.5', family: 'IPv4', internal: false, cidr: '10.0.0.5/24', mac: '', netmask: '255.255.255.0' },
        ],
      }),
    }));
    const { getLanAddresses: get } = await import('./lan');
    const addrs = get(3000);
    expect(addrs.some((a) => a.address.startsWith('fe80'))).toBe(false);
    vi.doUnmock('node:os');
  });
});

describe('GET /api/lan CORS', () => {
  // The Remote Access reachability check fetches the LAN URL cross-origin
  // (localhost page → 192.168.x.x). Without CORS, the fetch fails for CORS
  // reasons rather than actual unreachability, producing a false "blocked"
  // warning. These headers make the cross-origin probe truthful.
  it('responds to GET with Access-Control-Allow-Origin: *', async () => {
    const res = await app.request('/api/lan');
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('responds to OPTIONS preflight with 204 and CORS headers', async () => {
    const res = await app.request('/api/lan', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toMatch(/GET/);
  });
});
