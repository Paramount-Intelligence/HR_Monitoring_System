import { Stack } from 'expo-router';
import { AuthShell } from '../../src/auth/AuthShell';

export default function ChatLayout() {
  return (
    <AuthShell>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="[conversationId]" />
      </Stack>
    </AuthShell>
  );
}
