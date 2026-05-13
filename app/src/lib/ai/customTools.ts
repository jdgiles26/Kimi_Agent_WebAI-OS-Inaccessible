import { deleteRecord, listAll, putRecord } from '@/lib/storage/db';
import type { AITask } from './types';

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name. */
  icon: string;
  /** Display category — shown under "My Tools" by default. */
  category: string;
  task: AITask;
  /** Model id from the garden or a user-added custom model id. */
  modelId: string;
  /** For text-gen / text2text tools. */
  prompt?: { system: string; userTemplate: string };
  maxTokens?: number;
  /** For zero-shot. */
  candidateLabels?: string[];
  inputKind: 'text' | 'long-text' | 'code' | 'image' | 'audio';
  /** Free-form note shown to the user. */
  modelLabel?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomModel {
  id: string;
  hfId: string;
  name: string;
  task: AITask;
  category: 'text' | 'vision' | 'audio' | 'multimodal' | 'embedding';
  size: string;
  description: string;
  dtype?: string;
  createdAt: number;
}

export async function loadCustomTools(): Promise<CustomTool[]> {
  try {
    return (await listAll<CustomTool>('customTools')).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveCustomTool(tool: CustomTool): Promise<void> {
  await putRecord('customTools', { ...tool, updatedAt: Date.now() });
}

export async function deleteCustomTool(id: string): Promise<void> {
  await deleteRecord('customTools', id);
}

export async function loadCustomModels(): Promise<CustomModel[]> {
  try {
    return (await listAll<CustomModel>('customModels')).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveCustomModel(model: CustomModel): Promise<void> {
  await putRecord('customModels', model);
}

export async function deleteCustomModel(id: string): Promise<void> {
  await deleteRecord('customModels', id);
}
