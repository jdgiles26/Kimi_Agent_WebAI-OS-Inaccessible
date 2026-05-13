import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Sparkles,
  FileText,
  Languages,
  Plus,
  X,
  Globe,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useAIProcessor } from '@/apps/AppLayout';

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loadError?: boolean;
}

const WELCOME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a12;color:#e8e8f0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;overflow:hidden}
.container{text-align:center;max-width:600px;padding:40px}
h1{font-size:28px;font-weight:700;margin-bottom:12px;background:linear-gradient(135deg,#7c6bff,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#585870;font-size:14px;line-height:1.7;margin-bottom:32px}
.shortcuts{display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:left}
.kbd{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#12121a;border-radius:8px;border:1px solid rgba(255,255,255,0.06)}
.key{background:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:11px;font-family:monospace;color:#9090a8;border:1px solid rgba(255,255,255,0.08)}
.kbd span{font-size:12px;color:#e8e8f0}
.tips{margin-top:32px;padding:16px;background:#12121a;border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
.tips h3{font-size:13px;color:#7c6bff;margin-bottom:8px}
.tips ul{list-style:none;text-align:left}
.tips li{color:#585870;font-size:12px;padding:4px 0;display:flex;gap:8px}
.tips li::before{content:"";width:6px;height:6px;border-radius:50%;background:#7c6bff;margin-top:6px;flex-shrink:0}
</style>
</head>
<body>
<div class="container">
<h1>WebAI Browser</h1>
<p>Welcome to the built-in web browser. Enter any URL in the address bar to start browsing, or try these keyboard shortcuts.</p>
<div class="shortcuts">
<div class="kbd"><span class="key">Ctrl+T</span><span>New tab</span></div>
<div class="kbd"><span class="key">Ctrl+L</span><span>Focus address bar</span></div>
<div class="kbd"><span class="key">Ctrl+R</span><span>Reload page</span></div>
<div class="kbd"><span class="key">Ctrl+W</span><span>Close tab</span></div>
</div>
<div class="tips">
<h3>AI Features</h3>
<ul>
<li>Summarize any page with one click</li>
<li>Translate content in real-time</li>
<li>Ask AI about the current page</li>
</ul>
</div>
</div>
</body>
</html>`;

export default function WebBrowser() {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', url: 'about:blank', title: 'New Tab' },
  ]);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [urlInput, setUrlInput] = useState('');
  const [showSummarize, setShowSummarize] = useState(false);
  const [summarizeText] = useState('');
  const [useProxy, setUseProxy] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const proxyUrl = (target: string) =>
    target === 'about:blank' ? 'about:blank' : `/api/proxy?url=${encodeURIComponent(target)}`;
  const resolveSrc = (target: string) => (useProxy ? proxyUrl(target) : target);

  const addTab = useCallback(() => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      url: 'about:blank',
      title: 'New Tab',
      loadError: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
    setUrlInput('');
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((t) => t.id !== tabId);
        if (activeTab === tabId) {
          setActiveTab(filtered[filtered.length - 1].id);
          setUrlInput(filtered[filtered.length - 1].url);
        }
        return filtered;
      });
    },
    [activeTab]
  );

  const navigate = useCallback(() => {
    let url = urlInput.trim();
    if (!url) return;
    if (url === 'about:blank') {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTab ? { ...t, url, title: 'New Tab', loadError: false } : t))
      );
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = 'https://duckduckgo.com/html/?q=' + encodeURIComponent(url);
      }
    }
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab ? { ...t, url, loadError: false } : t))
    );
  }, [urlInput, activeTab]);

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-0.5">
          <button className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const t = activeTabData;
              if (t) {
                setTabs((prev) =>
                  prev.map((tab) =>
                    tab.id === activeTab ? { ...tab, url: t.url } : tab
                  )
                );
              }
            }}
            className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-[#12121a] rounded-lg px-3 py-1.5 border border-white/[0.06]">
          <Lock className="w-3 h-3 text-[#4ade80] shrink-0" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate()}
            className="flex-1 bg-transparent text-[11px] text-[#e8e8f0] focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setUseProxy((v) => !v)}
            className={`px-2 h-7 rounded-md text-[10px] font-medium transition-colors ${
              useProxy
                ? 'bg-[#4ade80]/15 text-[#4ade80]'
                : 'bg-white/[0.04] text-[#9090a8]'
            }`}
            title={
              useProxy
                ? 'Loading via local proxy (strips X-Frame-Options / CSP). Click to disable.'
                : 'Direct iframe load (most sites will block). Click to re-enable proxy.'
            }
          >
            {useProxy ? 'Proxy ON' : 'Proxy OFF'}
          </button>
          <button
            onClick={() => setShowSummarize(!showSummarize)}
            className="p-1.5 rounded-md text-[#7c6bff] hover:bg-[#7c6bff]/10"
            title="Summarize Page"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-[#38bdf8] hover:bg-[#38bdf8]/10"
            title="Translate"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md text-[#7c6bff] hover:bg-[#7c6bff]/10"
            title="Ask AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 px-2 border-b border-white/[0.06] overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          const selectTab = () => {
            setActiveTab(tab.id);
            setUrlInput(tab.url);
          };
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={selectTab}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectTab();
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[11px] min-w-0 max-w-[160px] transition-all cursor-pointer ${
                tab.id === activeTab
                  ? 'bg-[#12121a] text-[#e8e8f0]'
                  : 'text-[#585870] hover:text-[#9090a8] hover:bg-white/[0.03]'
              }`}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{tab.title}</span>
              <button
                type="button"
                aria-label={`Close tab ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/[0.1] shrink-0"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
        <button
          onClick={addTab}
          className="p-1.5 rounded-lg text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ display: tab.id === activeTab ? 'block' : 'none' }}
          >
            {showSummarize && tab.id === activeTab ? (
              <BrowserSummarize
                text={summarizeText}
                onClose={() => setShowSummarize(false)}
              />
            ) : tab.loadError ? (
              <div className="w-full h-full flex items-center justify-center bg-[#0a0a12]">
                <div className="text-center max-w-sm p-6">
                  <div className="w-16 h-16 rounded-full bg-[#fbbf24]/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-[#fbbf24]" />
                  </div>
                  <h3 className="text-sm font-medium text-[#e8e8f0] mb-2">Cannot Display Website</h3>
                  <p className="text-xs text-[#585870] mb-4">
                    This website blocks embedding via X-Frame-Options or Content-Security-Policy.
                    This is a security measure used by many sites to prevent clickjacking.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const t = activeTabData;
                        if (t) {
                          setTabs((prev) =>
                            prev.map((tt) =>
                              tt.id === tab.id ? { ...tt, loadError: false } : tt
                            )
                          );
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1] transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Retry
                    </button>
                    <a
                      href={tab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#7c6bff] text-white hover:bg-[#6b5ce0] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              </div>
            ) : tab.url === 'about:blank' ? (
              <iframe
                ref={tab.id === activeTab ? iframeRef : undefined}
                srcDoc={WELCOME_HTML}
                className="w-full h-full border-0"
                title="New Tab"
              />
            ) : (
              <iframe
                ref={tab.id === activeTab ? iframeRef : undefined}
                src={resolveSrc(tab.url)}
                className="w-full h-full border-0"
                title={tab.title}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                onError={() => {
                  setTabs((prev) =>
                    prev.map((t) =>
                      t.id === tab.id ? { ...t, loadError: true } : t
                    )
                  );
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserSummarize({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const { isProcessing, output, process, errorMessage } = useAIProcessor('tldr');
  const [pasted, setPasted] = useState(text);

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#e8e8f0]">Page Summarizer</h3>
        <button
          onClick={onClose}
          className="text-[11px] text-[#585870] hover:text-[#e8e8f0]"
        >
          Back to Page
        </button>
      </div>
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder="Paste page content here to summarize (the iframe sandbox blocks reading it directly)…"
        className="h-32 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 text-xs text-[#e8e8f0] placeholder-[#585870] resize-none focus:border-[#7c6bff] focus:outline-none mb-3"
      />
      <div className="flex justify-end mb-3">
        <button
          onClick={() => process(pasted.trim())}
          disabled={isProcessing || !pasted.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isProcessing ? 'Summarizing…' : 'Summarize'}
        </button>
      </div>
      {(output || errorMessage) && (
        <div className="flex-1 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 overflow-auto">
          <div className={`text-xs whitespace-pre-wrap ${errorMessage ? 'text-[#f87171]' : 'text-[#e8e8f0]'}`}>
            {errorMessage ?? output}
          </div>
        </div>
      )}
    </div>
  );
}
