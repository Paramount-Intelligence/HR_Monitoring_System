import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { OfflineQueueItem, OfflineQueueStatus } from './offline-mutation-types';

const STORAGE_PREFIX = '@pims/offline-queue';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}/${userId}`;
}

interface OfflineQueueState {
  userId: string | null;
  items: OfflineQueueItem[];
  isSyncing: boolean;
  hydrated: boolean;
  setUserId: (userId: string | null) => Promise<void>;
  hydrate: (userId: string) => Promise<void>;
  persist: () => Promise<void>;
  addItem: (item: OfflineQueueItem) => Promise<void>;
  updateItem: (id: string, patch: Partial<OfflineQueueItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  setSyncing: (isSyncing: boolean) => void;
  clearAll: () => Promise<void>;
  getPendingCount: () => number;
  getFailedCount: () => number;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  userId: null,
  items: [],
  isSyncing: false,
  hydrated: false,

  setUserId: async (userId) => {
    set({ userId, items: [], hydrated: false });
    if (userId) {
      await get().hydrate(userId);
    }
  },

  hydrate: async (userId) => {
    try {
      const raw = await AsyncStorage.getItem(storageKey(userId));
      const items = raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
      set({ userId, items, hydrated: true });
    } catch {
      set({ userId, items: [], hydrated: true });
    }
  },

  persist: async () => {
    const { userId, items } = get();
    if (!userId) return;
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(items));
  },

  addItem: async (item) => {
    const existing = get().items.find((i) => i.dedupeKey === item.dedupeKey && i.status !== 'failed');
    if (existing) return;

    set((state) => ({ items: [...state.items, item] }));
    await get().persist();
  },

  updateItem: async (id, patch) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? ({ ...item, ...patch } as OfflineQueueItem) : item
      ),
    }));
    await get().persist();
  },

  removeItem: async (id) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    await get().persist();
  },

  setSyncing: (isSyncing) => set({ isSyncing }),

  clearAll: async () => {
    const { userId } = get();
    set({ items: [], isSyncing: false, hydrated: false });
    if (userId) {
      await AsyncStorage.removeItem(storageKey(userId));
    }
  },

  getPendingCount: () =>
    get().items.filter((i) => i.status === 'queued' || i.status === 'syncing').length,

  getFailedCount: () => get().items.filter((i) => i.status === 'failed').length,
}));

export function getOfflineQueueStore() {
  return useOfflineQueueStore.getState();
}

/** Remove all persisted offline queues (logout / auth failure). */
export async function clearAllOfflineQueueStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const queueKeys = keys.filter((key) => key.startsWith(`${STORAGE_PREFIX}/`));
    if (queueKeys.length) {
      await AsyncStorage.multiRemove(queueKeys);
    }
  } catch {
    // Non-blocking
  }
  useOfflineQueueStore.setState({
    userId: null,
    items: [],
    isSyncing: false,
    hydrated: false,
  });
}

export function countByStatus(status: OfflineQueueStatus): number {
  return useOfflineQueueStore.getState().items.filter((i) => i.status === status).length;
}
