"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded bg-zinc-900 px-4 py-2 text-white"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
