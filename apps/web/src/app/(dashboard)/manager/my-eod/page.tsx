'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Clock, CheckSquare, Briefcase, FileText, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MyEODPage() {
  const [eod, setEod] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEOD();
  }, []);

  async function loadEOD() {
    try {
      setIsLoading(true);
      const data = await eodApi.getMyEOD();
      setEod(data);
    } catch (error) {
      toast.error('Failed to load EOD status');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setIsSubmitting(true);
      const generated = await eodApi.generateMyEOD();
      setEod(generated);
      toast.success('EOD Report auto-generated successfully');
    } catch (error) {
      toast.error('Failed to generate EOD');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      const submitted = await eodApi.submitEOD();
      setEod(submitted);
      toast.success('EOD Report submitted to manager');
    } catch (error) {
      toast.error('Failed to submit EOD');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">End of Day Report</h1>
          <p className="text-sm text-slate-500">Review your automated daily summary before submitting to your manager.</p>
        </div>
      </div>

      {!eod ? (
        <Card className="shadow-sm border-blue-100 bg-blue-50/50 text-center py-16">
          <CardContent className="flex flex-col items-center">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <ShieldCheck className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Ready to wrap up?</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Generate your EOD report. The system will compile your attendance, tasks, duties, and productivity automatically.
            </p>
            <Button 
              size="lg" 
              onClick={handleGenerate} 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
              Generate EOD Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white border shadow-sm rounded-xl">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-full",
                eod.status === 'Approved' ? "bg-emerald-100" :
                eod.status === 'Needs Revision' ? "bg-rose-100" :
                eod.status === 'Pending Approval' ? "bg-amber-100" : "bg-blue-100"
              )}>
                <ShieldCheck className={cn(
                  "h-6 w-6",
                  eod.status === 'Approved' ? "text-emerald-600" :
                  eod.status === 'Needs Revision' ? "text-rose-600" :
                  eod.status === 'Pending Approval' ? "text-amber-600" : "text-blue-600"
                )} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Current Status</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{eod.status}</h2>
                  {eod.status === 'Needs Revision' && <Badge variant="destructive">Action Required</Badge>}
                </div>
              </div>
            </div>
            
            {(eod.status === 'Generated' || eod.status === 'Needs Revision') && (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit to Manager
              </Button>
            )}
          </div>

          {eod.manager_comments && (
            <Card className="shadow-sm border-rose-200 bg-rose-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Manager Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-rose-900 leading-relaxed">{eod.manager_comments}</p>
                {eod.status === 'Needs Revision' && (
                  <Button variant="outline" size="sm" onClick={handleGenerate} className="mt-4 bg-white">
                    Refresh Report Data
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" /> Attendance & Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Date</span>
                    <span className="text-sm font-medium">{eod.date}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Work Mode</span>
                    <span className="text-sm font-medium uppercase">{eod.work_mode}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Login Time</span>
                    <span className="text-sm font-medium">{eod.login_time}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Logout Time</span>
                    <span className="text-sm font-medium">{eod.logout_time || 'Pending'}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm font-semibold text-slate-900">Total Hours Logged</span>
                    <span className="text-sm font-bold text-blue-600">{eod.total_hours}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-slate-500" /> Tasks & Duties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Total Tasks Worked On</span>
                    <span className="text-sm font-medium">{eod.tasks_worked_on}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Tasks Completed</span>
                    <span className="text-sm font-medium text-emerald-600">{eod.completed_tasks}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Tasks Pending</span>
                    <span className="text-sm font-medium text-amber-600">{eod.pending_tasks}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-slate-500">Blocked Items</span>
                    <span className="text-sm font-medium text-rose-600">{eod.blocked_tasks}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-sm font-semibold text-slate-900">Duties Performed</span>
                    <span className="text-sm font-bold text-blue-600">{eod.duties_performed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 p-3 rounded-xl border border-blue-400">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-medium">Daily Productivity Score</p>
                    <p className="text-2xl font-bold">{eod.productivity_score}/100</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Status</p>
                  <p className="font-medium text-blue-400">{eod.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
