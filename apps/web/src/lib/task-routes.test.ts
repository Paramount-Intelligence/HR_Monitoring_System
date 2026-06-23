import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveTimerHref,
  getTaskDetailHref,
  getTasksListHref,
  getTimeLogsHref,
} from './task-routes';

describe('getTaskDetailHref', () => {
  it('returns universal task route for any role when task id is present', () => {
    assert.equal(
      getTaskDetailHref({ taskId: 'abc-123', role: 'manager' }),
      '/tasks/abc-123'
    );
    assert.equal(
      getTaskDetailHref({ taskId: 'abc-123', role: 'employee' }),
      '/tasks/abc-123'
    );
    assert.equal(
      getTaskDetailHref({ taskId: 'abc-123', role: 'admin' }),
      '/tasks/abc-123'
    );
  });

  it('does not route manager to admin-only paths', () => {
    const href = getTaskDetailHref({ taskId: 'task-1', role: 'manager' });
    assert.equal(href.startsWith('/admin/'), false);
    assert.equal(href, '/tasks/task-1');
  });

  it('falls back to role-safe time logs when task id is missing', () => {
    assert.equal(getTaskDetailHref({ role: 'manager' }), '/manager/time-logs');
    assert.equal(getTaskDetailHref({ role: 'employee' }), '/employee/time-logs');
    assert.equal(getTaskDetailHref({ role: 'intern' }), '/employee/time-logs');
  });
});

describe('getActiveTimerHref', () => {
  it('opens task detail for manager self-task', () => {
    assert.equal(
      getActiveTimerHref({ taskId: 'self-task', role: 'manager' }),
      '/tasks/self-task'
    );
  });

  it('opens task detail for employee assigned task', () => {
    assert.equal(
      getActiveTimerHref({ taskId: 'emp-task', role: 'employee' }),
      '/tasks/emp-task'
    );
  });

  it('falls back to time logs without task id', () => {
    assert.equal(getActiveTimerHref({ role: 'manager' }), '/manager/time-logs');
  });
});

describe('getTimeLogsHref', () => {
  it('returns employee time logs for employee roles', () => {
    assert.equal(getTimeLogsHref('employee'), '/employee/time-logs');
    assert.equal(getTimeLogsHref('intern'), '/employee/time-logs');
  });

  it('returns manager time logs for manager and admin', () => {
    assert.equal(getTimeLogsHref('manager'), '/manager/time-logs');
    assert.equal(getTimeLogsHref('admin'), '/manager/time-logs');
  });
});

describe('getTasksListHref', () => {
  it('routes manager to my-tasks when viewing own assignment', () => {
    assert.equal(
      getTasksListHref({
        role: 'manager',
        currentUserId: 'u1',
        assigneeId: 'u1',
      }),
      '/manager/my-tasks'
    );
  });

  it('routes manager to team tasks for direct report assignment', () => {
    assert.equal(
      getTasksListHref({
        role: 'manager',
        currentUserId: 'u1',
        assigneeId: 'u2',
      }),
      '/manager/tasks'
    );
  });
});
