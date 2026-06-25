export type ProfileSection = 'info' | 'security' | 'notifications';

export const PROFILE_NOTIFICATIONS_PATH = '/profile?section=notifications';

export function parseProfileSection(section: string | null): ProfileSection {
  if (section === 'security' || section === 'notifications') return section;
  return 'info';
}

export function profilePathForSection(section: ProfileSection): string {
  if (section === 'info') return '/profile';
  return `/profile?section=${section}`;
}
