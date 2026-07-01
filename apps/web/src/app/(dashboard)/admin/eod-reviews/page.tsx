'use client';

import { ShieldCheck } from 'lucide-react';
import { EodReviewsPanel } from '@/components/eod/EodReviewsPanel';

export default function AdminEodReviewsPage() {
  return (
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">EOD Reviews</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)]">
              Review EOD reports submitted across the organization
            </p>
          </div>
        </div>
      </div>
      <EodReviewsPanel feedbackLabel="Admin Feedback" scope="organization" audience="admin" />
    </div>
  );
}
