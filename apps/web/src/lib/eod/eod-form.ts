import type { EODReport, EODStatus } from '@/lib/api/eod';

export const WORK_SUMMARY_MIN = 10;
export const WORK_SUMMARY_MAX = 5000;

export function validateWorkSummary(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return 'Work summary is required.';
  if (normalized.length < WORK_SUMMARY_MIN) {
    return `Work summary must be at least ${WORK_SUMMARY_MIN} characters.`;
  }
  if (normalized.length > WORK_SUMMARY_MAX) {
    return `Work summary must be at most ${WORK_SUMMARY_MAX} characters.`;
  }
  return null;
}

export function canSubmitEod(status: EODStatus | undefined): boolean {
  return status === 'Generated' || status === 'Needs Revision' || status === 'Draft';
}

export function displayEodStatus(status: EODStatus | undefined): string {
  if (!status) return 'Not started';
  if (status === 'Pending Approval') return 'Submitted';
  if (status === 'Approved') return 'Reviewed';
  return status;
}

export function isEodFormEditable(eod: EODReport | null): boolean {
  if (!eod) return true;
  return canSubmitEod(eod.status);
}

export function buildInitialFormState(eod: EODReport | null) {
  return {
    workSummary: eod?.work_summary ?? '',
    blockers: eod?.blockers ?? '',
    nextDayPlan: eod?.next_day_plan ?? '',
  };
}

export function looksLikeUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}
