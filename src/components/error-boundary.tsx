"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { captureError, addBreadcrumb } from "@/lib/sentry"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('[ErrorBoundary] Error caught:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Send error to Sentry with context
    captureError(error, {
      component: this.props.componentName || 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      reactErrorInfo: errorInfo,
    })

    // Add breadcrumb for debugging flow
    addBreadcrumb(
      `Error caught in ${this.props.componentName || 'Unknown Component'}`,
      'error',
      'error'
    )
  }

  handleRetry = () => {
    addBreadcrumb('User clicked retry after error', 'ui', 'info')
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <svg 
              className="h-8 w-8 text-red-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="mt-2 max-w-md text-center text-sm text-gray-500">
            We&apos;ve been notified and are working to fix the issue.
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-6 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
