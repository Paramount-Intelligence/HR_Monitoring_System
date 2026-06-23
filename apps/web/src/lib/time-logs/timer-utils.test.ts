import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canTrackTaskForTimer,
  formatTimeLogDuration,
  getStartTimerDisabledReason,
} from './timer-utils';

describe('canTrackTaskForTimer', () => {
  it('allows self-assigned active tasks', () => {
    assert.equal(
      canTrackTaskForTimer({ assigned_to: 'user-1', status: 'in_progress' }, 'user-1'),
      true
    );
  });

  it('blocks tasks assigned to another user', () => {
    assert.equal(
      canTrackTaskForTimer({ assigned_to: 'user-2', status: 'in_progress' }, 'user-1'),
      false
    );
  });

  it('blocks completed tasks', () => {
    assert.equal(
      canTrackTaskForTimer({ assigned_to: 'user-1', status: 'completed' }, 'user-1'),
      false
    );
  });
});

describe('getStartTimerDisabledReason', () => {
  const base = {
    selectedTaskId: 'task-1',
    hasActiveTimer: false,
    isSubmitting: false,
    isLoading: false,
    selectedTask: { assigned_to: 'user-1', status: 'in_progress' },
    currentUserId: 'user-1',
  };

  it('returns null when start is allowed', () => {
    assert.equal(getStartTimerDisabledReason(base), null);
  });

  it('requires a selected task', () => {
    assert.equal(
      getStartTimerDisabledReason({ ...base, selectedTaskId: '' }),
      'Select a task to start tracking.'
    );
  });

  it('blocks when another timer is active', () => {
    assert.equal(
      getStartTimerDisabledReason({ ...base, hasActiveTimer: true }),
      'Another timer is already active. Stop it first.'
    );
  });

  it('blocks outside-scope tasks with a readable reason', () => {
    assert.equal(
      getStartTimerDisabledReason({
        ...base,
        selectedTask: { assigned_to: 'user-2', status: 'in_progress' },
      }),
      'You can only start timers for tasks assigned to you.'
    );
  });
});

describe('formatTimeLogDuration', () => {
  it('shows sub-minute durations as < 1m', () => {
    assert.equal(
      formatTimeLogDuration({
        duration_minutes: 0,
        started_at: '2026-01-01T10:00:00.000Z',
        ended_at: '2026-01-01T10:00:30.000Z',
        status: 'completed',
      }),
      '< 1m'
    );
  });

  it('falls back to timestamps when duration_minutes is missing', () => {
    assert.equal(
      formatTimeLogDuration({
        started_at: '2026-01-01T10:00:00.000Z',
        ended_at: '2026-01-01T11:30:00.000Z',
        status: 'completed',
      }),
      '1h 30m'
    );
  });
});
