import { getOutbox, removeFromOutbox, recordCompletedOperation, cleanupCompletedOperations } from '../utils/idbHelper';
import toast from 'react-hot-toast';

let isSyncing = false;

/**
 * Updates the local react-query cache optimistically when offline
 */
export const updateLocalCacheOffline = (queryClient, method, url, requestData, responseData) => {
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  
  if (parts.length === 0) return;
  
  const resource = parts[0]; // e.g. 'transactions', 'accounts', 'budgets', 'tags', 'savings-goals', 'scheduled'
  const id = parts[1]; // e.g. '123'
  
  const resourceMap = {
    transactions: 'transactions',
    accounts: 'accounts',
    budgets: 'budgets',
    tags: 'tags',
    'savings-goals': 'savings-goals',
    scheduled: 'scheduled'
  };
  
  const queryKeyString = resourceMap[resource];
  if (!queryKeyString) return;
  
  const queryKey = [queryKeyString];
  
  if (method === 'POST') {
    queryClient.setQueriesData({ queryKey }, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return [responseData, ...old];
      }
      if (old && typeof old === 'object' && Array.isArray(old.transactions)) {
        return { ...old, transactions: [responseData, ...old.transactions] };
      }
      return old;
    });
  } else if (method === 'PUT' && id) {
    queryClient.setQueriesData({ queryKey }, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map(item => (item._id === id || item.id === id) ? { ...item, ...requestData } : item);
      }
      if (old && typeof old === 'object' && Array.isArray(old.transactions)) {
        return {
          ...old,
          transactions: old.transactions.map(item => (item._id === id || item.id === id) ? { ...item, ...requestData } : item)
        };
      }
      return old;
    });
  } else if (method === 'DELETE' && id) {
    queryClient.setQueriesData({ queryKey }, (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.filter(item => item._id !== id && item.id !== id);
      }
      if (old && typeof old === 'object' && Array.isArray(old.transactions)) {
        return {
          ...old,
          transactions: old.transactions.filter(item => item._id !== id && item.id !== id)
        };
      }
      return old;
    });
  }
};

/**
 * Processes the offline sync queue in IndexedDB.
 * 
 * Idempotency strategy :
 *  - Chaque action a une `idempotencyKey` (hash SHA-256 de method:url:body).
 *  - Avant d'exécuter l'action, on vérifie si elle est déjà dans `completed-ops`.
 *    Si oui → skip (la réponse précédente a été perdue mais le serveur a traité la req).
 *  - Après un succès API, on enregistre la clé dans `completed-ops` pour les futurs redémarrages.
 */
export const syncOutbox = async (queryClient) => {
  if (isSyncing) return;
  
  // Only sync if navigator says we are online
  if (!navigator.onLine) return;

  const outbox = await getOutbox();
  if (outbox.length === 0) return;
  
  isSyncing = true;
  console.log(`[Offline Sync] Starting sync for ${outbox.length} offline operations...`);
  
  window.dispatchEvent(new CustomEvent('sync-status-changed', { 
    detail: { status: 'syncing', count: outbox.length } 
  }));

  // Nettoyage des entrées expirées du store completed-ops
  try {
    const cleaned = await cleanupCompletedOperations();
    if (cleaned > 0) {
      console.log(`[Offline Sync] Cleaned ${cleaned} expired completed operations.`);
    }
  } catch (err) {
    console.error('[Offline Sync] Error cleaning up completed ops:', err);
  }
  
  const idMap = new Map();
  const { default: api } = await import('./api');
  
  try {
    for (const action of outbox) {
      let { id, method, url, data, tempId, idempotencyKey } = action;
      
      // Vérifier si cette opération a déjà été complétée (réponse perdue précédemment)
      if (idempotencyKey) {
        const { isOperationCompleted } = await import('../utils/idbHelper');
        const alreadyDone = await isOperationCompleted(idempotencyKey);
        if (alreadyDone) {
          console.log(`[Offline Sync] Skipping completed operation: ${method} ${url} (key: ${idempotencyKey})`);
          // La requête a déjà été traitée → on la retire simplement de l'outbox
          await removeFromOutbox(id);
          
          const currentOutbox = await getOutbox();
          window.dispatchEvent(new CustomEvent('outbox-updated', { 
            detail: { count: currentOutbox.length } 
          }));
          continue;
        }
      }

      // 1. Replace any temp IDs in the URL or payload with real database IDs
      idMap.forEach((realId, tempIdKey) => {
        url = url.replace(tempIdKey, realId);
        if (data) {
          const dataStr = JSON.stringify(data).replaceAll(tempIdKey, realId);
          data = JSON.parse(dataStr);
          
          // Recalculer la clé d'idempotence si le payload a changé
          if (idempotencyKey && method === 'POST') {
            generateNewIdempotencyKey(method, url, data).then(newKey => {
              idempotencyKey = newKey;
            });
          }
        }
      });
      
      console.log(`[Offline Sync] Executing action: ${method} ${url}`, data);
      
      // 2. Execute the actual API call (with idempotency header)
      const res = await api({
        method,
        url,
        data,
        skipOfflineInterceptor: true, // bypass offline interceptor in Axios
        headers: {
          'Idempotency-Key': idempotencyKey || '',
        },
      });
      
      // 3. Record the completed operation (protects against future lost responses)
      if (idempotencyKey && res.status >= 200 && res.status < 300) {
        try {
          await recordCompletedOperation(idempotencyKey);
        } catch (err) {
          console.error('[Offline Sync] Error recording completed operation:', err);
        }
      }

      // 4. Map temporary ID to real database ID if it was a POST request
      if (method === 'POST' && tempId) {
        // Find the database ID in the server response
        const serverData = res.data;
        const realId = serverData?._id || 
                       serverData?.id || 
                       serverData?.transaction?._id || 
                       serverData?.account?._id || 
                       serverData?.budget?._id;
                        
        if (realId) {
          idMap.set(tempId, realId);
          console.log(`[Offline Sync] Mapped temporary ID ${tempId} to real ID ${realId}`);
        }
      }
      
      // 5. Remove processed action from outbox
      await removeFromOutbox(id);
      
      // Update pending count
      const currentOutbox = await getOutbox();
      window.dispatchEvent(new CustomEvent('outbox-updated', { 
        detail: { count: currentOutbox.length } 
      }));
    }
    
    toast.success('Synchronisation hors ligne réussie !');
    
    // Invalidate queries to refresh application state from the server
    await queryClient.invalidateQueries();
    
    window.dispatchEvent(new CustomEvent('sync-status-changed', { 
      detail: { status: 'success', count: 0 } 
    }));
  } catch (error) {
    console.error('[Offline Sync] Failed to synchronize operations:', error);
    toast.error('Échec de la synchronisation en arrière-plan. Réessai ultérieur.');
    
    const remainingCount = (await getOutbox()).length;
    window.dispatchEvent(new CustomEvent('sync-status-changed', { 
      detail: { status: 'error', count: remainingCount } 
    }));
  } finally {
    isSyncing = false;
  }
};

/**
 * Génère dynamiquement une nouvelle clé d'idempotence (utilisé quand le payload change pendant le sync).
 */
const generateNewIdempotencyKey = async (method, url, data) => {
  const payloadString = data ? JSON.stringify(data) : '';
  const input = `${method}:${url}:${payloadString}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

/**
 * Initializes listeners for online/offline events
 */
export const initOfflineSync = (queryClient) => {
  window.addEventListener('online', () => {
    syncOutbox(queryClient);
  });
  
  // Initial check
  if (navigator.onLine) {
    syncOutbox(queryClient);
  }
  
  // Trigger initial UI update of count
  getOutbox().then(outbox => {
    window.dispatchEvent(new CustomEvent('outbox-updated', { 
      detail: { count: outbox.length } 
    }));
  });
};
