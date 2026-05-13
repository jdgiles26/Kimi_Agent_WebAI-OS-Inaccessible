export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  component: React.ComponentType<AppComponentProps>;
  requiresWebGPU?: boolean;
}

export interface AppComponentProps {
  windowId?: string;
  data?: Record<string, unknown>;
  onNotify?: (title: string, message: string, type: Notification['type']) => void;
  webGPUStatus?: WebGPUStatus;
}

export type AppCategory =
  | 'System'
  | 'AI Research'
  | 'Vision & Media'
  | 'Writing'
  | 'Development'
  | 'Productivity'
  | 'Voice & Audio'
  | 'Privacy & Security'
  | 'Creative';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  data?: Record<string, unknown>;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  size?: number;
  mimeType?: string;
}

export interface TerminalCommand {
  name: string;
  description: string;
  handler: (args: string[], fs: FileNode[], env: EnvVars) => { output: string; fs?: FileNode[]; env?: EnvVars };
}

export interface EnvVars {
  cwd: string;
  user: string;
  home: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export interface WebGPUStatus {
  supported: boolean;
  state: 'idle' | 'loading' | 'inferencing' | 'unsupported';
  message: string;
  adapterInfo?: string;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
}
