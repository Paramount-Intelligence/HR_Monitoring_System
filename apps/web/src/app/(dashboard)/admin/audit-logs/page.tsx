'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Search, Filter, Eye, History, User as UserIcon, Activity } from 'lucide-react';
import { auditLogsApi } from '@/lib/api/auditLogs';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeletons';
import { cn } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await auditLogsApi.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.action_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.entity_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.actor_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    const a = (action || '').toUpperCase();
    if (a.includes('CREATED') || a.includes('ACTIVATED') || a === 'LOGIN') return 'bg-emerald-50 text-emerald-700 border-emerald-100 border-none';
    if (a.includes('DELETED') || a.includes('DEACTIVATED') || a.includes('SUSPENDED') || a === 'LOGIN_FAILED') return 'bg-rose-50 text-rose-700 border-rose-100 border-none';
    if (a.includes('UPDATED') || a.includes('CHANGED')) return 'bg-blue-50 text-blue-700 border-blue-100 border-none';
    if (a.includes('PASSWORD')) return 'bg-violet-50 text-violet-700 border-violet-100 border-none';
    return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <History className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Compliance Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Audit Logs</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Full compliance logs of all organizational actions</p>
        </div>
        
        <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input 
                placeholder="Search actor, action, or entity..." 
                className="h-12 pl-12 rounded-2xl border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm font-bold text-xs focus:ring-[var(--accent-primary)] text-[var(--text-primary)]" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
            <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                <Activity className="h-6 w-6 text-[var(--accent-primary)]" />
                System Activity
            </CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight mt-1">Real-time governance audit trail</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--bg-subtle)]">
                <TableRow className="h-16 border-b border-[var(--border-subtle)]">
                  <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Timestamp</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actor</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Action Type</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Entity Affected</TableHead>
                  <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-10">
                        <TableSkeleton rows={10} cols={5} />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                            <ShieldCheck className="h-12 w-12 text-[var(--text-muted)]" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No matching logs found</p>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="h-20 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]/50 transition-all">
                      <TableCell className="pl-10 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-black text-[var(--text-primary)] text-xs tracking-tight">
                                {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy') : 'Unknown'}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">
                                {log.created_at ? format(new Date(log.created_at), 'HH:mm:ss') : '--:--:--'}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                                <UserIcon className="h-4 w-4 text-[var(--text-muted)]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-[var(--text-primary)] text-xs tracking-tight">
                                    {log.actor_name || 'System Process'}
                                </span>
                                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest truncate max-w-[150px]">
                                    {log.actor_email || 'INTERNAL'}
                                </span>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                            "rounded-lg text-[8px] font-black uppercase tracking-widest px-2.5 h-6",
                            getActionColor(log.action_type)
                        )}>
                          {log.action_type || 'UNDEFINED'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="capitalize text-xs font-black text-[var(--text-secondary)] tracking-tight">
                                {log.entity_type || 'System'}
                            </span>
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[120px]">
                                {log.entity_name || (log.entity_id ? `ID: ${log.entity_id.substring(0, 8)}` : 'N/A')}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-[var(--bg-subtle)] transition-all">
                          <Eye className="h-4 w-4 text-[var(--text-muted)] hover:text-[var(--accent-primary)]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
