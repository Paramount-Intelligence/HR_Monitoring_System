import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSidebarNavItems,
  isSidebarNavItemActive,
  REMOVED_SIDEBAR_TITLES,
} from './sidebar-nav';
import {
  isOrganizationNavActive,
  organizationTabHref,
  parseOrganizationTab,
} from './organization-nav';

describe('sidebar navigation consolidation', () => {
  it('admin sidebar excludes removed organization modules', () => {
    const titles = getSidebarNavItems('admin').map((item) => item.title);
    for (const removed of REMOVED_SIDEBAR_TITLES) {
      assert.equal(titles.includes(removed), false, `admin should not include ${removed}`);
    }
    assert.equal(titles.includes('Organization'), true);
  });

  it('hr sidebar excludes removed organization modules', () => {
    const titles = getSidebarNavItems('hr_operations').map((item) => item.title);
    for (const removed of REMOVED_SIDEBAR_TITLES) {
      assert.equal(titles.includes(removed), false, `hr should not include ${removed}`);
    }
    assert.equal(titles.includes('Organization'), true);
  });

  it('manager sidebar never included removed admin-only items', () => {
    const titles = getSidebarNavItems('manager').map((item) => item.title);
    for (const removed of REMOVED_SIDEBAR_TITLES) {
      assert.equal(titles.includes(removed), false);
    }
  });

  it('highlights Organization for legacy holiday and announcement routes', () => {
    assert.equal(isOrganizationNavActive('/admin/organization'), true);
    assert.equal(isOrganizationNavActive('/admin/organization?tab=holidays'), true);
    assert.equal(isOrganizationNavActive('/admin/holidays'), true);
    assert.equal(isOrganizationNavActive('/admin/announcements'), true);
    assert.equal(isOrganizationNavActive('/admin/users'), false);
  });

  it('sidebar active state uses organization grouping', () => {
    const organizationItem = getSidebarNavItems('admin').find((item) => item.title === 'Organization');
    assert.ok(organizationItem);
    assert.equal(isSidebarNavItemActive('/admin/holidays', organizationItem!), true);
    assert.equal(isSidebarNavItemActive('/admin/announcements', organizationItem!), true);
    assert.equal(isSidebarNavItemActive('/admin/permissions', organizationItem!), false);
    assert.equal(isSidebarNavItemActive('/admin/alerts', organizationItem!), false);
  });
});

describe('organization tab navigation helpers', () => {
  it('builds tab URLs for holidays and announcements', () => {
    assert.equal(organizationTabHref('holidays'), '/admin/organization?tab=holidays');
    assert.equal(organizationTabHref('announcements'), '/admin/organization?tab=announcements');
  });

  it('parses valid organization tabs from query params', () => {
    assert.equal(parseOrganizationTab('holidays'), 'holidays');
    assert.equal(parseOrganizationTab('announcements'), 'announcements');
    assert.equal(parseOrganizationTab('invalid'), null);
  });
});
