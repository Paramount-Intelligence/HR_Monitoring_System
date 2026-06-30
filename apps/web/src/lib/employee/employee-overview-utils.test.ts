import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttendanceCheckInLabel } from './employee-overview-utils.ts';

describe('employee overview attendance label', () => {
  it('shows checked in when attendance is active', () => {
    assert.equal(getAttendanceCheckInLabel('active'), 'Checked in');
  });

  it('shows not checked in when attendance is inactive', () => {
    assert.equal(getAttendanceCheckInLabel('not_checked_in'), 'Not checked in');
  });

  it('shows not checked in when attendance data is missing', () => {
    assert.equal(getAttendanceCheckInLabel(undefined), 'Not checked in');
    assert.equal(getAttendanceCheckInLabel(null), 'Not checked in');
  });
});
