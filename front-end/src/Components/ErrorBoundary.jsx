import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="cl-pd-gate" role="alert">
          <h1>Something went wrong</h1>
          <p>Please refresh the page and try again.</p>
          <button type="button" className="cl-pd-btn cl-pd-btn--primary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
