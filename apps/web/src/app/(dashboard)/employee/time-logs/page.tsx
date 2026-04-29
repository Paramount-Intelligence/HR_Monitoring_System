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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Time Tracking</h1>
          <p className="text-sm text-slate-500">Record your time against specific tasks.</p>
        </div>

        <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
          <DialogTrigger render={<Button variant="outline" className="bg-white" />}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Entry
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Manual Time Log</DialogTitle>
              <DialogDescription>
                Fallback entry if you forgot to start your timer.
              </DialogDescription>
            </DialogHeader>
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4 pt-4">
                <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                  <FormItem><FormLabel>Task</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a task" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {tasks.filter(t => t.status !== 'completed').map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={manualForm.control} name="started_at" render={({ field }) => (
                    <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={manualForm.control} name="ended_at" render={({ field }) => (
                    <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={manualForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="What did you work on?" className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={manualForm.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                    {manualForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Log
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-blue-100 overflow-hidden relative">
        {activeLog && (
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 animate-pulse" />
        )}
        <CardHeader className="bg-slate-50/50">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Active Timer
          </CardTitle>
          <CardDescription>Select a task and start tracking your time.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 w-full">
              {activeLog ? (
                <div className="p-3 bg-white border rounded-md">
                  <span className="text-sm text-slate-500 block mb-1">Currently Tracking:</span>
                  <span className="font-medium text-slate-900">
                    {tasks.find(t => t.id === activeLog.task_id)?.title || 'Unknown Task'}
                  </span>
                  <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    Started at {formatDateTime(activeLog.started_at)}
                  </div>
                </div>
              ) : (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select a task to track..." />
                  </SelectTrigger>
                  <SelectContent>
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
                  className="w-full md:w-auto shadow-md"
                >
                  {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                  Stop Timer
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 shadow-md"
                  onClick={handleStartTimer}
                  disabled={isTimerActionLoading || !selectedTaskId}
                >
                  {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                  Start Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No time logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[300px]">Task</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={log.status === 'active' ? 'bg-blue-50/50' : ''}>
                      <TableCell>
                        <div className="font-medium text-slate-900 truncate max-w-[280px]">
                          {tasks.find(t => t.id === log.task_id)?.title || 'Unknown Task'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{formatDateTime(log.started_at)}</TableCell>
                      <TableCell className="text-slate-500">
                        {log.status === 'active' ? (
                          <span className="text-blue-600 italic">Running...</span>
                        ) : (
                          formatDateTime(log.ended_at)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.status === 'active' ? '-' : formatDurationString(log.duration_minutes)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-slate-500">
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
