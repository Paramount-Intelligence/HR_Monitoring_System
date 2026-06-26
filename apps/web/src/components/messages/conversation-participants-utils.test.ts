import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canManageConversationParticipants,
  isMultiParticipantConversation,
} from './conversation-participants-utils';
import type { Conversation } from '@/lib/api/messages';

const baseConv = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  type: 'group',
  title: 'Team',
  created_by_id: 'u1',
  related_entity_type: null,
  related_entity_id: null,
  is_archived: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  who_can_send_messages: 'all_members',
  who_can_edit_group_info: 'admins_only',
  who_can_add_members: 'admins_only',
  participants: [],
  ...overrides,
});

describe('conversation participant permissions', () => {
  it('shows add member for admin platform role', () => {
    assert.equal(canManageConversationParticipants(baseConv(), 'admin', 'member'), true);
  });

  it('shows add member for manager platform role', () => {
    assert.equal(canManageConversationParticipants(baseConv(), 'manager', 'member'), true);
  });

  it('hides add member for unauthorized member', () => {
    assert.equal(canManageConversationParticipants(baseConv(), 'employee', 'member'), false);
    assert.equal(canManageConversationParticipants(baseConv(), 'intern', 'member'), false);
  });

  it('allows owner and conversation admin', () => {
    assert.equal(canManageConversationParticipants(baseConv(), 'employee', 'owner'), true);
    assert.equal(canManageConversationParticipants(baseConv(), 'employee', 'admin'), true);
  });

  it('allows all members when group policy permits', () => {
    assert.equal(
      canManageConversationParticipants(
        baseConv({ who_can_add_members: 'all_members' }),
        'employee',
        'member'
      ),
      true
    );
  });

  it('hides add member for direct chats', () => {
    assert.equal(isMultiParticipantConversation('direct'), false);
    assert.equal(
      canManageConversationParticipants(baseConv({ type: 'direct' }), 'admin', 'owner'),
      false
    );
  });

  it('supports task thread conversations', () => {
    assert.equal(isMultiParticipantConversation('task_thread'), true);
  });
});
