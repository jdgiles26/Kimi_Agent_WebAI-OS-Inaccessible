export type AIDevice = 'webgpu' | 'wasm' | 'cpu';
export type AIDtype = 'fp32' | 'fp16' | 'q8' | 'int8' | 'uint8' | 'q4' | 'bnb4' | 'q4f16';

export type AITask =
  | 'text-generation'
  | 'text2text-generation'
  | 'summarization'
  | 'translation'
  | 'sentiment-analysis'
  | 'text-classification'
  | 'zero-shot-classification'
  | 'token-classification'
  | 'feature-extraction'
  | 'fill-mask'
  | 'question-answering'
  | 'image-classification'
  | 'image-to-text'
  | 'image-segmentation'
  | 'image-feature-extraction'
  | 'object-detection'
  | 'depth-estimation'
  | 'zero-shot-image-classification'
  | 'automatic-speech-recognition'
  | 'text-to-audio';

export interface ProgressEvent {
  status?: 'initiate' | 'download' | 'progress' | 'done' | 'ready' | 'error';
  file?: string;
  loaded?: number;
  total?: number;
  progress?: number;
  message?: string;
}

export interface ModelCard {
  id: string;
  hfId: string;
  name: string;
  task: AITask;
  category: 'text' | 'vision' | 'audio' | 'multimodal' | 'embedding';
  size: string;
  description: string;
  good_for: string[];
  device?: AIDevice;
  dtype?: AIDtype;
  pretrainedOptions?: Record<string, unknown>;
  /** Set to true once we've personally confirmed it loads in-browser. */
  verified?: boolean;
  /** Set to true if the model is bundled as one of the auto-warmed essentials. */
  essential?: boolean;
  /** Optional fine print to surface in the UI. */
  note?: string;
}

export interface LoadedModel {
  cacheKey: string;
  modelId: string;
  task: AITask;
  device: AIDevice;
  dtype: AIDtype;
  pipeline: unknown;
  loadedAt: number;
}

export interface RunOptions {
  device?: AIDevice;
  dtype?: AIDtype;
  onProgress?: (e: ProgressEvent) => void;
  /** Per-pipeline call options forwarded directly to transformers.js. */
  callOptions?: Record<string, unknown>;
  /** If set, the cached pipeline must match these device/dtype values; otherwise reload. */
  strict?: boolean;
  signal?: AbortSignal;
}
