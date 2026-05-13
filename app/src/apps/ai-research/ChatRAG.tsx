import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, User, Bot, Paperclip, Cpu, AlertTriangle } from 'lucide-react';
import type { ChatMessage } from '@/types/os';
import { runModel } from '@/lib/ai/runtime';
import { getModelById } from '@/lib/ai/modelGarden';
import { getPlanForApp } from '@/lib/ai/toolModelMap';
import type { AIDtype } from '@/lib/ai/types';
import { cleanGeneratedText, formatPipelineResult } from '@/lib/ai/format';

/**
 * Split context text into ~600-char chunks at sentence boundaries.
 */
function chunkText(text: string, chunkChars = 600): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).length > chunkChars && buf) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

async function embed(texts: string[]): Promise<number[][]> {
  const card = getModelById('minilm-l6-v2')!;
  const out: unknown = await runModel({
    task: 'feature-extraction',
    modelId: card.hfId,
    input: texts,
    options: { callOptions: { pooling: 'mean', normalize: true } },
  });
  // transformers.js returns a Tensor; convert to JS arrays.
  if (
    out &&
    typeof out === 'object' &&
    typeof (out as { tolist?: unknown }).tolist === 'function'
  ) {
    return (out as { tolist: () => number[][] }).tolist();
  }
  if (Array.isArray(out)) return out as number[][];
  return [];
}

export default function ChatRAG({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('chatrag')!;
  const genCard = getModelById(plan.modelId)!;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! Paste a passage or URL into the context box above, then ask questions about it. With context, I retrieve the most relevant sentences and answer using SmolLM2. Without context, I answer from general knowledge.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [contextText, setContextText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ progress: number; file?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const corpusRef = useRef<{ chunks: string[]; vectors: number[][] } | null>(null);
  const lastIndexedText = useRef<string>('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isProcessing]);

  // Re-index context when it changes (debounced lazily on send).
  async function ensureIndex(): Promise<void> {
    if (!contextText.trim()) {
      corpusRef.current = null;
      lastIndexedText.current = '';
      return;
    }
    if (lastIndexedText.current === contextText) return;
    const chunks = chunkText(contextText);
    if (!chunks.length) {
      corpusRef.current = null;
      return;
    }
    const vectors = await embed(chunks);
    corpusRef.current = { chunks, vectors };
    lastIndexedText.current = contextText;
  }

  async function retrieve(query: string, k = 3): Promise<string[]> {
    if (!corpusRef.current) return [];
    const [qv] = await embed([query]);
    const scored = corpusRef.current.chunks.map((c, i) => ({
      c,
      score: cosine(qv, corpusRef.current!.vectors[i]),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((x) => x.c);
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const query = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: query, timestamp: Date.now() },
    ]);

    setIsProcessing(true);
    setError(null);
    setProgress({ progress: 0 });

    try {
      await ensureIndex();
      const contextSnips = await retrieve(query, 3);
      const contextBlock = contextSnips.length
        ? `Context passages:\n${contextSnips.map((s, i) => `[${i + 1}] ${s}`).join('\n')}\n\n`
        : '';
      const messagesForModel = [
        {
          role: 'system',
          content:
            'You are a research assistant. If context passages are provided, use them and cite passage numbers like [1]. If they are absent, answer from general knowledge. Be concise.',
        },
        { role: 'user', content: `${contextBlock}Question: ${query}` },
      ];

      const raw: unknown = await runModel({
        task: 'text-generation',
        modelId: genCard.hfId,
        input: messagesForModel,
        pretrainedOptions: genCard.pretrainedOptions,
        options: {
          dtype: genCard.dtype as AIDtype | undefined,
          callOptions: {
            max_new_tokens: 320,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false,
          },
          onProgress: (e) => {
            if (typeof e.progress === 'number') setProgress({ progress: e.progress, file: e.file });
          },
        },
      });

      const text = cleanGeneratedText(formatPipelineResult(raw, 'text-generation'));
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: 'assistant', content: text, timestamp: Date.now() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Model badge */}
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-center gap-2 text-[10px] text-[#7c6bff]/80 bg-[#7c6bff]/8 border border-[#7c6bff]/15 px-2.5 py-1.5 rounded-md">
          <Cpu className="w-3 h-3" />
          <span>{plan.modelLabel}</span>
          {!webGPUStatus?.supported && <span className="ml-auto text-[#fbbf24]">CPU fallback</span>}
        </div>
      </div>

      {/* Context input */}
      <div className="shrink-0 px-4 pt-2">
        <div className="text-[10px] text-[#585870] mb-1">Context (paste passage; URL fetch not enabled in-browser)</div>
        <div className="flex gap-2">
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Paste an article, transcript, or notes to ground answers in…"
            rows={3}
            className="flex-1 px-2 py-1.5 rounded-md bg-[#12121a] border border-white/[0.06] text-[11px] text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none resize-y"
          />
          <button className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] self-start">
            <Paperclip className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 flex items-start gap-2 text-[10px] text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/20 px-2.5 py-1.5 rounded-md">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-[#38bdf8]/15' : 'bg-[#7c6bff]/15'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-3 h-3 text-[#38bdf8]" />
              ) : (
                <Bot className="w-3 h-3 text-[#7c6bff]" />
              )}
            </div>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#7c6bff]/15 text-[#e8e8f0]'
                  : 'bg-[#12121a] text-[#e8e8f0] border border-white/[0.06]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#7c6bff]/15 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-[#7c6bff]" />
            </div>
            <div className="bg-[#12121a] border border-white/[0.06] px-3 py-2 rounded-xl flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#7c6bff] animate-spin" />
              <span className="text-[10px] text-[#585870]">
                {progress && progress.progress < 100
                  ? `Loading model ${Math.round(progress.progress)}%`
                  : 'Thinking…'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question…"
            className="flex-1 h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="h-9 px-3 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
