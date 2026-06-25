import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCompleteTaskButtonLabel,
  getCompleteTaskButtonState,
  isInternRole,
} from './completion-request-utils';

const baseTask = {
  id: 'task-1',
  assigned_to: 'intern-1',
  status: 'in_progress' as const,
};

describe('isInternRole', () => {
  it('returns true for intern', () => {
    assert.equal(isInternRole('intern'), true);
  });

  it('returns false for employee', () => {
    assert.equal(isInternRole('employee'), false);
  });
});

describe('getCompleteTaskButtonState', () => {
  it('shows complete after timer stopped for intern assignee', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'intern',
        task: baseTask,
        currentUserId: 'intern-1',
        activeTimer: null,
      }),
      'complete'
    );
  });

  it('blocks while timer active on task', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'intern',
        task: baseTask,
        currentUserId: 'intern-1',
        activeTimer: { task_id: 'task-1', status: 'running' },
      }),
      'timer_active'
    );
  });

  it('shows pending when request pending', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'intern',
        task: baseTask,
        currentUserId: 'intern-1',
        pendingCompletionRequest: {
          id: 'req-1',
          status: 'pending',
          requested_at: new Date().toISOString(),
        },
      }),
      'pending'
    );
  });

  it('allows retry after rejection when timer stopped', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'intern',
        task: baseTask,
        currentUserId: 'intern-1',
        pendingCompletionRequest: {
          id: 'req-1',
          status: 'rejected',
          requested_at: new Date().toISOString(),
        },
      }),
      'rejected'
    );
  });

  it('hides for non-intern roles', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'employee',
        task: baseTask,
        currentUserId: 'intern-1',
      }),
      'hidden'
    );
  });
});

describe('getCompleteTaskButtonLabel', () => {
  it('uses human-readable labels without ids', () => {
    assert.equal(getCompleteTaskButtonLabel('complete'), 'Complete Task');
    assert.equal(getCompleteTaskButtonLabel('pending'), 'Completion requested');
  });
});
