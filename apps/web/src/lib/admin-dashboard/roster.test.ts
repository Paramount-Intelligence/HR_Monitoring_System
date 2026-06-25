import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  attendanceBadgeClass,
  formatLoggedHours,
  looksLikeUuid,
} from './roster.ts';

describe('admin roster display helpers', () => {
  it('maps attendance statuses to badge classes', () => {
    assert.match(attendanceBadgeClass('Present'), /emerald/);
    assert.match(attendanceBadgeClass('Late'), /amber/);
    assert.match(attendanceBadgeClass('On Leave'), /violet/);
    assert.match(attendanceBadgeClass('WFH'), /sky/);
    assert.match(attendanceBadgeClass('Absent'), /slate/);
  });

  it('formats logged hours with one decimal when needed', () => {
    assert.equal(formatLoggedHours(200), '200');
    assert.equal(formatLoggedHours(200.34), '200.3');
  });

  it('detects uuid-like strings', () => {
    assert.equal(looksLikeUuid('3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc'), true);
    assert.equal(looksLikeUuid('Present'), false);
  });
});
