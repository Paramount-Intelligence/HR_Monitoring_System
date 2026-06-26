import { redirect } from 'next/navigation';
import { organizationTabHref } from '@/lib/navigation/organization-nav';

export default function AdminHolidaysPage() {
  redirect(organizationTabHref('holidays'));
}
