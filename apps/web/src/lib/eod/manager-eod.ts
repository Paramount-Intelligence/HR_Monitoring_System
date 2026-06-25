/** Manager My EOD display helpers. */

export function managerEodSubtitle(hasReportingManager: boolean): string {
  return hasReportingManager
    ? 'Daily report, productivity, blockers, and reporting manager review'
    : 'Daily report, productivity, blockers, and manager feedback';
}

export function reportingManagerLabel(managerName: string | null | undefined): string | null {
  const trimmed = (managerName ?? '').trim();
  return trimmed || null;
}
