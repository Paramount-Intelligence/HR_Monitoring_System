import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyTaskFilters,
  DEFAULT_TASK_FILTERS,
  filterTasks,
  hasActiveTaskFilters,
  sortTasks,
} from './task-filters';

const baseTasks = [
  {
    id: '1',
    title: 'Alpha task',
    description: 'First',
    project_title: 'HR Project',
    assigned_to: 'mgr-1',
    assigned_to_name: 'Manager One',
    status: 'created',
    priority: 'low',
    due_date: '2026-12-01',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
  },
  {
    id: '2',
    title: 'Beta delivery',
    description: 'Second',
    project_title: 'Ops Project',
    assigned_to: 'emp-1',
    assigned_to_name: 'Employee One',
    status: 'in_progress',
    priority: 'critical',
    due_date: '2026-06-15',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-03T10:00:00Z',
  },
  {
    id: '3',
    title: 'Gamma review',
    description: 'Third',
    project_title: 'HR Project',
    assigned_to: 'mgr-1',
    assigned_to_name: 'Manager One',
    status: 'completed',
    priority: 'medium',
    due_date: null,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
];

describe('DEFAULT_TASK_FILTERS', () => {
  it('uses In Progress as default status', () => {
    assert.equal(DEFAULT_TASK_FILTERS.status, 'in_progress');
    assert.equal(DEFAULT_TASK_FILTERS.assignee, 'all');
    assert.equal(DEFAULT_TASK_FILTERS.priority, 'all');
    assert.equal(DEFAULT_TASK_FILTERS.deadline, 'all');
    assert.equal(DEFAULT_TASK_FILTERS.sort, 'latest');
  });
});

describe('filterTasks', () => {
  it('filters by default in_progress status', () => {
    const result = filterTasks(baseTasks, DEFAULT_TASK_FILTERS);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, '2');
  });

  it('searches by title, project, and assignee name', () => {
    const byTitle = filterTasks(baseTasks, { ...DEFAULT_TASK_FILTERS, status: 'all', search: 'alpha' });
    assert.equal(byTitle.length, 1);

    const byProject = filterTasks(baseTasks, { ...DEFAULT_TASK_FILTERS, status: 'all', search: 'ops' });
    assert.equal(byProject.length, 1);

    const byAssignee = filterTasks(baseTasks, { ...DEFAULT_TASK_FILTERS, status: 'all', search: 'employee one' });
    assert.equal(byAssignee.length, 1);
  });

  it('filters by assignee you', () => {
    const result = filterTasks(
      baseTasks,
      { ...DEFAULT_TASK_FILTERS, status: 'all', assignee: 'you' },
      { currentUserId: 'mgr-1' }
    );
    assert.equal(result.length, 2);
  });

  it('filters by priority', () => {
    const result = filterTasks(baseTasks, { ...DEFAULT_TASK_FILTERS, status: 'all', priority: 'critical' });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, '2');
  });
});

describe('sortTasks', () => {
  it('sorts latest by updated_at', () => {
    const sorted = sortTasks(
      baseTasks.filter((task) => task.status === 'all' || true),
      'latest'
    );
    assert.equal(sorted[0]?.id, '3');
  });

  it('sorts priority high to low', () => {
    const sorted = sortTasks(baseTasks, 'priority_high');
    assert.equal(sorted[0]?.priority, 'critical');
  });
});

describe('hasActiveTaskFilters', () => {
  it('detects non-default filters', () => {
    assert.equal(hasActiveTaskFilters(DEFAULT_TASK_FILTERS), false);
    assert.equal(hasActiveTaskFilters({ ...DEFAULT_TASK_FILTERS, status: 'all' }), true);
  });
});

describe('applyTaskFilters', () => {
  it('combines filter and sort', () => {
    const result = applyTaskFilters(baseTasks, { ...DEFAULT_TASK_FILTERS, status: 'all', sort: 'priority_high' });
    assert.equal(result[0]?.priority, 'critical');
  });
});
