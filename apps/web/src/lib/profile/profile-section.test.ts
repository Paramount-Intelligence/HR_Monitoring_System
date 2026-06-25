import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_NOTIFICATIONS_PATH,
  parseProfileSection,
  profilePathForSection,
} from './profile-section.ts';

describe('profile section routing', () => {
  it('parses notifications section from query param', () => {
    assert.equal(parseProfileSection('notifications'), 'notifications');
  });

  it('parses security section from query param', () => {
    assert.equal(parseProfileSection('security'), 'security');
  });

  it('defaults unknown section to info', () => {
    assert.equal(parseProfileSection(null), 'info');
    assert.equal(parseProfileSection('settings'), 'info');
  });

  it('builds profile paths for each section', () => {
    assert.equal(profilePathForSection('info'), '/profile');
    assert.equal(profilePathForSection('security'), '/profile?section=security');
    assert.equal(profilePathForSection('notifications'), PROFILE_NOTIFICATIONS_PATH);
  });

  it('exposes canonical notifications shortcut path for Messages', () => {
    assert.equal(PROFILE_NOTIFICATIONS_PATH, '/profile?section=notifications');
  });
});
