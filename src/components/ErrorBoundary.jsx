import { Component } from 'react'
import { Button } from './ui/Button'

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled application error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
            !
          </div>
          <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
          <p className="max-w-sm text-sm text-text-muted">
            An unexpected error occurred. Try reloading the page — if it keeps happening, let us
            know.
          </p>
          <div className="w-40">
            <Button onClick={this.handleReload}>Reload</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
