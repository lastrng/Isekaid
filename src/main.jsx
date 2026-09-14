import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './product-ui.css';

class StartupErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[Isekai’d] erreur de démarrage', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <main style={{ minHeight: '100dvh', boxSizing: 'border-box', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#FDFBF7', color: '#1C1410', fontFamily: 'system-ui, sans-serif' }}><h1 style={{ fontSize: 22, margin: '0 0 12px' }}>Isekai’d n’a pas pu démarrer</h1><p style={{ lineHeight: 1.5, color: '#6F625B' }}>Une erreur est survenue au lancement. Ferme puis rouvre l’application. Si le problème persiste, transmets ce message :</p><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 12, borderRadius: 10, background: '#F1EDE7', fontSize: 12 }}>{String(this.state.error?.message || this.state.error)}</pre><button onClick={() => window.location.reload()} style={{ marginTop: 18, padding: 13, border: 0, borderRadius: 999, background: '#C9463D', color: '#fff', fontWeight: 700 }}>Recharger</button></main>;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StartupErrorBoundary><App /></StartupErrorBoundary>
  </StrictMode>
);
