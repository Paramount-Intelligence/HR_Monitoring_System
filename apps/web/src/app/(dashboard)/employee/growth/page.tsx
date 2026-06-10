'use client';

import { useState, useEffect, useMemo } from 'react';
import { growthApi, Goal, Note } from '@/lib/api/growth';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Loader2, Target, StickyNote, Calendar, CheckCircle2, 
  Circle, Trophy, Rocket, BookOpen, Brain, Star, History, ShieldCheck, Zap
} from 'lucide-react';
import { 
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, cleanReason } from '@/lib/utils';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { Badge } from '@/components/ui/badge';

const goalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  target_date: z.string().min(1, 'Target date is required'),
});

const noteSchema = z.object({
  content: z.string().min(5, 'Content must be at least 5 characters'),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type NoteFormValues = z.infer<typeof noteSchema>;

export default function EmployeeGrowthPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('goals');

  const fetchData = async () => {
    try {
      const [goalsData, notesData] = await Promise.all([
        growthApi.getGoals(),
        growthApi.getNotes()
      ]);
      setGoals(goalsData);
      setNotes(notesData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { title: '', description: '', target_date: '' },
  });

  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: '' },
  });

  const onGoalSubmit = async (data: GoalFormValues) => {
    try {
      await growthApi.createGoal(data);
      toast.success('Goal created');
      setIsGoalDialogOpen(false);
      goalForm.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const onNoteSubmit = async (data: NoteFormValues) => {
    try {
      await growthApi.createNote(data.content);
      toast.success('Note recorded');
      setIsNoteDialogOpen(false);
      noteForm.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdateGoalStatus = async (id: string, status: string) => {
    try {
      await growthApi.updateGoalStatus(id, status);
      toast.success(`Goal marked as ${status}`);
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const growthStats = useMemo(() => ({
    activeGoals: goals.filter((g) => g.status !== 'completed').length,
    completedGoals: goals.filter((g) => g.status === 'completed').length,
    dailyNotes: notes.length,
    feedbackReceived: 0,
  }), [goals, notes]);

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="My Growth"
        subtitle="Goals, daily notes, feedback, and development tracking"
        icon={Rocket}
        actions={
          <>
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-lg text-xs">
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Career Goal</DialogTitle>
                  <DialogDescription>Define a career goal or learning item to track your growth</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-4" id="goal-form">
                      <FormField control={goalForm.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Goal Title</FormLabel>
                          <FormControl><Input placeholder="Goal title" className="h-9 rounded-lg" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={goalForm.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Description</FormLabel>
                          <FormControl><Textarea placeholder="Define success..." className="min-h-[80px] rounded-lg resize-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={goalForm.control} name="target_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Target Date</FormLabel>
                          <FormControl><Input type="date" className="h-9 rounded-lg" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </form>
                  </Form>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsGoalDialogOpen(false)}>Discard</Button>
                  <Button type="submit" form="goal-form" size="sm" disabled={goalForm.formState.isSubmitting}>
                    {goalForm.formState.isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Save Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-lg text-xs">
                  <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Daily Note</DialogTitle>
                  <DialogDescription>Record professional thoughts or learnings</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <Form {...noteForm}>
                    <form onSubmit={noteForm.handleSubmit(onNoteSubmit)} className="space-y-4" id="note-form">
                      <FormField control={noteForm.control} name="content" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Content</FormLabel>
                          <FormControl><Textarea placeholder="Document your insights..." className="min-h-[120px] rounded-lg resize-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </form>
                  </Form>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsNoteDialogOpen(false)}>Discard</Button>
                  <Button type="submit" form="note-form" size="sm" disabled={noteForm.formState.isSubmitting}>
                    {noteForm.formState.isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Save Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Active Goals" value={growthStats.activeGoals} icon={Target} />
        <EmployeeMetricCard title="Completed Goals" value={growthStats.completedGoals} icon={CheckCircle2} />
        <EmployeeMetricCard title="Daily Notes" value={growthStats.dailyNotes} icon={StickyNote} />
        <EmployeeMetricCard title="Feedback Received" value={growthStats.feedbackReceived} icon={Star} />
      </EmployeeMetricGrid>

      <Tabs defaultValue="goals" className="w-full" onValueChange={setActiveTab}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-soft)]">
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-4 py-2 gap-2">
            <TabsList className="bg-transparent h-auto p-0 flex gap-1 border-none">
              <TabsTrigger 
                value="goals" 
                className="h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--accent-primary)] data-[state=active]:border data-[state=active]:border-[var(--border-default)] text-[var(--text-muted)]"
              >
                <Target className="mr-1.5 h-3.5 w-3.5" />
                Goals
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--accent-primary)] data-[state=active]:border data-[state=active]:border-[var(--border-default)] text-[var(--text-muted)]"
              >
                <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                Daily Notes
              </TabsTrigger>
            </TabsList>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {activeTab === 'goals' ? `${goals.length} goals` : `${notes.length} notes`}
            </div>
          </div>

          <div className="p-4">
            <TabsContent value="goals" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-0 focus-visible:outline-none">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><TableSkeleton rows={6} cols={1} /></div>
              ) : goals.length === 0 ? (
                <EmptyState title="No career goals" description="Establish career goals or learning items to track your growth." icon={Trophy} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {goals.map((goal) => (
                    <Card key={goal.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--border-default)] transition-all">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <div className="h-9 w-9 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--accent-primary)]">
                            {goal.status === 'completed' ? <Star className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                          </div>
                          <StatusBadge status={goal.status} />
                        </div>
                        <CardTitle className="text-sm font-semibold leading-snug">{goal.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-3">
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-3">{goal.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                            <Calendar className="h-3 w-3" />
                            {goal.target_date ? format(parseISO(goal.target_date), 'MMM d, yyyy') : 'No date'}
                          </div>
                          {goal.status !== 'completed' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-emerald-600" onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}>
                              Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-0 focus-visible:outline-none">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><TableSkeleton rows={4} cols={1} /></div>
              ) : notes.length === 0 ? (
                <EmptyState title="No daily notes" description="Record professional thoughts or learnings here." icon={Brain} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notes.map((note) => (
                    <Card key={note.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                      <CardDescription className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-2">
                        <History className="h-3 w-3" />
                        {format(parseISO(note.created_at), 'PPP')}
                      </CardDescription>
                      <CardContent className="p-0">
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {cleanReason(note.content)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </EmployeePageShell>
  );
}
