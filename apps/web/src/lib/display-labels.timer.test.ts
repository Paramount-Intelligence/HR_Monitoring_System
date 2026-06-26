import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTaskTimerLabel } from '@/lib/display-labels';

describe('getTaskTimerLabel', () => {
  it('uses task_title from active timer payloads', () => {
    const label = getTaskTimerLabel({
      task_title: 'Build slack style availability',
      project_title: 'PIMS Troubleshooting',
    });
    assert.equal(label, 'Build slack style availability — PIMS Troubleshooting');
  });

  it('falls back when task is missing', () => {
    const label = getTaskTimerLabel({ project_title: 'PIMS Troubleshooting' });
    assert.equal(label, 'Deleted or unavailable task — PIMS Troubleshooting');
  });
});
