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
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  inactive: { label: 'Inactive', className: 'bg-slate-50 text-slate-600 border-slate-100' },
  present: { label: 'Present', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  absent: { label: 'Absent', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  late: { label: 'Late', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  early_logout: { label: 'Early Logout', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  corrected: { label: 'Corrected', className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  
  // Leaves / Approvals / WFH
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-50 text-slate-600 border-slate-100' },
  wfh: { label: 'WFH', className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  half_day: { label: 'Half Day', className: 'bg-orange-50 text-orange-700 border-orange-100' },
  
  // Tasks / Projects
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  in_progress: { label: 'In Progress', className: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  on_hold: { label: 'On Hold', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  blocked: { label: 'Blocked', className: 'bg-rose-50 text-rose-700 border-rose-100' },
  
  // User Status
  invited: { label: 'Invited', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  suspended: { label: 'Suspended', className: 'bg-slate-100 text-slate-700 border-slate-200' },
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
