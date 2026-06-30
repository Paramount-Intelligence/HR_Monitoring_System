import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dashboardActionCardMeta,
  dashboardCardConfig,
  DashboardRole,
  getDashboardRoleConfig,
  normalizeDashboardCardKey,
} from './dashboard-card-config.ts';

const roles = Object.keys(dashboardCardConfig) as DashboardRole[];

function expectNoDuplicateDashboardCards(role: DashboardRole) {
  const config = getDashboardRoleConfig(role);
  assert.equal(new Set(config.actionCards).size, config.actionCards.length, `${role} action cards must be unique`);
  assert.equal(new Set(config.overviewCards).size, config.overviewCards.length, `${role} overview cards must be unique`);
  const actionCards = new Set(config.actionCards);
  assert.deepEqual(
    config.overviewCards.filter((card) => actionCards.has(card)),
    [],
    `${role} action and overview cards must not overlap`,
  );
}

describe('dashboard card role config', () => {
  for (const role of roles) {
    it(`${role} has no duplicate dashboard cards`, () => {
      expectNoDuplicateDashboardCards(role);
    });
  }

  it('normalizes legacy API keys to role-specific action keys', () => {
    assert.equal(normalizeDashboardCardKey('pending_eods', 'admin'), 'eod_pending_review');
    assert.equal(normalizeDashboardCardKey('pending_eods', 'manager'), 'pending_eod_reviews');
    assert.equal(normalizeDashboardCardKey('attendance_exceptions', 'manager'), 'team_attendance_exceptions');
    assert.equal(normalizeDashboardCardKey('my_eod', 'employee'), 'my_eod_pending');
    assert.equal(normalizeDashboardCardKey('my_active_timer', 'intern'), 'active_timer');
  });

  it('keeps required action card routes role-specific', () => {
    assert.equal(dashboardActionCardMeta.admin.pending_approvals?.href, '/admin/approvals');
    assert.equal(dashboardActionCardMeta.admin.eod_pending_review?.href, '/admin/eod-reviews');
    assert.equal(dashboardActionCardMeta.admin.long_running_timers?.href, '/admin/reports?tab=time-logs');
    assert.equal(dashboardActionCardMeta.manager.pending_eod_reviews?.href, '/manager/eod-reviews');
    assert.equal(dashboardActionCardMeta.manager.team_overdue_tasks?.href, '/manager/tasks?status=overdue');
    assert.equal(dashboardActionCardMeta.employee.my_eod_pending?.href, '/employee/eod');
    assert.equal(dashboardActionCardMeta.employee.active_timer?.href, '/employee/time-logs');
    assert.equal(dashboardActionCardMeta.hr.attendance_exceptions?.href, '/hr/attendance-exceptions');
    assert.equal(dashboardActionCardMeta.hr.pending_approvals?.href, '/hr/approvals');
  });

  it('uses compact chip labels for action cards', () => {
    assert.equal(dashboardActionCardMeta.admin.attendance_exceptions?.chipLabel, 'Attendance exceptions');
    assert.equal(dashboardActionCardMeta.manager.pending_eod_reviews?.chipLabel, 'EOD reviews');
    assert.equal(dashboardActionCardMeta.employee.my_eod_pending?.chipLabel, 'EOD pending');
    assert.equal(dashboardActionCardMeta.hr.pending_leave_requests?.chipLabel, 'Leave approvals');
  });

  it('employee action cards exclude announcement chip', () => {
    const config = getDashboardRoleConfig('employee');
    assert.equal(config.actionCards.includes('important_announcement'), false);
  });

  it('defines one overview KPI set per role without action overlap', () => {
    for (const role of roles) {
      const config = getDashboardRoleConfig(role);
      assert.ok(config.overviewCards.length >= 4, `${role} should have a primary KPI set`);
    }
  });
});
