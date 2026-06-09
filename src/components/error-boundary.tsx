import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-background text-foreground flex min-h-svh items-center justify-center px-5">
          <div className="border-border max-w-md rounded-xl border p-5">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {this.state.error.message}
            </p>
            <button
              type="button"
              className="bg-primary text-primary-foreground mt-4 rounded-md px-3 py-2 text-sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
