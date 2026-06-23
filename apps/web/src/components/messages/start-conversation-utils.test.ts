import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canLaunchConversation,
  filterMessagingDirectoryUsers,
  getMessagingUserSubtitle,
} from '@/components/messages/start-conversation-utils';
import type { MessagingDirectoryUser } from '@/lib/api/messages';

const users: MessagingDirectoryUser[] = [
  {
    id: 'self',
    full_name: 'Current User',
    role: 'employee',
    department_name: 'Engineering',
    designation: 'Developer',
    profile_picture_url: null,
    is_active: true,
  },
  {
    id: 'u2',
    full_name: 'Sarah Manager',
    role: 'manager',
    department_name: 'Operations',
    designation: 'Manager',
    profile_picture_url: null,
    is_active: true,
  },
  {
    id: 'u3',
    full_name: 'Alex Intern',
    role: 'intern',
    department_name: 'Engineering',
    designation: null,
    profile_picture_url: null,
    is_active: true,
  },
];

describe('filterMessagingDirectoryUsers', () => {
  it('excludes current user from direct tab list', () => {
    const filtered = filterMessagingDirectoryUsers(users, {
      currentUserId: 'self',
      conversationType: 'direct',
    });
    assert.equal(filtered.some((u) => u.id === 'self'), false);
    assert.equal(filtered.length, 2);
  });

  it('filters by name role and department client-side', () => {
    const filtered = filterMessagingDirectoryUsers(users, {
      currentUserId: 'self',
      conversationType: 'group',
      search: 'operations',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].full_name, 'Sarah Manager');
  });
});

describe('canLaunchConversation', () => {
  it('requires one participant for direct', () => {
    assert.equal(
      canLaunchConversation({
        conversationType: 'direct',
        selectedParticipantIds: ['u2'],
        title: '',
      }),
      true
    );
  });

  it('requires title for group and channel', () => {
    assert.equal(
      canLaunchConversation({
        conversationType: 'group',
        selectedParticipantIds: ['u2'],
        title: 'Team Chat',
      }),
      true
    );
    assert.equal(
      canLaunchConversation({
        conversationType: 'channel',
        selectedParticipantIds: ['u2'],
        title: '',
      }),
      false
    );
  });
});

describe('getMessagingUserSubtitle', () => {
  it('combines role department and designation', () => {
    assert.match(getMessagingUserSubtitle(users[1]), /manager/i);
    assert.match(getMessagingUserSubtitle(users[1]), /Operations/);
  });
});
