 'use client';

import { AttendanceExceptionsCenter } from '@/components/attendance/AttendanceExceptionsCenter';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { Clock } from 'lucide-react';

export default function ManagerAttendanceExceptionsPage() {
  return (
    <ManagerPageShell>
      <ManagerPageHeader title="Attendance Exceptions" subtitle="Review direct report attendance issues" icon={Clock} />
      <AttendanceExceptionsCenter scope="my_team" />
    </ManagerPageShell>
  );
}
