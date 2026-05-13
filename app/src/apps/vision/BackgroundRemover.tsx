import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

/** Mask object returned by transformers.js image-segmentation pipelines. */
interface SegmentationMask {
  data: Uint8ClampedArray | Uint8Array | number[];
  width?: number;
  height?: number;
}

interface SegmentationOutput {
  mask?: SegmentationMask;
}

/**
 * Composite an alpha mask over the original image so the user sees the
 * background actually removed.
 */
function renderBgRemovalResult(result: unknown, srcUrl: string): React.ReactNode {
  const first = (Array.isArray(result) ? result[0] : result) as SegmentationOutput | undefined;
  const mask = first?.mask;
  if (!mask) {
    return (
      <div className="text-xs text-[#e8e8f0] whitespace-pre-wrap">
        Mask data missing — model output: {JSON.stringify(result).slice(0, 400)}
      </div>
    );
  }
  return <CutoutPreview mask={mask} srcUrl={srcUrl} />;
}

function CutoutPreview({ mask, srcUrl }: { mask: SegmentationMask; srcUrl: string }) {
  return (
    <div className="space-y-2">
      <canvas
        ref={(el) => {
          if (!el) return;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const w = mask.width ?? img.naturalWidth;
            const h = mask.height ?? img.naturalHeight;
            el.width = w;
            el.height = h;
            const ctx = el.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const maskData = mask.data;
            for (let i = 0; i < maskData.length; i++) {
              data[i * 4 + 3] = maskData[i];
            }
            ctx.putImageData(imageData, 0, 0);
          };
          img.src = srcUrl;
        }}
        className="w-full max-h-[420px] object-contain rounded-md"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #1a1a24 25%, transparent 25%), linear-gradient(-45deg, #1a1a24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a24 75%), linear-gradient(-45deg, transparent 75%, #1a1a24 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
      />
      <div className="text-[10px] text-[#585870]">
        Right-click → Save image as… to download the cutout.
      </div>
    </div>
  );
}

export default function BackgroundRemover({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('bgremover')!;
  return (
    <ImageWorkbench
      title="Background Remover"
      description="Extract foreground from images (works best on portraits)"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      renderResult={renderBgRemovalResult}
      actionLabel="Remove Background"
    />
  );
}
