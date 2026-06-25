import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatActiveInactive,
  formatDepartmentHead,
  formatWorkingDays,
  resolveHeadLabel,
} from './utils';

describe('formatActiveInactive', () => {
  it('returns Active for true', () => {
    assert.equal(formatActiveInactive(true), 'Active');
  });

  it('returns Inactive for false', () => {
    assert.equal(formatActiveInactive(false), 'Inactive');
  });

  it('does not expose raw boolean strings as labels', () => {
    assert.notEqual(formatActiveInactive('true'), 'true');
    assert.equal(formatActiveInactive('true'), 'Active');
  });
});

describe('resolveHeadLabel', () => {
  const users = [
    { id: 'user-1', full_name: 'Jane Manager', role: 'manager' },
    { id: 'user-2', full_name: 'John Admin', role: 'admin' },
  ];

  it('returns full name for known user id', () => {
    assert.equal(resolveHeadLabel('user-1', users), 'Jane Manager');
  });

  it('never returns raw UUID as label', () => {
    const uuid = '3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc';
    assert.equal(resolveHeadLabel(uuid, users), 'Unknown user');
    assert.notEqual(resolveHeadLabel(uuid, users), uuid);
  });

  it('uses fallback name when provided', () => {
    assert.equal(resolveHeadLabel('missing-id', users, 'Fallback Head'), 'Fallback Head');
  });

  it('returns Unassigned when no head id', () => {
    assert.equal(resolveHeadLabel(null, users), 'Unassigned');
  });
});

describe('formatDepartmentHead', () => {
  it('prefers head_name over admin_name', () => {
    assert.equal(
      formatDepartmentHead({ head_name: 'Alice', admin_name: 'Bob' }),
      'Alice'
    );
  });

  it('returns dash when no head assigned', () => {
    assert.equal(formatDepartmentHead({}), '—');
  });
});

describe('formatWorkingDays', () => {
  it('maps numeric days to weekday labels', () => {
    assert.equal(formatWorkingDays('1,2,3,4,5'), 'Mon, Tue, Wed, Thu, Fri');
  });
});
