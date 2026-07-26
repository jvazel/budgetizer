import { getOutbox, removeFromOutbox, recordCompletedOperation, cleanupCompletedOperations, type OutboxAction } from '../utils/idbHelper';
import toast from 'react-hot-toast';
import { generateIdempotencyKey } from './api';
import type { QueryClient } from '@tanstack/react-query';

let isSyncing = false;

/**
 * Helper to retry transient network or server (5xx) failures with exponential backoff.
 */
const executeWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelayMs = 300
): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const status = (err as { status?: number; response?: { status?: number } })?.status ||
        (err as { response?: { status?: number } })?.response?.status;
      
      // Do not retry 4xx client errors (e.g. 400 Bad Request, 404 Not Found, 409 Conflict)
      if (status && status >= 400 && status < 500) {
        throw err;
      }
      if (attempt > maxRetries) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Offline Sync] Retrying action (attempt ${attempt}/${maxRetries}) after ${delay}ms due to network/server error.`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const updateLocalCacheOffline = (
  queryClient: QueryClient,
  method: string,
  url: string,
  requestData: unknown,
  responseData: unknown
): void => {
  const cleanUrl = url ? url.split('?')[0] : '';
  if (!cleanUrl) return;
  const parts = cleanUrl.split('/').filter(Boolean);

  if (parts.length === 0) return;

  const resource = parts[0] || '';
  const id = parts[1];

  const resourceMap: Record<string, string | undefined> = {
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
    queryClient.setQueriesData({ queryKey }, (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return [responseData, ...old];
      }
      if (old && typeof old === 'object' && Array.isArray((old as Record<string, unknown>).transactions)) {
        return { ...old, transactions: [responseData, ...(old as Record<string, unknown>).transactions as unknown[]] };
      }
      return old;
    });
  } else if (method === 'PUT' && id) {
    queryClient.setQueriesData({ queryKey }, (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((item: unknown) => {
          const itemObj = item as Record<string, unknown>;
          return (itemObj._id === id || itemObj.id === id) ? { ...itemObj, ...(requestData as Record<string, unknown>) } : item;
        });
      }
      if (old && typeof old === 'object' && Array.isArray((old as Record<string, unknown>).transactions)) {
        const oldObj = old as Record<string, unknown>;
        return {
          ...old,
          transactions: (oldObj.transactions as unknown[]).map((item: unknown) => {
            const itemObj = item as Record<string, unknown>;
            return (itemObj._id === id || itemObj.id === id) ? { ...itemObj, ...(requestData as Record<string, unknown>) } : item;
          })
        };
      }
      return old;
    });
  } else if (method === 'DELETE' && id) {
    queryClient.setQueriesData({ queryKey }, (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.filter((item: unknown) => {
          const itemObj = item as Record<string, unknown>;
          return itemObj._id !== id && itemObj.id !== id;
        });
      }
      if (old && typeof old === 'object' && Array.isArray((old as Record<string, unknown>).transactions)) {
        const oldObj = old as Record<string, unknown>;
        return {
          ...old,
          transactions: (oldObj.transactions as unknown[]).filter((item: unknown) => {
            const itemObj = item as Record<string, unknown>;
            return itemObj._id !== id && itemObj.id !== id;
          })
        };
      }
      return old;
    });
  }
};

/**
 * Handles a 409 conflict by applying server-wins strategy and notifying user.
 */
const handleConflict = async (
  action: OutboxAction,
  serverData: unknown,
  queryClient: QueryClient
): Promise<void> => {
  const cleanUrl = action.url ? action.url.split('?')[0] : '';
  if (!cleanUrl) return;
  const parts = cleanUrl.split('/').filter(Boolean);
  const resource = parts[0];
  const id = parts[1];

  if (!resource) return;

  const resourceMap: Record<string, string | undefined> = {
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
  if (id && serverData) {
    queryClient.setQueriesData({ queryKey }, (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((item: unknown) => {
          const itemObj = item as Record<string, unknown>;
          return (itemObj._id === id || itemObj.id === id) ? serverData : item;
        });
      }
      return old;
    });
  }
  toast('Conflit détecté (409) : la version du serveur a été appliquée.', { icon: '⚠️' });
};

/**
 * Processes the offline sync queue in IndexedDB.
 */
export const syncOutbox = async (queryClient: QueryClient): Promise<void> => {
  if (isSyncing) return;

  if (!navigator.onLine) return;

  const outbox = await getOutbox();
  if (outbox.length === 0) return;

  isSyncing = true;
  console.log(`[Offline Sync] Starting sync for ${outbox.length} offline operations...`);

  window.dispatchEvent(new CustomEvent('sync-status-changed', {
    detail: { status: 'syncing', count: outbox.length }
  }));

  try {
    const cleaned = await cleanupCompletedOperations();
    if (cleaned > 0) {
      console.log(`[Offline Sync] Cleaned ${cleaned} expired completed operations.`);
    }
  } catch (err) {
    console.error('[Offline Sync] Error cleaning up completed ops:', err);
  }

  const idMap = new Map<string, string>();
  const { default: api } = await import('./api');

  try {
    for (const action of outbox) {
      const { id, method, tempId } = action as OutboxAction;
      let { url, data, idempotencyKey } = action as OutboxAction;

      if (idempotencyKey) {
        const { isOperationCompleted } = await import('../utils/idbHelper');
        const alreadyDone = await isOperationCompleted(idempotencyKey);
        if (alreadyDone) {
          console.log(`[Offline Sync] Skipping completed operation: ${method} ${url} (key: ${idempotencyKey})`);
          await removeFromOutbox(id as number | string);
          const currentOutbox = await getOutbox();
          window.dispatchEvent(new CustomEvent('outbox-updated', {
            detail: { count: currentOutbox.length }
          }));
          continue;
        }
      }

      idMap.forEach((realId, tempIdKey) => {
        url = url.replace(tempIdKey, realId);
        if (data) {
          const dataStr = JSON.stringify(data).replaceAll(tempIdKey, realId);
          data = JSON.parse(dataStr);
          if (idempotencyKey && method === 'POST') {
            generateIdempotencyKey(method, url, data).then(newKey => {
              idempotencyKey = newKey;
            });
          }
        }
      });

      console.log(`[Offline Sync] Executing action: ${method} ${url}`, data);

      try {
        const res = await executeWithBackoff(() =>
          api.request({
            method: method as 'post' | 'put' | 'delete',
            url,
            data,
            headers: {
              'Idempotency-Key': idempotencyKey || '',
            },
          })
        );

        if (idempotencyKey && res.status >= 200 && res.status < 300) {
          try {
            await recordCompletedOperation(idempotencyKey, null);
          } catch (err) {
            console.error('[Offline Sync] Error recording completed operation:', err);
          }
        }

        if (method === 'POST' && tempId) {
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

        await removeFromOutbox(id as number | string);
        const currentOutbox = await getOutbox();
        window.dispatchEvent(new CustomEvent('outbox-updated', {
          detail: { count: currentOutbox.length }
        }));
      } catch (error: unknown) {
        const err = error as { status?: number; data?: unknown };
        if (err.status === 409) {
          console.warn(`[Offline Sync] Conflict detected for ${method} ${url}`, err.data);
          await handleConflict(action as OutboxAction, err.data, queryClient);
          await removeFromOutbox(id as number | string);
          const currentOutbox = await getOutbox();
          window.dispatchEvent(new CustomEvent('outbox-updated', {
            detail: { count: currentOutbox.length }
          }));
        } else {
          throw error;
        }
      }
    }

    toast.success('Synchronisation hors ligne réussie !');
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

export const initOfflineSync = (queryClient: QueryClient): void => {
  window.addEventListener('online', () => {
    syncOutbox(queryClient);
  });

  if (navigator.onLine) {
    syncOutbox(queryClient);
  }

  getOutbox().then(outbox => {
    window.dispatchEvent(new CustomEvent('outbox-updated', {
      detail: { count: outbox.length }
    }));
  });
};
