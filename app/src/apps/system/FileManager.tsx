import { useState, useCallback } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronLeft,
  Home,
  Search,
  Plus,
  FolderPlus,
  Trash2,
  Grid3X3,
  List,
} from 'lucide-react';
import { useFileSystem } from '@/hooks/useFileSystem';
import type { FileNode } from '@/types/os';

export default function FileManager() {
  const fs = useFileSystem();
  const [currentFolder, setCurrentFolder] = useState<string | null>('root');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const children = fs.getChildren(currentFolder);
  const current = currentFolder ? fs.getNode(currentFolder) : null;

  const filteredChildren = search
    ? children.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : children;

  const navigateUp = useCallback(() => {
    if (current?.parentId) setCurrentFolder(current.parentId);
    else setCurrentFolder(null);
  }, [current]);

  const openItem = useCallback(
    (node: FileNode) => {
      if (node.type === 'folder') {
        setCurrentFolder(node.id);
        setSearch('');
      } else {
        setEditingFile(node.id);
        setEditContent(node.content || '');
      }
    },
    []
  );

  const saveEdit = useCallback(() => {
    if (editingFile) {
      fs.updateFile(editingFile, editContent);
      setEditingFile(null);
    }
  }, [editingFile, editContent, fs]);

  const createFolder = useCallback(() => {
    if (newFolderName.trim()) {
      fs.createFolder(newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  }, [newFolderName, currentFolder, fs]);

  const createFile = useCallback(() => {
    fs.createFile('new-file.txt', currentFolder, '');
  }, [currentFolder, fs]);

  const deleteSelected = useCallback(() => {
    selectedItems.forEach((id) => fs.deleteNode(id));
    setSelectedItems(new Set());
  }, [selectedItems, fs]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (editingFile) {
    const file = fs.getNode(editingFile);
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <span className="text-xs text-[#e8e8f0]">{file?.name}</span>
          <div className="flex gap-1">
            <button
              onClick={saveEdit}
              className="px-3 py-1 rounded-md text-[11px] font-medium"
              style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
            >
              Save
            </button>
            <button
              onClick={() => setEditingFile(null)}
              className="px-3 py-1 rounded-md text-[11px] bg-white/[0.06] text-[#9090a8] hover:text-[#e8e8f0]"
            >
              Close
            </button>
          </div>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 bg-[#0a0a0f] p-4 text-xs font-mono text-[#e8e8f0] resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
        <button onClick={navigateUp} className="p-1 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 text-[11px] text-[#9090a8] flex-1 truncate">
          <Home className="w-3 h-3" />
          <ChevronRight className="w-3 h-3" />
          <span className="truncate">{current?.name || 'Home'}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#585870]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-7 w-32 pl-7 pr-2 rounded-md bg-[#12121a] border border-white/[0.06] text-[11px] text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none"
            />
          </div>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
            {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setShowNewFolder(!showNewFolder)} className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={createFile} className="p-1.5 rounded-md text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06]">
            <Plus className="w-3.5 h-3.5" />
          </button>
          {selectedItems.size > 0 && (
            <button onClick={deleteSelected} className="p-1.5 rounded-md text-[#f87171] hover:bg-[#f87171]/10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="px-3 py-2 border-b border-white/[0.06] flex gap-2 shrink-0">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="flex-1 h-7 px-2 rounded-md bg-[#12121a] border border-white/[0.06] text-[11px] text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
          />
          <button onClick={createFolder} className="px-3 py-1 rounded-md text-[11px] font-medium" style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}>
            Create
          </button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto p-3">
        {filteredChildren.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#585870]">
            <Folder className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">Empty folder</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {filteredChildren.map((node) => (
              <button
                key={node.id}
                onClick={() => toggleSelect(node.id)}
                onDoubleClick={() => openItem(node)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all ${
                  selectedItems.has(node.id)
                    ? 'bg-[#7c6bff]/15 border border-[#7c6bff]/30'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {node.type === 'folder' ? (
                  <Folder className="w-8 h-8 text-[#fbbf24]" />
                ) : (
                  <FileText className="w-8 h-8 text-[#38bdf8]" />
                )}
                <span className="text-[10px] text-[#e8e8f0] text-center leading-tight max-w-full truncate">
                  {node.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredChildren.map((node) => (
              <button
                key={node.id}
                onClick={() => toggleSelect(node.id)}
                onDoubleClick={() => openItem(node)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                  selectedItems.has(node.id)
                    ? 'bg-[#7c6bff]/15'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                {node.type === 'folder' ? (
                  <Folder className="w-4 h-4 text-[#fbbf24] shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-[#38bdf8] shrink-0" />
                )}
                <span className="text-xs text-[#e8e8f0] flex-1">{node.name}</span>
                <span className="text-[10px] text-[#585870]">
                  {node.type === 'file' && node.size ? `${node.size} B` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] text-[10px] text-[#585870] shrink-0 flex justify-between">
        <span>{filteredChildren.length} items</span>
        <span>{selectedItems.size} selected</span>
      </div>
    </div>
  );
}
