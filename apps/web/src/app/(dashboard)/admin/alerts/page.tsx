'use client';

import { useState, useEffect } from 'react';
import { alertsApi, Alert } from '@/lib/api/alerts';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Bell, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDateTime } from '@/lib/time';
import { getErrorMessage } from '@/lib/api/client';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await alertsApi.getAlerts();
      setAlerts(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await alertsApi.resolveAlert(id);
      toast.success('Alert resolved');
      await fetchAlerts();
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Bell className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monitoring</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Alerts</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Real-time monitoring of operational exceptions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
            {[1, 2, 3].map(i => (
                <Card key={i} className="rounded-[2.5rem] h-32 animate-pulse bg-slate-50 border-none shadow-premium" />
            ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-20">
          <EmptyState 
              title="No active alerts"
              message="All system signals are nominal. No active exceptions detected in the current cycle."
              icon={ShieldCheck}
          />
        </div>
      ) : (
        <div className="grid gap-6">
          {alerts.map(alert => (
            <Card key={alert.id} className={cn(
                "rounded-[2.5rem] shadow-premium border-none bg-white transition-all overflow-hidden",
                alert.status === 'RESOLVED' ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-premium-lg'
            )}>
              <CardContent className="p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                <div className="flex gap-6 items-start flex-1">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0",
                    alert.severity === 'CRITICAL' ? 'bg-rose-50' : alert.severity === 'WARNING' ? 'bg-amber-50' : 'bg-indigo-50'
                  )}>
                    {alert.severity === 'CRITICAL' ? (
                        <AlertTriangle className="h-7 w-7 text-rose-500" />
                    ) : (
                        <Zap className="h-7 w-7 text-indigo-500" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-black text-slate-900 text-xl tracking-tight leading-tight">{alert.title}</span>
                      <StatusBadge status={alert.severity} />
                      {alert.status === 'RESOLVED' && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[9px] uppercase tracking-widest px-3 h-6 rounded-lg">
                            RESOLVED
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-3xl">{alert.message}</p>
                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Clock className="h-3.5 w-3.5" />
                            DETECTION: {alert.created_at ? formatPKDateTime(alert.created_at) : 'PENDING'}
                        </div>
                        {alert.category && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {alert.category}
                            </div>
                        )}
                    </div>
                  </div>
                </div>
                
                {alert.status === 'OPEN' && (
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
                    onClick={() => handleResolve(alert.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    RESOLVE
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
