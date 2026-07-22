import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Algo salió mal</p>
          <p className="text-sm mb-4">{this.state.error.message}</p>
          <button
            className="text-primary underline text-sm"
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
