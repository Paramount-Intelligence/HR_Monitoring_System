import { Stack } from 'expo-router';
import { AuthShell } from '../../src/auth/AuthShell';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';

export default function ManageLayout() {
  return (
    <AuthShell>
      <RoleAccessGuard>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="users" />
          <Stack.Screen name="user/[userId]" />
          <Stack.Screen name="team" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="approvals" />
          <Stack.Screen name="approval/[approvalId]" />
          <Stack.Screen name="leaves" />
          <Stack.Screen name="corrections" />
        </Stack>
      </RoleAccessGuard>
    </AuthShell>
  );
}
