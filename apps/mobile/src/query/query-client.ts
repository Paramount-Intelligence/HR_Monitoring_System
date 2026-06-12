import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { isNetworkError, isTimeoutError } from '../api/api-error';
import { shouldPersistQueryKey } from '../constants/persist-query-keys';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_WEEK_MS = ONE_DAY_MS * 7;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isNetworkError(error) || isTimeoutError(error)) {
            return failureCount < 2;
          }
          return failureCount < 1;
        },
        staleTime: 30_000,
        gcTime: ONE_DAY_MS,
        networkMode: 'offlineFirst',
        refetchOnReconnect: true,
      },
      mutations: {
        networkMode: 'online',
        retry: false,
      },
    },
  });
}

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@pims/react-query-cache',
  throttleTime: 2000,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: ONE_WEEK_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) =>
      shouldPersistQueryKey(query.queryKey),
  },
};

export async function clearPersistedQueryCache(): Promise<void> {
  await asyncStoragePersister.removeClient();
}
