import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORK_SUMMARY_MIN,
  WORK_SUMMARY_MAX,
  validateWorkSummary,
  canSubmitEod,
  displayEodStatus,
  looksLikeUuid,
} from './eod-form.ts';

describe('EOD form helpers', () => {
  it('requires work summary minimum length', () => {
    assert.equal(validateWorkSummary(''), 'Work summary is required.');
    assert.equal(
      validateWorkSummary('short'),
      `Work summary must be at least ${WORK_SUMMARY_MIN} characters.`
    );
    assert.equal(
      validateWorkSummary('Completed LMS filters and tested attendance checkout flow today.'),
      null
    );
  });

  it('rejects work summary over max length', () => {
    const tooLong = 'a'.repeat(WORK_SUMMARY_MAX + 1);
    assert.match(validateWorkSummary(tooLong)!, /at most/);
  });

  it('allows submit only for generated, draft, or needs revision', () => {
    assert.equal(canSubmitEod('Generated'), true);
    assert.equal(canSubmitEod('Needs Revision'), true);
    assert.equal(canSubmitEod('Draft'), true);
    assert.equal(canSubmitEod('Pending Approval'), false);
    assert.equal(canSubmitEod('Approved'), false);
  });

  it('maps pending approval to submitted label', () => {
    assert.equal(displayEodStatus('Pending Approval'), 'Submitted');
    assert.equal(displayEodStatus('Approved'), 'Reviewed');
    assert.equal(displayEodStatus('Generated'), 'Generated');
  });

  it('does not treat normal text as uuid', () => {
    assert.equal(looksLikeUuid('Completed task updates'), false);
    assert.equal(looksLikeUuid('3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc'), true);
  });
});
