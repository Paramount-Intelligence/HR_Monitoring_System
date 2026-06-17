import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabScreenBottomInset } from '../../hooks/useTabScreenBottomInset';
import { colors, spacing } from '../../constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Tab screens: omit bottom safe-area inset; use hook on inner ScrollView padding instead. */
  withTabBarInset?: boolean;
  /**
   * When true, top safe-area is handled by BrandHeader/DashboardHeader/ManageScreenHeader.
   * Prevents double top inset (blank space above the header).
   */
  headerSafeArea?: boolean;
}

export function Screen({
  children,
  scroll = true,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
  withTabBarInset = false,
  headerSafeArea = false,
}: ScreenProps) {
  const tabInset = useTabScreenBottomInset();
  let safeEdges = withTabBarInset
    ? (edges.filter((edge) => edge !== 'bottom') as ScreenProps['edges'])
    : edges;
  if (headerSafeArea) {
    safeEdges = safeEdges?.filter((edge) => edge !== 'top') as ScreenProps['edges'];
  }

  const bottomPadding = scroll
    ? withTabBarInset
      ? tabInset
      : spacing.lg
    : 0;

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={safeEdges}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
  },
});
