import React from 'react';
import {createRoot} from 'react-dom/client';
import './estilos.css';
import {App} from './App';

// un error en un panel no debe dejar la ventana en blanco: se muestra y se puede seguir
class Barrera extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = {error: null as Error | null};
  static getDerivedStateFromError(error: Error) {
    return {error};
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Reel Studio]', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{padding: 32, color: '#fda4af', fontSize: 13}}>
        <h2 style={{fontSize: 16, marginBottom: 8}}>Algo falló en la interfaz</h2>
        <pre style={{whiteSpace: 'pre-wrap', color: '#a1a1aa'}}>{String(this.state.error.stack ?? this.state.error)}</pre>
        <button style={{marginTop: 12, padding: '6px 12px', background: '#0284c7', color: 'white', borderRadius: 6}} onClick={() => this.setState({error: null})}>
          Reintentar
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Barrera>
      <App />
    </Barrera>
  </React.StrictMode>,
);
