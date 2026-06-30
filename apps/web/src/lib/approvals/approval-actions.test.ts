import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ApprovalCenterItem } from '@/lib/api/approvals';
import { getAvailableActions, hasApprovalAction } from './approval-actions.ts';

function item(overrides: Partial<ApprovalCenterItem>): ApprovalCenterItem {
  return {
    id: 'item-1',
    type: 'eod',
    title: 'EOD Review',
    user_name: 'Alex',
    user_email: 'alex@example.com',
    department: 'Engineering',
    status: 'pending',
    submitted_at: '2026-06-09T10:00:00Z',
    business_date: '2026-06-09',
    description: 'Daily EOD pending review',
    action_url: '/manager/eod-reviews?date=2026-06-09',
    ...overrides,
  };
}

describe('approval center action resolution', () => {
  it('pending EOD uses backend available_actions', () => {
    const actions = getAvailableActions(
      item({ available_actions: ['review', 'approve', 'request_revision', 'reject'] }),
    );
    assert.deepEqual(actions, ['review', 'approve', 'request_revision', 'reject']);
  });

  it('approved EOD is review-only', () => {
    const actions = getAvailableActions(item({ status: 'approved', available_actions: ['review'] }));
    assert.deepEqual(actions, ['review']);
  });

  it('leave rows keep fallback direct actions when backend omits field', () => {
    const row = item({ type: 'leave', available_actions: undefined });
    assert.equal(hasApprovalAction(row, 'approve'), true);
    assert.equal(getAvailableActions(row).length, 4);
  });

  it('does not expose UUIDs in display fields', () => {
    const row = item({});
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    assert.equal(uuidPattern.test(row.title), false);
    assert.equal(uuidPattern.test(row.user_name), false);
    assert.equal(uuidPattern.test(row.description), false);
  });
});
