import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class StallBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '28px 20px' }}>
          <h1 style={{ fontSize: 22 }}>The stall page stopped.</h1>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, minHeight: 48, padding: '0 16px', fontWeight: 700 }}>
            Open again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StallBoundary>
      <App />
    </StallBoundary>
  </React.StrictMode>,
)
