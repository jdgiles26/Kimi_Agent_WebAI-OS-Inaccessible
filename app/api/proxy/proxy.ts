/**
 * Server-side fetch proxy used by the in-OS Web Browser app.
 *
 * The iframe in WebBrowser.tsx can't load most modern sites directly because
 * they send X-Frame-Options: DENY or CSP frame-ancestors. We sidestep that
 * by fetching the target server-side, stripping the framing headers, and
 * rewriting all relative/absolute URLs in the HTML to flow back through us
 * so subsequent navigation stays inside the proxy.
 *
 * The proxy is also a classic SSRF target — we refuse loopback, private, and
 * link-local addresses, and any non-http(s) scheme.
 */

const PRIVATE_V4 = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^127\./,
  /^0\./,
];

/**
 * Returns true if the URL is a plain http(s) public address.
 *
 * KNOWN LIMITATION — DNS rebinding: this function checks only the literal
 * host string; it does NOT perform DNS resolution. A DNS rebinding attack
 * (attacker's DNS TTL=0 resolves to public IP on first check, then to
 * 192.168.x.x on the actual `fetch`) can bypass this check. Mitigating DNS
 * rebinding fully requires either (a) resolving the hostname before the
 * safety check and re-checking the resolved IP, or (b) using OS-level network
 * namespacing. We accept this limitation because the proxy operates in a
 * controlled environment; the risk is documented here so a future maintainer
 * can address it if the threat model changes.
 */
export function isSafeProxyTarget(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0') {
    return false;
  }
  // IPv6 addresses: WHATWG URL always wraps in brackets and lowercases.
  if (host.startsWith('[') && host.endsWith(']')) {
    const ipv6 = host.slice(1, -1);
    // Loopback: ::1
    if (ipv6 === '::1') return false;
    // Any-address: ::
    if (ipv6 === '::') return false;
    // Unique-local (fc00::/7) and link-local (fe80::/10)
    if (/^f[cd]/i.test(ipv6) || /^fe80:/i.test(ipv6)) return false;
    // IPv4-mapped IPv6 (::ffff:W.X.Y.Z or ::ffff:hex:hex) — SSRF bypass.
    // Node normalises both ::ffff:127.0.0.1 and ::ffff:7f00:1 to ::ffff:7f00:1.
    if (/^::ffff:/i.test(ipv6)) {
      // Extract the embedded IPv4 or hex-pair suffix and check private ranges.
      const suffix = ipv6.slice('::ffff:'.length);
      // Dotted-decimal embedded address
      if (/^\d+\.\d+\.\d+\.\d+$/.test(suffix)) {
        if (PRIVATE_V4.some((re) => re.test(suffix))) return false;
      } else {
        // Hex-pair form (e.g. 7f00:1 = 127.0.0.1). Convert to dotted decimal.
        const parts = suffix.split(':');
        if (parts.length === 2) {
          const word0 = parseInt(parts[0], 16);
          const word1 = parseInt(parts[1], 16);
          const dotted = `${(word0 >> 8) & 0xff}.${word0 & 0xff}.${(word1 >> 8) & 0xff}.${word1 & 0xff}`;
          if (PRIVATE_V4.some((re) => re.test(dotted))) return false;
        } else {
          // Unknown IPv4-mapped form — refuse to be safe.
          return false;
        }
      }
    }
    return true; // other IPv6 — public address
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (PRIVATE_V4.some((re) => re.test(host))) return false;
  }
  return true;
}

/** Removes framing-blocker headers, cookies, and anything that would identify the proxy origin. */
export function sanitizeProxyResponseHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'x-frame-options') return;
    if (k === 'set-cookie') return;
    if (k === 'strict-transport-security') return;
    if (k === 'content-security-policy' || k === 'content-security-policy-report-only') {
      const cleaned = value
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d && !/^frame-ancestors\b/i.test(d))
        .join('; ');
      if (cleaned) out.set(key, cleaned);
      return;
    }
    if (k === 'content-encoding') return; // fetch already decompressed
    if (k === 'content-length') return; // we may rewrite the body
    out.set(key, value);
  });
  return out;
}

/**
 * Rewrites href= / src= / srcset= attributes and meta-refresh URLs so that
 * absolute and relative URLs route back through this proxy. We use regex-based
 * passes rather than full HTML parsing because the runtime is Hono on Node —
 * no DOMParser is available server-side.
 */
export function rewriteHtmlForProxy(
  html: string,
  baseUrl: string,
  proxyPath: string,
): string {
  // Standard single-URL attributes.
  const attrRe = /\s(href|src|action|data-src|data-href)\s*=\s*(["'])([^"']+)\2/gi;
  // CSS url(...) references.
  const cssUrlRe = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;

  const resolve = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^(data:|mailto:|tel:|javascript:|#)/i.test(trimmed)) return null;
    if (/^about:/i.test(trimmed)) return null;
    try {
      const abs = new URL(trimmed, baseUrl).toString();
      if (!isSafeProxyTarget(abs)) return null;
      return `${proxyPath}?url=${encodeURIComponent(abs)}`;
    } catch {
      return null;
    }
  };

  let out = html.replace(attrRe, (m, attr, quote, val) => {
    const next = resolve(val);
    if (!next) return m;
    return ` ${attr}=${quote}${next}${quote}`;
  });

  // Rewrite srcset="url1 descriptor, url2 descriptor" — each URL is proxied
  // and the width/density descriptors (e.g. "480w", "2x") are preserved.
  out = out.replace(/\ssrcset\s*=\s*(["'])([^"']+)\1/gi, (_m, quote, srcset) => {
    const rewritten = srcset
      .split(',')
      .map((entry: string) => {
        const parts = entry.trim().split(/\s+/);
        if (!parts[0]) return entry;
        const proxied = resolve(parts[0]);
        if (!proxied) return entry;
        parts[0] = proxied;
        return parts.join(' ');
      })
      .join(', ');
    return ` srcset=${quote}${rewritten}${quote}`;
  });

  // Rewrite <meta http-equiv="refresh" content="N; url=...">
  // Two passes handle the two valid attribute orderings:
  //   Pass 1 — http-equiv first:  <meta http-equiv="refresh" content="...">
  //   Pass 2 — content first:     <meta content="..." http-equiv="refresh">
  // Both orderings are spec-valid; real-world sites use both.
  out = out.replace(
    /(<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'])([^"']*)(")/gi,
    (_m, prefix, content, suffix) => {
      const rewritten = content.replace(/url\s*=\s*(\S+)/i, (_c: string, u: string) => {
        const proxied = resolve(u.replace(/['"]/g, ''));
        return proxied ? `url=${proxied}` : `url=${u}`;
      });
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  out = out.replace(
    /(<meta\b[^>]*content\s*=\s*["'])([^"']*)("([^>]*http-equiv\s*=\s*["']refresh["'][^>]*)>)/gi,
    (_m, prefix, content, suffix) => {
      const rewritten = content.replace(/url\s*=\s*(\S+)/i, (_c: string, u: string) => {
        const proxied = resolve(u.replace(/['"]/g, ''));
        return proxied ? `url=${proxied}` : `url=${u}`;
      });
      return `${prefix}${rewritten}${suffix}`;
    },
  );

  out = out.replace(cssUrlRe, (_m, quote, val) => {
    const next = resolve(val);
    if (!next) return _m;
    return `url(${quote}${next}${quote})`;
  });

  // Strip any pre-existing <base> elements — they would compete with our
  // injected one and the browser picks the first, which may be the site's CDN
  // base rather than the origin we resolved relative URLs against.
  out = out.replace(/<base\b[^>]*>/gi, '');

  // Inject our <base> so remaining relative URLs (fonts loaded by CSS, inline
  // JS using document.baseURI) resolve back to the proxied origin.
  const baseTag = `<base href="${baseUrl}" target="_top">`;
  if (/<head[\s>]/i.test(out)) {
    out = out.replace(/<head([\s>])/i, `<head$1${baseTag}`);
  } else {
    out = baseTag + out;
  }

  return out;
}

/** Hono-style handler that fetches and proxies a URL. */
export async function handleProxyRequest(targetUrl: string, proxyPath: string): Promise<Response> {
  if (!isSafeProxyTarget(targetUrl)) {
    return new Response(
      JSON.stringify({ error: 'Refused: only public http(s) targets are allowed.' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  let upstream: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    upstream = await fetch(targetUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (WebAI-OS Proxy; compatible; like Gecko) Chrome/124 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err) {
    clearTimeout(timer);
    return new Response(
      JSON.stringify({
        error: `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
  clearTimeout(timer);

  const headers = sanitizeProxyResponseHeaders(upstream.headers);
  const ct = upstream.headers.get('content-type') || '';

  if (ct.includes('text/html')) {
    const html = await upstream.text();
    const rewritten = rewriteHtmlForProxy(html, upstream.url, proxyPath);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(rewritten, { status: upstream.status, headers });
  }

  // Stream non-HTML through unchanged (images, CSS, JS, fonts).
  return new Response(upstream.body, { status: upstream.status, headers });
}
