import type { AITask } from './types';

/**
 * Per-built-in-app mapping: which transformers.js task + model the tool uses,
 * plus a prompt strategy for instruct/text-gen-driven tools and a description
 * of what raw input the tool feeds the pipeline.
 */
export interface ToolPlan {
  task: AITask;
  /** Default model id from the garden. */
  modelId: string;
  /** For text-generation tools, a chat-style system+user shape. */
  prompt?: {
    system: string;
    /** `{input}` is replaced with user text. */
    userTemplate: string;
  };
  /** Maximum new tokens for generation. */
  maxTokens?: number;
  /** Free-form note shown in the UI ("uses Whisper tiny", etc.). */
  modelLabel?: string;
  /** What kind of input the user provides — used for UI hints. */
  inputKind?: 'text' | 'long-text' | 'code' | 'image' | 'audio';
  /** For zero-shot, the candidate labels. */
  candidateLabels?: string[];
  /** For translation, default src/tgt language codes (Helsinki opus-mt format). */
  translation?: { src_lang?: string; tgt_lang?: string };
  /** When true, the tool is honest about needing a backend. */
  serverOnly?: boolean;
  /** Notes for the UI when serverOnly. */
  serverOnlyReason?: string;
}

export const TOOL_PLANS: Record<string, ToolPlan> = {
  // ===== AI Research =====
  chatrag: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: {
      system:
        'You are a research assistant. Use the provided context if present; if context is empty, answer from general knowledge. Be concise.',
      userTemplate: '{input}',
    },
    maxTokens: 256,
    modelLabel: 'SmolLM2-360M + MiniLM embeddings for RAG',
    inputKind: 'text',
  },
  synthesizer: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: {
      system: 'You merge multiple notes into a single synthesized summary. Group by theme, cite source numbers.',
      userTemplate: 'Documents (one per line, numbered):\n{input}\n\nWrite a synthesized summary.',
    },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'long-text',
  },
  tldr: {
    task: 'summarization',
    modelId: 'distilbart-cnn-6-6',
    modelLabel: 'DistilBART CNN 6-6 (summarization)',
    inputKind: 'long-text',
  },
  factchecker: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['factual claim', 'opinion', 'misleading', 'unverifiable'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'text',
  },
  biasdetector: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['neutral', 'left-leaning', 'right-leaning', 'sensationalist', 'opinion piece'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'long-text',
  },
  glossary: {
    task: 'token-classification',
    modelId: 'bert-ner',
    modelLabel: 'BERT-base NER (terms & entities)',
    inputKind: 'long-text',
  },
  citation: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: {
      system: '',
      userTemplate: 'Format the following source as a clean APA citation: {input}',
    },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'text',
  },
  compmatrix: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: {
      system: 'You build comparison tables. Output markdown tables. No prose.',
      userTemplate: 'Compare:\n{input}',
    },
    maxTokens: 384,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'long-text',
  },

  // ===== Vision & Media =====
  sketch2photo: {
    task: 'image-to-text',
    modelId: 'vit-gpt2-captions',
    modelLabel: 'ViT-GPT2 captioning (describes sketch; in-browser diffusion not yet wired)',
    inputKind: 'image',
    serverOnly: false,
    serverOnlyReason: 'In-browser diffusion is not yet supported by transformers.js; this returns a caption of the sketch instead.',
  },
  uitocode: {
    task: 'image-to-text',
    modelId: 'vit-gpt2-captions',
    modelLabel: 'ViT-GPT2 captioning (UI description → use with Code Explainer for code generation)',
    inputKind: 'image',
  },
  upscaler: {
    task: 'image-classification',
    modelId: 'vit-base-classifier',
    modelLabel: 'ViT classifier (preview; super-resolution model coming)',
    inputKind: 'image',
    serverOnly: false,
    serverOnlyReason: 'Pure-WebGPU SR (e.g. Real-ESRGAN) is large; this build classifies the image instead.',
  },
  bgremover: {
    task: 'image-segmentation',
    modelId: 'modnet-segmenter',
    modelLabel: 'MODNet (portrait background removal)',
    inputKind: 'image',
  },
  alttext: {
    task: 'image-to-text',
    modelId: 'vit-gpt2-captions',
    modelLabel: 'ViT-GPT2 captioning',
    inputKind: 'image',
  },
  colorextract: {
    task: 'image-classification',
    modelId: 'vit-base-classifier',
    modelLabel: 'ViT classifier (image tags); palette extraction runs locally without a model',
    inputKind: 'image',
  },
  ytsummarizer: {
    task: 'summarization',
    modelId: 'distilbart-cnn-6-6',
    modelLabel: 'DistilBART (summarizes transcript text you paste)',
    inputKind: 'long-text',
  },
  visualshopper: {
    task: 'image-classification',
    modelId: 'vit-base-classifier',
    modelLabel: 'ViT image classifier (object tags)',
    inputKind: 'image',
  },
  memegen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: {
      system: 'You write top-text / bottom-text meme captions. Two lines, no quotes.',
      userTemplate: 'Topic: {input}\n\nMeme caption:',
    },
    maxTokens: 60,
    modelLabel: 'SmolLM2-360M (caption text only)',
    inputKind: 'text',
  },

  // ===== Writing =====
  smartreply: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Draft a concise, friendly reply.', userTemplate: 'Original message:\n{input}\n\nReply:' },
    maxTokens: 160,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },
  toneshifter: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: { system: '', userTemplate: 'Rewrite the following in a friendly, professional tone: {input}' },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'text',
  },
  formfiller: {
    task: 'token-classification',
    modelId: 'bert-ner',
    modelLabel: 'BERT-NER (extracts fields from pasted context)',
    inputKind: 'long-text',
  },
  seooptimizer: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'You are an SEO editor. Suggest keyword improvements as a bulleted list.', userTemplate: '{input}' },
    maxTokens: 240,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'long-text',
  },
  threadmaker: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Convert an article into a numbered 6-tweet thread. Each line ≤ 240 chars.', userTemplate: '{input}' },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'long-text',
  },
  promptupgrader: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Improve prompts to be specific, scoped, and outcome-oriented.', userTemplate: 'Improve this prompt: {input}' },
    maxTokens: 200,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },
  translator: {
    task: 'translation',
    modelId: 'opus-mt-en-multi',
    translation: { src_lang: 'en', tgt_lang: 'fr' },
    modelLabel: 'OPUS-MT en→multi',
    inputKind: 'text',
  },
  storygen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'You are a creative fiction writer. Vivid imagery; 3 paragraphs.', userTemplate: 'Write a short story about: {input}' },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },

  // ===== Development =====
  codeexplainer: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'You explain code in plain English. Be precise.', userTemplate: 'Explain this code:\n\n{input}' },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'code',
  },
  bughunter: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'You audit code for bugs and security issues. Output a bulleted list with file:line if known.', userTemplate: '{input}' },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'code',
  },
  regexbuilder: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: { system: '', userTemplate: 'Write a regex (ECMAScript flavor) that matches: {input}' },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'text',
  },
  apiguru: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Generate curl and fetch examples for the described endpoint.', userTemplate: '{input}' },
    maxTokens: 240,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },
  css2tailwind: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: { system: '', userTemplate: 'Convert this CSS to Tailwind utility classes: {input}' },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'code',
  },
  consolesolver: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Diagnose JS/TS console errors. Likely cause + a fix.', userTemplate: '{input}' },
    maxTokens: 240,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'code',
  },
  querygen: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: { system: '', userTemplate: 'Write a SQL query for: {input}' },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'text',
  },
  codereviewer: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Review code: list issues, suggestions, and questions.', userTemplate: '{input}' },
    maxTokens: 384,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'code',
  },

  // ===== Productivity =====
  schedulex: {
    task: 'token-classification',
    modelId: 'bert-ner',
    modelLabel: 'BERT-NER (date/time/location entities)',
    inputKind: 'long-text',
  },
  equationsolver: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    prompt: { system: '', userTemplate: 'Solve step by step: {input}' },
    modelLabel: 'Flan-T5 Small',
    inputKind: 'text',
  },
  pricetracker: {
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    serverOnly: true,
    serverOnlyReason: 'Live price tracking requires periodic scraping outside the browser.',
    inputKind: 'text',
    modelLabel: 'Offline demo only',
  },
  taborganizer: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['work', 'shopping', 'learning', 'social', 'news', 'reference'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'long-text',
  },
  webscraper: {
    task: 'token-classification',
    modelId: 'bert-ner',
    modelLabel: 'BERT-NER (extracts entities from pasted HTML/text)',
    inputKind: 'long-text',
  },
  receiptparser: {
    task: 'token-classification',
    modelId: 'bert-ner',
    modelLabel: 'BERT-NER (extracts amounts, dates, vendors from pasted text)',
    inputKind: 'long-text',
  },
  subscanner: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['subscription', 'one-time purchase', 'refund', 'transfer'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'long-text',
  },
  meetingsum: {
    task: 'summarization',
    modelId: 'distilbart-cnn-6-6',
    modelLabel: 'DistilBART CNN 6-6',
    inputKind: 'long-text',
  },

  // ===== Voice & Audio =====
  page2podcast: {
    task: 'text-to-audio',
    modelId: 'speecht5-tts',
    modelLabel: 'SpeechT5 TTS',
    inputKind: 'long-text',
  },
  voicenav: {
    task: 'automatic-speech-recognition',
    modelId: 'whisper-tiny-en',
    modelLabel: 'Whisper Tiny.en',
    inputKind: 'audio',
  },
  transcriber: {
    task: 'automatic-speech-recognition',
    modelId: 'whisper-base',
    modelLabel: 'Whisper Base (multilingual)',
    inputKind: 'audio',
  },
  meetingnotes: {
    task: 'automatic-speech-recognition',
    modelId: 'whisper-base',
    modelLabel: 'Whisper Base + DistilBART summary',
    inputKind: 'audio',
  },
  tts: {
    task: 'text-to-audio',
    modelId: 'speecht5-tts',
    modelLabel: 'SpeechT5 TTS',
    inputKind: 'text',
  },

  // ===== Privacy & Security =====
  phishshield: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['legitimate page', 'phishing attempt', 'spam', 'low-quality'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'long-text',
  },
  cookiedeny: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['essential', 'analytics', 'advertising', 'tracking'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'text',
  },
  tosanalyzer: {
    task: 'summarization',
    modelId: 'distilbart-cnn-6-6',
    modelLabel: 'DistilBART CNN (summarize TOS sections)',
    inputKind: 'long-text',
  },
  trackerblock: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['tracker', 'analytics', 'cdn', 'legitimate'],
    modelLabel: 'MobileBERT MNLI zero-shot',
    inputKind: 'text',
  },
  passanalyzer: {
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    candidateLabels: ['weak password', 'medium password', 'strong password'],
    modelLabel: 'MobileBERT MNLI zero-shot (plus entropy check)',
    inputKind: 'text',
  },

  // ===== Creative =====
  musicgen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Describe an ambient music piece (mood, instruments, tempo).', userTemplate: '{input}' },
    maxTokens: 200,
    modelLabel: 'SmolLM2-360M (text only; in-browser MusicGen ONNX not yet wired)',
    inputKind: 'text',
  },
  logogen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Describe 3 distinct logo concepts as text briefs.', userTemplate: '{input}' },
    maxTokens: 280,
    modelLabel: 'SmolLM2-360M (concept briefs; rasterized logo coming)',
    inputKind: 'text',
  },
  poemgen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Write evocative poems.', userTemplate: '{input}' },
    maxTokens: 240,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },
  resumebuilder: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'You write resume bullet points using strong action verbs and quantification.', userTemplate: '{input}' },
    maxTokens: 360,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'long-text',
  },
  mindmapgen: {
    task: 'text-generation',
    modelId: 'smollm2-360m',
    prompt: { system: 'Output a hierarchical mind map as a nested bulleted list.', userTemplate: 'Topic: {input}' },
    maxTokens: 320,
    modelLabel: 'SmolLM2-360M',
    inputKind: 'text',
  },
};

export function getPlanForApp(appId: string): ToolPlan | undefined {
  return TOOL_PLANS[appId];
}
