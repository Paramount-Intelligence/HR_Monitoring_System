import type { OrganizationTabId } from '@/components/admin/organization/OrganizationTabs';

export const ORGANIZATION_BASE_PATH = '/admin/organization';

const VALID_TABS: OrganizationTabId[] = ['departments', 'shifts', 'holidays', 'announcements'];

export function organizationTabHref(tab: OrganizationTabId): string {
  return `${ORGANIZATION_BASE_PATH}?tab=${tab}`;
}

export function parseOrganizationTab(value: string | null | undefined): OrganizationTabId | null {
  if (!value) return null;
  return VALID_TABS.includes(value as OrganizationTabId) ? (value as OrganizationTabId) : null;
}

/** Routes that should highlight Organization in the sidebar. */
export const ORGANIZATION_ACTIVE_PREFIXES = [
  ORGANIZATION_BASE_PATH,
  '/admin/holidays',
  '/admin/announcements',
] as const;

export function isOrganizationNavActive(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ORGANIZATION_ACTIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
