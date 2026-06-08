'use client';

import { useState, useEffect } from 'react';
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
  Dialog, DialogContent, DialogDescription, DialogHeader, 
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
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const goalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  target_date: z.string().min(1, 'Target date is required'),
});

const noteSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  category: z.string().min(1, 'Category is required'),
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
    defaultValues: { title: '', content: '', category: 'professional' },
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
      await growthApi.createNote(data);
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

  return (
    <div className="space-y-10 pb-20 max-w-[1400px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Rocket className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Career Growth</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Career Growth</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Track goals, learning items, and daily notes</p>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl border-none shadow-xl transition-all active:scale-95">
                <Target className="mr-2 h-4 w-4 text-white" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Add Career Goal</DialogTitle>
                <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">Define a career goal or learning item to track your growth</DialogDescription>
              </DialogHeader>
              <Form {...goalForm}>
                <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-8 pt-6">
                  <FormField control={goalForm.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Goal Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Master React Design Patterns" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={goalForm.control} name="description" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Description</FormLabel>
                      <FormControl><Textarea placeholder="Define what success looks like..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={goalForm.control} name="target_date" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Target Achievement Date</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-6 gap-4">
                    <Button type="button" variant="ghost" onClick={() => setIsGoalDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                    <Button type="submit" disabled={goalForm.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl border-none shadow-xl transition-all active:scale-95 flex-1">
                      {goalForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                      Save Goal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-14 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl transition-all active:scale-95">
                <StickyNote className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Add Daily Note</DialogTitle>
                <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">Record professional thoughts or learnings</DialogDescription>
              </DialogHeader>
              <Form {...noteForm}>
                <form onSubmit={noteForm.handleSubmit(onNoteSubmit)} className="space-y-8 pt-6">
                  <FormField control={noteForm.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Note Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Optimized SQL Query for Attendance" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={noteForm.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Select context" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          <SelectItem value="professional" className="text-xs font-bold">Professional</SelectItem>
                          <SelectItem value="technical" className="text-xs font-bold">Technical</SelectItem>
                          <SelectItem value="strategic" className="text-xs font-bold">Strategic</SelectItem>
                          <SelectItem value="personal" className="text-xs font-bold">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={noteForm.control} name="content" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Content</FormLabel>
                      <FormControl><Textarea placeholder="Document your insights..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[140px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-6 gap-4">
                    <Button type="button" variant="ghost" onClick={() => setIsNoteDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                    <Button type="submit" disabled={noteForm.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl border-none shadow-xl transition-all active:scale-95 flex-1">
                      {noteForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                      Save Note
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="goals" className="w-full" onValueChange={setActiveTab}>
        <div className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden border border-[var(--border-subtle)]">
          {/* Integrated Connected Tab Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 px-8 py-5 gap-4">
            <TabsList className="bg-transparent h-auto p-0 flex gap-2 border-none">
              <TabsTrigger 
                value="goals" 
                className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--accent-primary)] data-[state=active]:border-[var(--border-subtle)] data-[state=active]:shadow-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Target className="mr-2 h-4 w-4" />
                Goals
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--accent-primary)] data-[state=active]:border-[var(--border-subtle)] data-[state=active]:shadow-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <StickyNote className="mr-2 h-4 w-4" />
                Daily Notes
              </TabsTrigger>
            </TabsList>
            <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] sm:pr-2">
              {activeTab === 'goals' ? `${goals.length} Goals Tracked` : `${notes.length} Insights Logged`}
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <TabsContent value="goals" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-0 focus-visible:outline-none">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><TableSkeleton rows={6} cols={1} /></div>
              ) : goals.length === 0 ? (
                <div className="p-20 bg-[var(--bg-subtle)]/20 rounded-[3rem] shadow-inner border border-[var(--border-subtle)]"><EmptyState title="No career goals" message="Establish career goals or learning items to track your career evolution." icon={Trophy} /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {goals.map((goal) => (
                    <Card key={goal.id} className="border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden group hover:shadow-[var(--shadow-hard)] hover:border-[var(--border-default)] transition-all duration-500 text-[var(--text-primary)]">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-6">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[var(--accent-primary)] group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            {goal.status === 'completed' ? <Star className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
                          </div>
                          <StatusBadge status={goal.status} />
                        </div>
                        <CardTitle className="text-xl font-black tracking-tight leading-snug group-hover:text-[var(--accent-primary)] transition-colors">
                          {goal.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8 space-y-6">
                        <p className="text-[var(--text-secondary)] font-medium text-sm leading-relaxed h-20 overflow-hidden line-clamp-3 italic">
                          {goal.description}
                        </p>
                        <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                            <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            Target: {goal.target_date ? format(parseISO(goal.target_date), 'MMM d, yyyy') : 'No date'}
                          </div>
                          {goal.status !== 'completed' && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 px-4 rounded-xl font-black text-emerald-600 text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all border-none"
                                onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}
                            >
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
                <div className="p-20 bg-[var(--bg-subtle)]/20 rounded-[3rem] shadow-inner border border-[var(--border-subtle)]"><EmptyState title="No daily notes" message="Record professional thoughts or learnings here." icon={Brain} /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {notes.map((note) => (
                    <Card key={note.id} className="border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden p-10 group relative text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all duration-300">
                      <div className="absolute top-0 right-0 p-8">
                          <Badge variant="outline" className="h-6 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                            {note.category}
                          </Badge>
                      </div>
                      <CardHeader className="p-0 mb-6 text-[var(--text-primary)]">
                        <CardTitle className="text-2xl font-black tracking-tight group-hover:text-[var(--accent-primary)] transition-colors">
                          {note.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2">
                            <History className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            Logged on {format(parseISO(note.created_at), 'PPP')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <p className="text-[var(--text-secondary)] font-medium text-sm leading-relaxed whitespace-pre-wrap italic">
                          "{note.content}"
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
    </div>
  );
}
