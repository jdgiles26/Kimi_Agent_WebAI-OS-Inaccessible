import { useState, useCallback } from 'react';
import type { FileNode } from '@/types/os';

const FS_KEY = 'webai-fs';

function loadFS(): FileNode[] {
  try {
    const data = localStorage.getItem(FS_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // Malformed storage — fall through to defaults.
  }
  return getDefaultFS();
}

function getDefaultFS(): FileNode[] {
  const rootId = 'root';
  const docsId = 'folder-docs';
  const downloadsId = 'folder-downloads';
  const now = Date.now();

  return [
    { id: rootId, name: 'Home', type: 'folder', parentId: null, createdAt: now, updatedAt: now },
    { id: docsId, name: 'Documents', type: 'folder', parentId: rootId, createdAt: now, updatedAt: now },
    { id: downloadsId, name: 'Downloads', type: 'folder', parentId: rootId, createdAt: now, updatedAt: now },
    {
      id: 'file-welcome', name: 'welcome.txt', type: 'file',
      content: 'Welcome to WebAI OS!\n\nThis is a web-based Linux desktop environment with 50+ AI-powered applications running entirely in your browser using WebGPU.\n\nExplore the Start Menu to discover apps for:\n- AI Research & Analysis\n- Vision & Media Generation\n- Writing & Content Creation\n- Development & Debugging\n- Productivity & Automation\n- Voice & Audio\n- Privacy & Security\n- Creative Tools\n\nAll AI inference happens locally — your data never leaves your device.',
      parentId: docsId, createdAt: now, updatedAt: now, size: 512, mimeType: 'text/plain',
    },
    {
      id: 'file-readme', name: 'README.md', type: 'file',
      content: '# WebAI OS\n\n## Features\n- 50+ AI-powered applications\n- WebGPU-accelerated inference\n- Full window management\n- Virtual file system\n- Terminal with 20+ commands\n- Web browser with AI features\n\n## Getting Started\n1. Open the Start Menu (Super key or click the logo)\n2. Browse app categories\n3. Launch any app by clicking it\n4. Use the terminal for advanced operations\n',
      parentId: rootId, createdAt: now, updatedAt: now, size: 256, mimeType: 'text/markdown',
    },
    {
      id: 'file-notes', name: 'quick-notes.txt', type: 'file',
      content: 'Quick Notes:\n- Try Chat with Page to ask questions about any webpage\n- Use Image Upscaler to enhance photos\n- Code Explainer breaks down any code snippet\n- Page to Podcast converts articles to audio\n\nTip: All AI runs locally via WebGPU — no data sent to servers!',
      parentId: docsId, createdAt: now, updatedAt: now, size: 180, mimeType: 'text/plain',
    },
  ];
}

function saveFS(nodes: FileNode[]) {
  localStorage.setItem(FS_KEY, JSON.stringify(nodes));
}

export function useFileSystem() {
  const [files, setFiles] = useState<FileNode[]>(loadFS);

  const persist = useCallback((updater: (prev: FileNode[]) => FileNode[]) => {
    setFiles((prev) => {
      const next = updater(prev);
      saveFS(next);
      return next;
    });
  }, []);

  const getChildren = useCallback(
    (parentId: string | null) => {
      return files.filter((f) => f.parentId === parentId);
    },
    [files]
  );

  const getNode = useCallback(
    (id: string) => files.find((f) => f.id === id),
    [files]
  );

  const createFolder = useCallback(
    (name: string, parentId: string | null) => {
      persist((prev) => [
        ...prev,
        {
          id: `folder-${Date.now()}`,
          name,
          type: 'folder',
          parentId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
    },
    [persist]
  );

  const createFile = useCallback(
    (name: string, parentId: string | null, content = '') => {
      persist((prev) => [
        ...prev,
        {
          id: `file-${Date.now()}`,
          name,
          type: 'file',
          content,
          parentId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          size: content.length,
          mimeType: 'text/plain',
        },
      ]);
    },
    [persist]
  );

  const updateFile = useCallback(
    (id: string, content: string) => {
      persist((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, content, updatedAt: Date.now(), size: content.length }
            : f
        )
      );
    },
    [persist]
  );

  const renameNode = useCallback(
    (id: string, newName: string) => {
      persist((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f
        )
      );
    },
    [persist]
  );

  const deleteNode = useCallback(
    (id: string) => {
      persist((prev) => {
        const toDelete = new Set<string>();
        const collect = (nodeId: string) => {
          toDelete.add(nodeId);
          prev
            .filter((f) => f.parentId === nodeId)
            .forEach((f) => collect(f.id));
        };
        collect(id);
        return prev.filter((f) => !toDelete.has(f.id));
      });
    },
    [persist]
  );

  const moveNode = useCallback(
    (id: string, newParentId: string | null) => {
      persist((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, parentId: newParentId, updatedAt: Date.now() } : f
        )
      );
    },
    [persist]
  );

  const searchFiles = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      return files.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.content && f.content.toLowerCase().includes(q))
      );
    },
    [files]
  );

  const getPath = useCallback(
    (nodeId: string): string => {
      const parts: string[] = [];
      let current = files.find((f) => f.id === nodeId);
      while (current) {
        parts.unshift(current.name);
        current = current.parentId
          ? files.find((f) => f.id === current!.parentId)
          : undefined;
      }
      return parts.join('/') || '/';
    },
    [files]
  );

  return {
    files,
    getChildren,
    getNode,
    createFolder,
    createFile,
    updateFile,
    renameNode,
    deleteNode,
    moveNode,
    searchFiles,
    getPath,
  };
}
