import { Redirect, Tabs } from 'expo-router';

import { useQuery } from '@tanstack/react-query';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../../src/auth/auth-store';

import { getUnreadNotificationCount } from '../../src/api/notifications.api';

import { getUnreadCount } from '../../src/api/messages.api';

import { queryKeys } from '../../src/constants/query-keys';

import { colors } from '../../src/constants/theme';

import { canAccessManage } from '../../src/utils/role';
import { AnimatedTabIcon } from '../../src/components/navigation/AnimatedTabIcon';

export default function TabsLayout() {

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const showManageTab = canAccessManage(user?.role);

  const insets = useSafeAreaInsets();



  const messagesUnreadQuery = useQuery({

    queryKey: queryKeys.unreadCount,

    queryFn: getUnreadCount,

    enabled: isAuthenticated,

    staleTime: 30_000,

  });



  const alertsUnreadQuery = useQuery({

    queryKey: queryKeys.notificationsUnread,

    queryFn: getUnreadNotificationCount,

    enabled: isAuthenticated,

    staleTime: 30_000,

  });



  if (!isAuthenticated) {

    return <Redirect href="/(auth)/login" />;

  }



  const messageBadge = messagesUnreadQuery.data?.unread_messages ?? 0;

  const alertBadge = alertsUnreadQuery.data ?? 0;



  return (

    <Tabs

      screenOptions={{

        headerShown: false,

        tabBarActiveTintColor: colors.tabActive,

        tabBarInactiveTintColor: colors.tabInactive,

        tabBarStyle: {

          backgroundColor: colors.card,

          borderTopColor: colors.border,

          height: 56 + insets.bottom,

          paddingBottom: Math.max(insets.bottom, 8),

          paddingTop: 8,

        },

        tabBarLabelStyle: {

          fontSize: 11,

          fontWeight: '600',

        },

      }}

    >

      <Tabs.Screen

        name="index"

        options={{

          title: 'Dashboard',

          tabBarIcon: ({ color, focused }) => (

            <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />

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

        name="notifications"

        options={{

          title: 'Alerts',

          tabBarBadge: alertBadge > 0 ? (alertBadge > 99 ? '99+' : alertBadge) : undefined,

          tabBarIcon: ({ color, focused }) => (

            <AnimatedTabIcon
              name={focused ? 'notifications' : 'notifications-outline'}
              focused={focused}
              color={color}
            />

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

        name="manage"

        options={{

          title: 'Manage',

          href: showManageTab ? undefined : null,

          tabBarIcon: ({ color, focused }) => (

            <AnimatedTabIcon
              name={focused ? 'briefcase' : 'briefcase-outline'}
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

    </Tabs>

  );

}


