const DB_NAME = 'budgetizer-offline-db';
const DB_VERSION = 2; // Version incrémentée pour ajouter l'object store completed-operations
const STORES = {
  QUERY_CACHE: 'query-cache',
  SYNC_OUTBOX: 'sync-outbox',
  COMPLETED_OPS: 'completed-ops',
};

// Silence IndexedDB errors in test environment
const logError = (...args) => {
  if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
    console.error(...args);
  }
};

const getDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported or defined in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Créer les stores s'ils n'existent pas
      if (!db.objectStoreNames.contains(STORES.QUERY_CACHE)) {
        db.createObjectStore(STORES.QUERY_CACHE);
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORES.SYNC_OUTBOX, { keyPath: 'id', autoIncrement: true });
        // Index sur idempotencyKey pour la recherche rapide lors du sync
        if (!outboxStore.indexNames.contains('byIdempotencyKey')) {
          outboxStore.createIndex('byIdempotencyKey', 'idempotencyKey', { unique: false });
        }
      }
      // Nouveau store : opérations complétées (réponses perdues)
      if (!db.objectStoreNames.contains(STORES.COMPLETED_OPS)) {
        const completedStore = db.createObjectStore(STORES.COMPLETED_OPS, { keyPath: 'idempotencyKey' });
        completedStore.createIndex('userId', 'userId', { unique: false });
        completedStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

export const getCacheValue = async (key) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.QUERY_CACHE, 'readonly');
      const store = transaction.objectStore(STORES.QUERY_CACHE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error getting cache value from IDB:', error);
    return undefined;
  }
};

export const setCacheValue = async (key, value) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.QUERY_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.QUERY_CACHE);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error setting cache value in IDB:', error);
  }
};

export const deleteCacheValue = async (key) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.QUERY_CACHE, 'readwrite');
      const store = transaction.objectStore(STORES.QUERY_CACHE);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error deleting cache value from IDB:', error);
  }
};

// --- Hashing pour les clés d'idempotence ------------------------------------

/**
 * Génère une clé d'idempotence à partir de la méthode, l'URL et le payload.
 * Utilise SubtleCrypto (Web Crypto API) pour un hash SHA-256.
 */
export const generateIdempotencyKey = async (method, url, data) => {
  const payloadString = data ? JSON.stringify(data) : '';
  const input = `${method}:${url}:${payloadString}`;
  
  // Générer un hash SHA-256 en hexadécimal
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

// --- Outbox helpers ----------------------------------------------------------

export const getOutbox = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_OUTBOX, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_OUTBOX);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error getting outbox from IDB:', error);
    return [];
  }
};

export const addToOutbox = async (action) => {
  try {
    // Générer une clé d'idempotence unique pour cette opération
    const idempotencyKey = await generateIdempotencyKey(
      action.method,
      action.url,
      action.data
    );

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_OUTBOX, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_OUTBOX);
      const item = { 
        ...action, 
        timestamp: Date.now(),
        idempotencyKey,
      };
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        // Duplicate key → already in outbox (same operation added twice)
        reject(e.target.error);
      };
    });
  } catch (error) {
    logError('Error adding to outbox in IDB:', error);
  }
};

export const removeFromOutbox = async (id) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_OUTBOX, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_OUTBOX);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error removing from outbox in IDB:', error);
  }
};

export const clearOutbox = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_OUTBOX, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_OUTBOX);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error clearing outbox in IDB:', error);
  }
};

// --- Completed operations tracking -------------------------------------------

/**
 * Enregistre une opération dont la réponse a été perdue mais qui a réussi côté serveur.
 * Permet de reconnaître les doublons lors des prochains syncs et de ne pas rejouer l'opération.
 */
export const recordCompletedOperation = async (idempotencyKey, userId) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.COMPLETED_OPS, 'readwrite');
      const store = transaction.objectStore(STORES.COMPLETED_OPS);
      // Expire après 24h (suffisant pour couvrir la fenêtre de sync hors-ligne)
      const entry = {
        idempotencyKey,
        userId: userId || null,
        recordedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
      };
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error recording completed operation in IDB:', error);
  }
};

/**
 * Vérifie si une opération avec cette clé d'idempotence a déjà été complétée.
 */
export const isOperationCompleted = async (idempotencyKey) => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.COMPLETED_OPS, 'readonly');
      const store = transaction.objectStore(STORES.COMPLETED_OPS);
      const request = store.get(idempotencyKey);
      request.onsuccess = () => {
        const entry = request.result;
        // Vérifier que l'entrée n'est pas expirée
        resolve(entry && entry.expiresAt > Date.now());
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error checking completed operation in IDB:', error);
    return false;
  }
};

/**
 * Nettoyage des entrées expirées du store completed-ops.
 * À appeler périodiquement ou lors du sync.
 */
export const cleanupCompletedOperations = async () => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.COMPLETED_OPS, 'readwrite');
      const store = transaction.objectStore(STORES.COMPLETED_OPS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result || [];
        const now = Date.now();
        let deletedCount = 0;
        
        for (const entry of entries) {
          if (entry.expiresAt < now) {
            store.delete(entry.idempotencyKey);
            deletedCount++;
          }
        }
        
        resolve(deletedCount);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logError('Error cleaning up completed operations in IDB:', error);
    return 0;
  }
};
