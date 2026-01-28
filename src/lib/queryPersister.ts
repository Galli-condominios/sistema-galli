import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'galli-react-query-cache';
const CACHE_VERSION = '1.0.0';

// Keys that should NOT be persisted (sensitive or realtime data)
const EXCLUDED_QUERY_KEYS = [
  'notifications',
  'group-chat',
  'system-logs',
  'system-alerts',
  'ai-conversations',
];

// Check if a query should be persisted
const shouldPersistQuery = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey)) return true;
  
  const firstKey = queryKey[0];
  if (typeof firstKey !== 'string') return true;
  
  return !EXCLUDED_QUERY_KEYS.some(excluded => 
    firstKey.toLowerCase().includes(excluded.toLowerCase())
  );
};

// Filter out queries that shouldn't be persisted
const filterPersistedClient = (client: PersistedClient): PersistedClient => {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.filter(query => 
        shouldPersistQuery(query.queryKey)
      ),
    },
  };
};

// Create IndexedDB persister for React Query
export const createIDBPersister = (): Persister => {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const filteredClient = filterPersistedClient(client);
        await set(CACHE_KEY, {
          version: CACHE_VERSION,
          timestamp: Date.now(),
          client: filteredClient,
        });
      } catch (error) {
        console.warn('[Cache] Failed to persist:', error);
      }
    },
    
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const data = await get<{
          version: string;
          timestamp: number;
          client: PersistedClient;
        }>(CACHE_KEY);
        
        if (!data) return undefined;
        
        // Check version compatibility
        if (data.version !== CACHE_VERSION) {
          console.log('[Cache] Version mismatch, clearing cache');
          await del(CACHE_KEY);
          return undefined;
        }
        
        // Check if cache is older than 24 hours
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - data.timestamp > maxAge) {
          console.log('[Cache] Cache expired, clearing');
          await del(CACHE_KEY);
          return undefined;
        }
        
        console.log('[Cache] Restored from IndexedDB');
        return data.client;
      } catch (error) {
        console.warn('[Cache] Failed to restore:', error);
        return undefined;
      }
    },
    
    removeClient: async () => {
      try {
        await del(CACHE_KEY);
        console.log('[Cache] Cleared');
      } catch (error) {
        console.warn('[Cache] Failed to clear:', error);
      }
    },
  };
};

// Utility to clear cache manually
export const clearQueryCache = async (): Promise<void> => {
  await del(CACHE_KEY);
};

// Utility to get cache info
export const getCacheInfo = async (): Promise<{
  exists: boolean;
  timestamp?: number;
  queryCount?: number;
} | null> => {
  try {
    const data = await get<{
      version: string;
      timestamp: number;
      client: PersistedClient;
    }>(CACHE_KEY);
    
    if (!data) return { exists: false };
    
    return {
      exists: true,
      timestamp: data.timestamp,
      queryCount: data.client.clientState.queries.length,
    };
  } catch {
    return null;
  }
};
