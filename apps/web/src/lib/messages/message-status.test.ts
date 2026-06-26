import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryStatusFromCounts,
  getMessageDeliveryStatus,
  mergeDeliveredUpdate,
  mergeSeenUpdate,
  shouldShowMessageTicks,
  statusFromMessageInfo,
} from '@/lib/messages/message-status';

describe('message-status helpers', () => {
  it('returns sent when only created_at exists', () => {
    assert.equal(getMessageDeliveryStatus({ created_at: '2026-06-09T00:13:00Z' }), 'sent');
  });

  it('returns delivered when delivered_at exists', () => {
    assert.equal(
      getMessageDeliveryStatus({ created_at: '2026-06-09T00:13:00Z', delivered_at: '2026-06-09T00:15:00Z' }),
      'delivered',
    );
  });

  it('returns seen when seen_at exists', () => {
    assert.equal(
      getMessageDeliveryStatus({
        created_at: '2026-06-09T00:13:00Z',
        delivered_at: '2026-06-09T00:15:00Z',
        seen_at: '2026-06-09T00:15:00Z',
      }),
      'seen',
    );
  });

  it('prefers seen timestamps over stale delivered delivery_status', () => {
    assert.equal(
      getMessageDeliveryStatus({
        delivery_status: 'delivered',
        seen_at: '2026-06-09T00:16:00Z',
        delivered_at: '2026-06-09T00:15:00Z',
      }),
      'seen',
    );
  });

  it('handles zero total_recipients in seen merge', () => {
    const updated = mergeSeenUpdate(
      {
        id: '1',
        conversation_id: 'c',
        sender_id: 'me',
        sender: { id: 'me', full_name: 'Me', email: '', role: 'employee' },
        body: 'hi',
        message_type: 'text',
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: '2026-06-09T00:13:00Z',
        updated_at: '2026-06-09T00:13:00Z',
        deleted_at: null,
        mentions: [],
        reactions: [],
        delivery_status: 'delivered',
        total_recipients: 0,
        delivered_count: 1,
        seen_count: 0,
      },
      '2026-06-09T00:15:00Z',
    );
    assert.equal(updated.delivery_status, 'seen');
    assert.equal(updated.seen_count, 1);
  });

  it('shows ticks only for own messages', () => {
    assert.equal(shouldShowMessageTicks({ sender_id: 'a' }, 'a'), true);
    assert.equal(shouldShowMessageTicks({ sender_id: 'a' }, 'b'), false);
  });

  it('maps receipt counts like backend aggregate policy', () => {
    assert.equal(deliveryStatusFromCounts(0, 0, 1), 'sent');
    assert.equal(deliveryStatusFromCounts(1, 0, 1), 'delivered');
    assert.equal(deliveryStatusFromCounts(1, 1, 1), 'seen');
    assert.equal(deliveryStatusFromCounts(1, 0, 3), 'delivered');
    assert.equal(deliveryStatusFromCounts(3, 1, 3), 'seen');
    assert.equal(deliveryStatusFromCounts(3, 3, 3), 'seen');
  });

  it('updates delivered state from realtime merge', () => {
    const updated = mergeDeliveredUpdate(
      {
        id: '1',
        conversation_id: 'c',
        sender_id: 'me',
        sender: { id: 'me', full_name: 'Me', email: '', role: 'employee' },
        body: 'hi',
        message_type: 'text',
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: '2026-06-09T00:13:00Z',
        updated_at: '2026-06-09T00:13:00Z',
        deleted_at: null,
        mentions: [],
        reactions: [],
        delivery_status: 'sent',
        total_recipients: 1,
        delivered_count: 0,
        seen_count: 0,
      },
      '2026-06-09T00:15:00Z',
    );
    assert.equal(updated.delivery_status, 'delivered');
    assert.equal(updated.delivered_at, '2026-06-09T00:15:00Z');
  });

  it('updates seen state from realtime merge', () => {
    const updated = mergeSeenUpdate(
      {
        id: '1',
        conversation_id: 'c',
        sender_id: 'me',
        sender: { id: 'me', full_name: 'Me', email: '', role: 'employee' },
        body: 'hi',
        message_type: 'text',
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: '2026-06-09T00:13:00Z',
        updated_at: '2026-06-09T00:13:00Z',
        deleted_at: null,
        mentions: [],
        reactions: [],
        delivery_status: 'delivered',
        total_recipients: 1,
        delivered_count: 1,
        seen_count: 0,
      },
      '2026-06-09T00:15:00Z',
    );
    assert.equal(updated.delivery_status, 'seen');
    assert.equal(updated.seen_at, '2026-06-09T00:15:00Z');
  });

  it('matches message info modal receipt semantics', () => {
    assert.equal(statusFromMessageInfo('2026-06-09T00:13:00Z', []), 'sent');
    assert.equal(
      statusFromMessageInfo('2026-06-09T00:13:00Z', [{ delivered_at: '2026-06-09T00:15:00Z' }]),
      'delivered',
    );
    assert.equal(
      statusFromMessageInfo('2026-06-09T00:13:00Z', [
        { delivered_at: '2026-06-09T00:15:00Z', seen_at: '2026-06-09T00:15:00Z' },
      ]),
      'seen',
    );
  });
});
