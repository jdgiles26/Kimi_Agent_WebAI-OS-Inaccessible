import { networkInterfaces } from 'node:os';

export interface LanAddress {
  iface: string;
  family: 'IPv4' | 'IPv6';
  address: string;
  /** Best URL for sharing — http://<address>:<port>. */
  url: string;
}

/** Returns external (non-internal, non-link-local) LAN addresses for sharing. */
export function getLanAddresses(port: number): LanAddress[] {
  const nets = networkInterfaces();
  const out: LanAddress[] = [];
  for (const [iface, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.internal) continue;
      if (a.family !== 'IPv4' && a.family !== 'IPv6') continue;
      // Skip IPv6 link-local
      if (a.family === 'IPv6' && a.address.toLowerCase().startsWith('fe80')) continue;
      const host = a.family === 'IPv6' ? `[${a.address}]` : a.address;
      out.push({
        iface,
        family: a.family as 'IPv4' | 'IPv6',
        address: a.address,
        url: `http://${host}:${port}/`,
      });
    }
  }
  // IPv4 first — iPhones on Wi-Fi can't always reach a laptop's IPv6 address,
  // and Remote Access defaults the QR to the first entry.
  out.sort((a, b) => (a.family === b.family ? 0 : a.family === 'IPv4' ? -1 : 1));
  return out;
}
