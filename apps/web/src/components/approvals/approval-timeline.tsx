import { ApprovalTimelineEntry } from '@/lib/api/leaves';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, MessageSquare, AlertTriangle, XCircle, Share2, Plus, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalTimelineProps {
  entries: ApprovalTimelineEntry[];
}

export function ApprovalTimeline({ entries }: ApprovalTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center gap-3 text-slate-400 py-4 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <Clock className="h-4 w-4 opacity-50" />
        <span className="text-[10px] font-black uppercase tracking-widest italic">No governance history detected</span>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="h-3.5 w-3.5" />;
      case 'clarified':
        return <MessageSquare className="h-3.5 w-3.5" />;
      case 'approved':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'escalated':
        return <ArrowUpRight className="h-3.5 w-3.5" />;
      case 'cancelled':
        return <Share2 className="h-3.5 w-3.5 rotate-180" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-50 text-blue-600 ring-4 ring-blue-50/50';
      case 'clarified':
        return 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50';
      case 'approved':
        return 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50';
      case 'rejected':
        return 'bg-rose-50 text-rose-600 ring-4 ring-rose-50/50';
      case 'escalated':
        return 'bg-purple-50 text-purple-600 ring-4 ring-purple-50/50';
      case 'cancelled':
        return 'bg-slate-50 text-slate-500 ring-4 ring-slate-50/50';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  return (
    <div className="space-y-10 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:content-['']">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-6 group">
          <div className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 z-10 shadow-sm transition-transform group-hover:scale-110",
            getActionColor(entry.action)
          )}>
            {getActionIcon(entry.action)}
          </div>
          
          <div className="flex flex-col gap-1 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-black text-slate-900 uppercase text-[10px] tracking-[0.1em]">
                {entry.action.replace('_', ' ')}
              </span>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
            
            {entry.comment && (
              <div className="text-sm font-bold text-slate-600 bg-white p-4 rounded-[1.25rem] border border-slate-100 mt-2 shadow-sm italic leading-relaxed">
                "{entry.comment}"
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Plus className="h-2 w-2 text-slate-400" />
              </div>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                Initiated By: <span className="text-indigo-600">{entry.actor_name || `Agent ${entry.actor_id.slice(0, 5)}`}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
