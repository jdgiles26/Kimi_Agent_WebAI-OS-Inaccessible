import { describe, it, expect, beforeEach } from 'vitest';
import { putRecord, getRecord, listAll, deleteRecord, clearStore } from './db';

beforeEach(async () => {
  await clearStore('customTools');
  await clearStore('customModels');
  await clearStore('preferences');
});

describe('IndexedDB CRUD', () => {
  it('round-trips a customTool record', async () => {
    const t = {
      id: 't1',
      name: 'A',
      description: '',
      icon: 'Sparkles',
      category: 'My Tools',
      task: 'text-generation' as const,
      modelId: 'smollm2-360m',
      inputKind: 'text' as const,
      createdAt: 1,
      updatedAt: 2,
    };
    await putRecord('customTools', t);
    const got = await getRecord('customTools', 't1');
    expect(got).toMatchObject({ id: 't1', name: 'A' });
  });

  it('lists multiple records', async () => {
    await putRecord('customTools', { id: 'a', name: 'A', updatedAt: 1 } as any);
    await putRecord('customTools', { id: 'b', name: 'B', updatedAt: 2 } as any);
    const all = await listAll('customTools');
    expect(all).toHaveLength(2);
  });

  it('deletes records', async () => {
    await putRecord('preferences', { key: 'theme', value: 'dark' } as any);
    await deleteRecord('preferences', 'theme');
    expect(await getRecord('preferences', 'theme')).toBeUndefined();
  });
});
