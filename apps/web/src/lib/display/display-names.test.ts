import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectDisplayName,
  getTaskDisplayName,
  makeProjectOptions,
  makeTaskTimerOptions,
  resolveOptionLabel,
} from '@/lib/display/display-names';

describe('getProjectDisplayName', () => {
  it('returns project title instead of id', () => {
    assert.equal(
      getProjectDisplayName({ id: '0408e6db-49d1-4363-9285-0cebe61a1777', title: 'Active HR Project' } as never),
      'Active HR Project'
    );
  });

  it('falls back when name is missing', () => {
    assert.equal(getProjectDisplayName({ id: '0408e6db-49d1-4363-9285-0cebe61a1777' } as never), 'Untitled Project');
  });

  it('never returns uuid-like strings', () => {
    assert.equal(
      getProjectDisplayName({ title: '0408e6db-49d1-4363-9285-0cebe61a1777' }),
      'Untitled Project'
    );
  });
});

describe('getTaskDisplayName', () => {
  it('returns task title instead of id', () => {
    assert.equal(getTaskDisplayName({ title: 'Delegated task' }), 'Delegated task');
  });

  it('falls back when title is missing', () => {
    assert.equal(getTaskDisplayName({ id: 'task-uuid' } as never), 'Untitled Task');
  });
});

describe('resolveOptionLabel for dropdowns', () => {
  const projectOptions = makeProjectOptions([
    { id: '0408e6db-49d1-4363-9285-0cebe61a1777', title: 'Active HR Project' },
  ]);

  it('shows project name for selected value', () => {
    assert.equal(
      resolveOptionLabel(projectOptions, '0408e6db-49d1-4363-9285-0cebe61a1777', 'Select project'),
      'Active HR Project'
    );
  });

  it('does not show raw uuid when option is missing', () => {
    assert.equal(
      resolveOptionLabel(projectOptions, '99999999-9999-9999-9999-999999999999', 'Select project'),
      'Select project'
    );
  });

  it('builds task timer labels with project subtitle', () => {
    const options = makeTaskTimerOptions([
      {
        id: 'task-1',
        title: 'Flexagon AI Copilot',
        project_title: 'Active HR Project',
        status: 'in_progress',
      },
    ]);
    assert.equal(options[0]?.label, 'Flexagon AI Copilot — Active HR Project');
    assert.equal(resolveOptionLabel(options, 'task-1', 'Select task'), 'Flexagon AI Copilot — Active HR Project');
  });
});
