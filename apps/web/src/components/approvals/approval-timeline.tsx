import { ApprovalTimelineEntry } from '@/lib/api/leaves';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, MessageSquare, AlertTriangle, XCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalTimelineProps {
  entries: ApprovalTimelineEntry[];
}

export function ApprovalTimeline({ entries }: ApprovalTimelineProps) {
  if (!entries || entries.length === 0) {
    return <div className="text-slate-400 text-sm italic">No history available.</div>;
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <PlusIcon className="h-4 w-4" />;
      case 'clarified':
        return <MessageSquare className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled':
        return <Share2 className="h-4 w-4 rotate-180" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-100 text-blue-600';
      case 'clarified':
        return 'bg-amber-100 text-amber-600';
      case 'approved':
        return 'bg-emerald-100 text-emerald-600';
      case 'rejected':
        return 'bg-red-100 text-red-600';
      case 'escalated':
        return 'bg-purple-100 text-purple-600';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-4">
          {/* Connector line */}
          {index !== entries.length - 1 && (
            <div className="absolute left-4 top-8 bottom-[-24px] w-0.5 bg-slate-100" />
          )}
          
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10",
            getActionColor(entry.action)
          )}>
            {getActionIcon(entry.action)}
          </div>
          
          <div className="flex flex-col gap-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 capitalize text-sm">
                {entry.action.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
            
            {entry.comment && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 max-w-md">
                "{entry.comment}"
              </div>
            )}
            
            <div className="text-[10px] text-slate-400 mt-1">
              By: <span className="font-medium text-slate-500">{entry.actor_name || entry.actor_id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
