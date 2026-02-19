import { Component } from 'react';

/**
 * React ErrorBoundary — catches JS errors anywhere in its child tree
 * and renders a visible diagnostic overlay instead of tearing down the whole app.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      // If a fallback prop is provided (e.g. null for silent failure), use it
      if (this.props.fallback !== undefined) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error)
          : this.props.fallback;
      }

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            color: '#ff6b6b',
            fontFamily: "'Share Tech Mono', monospace",
            padding: 40,
            overflow: 'auto',
          }}
        >
          <h2 style={{ color: '#ff6b35', margin: '0 0 16px' }}>⚠ Render Error</h2>
          <pre style={{ color: '#ff8888', fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <pre style={{ color: '#888', fontSize: 11, marginTop: 12, whiteSpace: 'pre-wrap' }}>
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => this.setState({ error: null, info: null })}
            style={{
              marginTop: 20,
              background: '#ff6b35',
              color: '#000',
              border: 'none',
              padding: '8px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderRadius: 4,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
