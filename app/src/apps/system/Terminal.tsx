import { useState, useRef, useEffect, useCallback } from 'react';
import type { FileNode, EnvVars } from '@/types/os';

interface CommandResult {
  output: string;
  fs?: FileNode[];
  env?: EnvVars;
}

export default function Terminal() {
  const [history, setHistory] = useState<{ prompt: string; output: string; isError?: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [env, setEnv] = useState<EnvVars>({ cwd: '/home/user', user: 'user', home: '/home/user' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  const executeCommand = useCallback(
    (cmdLine: string) => {
      const trimmed = cmdLine.trim();
      if (!trimmed) return;

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      let result: CommandResult = { output: '' };

      switch (cmd) {
        case 'help':
          result.output = `Available commands:
  ls [path]        List directory contents
  cd <path>        Change directory
  pwd              Print working directory
  cat <file>       Display file contents
  mkdir <name>     Create directory
  touch <name>     Create empty file
  rm <name>        Remove file or directory
  echo <text>      Print text
  clear            Clear terminal
  neofetch         System info
  webgpu-info      WebGPU diagnostics
  whoami           Current user
  date             Current date/time
  calc <expr>      Calculate expression
  ps               List processes (simulated)
  df               Disk usage
  uname            System info
  history          Command history`;
          break;

        case 'ls':
          result.output = 'home  documents  downloads  welcome.txt  README.md';
          break;

        case 'pwd':
          result.output = env.cwd;
          break;

        case 'whoami':
          result.output = env.user;
          break;

        case 'date':
          result.output = new Date().toString();
          break;

        case 'clear':
          setHistory([]);
          return;

        case 'echo':
          result.output = args.join(' ') || '';
          break;

        case 'neofetch':
          result.output = `
    ___      __        __              ____  _____
   /   | ____/ /_____ _/ /___  ________  / __ / ___/
  / /| |/ __  // _  // / __ / ___/ / / / / /__ /
 / ___ / /_/ //  __// / /_/ / /  / /_/ /_/ /___/ /
/_/  |_\\__,_/ \\___//_/\\____/_/   \\__//____//____/

  OS: WebAI OS (Linux-like Web Desktop)
  Kernel: WebGPU AI v1.0
  Uptime: ${Math.floor(performance.now() / 1000)}s
  Shell: webai-sh
  CPU: ${navigator.hardwareConcurrency} cores
  GPU: ${navigator.gpu ? 'WebGPU Supported' : 'Not Available'}
  Browser: ${navigator.userAgent.split(')')[0] + ')'}
  Memory: Available via WebGPU
  Resolution: ${window.innerWidth}x${window.innerHeight}
  Apps: 62 AI-powered applications
  `;
          break;

        case 'webgpu-info':
          result.output = `WebGPU Information:
  Supported: ${(typeof navigator !== 'undefined' && 'gpu' in navigator) ? 'YES' : 'NO'}
  API: navigator.gpu
  Features:
    - Compute shaders for AI inference
    - GPU-accelerated transformers
    - On-device LLM inference
    - Zero server cost
    - Privacy-preserving
  
  Libraries:
    - Transformers.js (Hugging Face)
    - WebLLM (MLC AI)
    - ONNX Runtime Web
  
  Models Available:
    - Text Generation (GPT-2, Phi, Mistral)
    - Summarization (BART, T5)
    - Translation (Marian, NLLB)
    - Sentiment Analysis (DistilBERT)
    - Image-to-Text (BLIP, ViT-GPT2)
    - Question Answering (DistilBERT)
    - Text-to-Text (T5, FLAN-T5)`;
          break;

        case 'uname':
          result.output = 'WebAI OS x86_64 WebGPU_AI_Enabled';
          break;

        case 'calc': {
          const expr = args.join(' ');
          try {
            const val = new Function('return ' + expr.replace(/[^0-9+\-*/().\s]/g, ''))();
            result.output = String(val);
          } catch {
            result.output = 'Error: Invalid expression';
          }
          break;
        }

        case 'ps':
          result.output = `PID  CMD
  1  webai-kernel
  2  gpu-scheduler
  3  ai-inference-engine
  4  window-manager
  5  file-system
  6  terminal
  7  browser
  8  webgpu-driver
  9  notification-daemon
 10  start-menu`;
          break;

        case 'df':
          result.output = `Filesystem     Size  Used  Avail  Use%  Mounted on
localStorage   5MB   0.2MB  4.8MB   4%  /
indexedDB      50MB  1.5MB  48.5MB  3%  /data
CacheAPI       200MB 15MB   185MB   8%  /models
Memory         auto  dynamic auto    -   /tmp`;
          break;

        case 'cd': {
          const path = args[0] || env.home;
          if (path === '~' || path === env.home) {
            setEnv((e) => ({ ...e, cwd: e.home }));
          } else if (path === '..') {
            setEnv((e) => ({ ...e, cwd: e.home }));
          } else {
            result.output = `cd: ${path}: Directory exists (virtual)`;
          }
          break;
        }

        case 'cat': {
          const fname = args[0];
          if (fname === 'welcome.txt') {
            result.output = 'Welcome to WebAI OS!\n\nA web-based Linux desktop with 50+ AI-powered apps.';
          } else if (fname === 'README.md') {
            result.output = '# WebAI OS\n\n## Features\n- 50+ AI apps\n- WebGPU inference\n- Full window management\n- Virtual file system';
          } else {
            result.output = `cat: ${fname}: No such file`;
          }
          break;
        }

        case 'mkdir':
          if (args[0]) {
            result.output = `Created directory: ${args[0]}`;
          } else {
            result.output = 'mkdir: missing operand';
          }
          break;

        case 'touch':
          if (args[0]) {
            result.output = `Created file: ${args[0]}`;
          } else {
            result.output = 'touch: missing operand';
          }
          break;

        case 'rm':
          if (args[0]) {
            result.output = `Removed: ${args[0]}`;
          } else {
            result.output = 'rm: missing operand';
          }
          break;

        case 'history':
          result.output = history.map((h, i) => `${i + 1}  ${h.prompt}`).join('\n');
          break;

        default:
          result.output = `${cmd}: command not found. Type 'help' for available commands.`;
          result = { ...result, output: result.output };
      }

      setHistory((prev) => [
        ...prev,
        {
          prompt: `${env.user}@webai-os:${env.cwd}$ ${trimmed}`,
          output: result.output,
          isError: result.output.includes('Error') || result.output.includes('not found'),
        },
      ]);
    },
    [env, history]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(input);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] font-mono">
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-1 text-xs">
        {history.map((entry, i) => (
          <div key={i} className="space-y-0.5">
            <div className="text-[#585870]">{entry.prompt}</div>
            <pre
              className={`whitespace-pre-wrap leading-relaxed ${
                entry.isError ? 'text-[#f87171]' : 'text-[#e8e8f0]'
              }`}
            >
              {entry.output}
            </pre>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center px-3 py-2 border-t border-white/[0.06] shrink-0">
        <span className="text-[#4ade80] text-xs font-mono shrink-0">
          {env.user}@webai-os:{env.cwd}$
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-xs text-[#e8e8f0] font-mono ml-2 focus:outline-none"
          autoFocus
          spellCheck={false}
        />
      </form>
    </div>
  );
}
