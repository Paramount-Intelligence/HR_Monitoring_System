'use client';

import { useEffect, useState } from 'react';
import { timeLogsApi, TimeLog } from '@/lib/api/timeLogs';
import { tasksApi, Task } from '@/lib/api/tasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, formatDuration, intervalToDuration } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, PlayCircle, StopCircle, Clock, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const manualLogSchema = z.object({
  task_id: z.string().min(1, 'Task is required'),
  started_at: z.string().min(1, 'Start time is required'),
  ended_at: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
});

type ManualLogValues = z.infer<typeof manualLogSchema>;

export default function TimeLogsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [logsData, tasksData] = await Promise.all([
        timeLogsApi.getMyLogs(),
        tasksApi.getTasks()
      ]);
      setLogs(logsData);
      setTasks(tasksData);
    } catch (error) {
      toast.error('Failed to load time tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeLog = logs.find(l => l.status === 'active');

  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      toast.error('Please select a task to track');
      return;
    }
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.startTimer(selectedTaskId);
      toast.success('Timer started');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start timer');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeLog) return;
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.stopTimer(activeLog.task_id);
      toast.success('Timer stopped');
      setSelectedTaskId('');
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to stop timer');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const manualForm = useForm<ManualLogValues>({
    resolver: zodResolver(manualLogSchema),
    defaultValues: {
      task_id: '',
      started_at: '',
      ended_at: '',
      notes: '',
    },
  });

  const onManualSubmit = async (data: ManualLogValues) => {
    try {
      await timeLogsApi.createManualLog({
        task_id: data.task_id,
        started_at: new Date(data.started_at).toISOString(),
        ended_at: new Date(data.ended_at).toISOString(),
        notes: data.notes
      });
      toast.success('Manual log created');
      setIsManualDialogOpen(false);
      manualForm.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create manual log');
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'PPp');
    } catch {
      return dateStr;
    }
  };

  const formatDurationString = (minutes: number) => {
    if (!minutes) return '-';
    const duration = intervalToDuration({ start: 0, end: minutes * 60 * 1000 });
    return formatDuration(duration, { format: ['hours', 'minutes'] });
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Time Logs</h1>
          <p className="text-sm text-[var(--text-secondary)]">Track and manage your project time logs</p>
        </div>

        <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] font-bold rounded-xl h-11 px-6 text-xs uppercase tracking-widest">
              <Plus className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
              Manual Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] p-8 text-[var(--text-primary)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">Manual Time Log</DialogTitle>
              <DialogDescription className="text-sm font-medium text-[var(--text-muted)]">
                Add a manual time log entry
              </DialogDescription>
            </DialogHeader>
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4 pt-4">
                <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Task</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                        {tasks.filter(t => t.status !== 'completed').map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={manualForm.control} name="started_at" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Start Time</FormLabel>
                      <FormControl><Input type="datetime-local" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="ended_at" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">End Time</FormLabel>
                      <FormControl><Input type="datetime-local" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                    </FormItem>
                  )} />
                </div>
                <FormField control={manualForm.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="What did you work on?" className="resize-none rounded-xl border-[var(--border-default)] min-h-[100px] font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={manualForm.formState.isSubmitting} className="bg-[var(--accent-primary)] hover:opacity-90 border-none text-white font-bold h-11 px-6 rounded-xl shadow-sm">
                    {manualForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                    Save Log
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)] relative rounded-xl">
        {activeLog && (
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)] animate-pulse" />
        )}
        <CardHeader className="bg-[var(--bg-subtle)]/30 border-b border-[var(--border-subtle)]">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
            <Clock className="h-5 w-5 text-[var(--accent-primary)]" />
            Active Timer
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-muted)] font-medium">Select a task and start tracking your time.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              {activeLog ? (
                <div className="p-4 bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)] rounded-xl">
                  <span className="text-xs text-[var(--text-muted)] block mb-1 font-bold">Currently Tracking:</span>
                  <span className="font-bold text-[var(--text-primary)] text-base">
                    {tasks.find(t => t.id === activeLog.task_id)?.title || 'Unknown Task'}
                  </span>
                  <div className="text-xs text-[var(--accent-primary)] mt-2 flex items-center gap-1 font-bold">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                    Started at {formatDateTime(activeLog.started_at)}
                  </div>
                </div>
              ) : (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="w-full bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl h-12">
                    <SelectValue placeholder="Select a task to track..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                    {tasks.filter(t => t.status !== 'completed').map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="w-full md:w-auto flex justify-end">
              {activeLog ? (
                <Button 
                  size="lg" 
                  variant="destructive" 
                  onClick={handleStopTimer}
                  disabled={isTimerActionLoading}
                  className="w-full md:w-auto h-12 px-8 rounded-xl font-bold uppercase tracking-wider text-xs border-none shadow-sm"
                >
                  {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <StopCircle className="mr-2 h-5 w-5 text-white" />}
                  Stop Timer
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full md:w-auto h-12 px-8 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 font-bold uppercase tracking-wider text-xs border-none text-white shadow-sm"
                  onClick={handleStartTimer}
                  disabled={isTimerActionLoading || !selectedTaskId}
                >
                  {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <PlayCircle className="mr-2 h-5 w-5 text-white" />}
                  Start Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Recent Time Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] italic font-bold">
              No time logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)]">
                    <TableHead className="w-[300px] font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Task</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Start Time</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">End Time</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Duration</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={cn("hover:bg-[var(--bg-subtle)]/50 border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-primary)]", log.status === 'active' && 'bg-[var(--bg-subtle)]/40')}>
                      <TableCell className="px-6 py-4">
                        <div className="font-bold text-[var(--text-primary)] truncate max-w-[280px]">
                          {tasks.find(t => t.id === log.task_id)?.title || 'Unknown Task'}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium px-6 py-4">{formatDateTime(log.started_at)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium px-6 py-4">
                        {log.status === 'active' ? (
                          <span className="text-[var(--accent-primary)] italic font-bold">Running...</span>
                        ) : (
                          formatDateTime(log.ended_at)
                        )}
                      </TableCell>
                      <TableCell className="font-bold px-6 py-4">
                        {log.status === 'active' ? '-' : formatDurationString(log.duration_minutes)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-[var(--text-muted)] border-[var(--border-subtle)] font-bold text-[10px]">
                          {log.source_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
