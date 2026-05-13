import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  /** Optional human label shown above the stack — e.g., the app's name. */
  label?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * One of these wraps each AppWindow so that a single tool crashing never
 * takes down the OS shell. The user gets a clear panel with the error and
 * a "Retry" button that resets the boundary.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[App crash] ${this.props.label ?? ''}`, error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f87171]/15 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#f87171]" />
          </div>
          <h3 className="text-sm font-semibold text-[#e8e8f0]">
            {this.props.label ?? 'This tool'} crashed
          </h3>
          <pre className="text-[10px] text-[#9090a8] bg-[#12121a] rounded p-2 max-h-40 overflow-auto text-left whitespace-pre-wrap">
            {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack.split('\n').slice(0, 8).join('\n')}` : ''}
          </pre>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded-md text-[11px] bg-[#7c6bff]/15 text-[#9b8fff] hover:bg-[#7c6bff]/25 flex items-center gap-1.5 mx-auto"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
          <p className="text-[10px] text-[#585870]">
            Other windows and the OS shell are still running.
          </p>
        </div>
      </div>
    );
  }
}
