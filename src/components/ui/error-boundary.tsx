import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[cathnote]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="p-6">
        <p className="text-danger">This case could not be shown.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{this.state.error.message}</p>
        <Button className="mt-4" variant="secondary" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    )
  }
}
