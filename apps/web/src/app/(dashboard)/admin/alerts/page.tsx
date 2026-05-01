'use client';

import { useEffect, useState } from 'react';
import { alertsApi, Alert } from '@/lib/api/alerts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Bell, CheckCircle2 } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const data = await alertsApi.getAlerts();
      setAlerts(data);
    } catch (error) {
      toast.error('Failed to load alerts');
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case 'medium': return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge>{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Alerts</h1>
        <p className="text-sm text-slate-500">Manage and resolve exceptions across the organization.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
            <Bell className="h-16 w-16 text-slate-200 mb-4" />
            <h2 className="text-lg font-medium text-slate-900 mb-2">All clear</h2>
            <p className="max-w-md text-sm">You have no active alerts in your inbox.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {alerts.map(alert => (
            <Card key={alert.id} className={`shadow-sm ${alert.status === 'RESOLVED' ? 'opacity-60 bg-slate-50' : ''}`}>
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{alert.title}</span>
                    {getSeverityBadge(alert.severity)}
                    {alert.status === 'RESOLVED' && <Badge variant="secondary">Resolved</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{alert.message}</p>
                  <div className="text-xs text-slate-400 pt-1">
                    Received: {alert.created_at ? format(parseISO(alert.created_at), 'PPp') : '-'}
                  </div>
                </div>
                
                {alert.status === 'OPEN' && (
                  <Button 
                    variant="outline" 
                    className="shrink-0 w-full sm:w-auto"
                    onClick={() => handleResolve(alert.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                    Mark Resolved
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
