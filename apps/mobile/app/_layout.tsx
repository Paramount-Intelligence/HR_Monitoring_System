import { useEffect, type ReactNode } from 'react';
import { Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore, setAppQueryClient } from '../src/auth/auth-store';
import { LoadingState } from '../src/components/ui/LoadingState';
import { RealtimeProvider } from '../src/realtime/RealtimeProvider';
import { PushNotificationProvider } from '../src/notifications/PushNotificationProvider';
import { CallOverlayProvider } from '../src/calls/CallOverlayProvider';
import { NetworkProvider } from '../src/network/NetworkProvider';
import { DeepLinkProvider } from '../src/linking/DeepLinkProvider';
import {
  createAppQueryClient,
  persistOptions,
} from '../src/query/query-client';

const queryClient = createAppQueryClient();
setAppQueryClient(queryClient);

function AuthBootstrap({ children }: { children: ReactNode }) {
  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  if (!isHydrated) {
    return <LoadingState message="Starting PIMS…" fullScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthBootstrap>
        <NetworkProvider>
          <DeepLinkProvider>
          <RealtimeProvider>
            <PushNotificationProvider>
              <CallOverlayProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="manage" />
                  <Stack.Screen name="reports" />
                  <Stack.Screen name="chat" />
                </Stack>
              </CallOverlayProvider>
            </PushNotificationProvider>
          </RealtimeProvider>
          </DeepLinkProvider>
        </NetworkProvider>
      </AuthBootstrap>
    </PersistQueryClientProvider>
  );
}
