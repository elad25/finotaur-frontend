import React from 'react';

type State = { hasError: boolean };
export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) return <div role="alert">Something went wrong. Try reloading.</div>;
    return this.props.children;
  }
}
