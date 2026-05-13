/**
 * Tiny IndexedDB wrapper for WebAI OS user data:
 *   - customTools : user-built mini-apps (saved tool blueprints)
 *   - customModels: extra HF model entries added by the user
 *   - preferences : key/value preferences (theme, autoLoad, etc.)
 *   - runHistory  : last N inputs/outputs per tool (optional, capped)
 *
 * No external dependency — IndexedDB only.
 */
const DB_NAME = 'webai-os';
const DB_VERSION = 1;

export type StoreName = 'customTools' | 'customModels' | 'preferences' | 'runHistory';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('customTools')) {
        const s = db.createObjectStore('customTools', { keyPath: 'id' });
        s.createIndex('byUpdated', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('customModels')) {
        db.createObjectStore('customModels', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('runHistory')) {
        const s = db.createObjectStore('runHistory', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byTool', 'toolId');
        s.createIndex('byCreated', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    Promise.resolve(fn(s))
      .then((res) => {
        t.oncomplete = () => resolve(res);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
      .catch((err) => {
        try {
          t.abort();
        } catch {
          /* ignore */
        }
        reject(err);
      });
  });
}

function wrapReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putRecord<T extends object>(
  store: StoreName,
  value: T,
): Promise<void> {
  await tx(store, 'readwrite', (s) => wrapReq(s.put(value)));
}

export async function getRecord<T = unknown>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', (s) => wrapReq(s.get(key)) as Promise<T | undefined>);
}

export async function deleteRecord(store: StoreName, key: IDBValidKey): Promise<void> {
  await tx(store, 'readwrite', (s) => wrapReq(s.delete(key)));
}

export async function listAll<T = unknown>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => wrapReq(s.getAll()) as Promise<T[]>);
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, 'readwrite', (s) => wrapReq(s.clear()));
}
