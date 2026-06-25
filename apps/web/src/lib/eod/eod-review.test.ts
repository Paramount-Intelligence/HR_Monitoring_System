import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { displayEodTextField, hasSubmittedEodText } from './eod-review.ts';

describe('EOD review display helpers', () => {
  it('shows friendly empty states for missing text', () => {
    assert.equal(displayEodTextField(null, 'No work summary submitted.'), 'No work summary submitted.');
    assert.equal(displayEodTextField('   ', 'No blockers reported.'), 'No blockers reported.');
    assert.equal(displayEodTextField('Finished tasks.', 'No work summary submitted.'), 'Finished tasks.');
  });

  it('detects whether any submitted text exists', () => {
    assert.equal(
      hasSubmittedEodText({
        work_summary: 'Done',
        blockers: null,
        next_day_plan: null,
      }),
      true
    );
    assert.equal(
      hasSubmittedEodText({
        work_summary: null,
        blockers: null,
        next_day_plan: null,
      }),
      false
    );
  });
});
