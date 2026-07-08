import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient } from './services/queryClient'
import { getCacheValue, setCacheValue, deleteCacheValue } from './utils/idbHelper'
import { initOfflineSync } from './services/offlineSync'
import api from './services/api'

// Define IndexedDB persister for query cache
const persister = {
  persistClient: async (client) => {
    await setCacheValue('reactQueryCache', client);
  },
  restoreClient: async () => {
    return await getCacheValue('reactQueryCache');
  },
  removeClient: async () => {
    await deleteCacheValue('reactQueryCache');
  },
};

// Initialize offline synchronization listeners
initOfflineSync(queryClient);



// Automatic service worker registration and updates
const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
if (tokenParam) {
  urlParams.delete('token');
  const newSearch = urlParams.toString();
  window.history.replaceState({}, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
  api.post('/auth/set-cookie', { token: tokenParam })
    .then(() => {
      localStorage.setItem('isLoggedIn', 'true');
      window.location.reload();
    })
    .catch((err) => {
      console.error('Failed to set cookie from URL token', err);
    });
}

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

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
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)

