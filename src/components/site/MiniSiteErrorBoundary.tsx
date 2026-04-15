'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class MiniSiteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('MiniSiteErrorBoundary', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <p style={{ fontSize: 40, margin: '0 0 10px' }}>⚠️</p>
            <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Temporary loading issue</p>
            <p style={{ opacity: 0.75, margin: '0 0 16px' }}>Refresh the page to recover this mini-site view.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ border: 'none', borderRadius: 10, padding: '10px 16px', background: '#818cf8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
