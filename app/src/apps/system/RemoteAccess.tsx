import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Globe,
  Cloud,
  ShieldAlert,
} from 'lucide-react';
import QRCode from 'qrcode';
import { AppLayout } from '@/apps/AppLayout';

interface LanResponse {
  port: number;
  addresses: { iface: string; family: 'IPv4' | 'IPv6'; address: string; url: string }[];
}

type Reachability = 'unknown' | 'checking' | 'ok' | 'blocked';

export default function RemoteAccess() {
  const [data, setData] = useState<LanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [qr, setQr] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [reach, setReach] = useState<Reachability>('unknown');
  const [publicUrl, setPublicUrl] = useState<string>(() => {
    return localStorage.getItem('webai:public-tunnel-url') || '';
  });
  const [publicUrlDraft, setPublicUrlDraft] = useState('');

  // Save the public tunnel URL so it persists across sessions.
  const savePublicUrl = (url: string) => {
    const clean = url.trim().replace(/\/$/, '');
    setPublicUrl(clean);
    if (clean) localStorage.setItem('webai:public-tunnel-url', clean);
    else localStorage.removeItem('webai:public-tunnel-url');
  };

  // Reachability check. /api/lan is CORS-open, so this cross-origin fetch
  // succeeds iff the LAN address is actually routable from this browser.
  // A failure here is a real network problem (firewall, isolation, wrong port),
  // not a CORS issue.
  const checkReach = async (url: string) => {
    // If the page is *already* loaded from this URL, it's trivially reachable.
    if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) {
      setReach('ok');
      return;
    }
    setReach('checking');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(`${url.replace(/\/$/, '')}/api/lan`, {
        signal: ctrl.signal,
        cache: 'no-store',
        mode: 'cors',
      });
      clearTimeout(t);
      setReach(r.ok ? 'ok' : 'blocked');
    } catch {
      setReach('blocked');
    }
  };

  const refresh = async () => {
    setError(null);
    try {
      const r = await fetch('/api/lan');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as LanResponse;
      setData(json);
      // Default the QR to an IPv4 address — iPhones on Wi-Fi often can't reach
      // the laptop's global IPv6 address. Fall back to whatever's first.
      const preferred = json.addresses.find((a) => a.family === 'IPv4') || json.addresses[0];
      if (preferred) {
        setSelected(preferred.url);
        checkReach(preferred.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    refresh();
    // refresh is intentionally fired once on mount; capturing it in deps would
    // re-fire on every render because it's a fresh arrow on each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = selected || publicUrl;
    if (!target) {
      setQr('');
      return;
    }
    QRCode.toDataURL(target, { width: 260, margin: 1, color: { dark: '#e8e8f0', light: '#0a0a12' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [selected, publicUrl]);

  const v4 = useMemo(() => (data?.addresses ?? []).filter((a) => a.family === 'IPv4'), [data]);
  const v6 = useMemo(() => (data?.addresses ?? []).filter((a) => a.family === 'IPv6'), [data]);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 1500);
  };

  const port = data?.port ?? 3000;
  // Display either the saved public tunnel URL or the LAN selection.
  const qrTarget = publicUrl || selected;

  return (
    <AppLayout
      title="Remote Access"
      description="Open WebAI OS on your phone, tablet, or any device — on this Wi-Fi or over the internet"
    >
      <div className="h-full overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#7c6bff]" />
              <div className="text-sm font-medium text-[#e8e8f0]">How to connect</div>
            </div>
            <ol className="text-[11px] text-[#9090a8] space-y-1.5 list-decimal pl-4">
              <li>
                <strong className="text-[#e8e8f0]">Same Wi-Fi:</strong> scan the QR or open the
                IPv4 URL below in your phone's browser.
              </li>
              <li>
                <strong className="text-[#e8e8f0]">Different network / cellular:</strong> start a
                tunnel (see the panel below), paste the public URL, then scan the new QR.
              </li>
              <li>
                Pin the page to your home screen (Safari: Share → Add to Home Screen) for a
                full-screen app feel.
              </li>
            </ol>

            {error && (
              <div className="flex items-start gap-2 text-[10px] text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/20 px-2.5 py-1.5 rounded-md">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Could not load LAN addresses: {error}. In production the server must run with
                  the API enabled.
                </span>
              </div>
            )}

            {reach === 'blocked' && (
              <div
                role="alert"
                className="flex items-start gap-2 text-[10px] text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/30 px-2.5 py-1.5 rounded-md"
              >
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium text-[#fca5a5]">
                    LAN URL not reachable from this browser.
                  </div>
                  <div>Possible causes:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[#9090a8]">
                    <li>
                      macOS Application Firewall is blocking the Node binary. Run:
                      <code className="block mt-0.5 font-mono text-[9.5px] text-[#e8e8f0]">
                        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$(which node)"
                      </code>
                    </li>
                    <li>Your phone is on a different Wi-Fi or cellular — use the tunnel below.</li>
                    <li>Router has client isolation / guest-network mode on.</li>
                  </ul>
                </div>
              </div>
            )}
            {reach === 'ok' && (
              <div
                role="status"
                className="flex items-center gap-2 text-[10px] text-[#4ade80] bg-[#4ade80]/8 border border-[#4ade80]/30 px-2.5 py-1.5 rounded-md"
              >
                <Check className="w-3 h-3 shrink-0" />
                Verified reachable from this browser. The QR should work on phones on this Wi-Fi.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-wider text-[#9090a8]">
                  LAN URLs (same Wi-Fi)
                </div>
                <button
                  onClick={refresh}
                  className="text-[10px] text-[#7c6bff] hover:text-[#9b8fff] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <UrlList
                title="Wi-Fi (IPv4)"
                icon={Wifi}
                items={v4}
                selected={selected}
                onSelect={(u) => {
                  setSelected(u);
                  savePublicUrl('');
                  checkReach(u);
                }}
                onCopy={copy}
                copiedUrl={copied}
              />
              {v6.length > 0 && (
                <UrlList
                  title="IPv6"
                  icon={Globe}
                  items={v6}
                  selected={selected}
                  onSelect={(u) => {
                    setSelected(u);
                    savePublicUrl('');
                    checkReach(u);
                  }}
                  onCopy={copy}
                  copiedUrl={copied}
                />
              )}
              {data && data.addresses.length === 0 && (
                <div className="text-[11px] text-[#585870]">
                  No LAN addresses detected. Run the dev server with <code>host: true</code> in
                  vite.config.ts (it already is).
                </div>
              )}
            </div>

            {/* Public tunnel panel */}
            <div className="border-t border-white/[0.06] pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#38bdf8]" />
                <div className="text-sm font-medium text-[#e8e8f0]">
                  Public access (any network, cellular, anywhere)
                </div>
              </div>
              <div className="text-[10px] text-[#9090a8]">
                LAN URLs only work on the same Wi-Fi. To reach the app from cellular or a
                different network, expose it over the internet with a tunnel. Pick one, run the
                command in another terminal, then paste the public URL below.
              </div>

              <div className="text-[10px] space-y-2 pt-1">
                <TunnelOption
                  name="Cloudflare Tunnel"
                  install="brew install cloudflared"
                  command={`cloudflared tunnel --url http://localhost:${port}`}
                  hint="Free. No signup for quick tunnels. Outputs a https://*.trycloudflare.com URL."
                />
                <TunnelOption
                  name="ngrok"
                  install="brew install ngrok && ngrok config add-authtoken <your-token>"
                  command={`ngrok http ${port}`}
                  hint="Free tier requires a token (one-time signup). Outputs a https://*.ngrok-free.app URL."
                />
                <TunnelOption
                  name="Tailscale (mesh VPN, no public exposure)"
                  install="brew install --cask tailscale"
                  command={`tailscale serve --bg http://localhost:${port}`}
                  hint={`Best for personal use. Devices stay on a private mesh; no public URL. Reach this Mac as http://<machine-name>:${port} from any of your Tailscale devices.`}
                />
              </div>

              <div className="pt-2 space-y-1.5">
                <div className="text-[10px] text-[#9090a8]">
                  Paste the URL the tunnel printed (or leave blank to clear):
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={publicUrlDraft}
                    onChange={(e) => setPublicUrlDraft(e.target.value)}
                    placeholder="https://something-fluffy-quokka.trycloudflare.com"
                    className="flex-1 h-8 px-2.5 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0] font-mono"
                  />
                  <button
                    onClick={() => {
                      savePublicUrl(publicUrlDraft);
                      setPublicUrlDraft('');
                    }}
                    className="h-8 px-3 rounded text-[11px] font-medium bg-[#38bdf8]/15 text-[#38bdf8] hover:bg-[#38bdf8]/25"
                  >
                    Set as QR
                  </button>
                  {publicUrl && (
                    <button
                      onClick={() => savePublicUrl('')}
                      className="h-8 px-3 rounded text-[11px] bg-white/[0.06] text-[#9090a8] hover:text-[#e8e8f0]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {publicUrl && (
                  <div className="flex items-center gap-2 text-[10px] text-[#38bdf8] bg-[#38bdf8]/8 border border-[#38bdf8]/20 px-2.5 py-1.5 rounded-md">
                    <Cloud className="w-3 h-3 shrink-0" />
                    <span className="font-mono truncate flex-1">{publicUrl}</span>
                    <button onClick={() => copy(publicUrl)} className="p-0.5 hover:text-white">
                      {copied === publicUrl ? (
                        <Check className="w-3 h-3 text-[#4ade80]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-[10px] text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/20 px-2.5 py-1.5 rounded-md">
              <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
              <div>
                <strong className="text-[#fbbf24]">Security note:</strong> WebAI OS has no built-in
                auth. A public tunnel makes the app and the <code>/api/proxy</code> route reachable
                to anyone with the URL. Keep tunnels short-lived, or put an auth proxy (Cloudflare
                Access, Authelia, oauth2-proxy) in front for anything more than a quick demo.
              </div>
            </div>
          </div>

          {/* QR panel */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-[#9090a8]">
              QR code {publicUrl ? '(public)' : '(LAN)'}
            </div>
            <div className="aspect-square w-full rounded-lg border border-white/[0.06] bg-[#0a0a12] flex items-center justify-center overflow-hidden">
              {qr ? (
                <img src={qr} alt="Connection QR" className="w-full h-full object-contain" />
              ) : (
                <div className="text-[11px] text-[#585870] p-4 text-center">
                  Select a URL or paste a tunnel URL to generate a QR code.
                </div>
              )}
            </div>
            <div className="text-[10px] text-[#585870] break-all">{qrTarget || '—'}</div>
            {publicUrl && (
              <div className="text-[9.5px] text-[#38bdf8]">
                QR points to your public tunnel. Anyone with this URL can use the app.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function TunnelOption({
  name,
  install,
  command,
  hint,
}: {
  name: string;
  install: string;
  command: string;
  hint: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string>('');
  const doCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1200);
  };
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#12121a] p-2 space-y-1.5">
      <div className="text-[11px] font-medium text-[#e8e8f0]">{name}</div>
      <CodeRow label="install" cmd={install} k={`${name}-install`} copiedKey={copiedKey} onCopy={doCopy} />
      <CodeRow label="run" cmd={command} k={`${name}-run`} copiedKey={copiedKey} onCopy={doCopy} />
      <div className="text-[9.5px] text-[#585870] leading-snug">{hint}</div>
    </div>
  );
}

function CodeRow({
  label,
  cmd,
  k,
  copiedKey,
  onCopy,
}: {
  label: string;
  cmd: string;
  k: string;
  copiedKey: string;
  onCopy: (t: string, k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-[#585870] w-12 shrink-0">{label}</span>
      <code className="flex-1 font-mono text-[#e8e8f0] truncate">{cmd}</code>
      <button
        onClick={() => onCopy(cmd, k)}
        className="p-0.5 text-[#585870] hover:text-[#e8e8f0]"
        title="Copy"
      >
        {copiedKey === k ? (
          <Check className="w-3 h-3 text-[#4ade80]" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

function UrlList({
  title,
  icon: Icon,
  items,
  selected,
  onSelect,
  onCopy,
  copiedUrl,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { iface: string; address: string; url: string }[];
  selected: string;
  onSelect: (url: string) => void;
  onCopy: (url: string) => void;
  copiedUrl: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 text-[10px] text-[#585870] mb-1">
        <Icon className="w-3 h-3" />
        {title}
      </div>
      <div className="space-y-1">
        {items.map((a) => (
          <div
            key={`${a.iface}-${a.address}`}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
              selected === a.url ? 'border-[#7c6bff] bg-[#7c6bff]/8' : 'border-white/[0.06] bg-[#12121a]'
            }`}
          >
            <button
              onClick={() => onSelect(a.url)}
              className="flex-1 text-left text-[11px] text-[#e8e8f0] font-mono truncate"
            >
              {a.url}
            </button>
            <span className="text-[9px] text-[#585870]">{a.iface}</span>
            <button
              onClick={() => onCopy(a.url)}
              className="p-1 text-[#585870] hover:text-[#e8e8f0]"
              title="Copy"
            >
              {copiedUrl === a.url ? (
                <Check className="w-3 h-3 text-[#4ade80]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
