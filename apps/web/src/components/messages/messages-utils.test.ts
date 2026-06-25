import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Conversation, Message } from '@/lib/api/messages';
import {
  getConversationLoadError,
  getConversationPreview,
  getConversationDisplayName,
  getSlackMessageRenderItems,
  groupMessagesByDateWithSlack,
  stripMessagePreviewText,
  filterByChatListFilter,
  matchesSearch,
} from './messages-utils';

function makeMessage(overrides: Partial<Message> & Pick<Message, 'id' | 'sender_id' | 'created_at'>): Message {
  return {
    conversation_id: 'conv-1',
    sender: {
      id: overrides.sender_id,
      full_name: overrides.sender_id === 'user-1' ? 'You' : 'Teammate',
      email: 'user@test.com',
      role: 'employee',
    },
    body: 'Hello',
    message_type: 'text',
    is_edited: false,
    is_deleted: false,
    created_at: overrides.created_at,
    updated_at: overrides.created_at,
    attachments: [],
    mentions: [],
    reactions: [],
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'direct',
    title: 'Teammate',
    created_by_id: 'user-1',
    is_archived: false,
    created_at: '2026-06-09T10:00:00.000Z',
    updated_at: '2026-06-09T10:00:00.000Z',
    participants: [],
    unread_count: 0,
    ...overrides,
  };
}

describe('getConversationPreview', () => {
  it('shows No messages yet for empty conversations', () => {
    assert.equal(getConversationPreview(makeConversation({ last_message: null })), 'No messages yet');
  });

  it('strips HTML from sidebar previews', () => {
    const preview = getConversationPreview(
      makeConversation({
        last_message: {
          id: 'msg-1',
          body: '<p><strong>Hi</strong> there</p>',
          sender_id: 'user-2',
          sender_name: 'Teammate',
          created_at: '2026-06-09T10:00:00.000Z',
        },
      })
    );
    assert.equal(preview, 'Teammate: Hi there');
    assert.equal(preview.includes('<'), false);
  });
});

describe('stripMessagePreviewText', () => {
  it('removes HTML wrappers', () => {
    assert.equal(stripMessagePreviewText('<p>Hello <strong>world</strong></p>'), 'Hello world');
  });
});

describe('getSlackMessageRenderItems', () => {
  it('groups consecutive same-sender messages within five minutes', () => {
    const messages = [
      makeMessage({ id: 'm1', sender_id: 'user-1', created_at: '2026-06-09T10:00:00.000Z' }),
      makeMessage({ id: 'm2', sender_id: 'user-1', created_at: '2026-06-09T10:02:00.000Z', body: 'Second' }),
      makeMessage({ id: 'm3', sender_id: 'user-2', created_at: '2026-06-09T10:03:00.000Z', body: 'Reply' }),
    ];

    const items = getSlackMessageRenderItems(messages);
    assert.equal(items.length, 3);
    assert.equal(items[0].showHeader, true);
    assert.equal(items[1].isContinuation, true);
    assert.equal(items[1].showAvatar, false);
    assert.equal(items[2].showHeader, true);
  });

  it('starts a new group after the time window', () => {
    const messages = [
      makeMessage({ id: 'm1', sender_id: 'user-1', created_at: '2026-06-09T10:00:00.000Z' }),
      makeMessage({ id: 'm2', sender_id: 'user-1', created_at: '2026-06-09T10:06:00.000Z', body: 'Later' }),
    ];

    const items = getSlackMessageRenderItems(messages);
    assert.equal(items[1].isContinuation, false);
    assert.equal(items[1].showAvatar, true);
  });
});

describe('groupMessagesByDateWithSlack', () => {
  it('keeps date dividers while grouping within a day', () => {
    const messages = [
      makeMessage({ id: 'm1', sender_id: 'user-1', created_at: '2026-06-09T10:00:00.000Z' }),
      makeMessage({ id: 'm2', sender_id: 'user-1', created_at: '2026-06-09T10:01:00.000Z', body: 'Again' }),
    ];

    const groups = groupMessagesByDateWithSlack(messages);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].items[1].isContinuation, true);
  });
});

describe('filterByChatListFilter', () => {
  it('shows all conversations for all filter', () => {
    const conv = makeConversation();
    assert.equal(filterByChatListFilter(conv, 'all'), true);
  });

  it('unread filter shows only unread conversations', () => {
    assert.equal(filterByChatListFilter(makeConversation({ unread_count: 2 }), 'unread'), true);
    assert.equal(filterByChatListFilter(makeConversation({ unread_count: 0 }), 'unread'), false);
  });

  it('groups filter shows group and channel conversations', () => {
    assert.equal(filterByChatListFilter(makeConversation({ type: 'group' }), 'groups'), true);
    assert.equal(filterByChatListFilter(makeConversation({ type: 'channel' }), 'groups'), true);
    assert.equal(filterByChatListFilter(makeConversation({ type: 'direct' }), 'groups'), false);
  });
});

describe('matchesSearch', () => {
  it('filters by conversation name and participant name', () => {
    const conv = makeConversation({
      type: 'direct',
      participants: [
        {
          id: 'p1',
          user_id: 'user-2',
          role: 'member',
          user: {
            id: 'user-2',
            full_name: 'Jane Smith',
            email: 'jane@company.com',
            role: 'employee',
          },
        },
      ],
    });
    assert.equal(matchesSearch(conv, 'jane', 'user-1'), true);
    assert.equal(matchesSearch(conv, 'zzz', 'user-1'), false);
  });
});

describe('getConversationDisplayName', () => {
  it('does not expose raw UUIDs in display name', () => {
    const uuid = '13108efc-17da-4cdf-90e8-1d36a2d99883';
    const conv = makeConversation({
      title: null,
      type: 'direct',
      participants: [
        {
          id: 'p1',
          user_id: 'user-2',
          role: 'member',
          user: { id: 'user-2', full_name: 'Jane Smith', email: 'j@test.com', role: 'employee' },
        },
      ],
    });
    const name = getConversationDisplayName(conv, 'user-1');
    assert.equal(name.includes(uuid), false);
    assert.equal(name, 'Jane Smith');
  });
});

describe('getConversationLoadError', () => {
  it('maps 403 to access denied without retry', () => {
    const error = getConversationLoadError({ response: { status: 403 } });
    assert.match(error.message, /access/i);
    assert.equal(error.canRetry, false);
  });

  it('maps 500 to retryable server error', () => {
    const error = getConversationLoadError({ response: { status: 500 } });
    assert.equal(error.canRetry, true);
    assert.match(error.message, /Please try again/);
  });
});
