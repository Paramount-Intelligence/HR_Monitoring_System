'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import type { MessageInfo, MessageReceiptInfo } from '@/lib/api/messages';
import { formatMessageTime } from '@/components/messages/messages-utils';

interface MessageInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  info: MessageInfo | null;
  error: string | null;
  isDirect: boolean;
}

function formatReceiptTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return formatMessageTime(value);
}

function ReceiptRow({ receipt }: { receipt: MessageReceiptInfo }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <UserProfilePicture
        user={{ full_name: receipt.full_name, avatar_url: receipt.profile_picture_url }}
        name={receipt.full_name}
        size="sm"
        className="h-8 w-8 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{receipt.full_name}</p>
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{receipt.role}</p>
      </div>
      <div className="text-right text-xs text-[var(--text-muted)] tabular-nums shrink-0">
        {receipt.seen_at && <p>Seen · {formatReceiptTime(receipt.seen_at)}</p>}
        {!receipt.seen_at && receipt.delivered_at && (
          <p>Delivered · {formatReceiptTime(receipt.delivered_at)}</p>
        )}
        {!receipt.seen_at && !receipt.delivered_at && <p>Pending</p>}
      </div>
    </div>
  );
}

export function MessageInfoDialog({
  open,
  onOpenChange,
  loading,
  info,
  error,
  isDirect,
}: MessageInfoDialogProps) {
  const seen = info?.receipts.filter(r => r.seen_at) ?? [];
  const delivered = info?.receipts.filter(r => r.delivered_at && !r.seen_at) ?? [];
  const pending = info?.receipts.filter(r => !r.delivered_at && !r.seen_at) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message info</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {loading && (
            <div className="py-12 flex items-center justify-center text-[var(--text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <p className="py-8 text-center text-sm text-[var(--status-danger-text)]">{error}</p>
          )}
          {!loading && info && (
            <div className="space-y-5">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Sent
                </h3>
                <p className="text-sm text-[var(--text-primary)]">{formatMessageTime(info.sent_at)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {info.sender.full_name}
                  {info.conversation_name ? ` · ${info.conversation_name}` : ''}
                </p>
              </section>

              {info.is_deleted && (
                <p className="text-sm italic text-[var(--text-muted)]">This message was deleted.</p>
              )}

              {isDirect && info.receipts.length > 0 && (
                <section className="space-y-2">
                  {info.receipts[0].delivered_at && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Delivered
                      </h3>
                      <p className="text-sm">{formatReceiptTime(info.receipts[0].delivered_at)}</p>
                    </div>
                  )}
                  {info.receipts[0].seen_at && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Seen
                      </h3>
                      <p className="text-sm">{formatReceiptTime(info.receipts[0].seen_at)}</p>
                    </div>
                  )}
                  {!info.receipts[0].delivered_at && !info.receipts[0].seen_at && (
                    <p className="text-sm text-[var(--text-muted)]">Not delivered yet</p>
                  )}
                </section>
              )}

              {!isDirect && (
                <>
                  {seen.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Seen by
                      </h3>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {seen.map(r => (
                          <ReceiptRow key={r.user_id} receipt={r} />
                        ))}
                      </div>
                    </section>
                  )}
                  {delivered.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Delivered to
                      </h3>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {delivered.map(r => (
                          <ReceiptRow key={r.user_id} receipt={r} />
                        ))}
                      </div>
                    </section>
                  )}
                  {pending.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Pending
                      </h3>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {pending.map(r => (
                          <ReceiptRow key={r.user_id} receipt={r} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {info.attachments.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Attachments
                  </h3>
                  <ul className="space-y-1">
                    {info.attachments.map(att => (
                      <li key={att.id} className="text-sm text-[var(--text-secondary)] truncate">
                        {att.original_file_name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
