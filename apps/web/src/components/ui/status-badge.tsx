'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type StatusType = 
  | 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' 
  | 'completed' | 'in_progress' | 'on_hold' | 'cancelled' | 'late' | 'absent' | 'present' | 'half_day' | 'wfh';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string, className: string }> = {
  // Attendance / Session
  active: { label: 'Active', className: 'app-badge-success' },
  inactive: { label: 'Inactive', className: 'app-badge-neutral' },
  present: { label: 'Present', className: 'app-badge-success' },
  absent: { label: 'Absent', className: 'app-badge-danger' },
  late: { label: 'Late', className: 'app-badge-warning' },
  early_logout: { label: 'Early Logout', className: 'app-badge-warning' },
  corrected: { label: 'Corrected', className: 'app-badge-info' },
  
  // Leaves / Approvals / WFH
  pending: { label: 'Pending', className: 'app-badge-warning' },
  approved: { label: 'Approved', className: 'app-badge-success' },
  rejected: { label: 'Rejected', className: 'app-badge-danger' },
  cancelled: { label: 'Cancelled', className: 'app-badge-neutral' },
  wfh: { label: 'WFH', className: 'app-badge-info' },
  half_day: { label: 'Half Day', className: 'app-badge-warning' },
  
  // Tasks / Projects
  completed: { label: 'Completed', className: 'app-badge-success' },
  in_progress: { label: 'In Progress', className: 'app-badge-info' },
  on_hold: { label: 'On Hold', className: 'app-badge-neutral' },
  blocked: { label: 'Blocked', className: 'app-badge-danger' },
  
  // User Status
  invited: { label: 'Invited', className: 'app-badge-info' },
  suspended: { label: 'Suspended', className: 'app-badge-danger' },
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const config = STATUS_CONFIG[normalizedStatus] || { 
    label: status.replace(/_/g, ' '), 
    className: 'bg-slate-50 text-slate-600 border-slate-100' 
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </Badge>
  );
}
