import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_DASHBOARD_USERS_TAB_PATH,
  ADMIN_USERS_LIST_PATH,
  buildAdminProfileHref,
  getProfileBackLabel,
  getSafeReturnTo,
  parseAdminDashboardTab,
  resolveProfileBackHref,
} from '@/lib/navigation/admin-profile-nav';

describe('admin profile navigation', () => {
  it('builds roster profile link with dashboard returnTo', () => {
    const href = buildAdminProfileHref('user-123', {
      returnTo: ADMIN_DASHBOARD_USERS_TAB_PATH,
    });
    const url = new URL(href, 'http://localhost');
    assert.equal(url.pathname, '/admin/users/profile');
    assert.equal(url.searchParams.get('id'), 'user-123');
    assert.equal(url.searchParams.get('returnTo'), ADMIN_DASHBOARD_USERS_TAB_PATH);
  });

  it('builds users list profile link with explicit returnTo', () => {
    const href = buildAdminProfileHref('user-456', { returnTo: ADMIN_USERS_LIST_PATH });
    const url = new URL(href, 'http://localhost');
    assert.equal(url.searchParams.get('returnTo'), ADMIN_USERS_LIST_PATH);
  });

  it('uses safe returnTo when provided', () => {
    const encoded = encodeURIComponent('/admin/dashboard?tab=users');
    assert.equal(resolveProfileBackHref(encoded), '/admin/dashboard?tab=users');
  });

  it('falls back to admin users when returnTo missing', () => {
    assert.equal(resolveProfileBackHref(null), ADMIN_USERS_LIST_PATH);
  });

  it('rejects external returnTo values', () => {
    assert.equal(getSafeReturnTo('https://evil.example'), null);
    assert.equal(getSafeReturnTo('//evil.example'), null);
    assert.equal(getSafeReturnTo('javascript:alert(1)'), null);
    assert.equal(getSafeReturnTo('/employee/dashboard'), null);
  });

  it('labels dashboard and users back destinations', () => {
    assert.equal(getProfileBackLabel('/admin/dashboard?tab=users'), 'Back to Dashboard');
    assert.equal(getProfileBackLabel('/admin/users'), 'Back to Users');
    assert.equal(getProfileBackLabel('/admin/alerts'), 'Back');
  });

  it('parses dashboard tab query including user-management alias', () => {
    assert.equal(parseAdminDashboardTab('user-management'), 'users');
    assert.equal(parseAdminDashboardTab('users'), 'users');
    assert.equal(parseAdminDashboardTab('communication'), 'communication');
    assert.equal(parseAdminDashboardTab('invalid'), 'overview');
    assert.equal(parseAdminDashboardTab(null), 'overview');
  });
});
