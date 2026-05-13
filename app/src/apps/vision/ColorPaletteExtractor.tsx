import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';

/**
 * Color palette extraction is pure pixel math — no model needed. Renders a 6-color
 * dominant palette using a simple k-means-ish bucketing of the image pixels.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function extractPalette(img: HTMLImageElement, k = 6): { hex: string; count: number }[] {
  const canvas = document.createElement('canvas');
  const maxSize = 256;
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.floor(img.naturalWidth * scale) || 1;
  canvas.height = Math.floor(img.naturalHeight * scale) || 1;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // Bucket by quantizing each channel to 4 bits (16 buckets) then count.
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 200) continue;
    const r = data[i] & 0xf0;
    const g = data[i + 1] & 0xf0;
    const b = data[i + 2] & 0xf0;
    const key = `${r},${g},${b}`;
    const slot = buckets.get(key);
    if (slot) {
      slot.r += data[i];
      slot.g += data[i + 1];
      slot.b += data[i + 2];
      slot.n += 1;
    } else {
      buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], n: 1 });
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, k)
    .map((b) => ({
      hex: rgbToHex(Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)),
      count: b.n,
    }));
}

export default function ColorPaletteExtractor() {
  const [imgUrl, setImgUrl] = useState('');
  const [palette, setPalette] = useState<{ hex: string; count: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async () => {
    if (!imgUrl) return;
    setBusy(true);
    setError(null);
    setPalette(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        setPalette(extractPalette(img));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    };
    img.onerror = () => {
      setError('Could not load that image. CORS may be blocking remote URLs — try uploading the file instead.');
      setBusy(false);
    };
    img.src = imgUrl;
  }, [imgUrl]);

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setImgUrl(String(reader.result));
    reader.readAsDataURL(f);
  };

  return (
    <AppLayout title="Color Palette Extractor" description="Extract a 6-color palette from any image">
      <div className="h-full flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={imgUrl.startsWith('data:') ? '(uploaded file)' : imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="Paste image URL or upload below…"
            className="flex-1 h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="h-9 px-3 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1]"
          >
            <Upload className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Upload
          </button>
        </div>

        {imgUrl && (
          <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#12121a] max-h-40 flex items-center justify-center">
            <img src={imgUrl} alt="input" className="max-h-40 object-contain" />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={run}
            disabled={!imgUrl || busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Extract
          </button>
        </div>

        {error && <div className="text-xs text-[#f87171] whitespace-pre-wrap">{error}</div>}

        {palette && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {palette.map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  navigator.clipboard.writeText(c.hex);
                  setCopied(c.hex);
                  setTimeout(() => setCopied(''), 1200);
                }}
                className="flex flex-col items-stretch rounded-lg overflow-hidden border border-white/[0.06] hover:scale-[1.02] transition-transform"
              >
                <div style={{ background: c.hex }} className="h-16" />
                <div className="flex items-center justify-between px-2 py-1.5 text-[10px] bg-[#12121a]">
                  <span className="font-mono text-[#e8e8f0]">{c.hex}</span>
                  {copied === c.hex ? (
                    <Check className="w-3 h-3 text-[#4ade80]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#585870]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
