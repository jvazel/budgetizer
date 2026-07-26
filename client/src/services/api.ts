import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { addToOutbox, getOutbox, OutboxAction } from '../utils/idbHelper';

const apiBaseURL = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !apiBaseURL) {
  console.error(
    '[Budgetizer] VITE_API_URL n\'est pas défini en production. ' +
    'L\'application ne pourra pas communiquer avec l\'API. ' +
    'Veuillez configurer VITE_API_URL dans le fichier .env du client.'
  );
}

interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  skipOfflineInterceptor?: boolean;
  skipIdempotencyHeader?: boolean;
}

/**
 * Génère une clé d'idempotence unique pour identifier de manière déterministe
 * une requête write (POST/PUT/DELETE).
 * Cette clé est envoyée dans l'en-tête `Idempotency-Key` au serveur.
 */
export const generateIdempotencyKey = async (method: string, url: string, data?: unknown): Promise<string> => {
  const payloadString = data ? JSON.stringify(data) : '';
  const input = `${method}:${url}:${payloadString}`;
  
  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch {
    // Fallback : hash simple en JS pur si Web Crypto n'est pas disponible
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36) + Math.random().toString(36).slice(2, 8);
  }
};

const api = axios.create({
  baseURL: apiBaseURL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to handle offline write mutations
api.interceptors.request.use(
  async (config: ExtendedRequestConfig) => {
    const methodStr = config.method ? config.method.toLowerCase() : '';
    const isWriteMethod = ['post', 'put', 'delete'].includes(methodStr);
    
    if (!navigator.onLine && isWriteMethod && !config.skipOfflineInterceptor) {
      console.log(`[Axios Interceptor] Intercepting offline write: ${config.method?.toUpperCase()} ${config.url}`);
      
      const method = (config.method?.toUpperCase() || 'POST') as 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      // Générer la clé d'idempotence et l'ajouter à la fois à l'action (pour l'outbox)
      // et au header HTTP (pour le serveur)
      const idempotencyKey = await generateIdempotencyKey(method, config.url || '', config.data);
      const action: OutboxAction = {
        method,
        url: config.url || '',
        data: config.data,
        idempotencyKey,
      };

      let tempId: string | undefined = undefined;
      if (method === 'POST') {
        tempId = 'temp-' + Date.now() + Math.random().toString(36).substring(2, 11);
        action.tempId = tempId;
      }

      await addToOutbox(action);
      
      // Dispatch outbox count update
      const outbox = await getOutbox();
      window.dispatchEvent(new CustomEvent('outbox-updated', { detail: { count: outbox.length } }));
      
      // Construct mock response data
      const responseData = tempId 
        ? { _id: tempId, id: tempId, ...config.data }
        : config.data;
        
      // Perform optimistic cache updates
      try {
        const { queryClient } = await import('./queryClient');
        const { updateLocalCacheOffline } = await import('./offlineSync');
        updateLocalCacheOffline(queryClient, method, config.url || '', config.data, responseData);
      } catch (err) {
        console.error('Error during optimistic cache update:', err);
      }
      
      throw { isOfflineMock: true, data: responseData } satisfies OfflineMockError;
    }

    // Pour les requêtes EN LIGNE : ajouter l'en-tête Idempotency-Key
    if (isWriteMethod && !config.skipIdempotencyHeader) {
      const idempotencyKey = await generateIdempotencyKey(
        config.method?.toUpperCase() || 'POST',
        config.url || '',
        config.data
      );
      config.headers['Idempotency-Key'] = idempotencyKey;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

interface OfflineMockError {
  isOfflineMock: true;
  data: unknown;
}

const isOfflineMockError = (error: unknown): error is OfflineMockError => {
  return error !== null && typeof error === 'object' && 'isOfflineMock' in error && (error as OfflineMockError).isOfflineMock === true;
};

// Add a response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError | OfflineMockError) => {
    if (isOfflineMockError(error)) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
    }

    if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
      localStorage.removeItem('isLoggedIn');
    }
    return Promise.reject(error);
  }
);

export default api;
