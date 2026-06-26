'use client';

import { ShieldCheck } from 'lucide-react';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { EodReviewsPanel } from '@/components/eod/EodReviewsPanel';

export default function EODReviewsPage() {
  return (
    <ManagerPageShell>
      <ManagerPageHeader
        title="EOD Review"
        subtitle="Review and verify daily EOD reports from your team"
        icon={ShieldCheck}
      />
      <EodReviewsPanel />
    </ManagerPageShell>
  );
}
