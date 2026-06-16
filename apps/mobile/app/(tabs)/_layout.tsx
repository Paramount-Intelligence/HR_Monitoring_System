import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/auth/auth-store';
import { getUnreadCount } from '../../src/api/messages.api';
import { queryKeys } from '../../src/constants/query-keys';
import { colors, layout, shadows } from '../../src/theme';
import { AnimatedTabIcon } from '../../src/components/navigation/AnimatedTabIcon';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insets = useSafeAreaInsets();

  const messagesUnreadQuery = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  const messageBadge = messagesUnreadQuery.data?.unread_messages ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : colors.surfaceElevated,
          borderTopColor: `${colors.border}80`,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: layout.tabBarHeight + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          ...shadows.tabBar,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Inter_600SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'calendar' : 'calendar-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'folder' : 'folder-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'checkmark-done' : 'checkmark-done-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: messageBadge > 0 ? (messageBadge > 99 ? '99+' : messageBadge) : undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'person-circle' : 'person-circle-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* Legacy routes — kept for direct links, hidden from tab bar */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="manage" options={{ href: null }} />
    </Tabs>
  );
}
