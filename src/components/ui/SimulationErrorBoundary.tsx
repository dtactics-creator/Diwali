import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class SimulationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected WebGL / simulation error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070612] text-amber-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#131126] border border-rose-500/40 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Simulation Rendering Notice
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              The 3D viewport encountered a rendering issue:{' '}
              <code className="text-rose-300 font-mono">
                {this.state.errorMessage}
              </code>
            </p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reload Viewport
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
