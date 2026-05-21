import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Automatic service worker registration and updates
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      console.log('Nouvelle version disponible, mise à jour en cours...');
    },
    onOfflineReady() {
      console.log('L\'application est prête à fonctionner hors ligne.');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

