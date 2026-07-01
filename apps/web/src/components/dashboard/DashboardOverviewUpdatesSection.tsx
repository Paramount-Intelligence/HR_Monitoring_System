'use client';

import { UpcomingHolidaysCard } from './UpcomingHolidaysCard';

interface DashboardOverviewUpdatesSectionProps {
  limit?: number;
  holidaysViewAllHref?: string;
  className?: string;
}

export function DashboardOverviewUpdatesSection({
  limit = 5,
  holidaysViewAllHref = '/calendar',
  className,
}: DashboardOverviewUpdatesSectionProps) {
  return (
    <div className={className}>
      <UpcomingHolidaysCard limit={limit} viewAllHref={holidaysViewAllHref} />
    </div>
  );
}
