export function getAttendanceCheckInLabel(attendanceStatus: string | undefined | null): string {
  if (!attendanceStatus) return 'Not checked in';
  return attendanceStatus === 'active' ? 'Checked in' : 'Not checked in';
}
