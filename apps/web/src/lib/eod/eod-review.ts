/** Display helpers for manager EOD review UI. */

export function displayEodTextField(
  value: string | null | undefined,
  emptyText: string
): string {
  const trimmed = (value ?? '').trim();
  return trimmed || emptyText;
}

export function hasSubmittedEodText(report: {
  work_summary?: string | null;
  blockers?: string | null;
  next_day_plan?: string | null;
}): boolean {
  return [report.work_summary, report.blockers, report.next_day_plan].some(
    (field) => Boolean((field ?? '').trim())
  );
}
