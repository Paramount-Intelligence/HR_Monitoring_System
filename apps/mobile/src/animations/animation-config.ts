import { Easing } from 'react-native';

export const ANIMATION = {
  pressScale: 0.97,
  pressDuration: 100,
  cardEntrance: 220,
  modalEntrance: 280,
  bannerSlide: 250,
  badgeTransition: 180,
  tabIconScale: 1.08,
  staggerStep: 45,
  maxStaggerItems: 8,
} as const;

export const EASING = {
  entrance: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;
