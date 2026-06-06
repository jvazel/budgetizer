import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Listen to global business events to invalidate React Query cache
window.addEventListener('transaction-changed', () => {
  queryClient.invalidateQueries();
});

// Automatic service worker registration and updates
const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
if (tokenParam) {
  localStorage.setItem('token', tokenParam);
  urlParams.delete('token');
  const newSearch = urlParams.toString();
  window.history.replaceState({}, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
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
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)

