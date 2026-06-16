import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { layout } from '../theme/layout';
import { spacing } from '../theme';

/** Bottom padding so scroll content clears the tab bar on tab screens. */
export function useTabScreenBottomInset(extra = spacing.sm): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const resolved = typeof tabBarHeight === 'number' ? tabBarHeight : layout.tabBarHeight;
  return resolved + extra;
}
