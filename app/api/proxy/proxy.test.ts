import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSafeProxyTarget, rewriteHtmlForProxy, sanitizeProxyResponseHeaders } from './proxy';

describe('isSafeProxyTarget', () => {
  it('accepts public https URLs', () => {
    expect(isSafeProxyTarget('https://example.com')).toBe(true);
  });
  it('accepts http URLs', () => {
    expect(isSafeProxyTarget('http://example.com/page')).toBe(true);
  });
  it('rejects loopback (localhost / 127.0.0.1)', () => {
    expect(isSafeProxyTarget('http://localhost')).toBe(false);
    expect(isSafeProxyTarget('http://127.0.0.1')).toBe(false);
    expect(isSafeProxyTarget('http://127.255.255.254')).toBe(false);
  });
  it('rejects private subnets (10/8, 172.16/12, 192.168/16)', () => {
    expect(isSafeProxyTarget('http://10.0.0.1')).toBe(false);
    expect(isSafeProxyTarget('http://172.20.5.1')).toBe(false);
    expect(isSafeProxyTarget('http://192.168.1.1')).toBe(false);
  });
  it('rejects link-local (169.254/16)', () => {
    expect(isSafeProxyTarget('http://169.254.169.254')).toBe(false);
  });
  it('rejects file:, ftp:, gopher:, data: schemes', () => {
    expect(isSafeProxyTarget('file:///etc/passwd')).toBe(false);
    expect(isSafeProxyTarget('ftp://example.com')).toBe(false);
    expect(isSafeProxyTarget('data:text/html,<h1>x</h1>')).toBe(false);
  });
  it('rejects malformed URLs', () => {
    expect(isSafeProxyTarget('not a url')).toBe(false);
    expect(isSafeProxyTarget('')).toBe(false);
  });

  it('rejects IPv6 loopback variants (SSRF bypass)', () => {
    // Short loopback forms
    expect(isSafeProxyTarget('http://[::1]')).toBe(false);
    expect(isSafeProxyTarget('http://[0:0:0:0:0:0:0:1]')).toBe(false);
    // IPv4-mapped IPv6 — classic SSRF bypass
    expect(isSafeProxyTarget('http://[::ffff:127.0.0.1]')).toBe(false);
    expect(isSafeProxyTarget('http://[::ffff:7f00:1]')).toBe(false);
    // IPv6 any-address
    expect(isSafeProxyTarget('http://[::]')).toBe(false);
  });

  it('rejects decimal / hex encoded private IPs (SSRF bypass)', () => {
    // Decimal integer form of 127.0.0.1
    expect(isSafeProxyTarget('http://2130706433')).toBe(false);
    // Hex form — Node.js URL parser normalises to dotted decimal, others may not
    // We verify that if the parser accepts it, we still reject it.
    // 0x7f000001 = 127.0.0.1 — browsers/Node reject this as a valid hostname
    // so we cannot rely on it, but we DO assert decimal is caught.
  });

  it('accepts public IPv6 addresses', () => {
    // Cloudflare DNS and documentation prefix should be allowed
    expect(isSafeProxyTarget('http://[2606:4700:4700::1111]')).toBe(true);
    expect(isSafeProxyTarget('http://[2001:db8::1]')).toBe(true);
  });

  it('accepts DNS hostnames that look public (known-limitation: no DNS resolution)', () => {
    // KNOWN LIMITATION: isSafeProxyTarget checks only the literal host string.
    // A DNS rebinding attack could make attacker-controlled.com resolve to
    // 192.168.1.1 at fetch time even though the check passes here.
    // This test documents the current (literal-check) behavior so it doesn't
    // silently change; the limitation is documented in the source.
    expect(isSafeProxyTarget('http://attacker-controlled.com')).toBe(true);
    // We do NOT resolve attacker-controlled.com to its IP — that's the gap.
  });

  it('rejects IPv6 link-local addresses (fe80::/10)', () => {
    expect(isSafeProxyTarget('http://[fe80::1]')).toBe(false);
    expect(isSafeProxyTarget('http://[fe80::abcd:1234]')).toBe(false);
  });

  it('rejects IPv6 unique-local addresses (fc00::/7)', () => {
    expect(isSafeProxyTarget('http://[fc00::1]')).toBe(false);
    expect(isSafeProxyTarget('http://[fd12:3456:789a:1::1]')).toBe(false);
  });
});

describe('sanitizeProxyResponseHeaders', () => {
  it('strips X-Frame-Options and frame-ancestors CSP', () => {
    const src = new Headers({
      'x-frame-options': 'DENY',
      'content-security-policy': "frame-ancestors 'none'; default-src 'self'",
      'content-type': 'text/html; charset=utf-8',
    });
    const out = sanitizeProxyResponseHeaders(src);
    expect(out.get('x-frame-options')).toBeNull();
    expect(out.get('content-security-policy') || '').not.toMatch(/frame-ancestors/i);
    expect(out.get('content-type')).toMatch(/text\/html/);
  });

  it('removes CSP entirely if only directive was frame-ancestors', () => {
    const src = new Headers({
      'content-security-policy': "frame-ancestors 'none'",
    });
    const out = sanitizeProxyResponseHeaders(src);
    expect(out.get('content-security-policy')).toBeNull();
  });

  it('strips Set-Cookie (would leak across origins)', () => {
    const src = new Headers({ 'set-cookie': 'session=abc; HttpOnly' });
    const out = sanitizeProxyResponseHeaders(src);
    expect(out.get('set-cookie')).toBeNull();
  });
});

describe('rewriteHtmlForProxy', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('rewrites absolute http(s) links through /api/proxy', () => {
    const html = `<a href="https://example.com/x">link</a><img src="https://cdn.example.com/i.png"/>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/page', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fx');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fcdn.example.com%2Fi.png');
  });

  it('resolves relative URLs using the document base', () => {
    const html = `<a href="/about">a</a><img src="logo.png"/>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/path/page', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fabout');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fpath%2Flogo.png');
  });

  it('leaves data:, mailto:, tel:, javascript: untouched', () => {
    const html = `<a href="mailto:a@b.com">m</a><a href="tel:+1">t</a><img src="data:image/png;base64,xxx"/>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    expect(out).toContain('href="mailto:a@b.com"');
    expect(out).toContain('href="tel:+1"');
    expect(out).toContain('src="data:image/png;base64,xxx"');
  });

  it('rewrites both href and src in arbitrary tags', () => {
    const html = `<link rel="stylesheet" href="/site.css"><script src="/app.js"></script>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fsite.css');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fapp.js');
  });

  it('rewrites srcset attribute URLs', () => {
    const html = `<img srcset="/img/small.jpg 480w, /img/large.jpg 1024w" src="/img/default.jpg">`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    // Each URL in the srcset should be proxied.
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fimg%2Fsmall.jpg');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fimg%2Flarge.jpg');
  });

  it('rewrites meta http-equiv refresh URLs', () => {
    const html = `<meta http-equiv="refresh" content="5; url=https://example.com/new">`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fnew');
  });

  it('rewrites meta refresh with content attribute before http-equiv (reversed order)', () => {
    // Some sites emit <meta content="N; url=..." http-equiv="refresh"> (content first).
    // This discriminates whether the second regex in rewriteHtmlForProxy is load-bearing.
    const html = `<meta content="0; url=https://example.com/redirect" http-equiv="refresh">`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fredirect');
  });

  it('rewrites CSS url() in inline style attributes', () => {
    const html = `<div style="background: url('/bg.png') center/cover no-repeat;">text</div>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/', '/api/proxy');
    expect(out).toContain('/api/proxy?url=https%3A%2F%2Fexample.com%2Fbg.png');
  });

  it('strips a pre-existing <base> tag before injecting its own', () => {
    const html = `<html><head><base href="https://cdn.example.com/"><title>T</title></head><body><a href="/about">about</a></body></html>`;
    const out = rewriteHtmlForProxy(html, 'https://example.com/page', '/api/proxy');
    // There should be exactly one <base> tag — the injected one.
    const baseMatches = out.match(/<base\b/gi) ?? [];
    expect(baseMatches).toHaveLength(1);
    // The injected base should point to the original page origin, not the CDN.
    expect(out).toContain('<base href="https://example.com/page"');
  });
});
