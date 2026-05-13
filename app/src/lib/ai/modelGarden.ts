import type { ModelCard } from './types';

/**
 * Curated transformers.js-compatible models, grouped by capability.
 *
 * These are real Hugging Face ONNX ports that load in the browser via
 * `@huggingface/transformers` v4. Models marked `verified: true` have been
 * spot-tested by us; unverified entries are reasonable candidates surfaced
 * to the user — the runtime will attempt WebGPU first and fall back to wasm.
 *
 * Model verification status (HF API checked 2026-05-12):
 *   All entries below confirmed HTTP 200 with ≥1 onnx/ sibling, except where noted.
 */
export const MODEL_GARDEN: ModelCard[] = [
  // ----- Text generation (chat / instruct) -----
  {
    id: 'smollm2-360m',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings in HuggingFaceTB repo.
    hfId: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    name: 'SmolLM2 360M Instruct',
    task: 'text-generation',
    category: 'text',
    size: '~360MB · q4f16',
    description: 'Tiny instruction-tuned chat model. Fast on WebGPU, usable on CPU.',
    good_for: ['chat', 'short replies', 'rewriting', 'classification with prompt'],
    dtype: 'q4f16',
    verified: false,
    note: 'If the HuggingFaceTB repo lacks ONNX weights for your build, try the onnx-community/SmolLM2-360M-Instruct mirror in Model Garden → Add custom model.',
  },
  {
    id: 'qwen2.5-0.5b',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings.
    hfId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen2.5 0.5B Instruct',
    task: 'text-generation',
    category: 'text',
    size: '~500MB · q4f16',
    description: 'Compact instruction model with strong reasoning for its size.',
    good_for: ['chat', 'code Q&A', 'structured extraction'],
    dtype: 'q4f16',
    verified: false,
  },
  {
    id: 'llama-3.2-1b',
    // Verified 2026-05-12: onnx-community/Llama-3.2-1B-Instruct redirects (HTTP 307)
    // to onnx-community/Llama-3.2-1B-Instruct-ONNX which has 15 onnx/ siblings.
    // Updated hfId to the canonical ONNX repo to avoid the redirect at inference time.
    hfId: 'onnx-community/Llama-3.2-1B-Instruct-ONNX',
    name: 'Llama 3.2 1B Instruct',
    task: 'text-generation',
    category: 'text',
    size: '~1.2GB · q4',
    description: 'Higher quality 1B chat model. Heavier download; great on WebGPU.',
    good_for: ['chat', 'creative writing', 'long-form'],
    dtype: 'q4f16',
    verified: false,
  },

  // ----- Text-to-text / summarization / translation -----
  {
    id: 'flan-t5-small',
    // Verified 2026-05-12: HTTP 200, 32 onnx/ siblings.
    hfId: 'Xenova/flan-t5-small',
    name: 'Flan-T5 Small',
    task: 'text2text-generation',
    category: 'text',
    size: '~80MB',
    description: 'Instruction-following T5; great for rewriting & light reasoning.',
    good_for: ['rewriting', 'simple Q&A', 'paraphrasing'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'distilbart-cnn-6-6',
    // Verified 2026-05-12: HTTP 200, 32 onnx/ siblings.
    // essential flag removed: 150MB is too large to silently prewarm on cold load.
    // Users can manually load via Model Garden or enable auto-load in Settings.
    hfId: 'Xenova/distilbart-cnn-6-6',
    name: 'DistilBART CNN 6-6',
    task: 'summarization',
    category: 'text',
    size: '~150MB',
    description: 'Distilled BART fine-tuned on CNN/DailyMail summarization.',
    good_for: ['article summaries', 'TL;DR'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'opus-mt-en-multi',
    // Verified 2026-05-12: HTTP 200, 32 onnx/ siblings.
    hfId: 'Xenova/opus-mt-en-mul',
    name: 'OPUS-MT English → Many',
    task: 'translation',
    category: 'text',
    size: '~80MB',
    description: 'Translate English into many target languages.',
    good_for: ['translation from English'],
    dtype: 'q8',
    verified: false,
  },

  // ----- Classification & extraction -----
  {
    id: 'distilbert-sst2',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings.
    hfId: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    name: 'DistilBERT SST-2',
    task: 'sentiment-analysis',
    category: 'text',
    size: '~70MB',
    description: 'Binary positive/negative sentiment classifier.',
    good_for: ['sentiment', 'bias direction (rough)'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'mobilebert-mnli',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings.
    hfId: 'Xenova/mobilebert-uncased-mnli',
    name: 'MobileBERT MNLI (Zero-shot)',
    task: 'zero-shot-classification',
    category: 'text',
    size: '~100MB',
    description: 'Zero-shot text classification against custom labels.',
    good_for: ['topic tagging', 'fact-vs-opinion', 'phishing-likelihood'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'bert-ner',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings.
    hfId: 'Xenova/bert-base-NER',
    name: 'BERT base NER',
    task: 'token-classification',
    category: 'text',
    size: '~110MB',
    description: 'Named-entity recognition (PER / ORG / LOC / MISC).',
    good_for: ['entity extraction', 'redaction'],
    dtype: 'q8',
    verified: false,
  },

  // ----- Embeddings -----
  {
    id: 'minilm-l6-v2',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings. 25MB — safe to prewarm.
    hfId: 'Xenova/all-MiniLM-L6-v2',
    name: 'all-MiniLM-L6-v2',
    task: 'feature-extraction',
    category: 'embedding',
    size: '~25MB',
    description: 'Sentence embeddings. The workhorse for RAG and semantic search.',
    good_for: ['semantic search', 'RAG retrieval', 'clustering'],
    dtype: 'q8',
    verified: false,
    essential: true,
  },

  // ----- Vision -----
  {
    id: 'vit-base-classifier',
    // Verified 2026-05-12: HTTP 200, 7 onnx/ siblings.
    hfId: 'Xenova/vit-base-patch16-224',
    name: 'ViT Base Image Classifier',
    task: 'image-classification',
    category: 'vision',
    size: '~90MB',
    description: 'ImageNet-1k classification for whole-image labels.',
    good_for: ['image tags', 'visual shopping (rough)'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'vit-gpt2-captions',
    // Verified 2026-05-12: HTTP 200, 10 onnx/ siblings.
    hfId: 'Xenova/vit-gpt2-image-captioning',
    name: 'ViT-GPT2 Image Captioning',
    task: 'image-to-text',
    category: 'vision',
    size: '~250MB',
    description: 'Generate natural-language captions / alt text from images.',
    good_for: ['alt text', 'image descriptions'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'modnet-segmenter',
    // Verified 2026-05-12: HTTP 200, 7 onnx/ siblings. fp32 dtype preserved on WASM.
    hfId: 'Xenova/modnet',
    name: 'MODNet Portrait Matting',
    task: 'image-segmentation',
    category: 'vision',
    size: '~25MB',
    description: 'Portrait foreground matting (background removal for people).',
    good_for: ['background removal (portraits)'],
    dtype: 'fp32',
    verified: false,
  },
  {
    id: 'rmbg-1.4',
    // Verified 2026-05-12: HTTP 200, 4 onnx/ siblings. fp32 dtype preserved on WASM.
    hfId: 'briaai/RMBG-1.4',
    name: 'RMBG 1.4',
    task: 'image-segmentation',
    category: 'vision',
    size: '~180MB',
    description: 'General-purpose background remover (objects + people).',
    good_for: ['background removal (general)'],
    dtype: 'fp32',
    verified: false,
    note: 'License: non-commercial. Bria RMBG.',
  },
  {
    id: 'depth-anything-small',
    // Verified 2026-05-12: HTTP 200, 8 onnx/ siblings.
    hfId: 'onnx-community/depth-anything-v2-small',
    name: 'Depth Anything V2 Small',
    task: 'depth-estimation',
    category: 'vision',
    size: '~100MB',
    description: 'Monocular depth estimation; great for image effects.',
    good_for: ['depth maps', 'parallax effects'],
    dtype: 'q8',
    verified: false,
  },

  // ----- Audio -----
  {
    id: 'whisper-tiny-en',
    // Verified 2026-05-12: HTTP 200, 31 onnx/ siblings.
    hfId: 'Xenova/whisper-tiny.en',
    name: 'Whisper Tiny (English)',
    task: 'automatic-speech-recognition',
    category: 'audio',
    size: '~40MB',
    description: 'Fast English speech-to-text. Tradeoff: lower accuracy than base.',
    good_for: ['live transcription', 'short clips'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'whisper-base',
    // Verified 2026-05-12: HTTP 200, 31 onnx/ siblings.
    hfId: 'Xenova/whisper-base',
    name: 'Whisper Base (Multilingual)',
    task: 'automatic-speech-recognition',
    category: 'audio',
    size: '~140MB',
    description: 'Higher-accuracy multilingual ASR.',
    good_for: ['meeting notes', 'multilingual transcription'],
    dtype: 'q8',
    verified: false,
  },
  {
    id: 'speecht5-tts',
    // Verified 2026-05-12: HTTP 200, 40 onnx/ siblings. fp32 dtype preserved on WASM.
    hfId: 'Xenova/speecht5_tts',
    name: 'SpeechT5 TTS',
    task: 'text-to-audio',
    category: 'audio',
    size: '~150MB',
    description: 'Text-to-speech with speaker embeddings.',
    good_for: ['voice-over', 'page-to-podcast'],
    dtype: 'fp32',
    verified: false,
    pretrainedOptions: {},
  },
];

const byId = new Map(MODEL_GARDEN.map((m) => [m.id, m]));

export function getModelById(id: string): ModelCard | undefined {
  return byId.get(id);
}

export const ESSENTIAL_MODELS: ModelCard[] = MODEL_GARDEN.filter((m) => m.essential);
