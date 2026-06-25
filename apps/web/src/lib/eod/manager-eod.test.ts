import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { managerEodSubtitle, reportingManagerLabel } from './manager-eod.ts';

describe('manager My EOD helpers', () => {
  it('uses reporting manager subtitle when assigned', () => {
    assert.match(managerEodSubtitle(true), /reporting manager review/i);
  });

  it('falls back subtitle when no reporting manager', () => {
    assert.match(managerEodSubtitle(false), /manager feedback/i);
  });

  it('normalizes reporting manager label', () => {
    assert.equal(reportingManagerLabel('Zia Ul Din'), 'Zia Ul Din');
    assert.equal(reportingManagerLabel(''), null);
    assert.equal(reportingManagerLabel(null), null);
  });
});
