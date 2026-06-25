'use client';

import { AnnouncementsOverviewCard } from './AnnouncementsOverviewCard';
import { UpcomingHolidaysCard } from './UpcomingHolidaysCard';

interface DashboardOverviewUpdatesSectionProps {
  limit?: number;
  announcementsViewAllHref?: string;
  holidaysViewAllHref?: string;
  className?: string;
}

export function DashboardOverviewUpdatesSection({
  limit = 5,
  announcementsViewAllHref,
  holidaysViewAllHref = '/calendar',
  className,
}: DashboardOverviewUpdatesSectionProps) {
  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className ?? ''}`}>
      <AnnouncementsOverviewCard limit={limit} viewAllHref={announcementsViewAllHref} />
      <UpcomingHolidaysCard limit={limit} viewAllHref={holidaysViewAllHref} />
    </div>
  );
}
