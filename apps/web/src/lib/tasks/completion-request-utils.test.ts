import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowTaskCompleteButton,
  canSelfCompleteTasks,
  getCompleteTaskButtonLabel,
  getCompleteTaskButtonState,
  isInternRole,
  isTaskCompletableByUser,
} from './completion-request-utils';

const baseTask = {
  id: 'task-1',
  assigned_to: 'user-1',
  created_by: 'manager-1',
  status: 'in_progress' as const,
  can_complete: true,
};

describe('canSelfCompleteTasks', () => {
  it('allows employee and intern roles', () => {
    assert.equal(canSelfCompleteTasks('employee'), true);
    assert.equal(canSelfCompleteTasks('intern'), true);
    assert.equal(canSelfCompleteTasks('manager'), false);
  });
});

describe('isInternRole', () => {
  it('returns true for intern', () => {
    assert.equal(isInternRole('intern'), true);
  });
});

describe('isTaskCompletableByUser', () => {
  it('allows assignee and creator', () => {
    assert.equal(isTaskCompletableByUser(baseTask, 'user-1'), true);
    assert.equal(isTaskCompletableByUser(baseTask, 'manager-1'), true);
    assert.equal(isTaskCompletableByUser(baseTask, 'outsider-1'), false);
  });
});

describe('getCompleteTaskButtonState', () => {
  it('shows complete for employee when can_complete is true', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'employee',
        task: baseTask,
        currentUserId: 'user-1',
        activeTimer: null,
      }),
      'complete',
    );
  });

  it('shows stop_and_complete when timer is active on task', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'employee',
        task: baseTask,
        currentUserId: 'user-1',
        activeTimer: { task_id: 'task-1', status: 'running' },
      }),
      'stop_and_complete',
    );
  });

  it('hides when backend sets can_complete false', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'employee',
        task: { ...baseTask, can_complete: false },
        currentUserId: 'user-1',
      }),
      'hidden',
    );
  });

  it('shows complete for intern assignee', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'intern',
        task: { ...baseTask, assigned_to: 'intern-1', can_complete: true },
        currentUserId: 'intern-1',
        activeTimer: null,
      }),
      'complete',
    );
  });

  it('hides for unauthorized user', () => {
    assert.equal(
      getCompleteTaskButtonState({
        role: 'employee',
        task: { ...baseTask, can_complete: false },
        currentUserId: 'outsider-1',
      }),
      'hidden',
    );
  });
});

describe('canShowTaskCompleteButton', () => {
  it('returns true for eligible employee task row', () => {
    assert.equal(
      canShowTaskCompleteButton({
        role: 'employee',
        task: baseTask,
        currentUserId: 'user-1',
      }),
      true,
    );
  });
});

describe('getCompleteTaskButtonLabel', () => {
  it('uses human-readable labels', () => {
    assert.equal(getCompleteTaskButtonLabel('complete'), 'Mark Complete');
    assert.equal(getCompleteTaskButtonLabel('stop_and_complete'), 'Stop & Complete');
    assert.equal(getCompleteTaskButtonLabel('completed'), 'Completed');
  });
});
