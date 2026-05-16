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
      toast.success('Professional goal established');
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
      toast.success('Professional note recorded');
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
    <div className="space-y-10 pb-20 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Rocket className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Growth</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Growth</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Professional Development & Notes</p>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
                <Target className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Establish Goal</DialogTitle>
                <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight">Define a professional milestone for operational growth</DialogDescription>
              </DialogHeader>
              <Form {...goalForm}>
                <form onSubmit={goalForm.handleSubmit(onGoalSubmit)} className="space-y-8 pt-6">
                  <FormField control={goalForm.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Goal Identity</FormLabel>
                      <FormControl><Input placeholder="e.g. Master React Design Patterns" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={goalForm.control} name="description" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Objective Scope</FormLabel>
                      <FormControl><Textarea placeholder="Define what success looks like..." className="resize-none rounded-[1.5rem] bg-slate-50/50 border-slate-100 min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={goalForm.control} name="target_date" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Achievement Date</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-6 gap-4">
                    <Button type="button" variant="ghost" onClick={() => setIsGoalDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1">Discard</Button>
                    <Button type="submit" disabled={goalForm.formState.isSubmitting} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1 text-white">
                      {goalForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Activate Goal
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-14 bg-white border border-slate-100 hover:bg-slate-50 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl transition-all active:scale-95">
                <StickyNote className="mr-2 h-4 w-4" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Record Knowledge</DialogTitle>
                <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight">Capture professional insights or technical breakthroughs</DialogDescription>
              </DialogHeader>
              <Form {...noteForm}>
                <form onSubmit={noteForm.handleSubmit(onNoteSubmit)} className="space-y-8 pt-6">
                  <FormField control={noteForm.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Note Identity</FormLabel>
                      <FormControl><Input placeholder="e.g. Optimized SQL Query for Attendance" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={noteForm.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contextual Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold"><SelectValue placeholder="Select context" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-premium-lg">
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
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Knowledge Content</FormLabel>
                      <FormControl><Textarea placeholder="Document your insights..." className="resize-none rounded-[1.5rem] bg-slate-50/50 border-slate-100 min-h-[140px] font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-6 gap-4">
                    <Button type="button" variant="ghost" onClick={() => setIsNoteDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1">Discard</Button>
                    <Button type="submit" disabled={noteForm.formState.isSubmitting} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1 text-white">
                      {noteForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Record Insight
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="goals" className="w-full" onValueChange={setActiveTab}>
        <div className="flex justify-center mb-10">
            <TabsList className="h-16 p-2 bg-slate-100/50 rounded-[2rem] border border-slate-200/40 backdrop-blur-sm">
                <TabsTrigger value="goals" className="h-12 px-10 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium transition-all">
                    <Target className="mr-2 h-4 w-4" />
                    Strategic Goals
                </TabsTrigger>
                <TabsTrigger value="notes" className="h-12 px-10 rounded-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-premium transition-all">
                    <StickyNote className="mr-2 h-4 w-4" />
                    Knowledge Notes
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="goals" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><TableSkeleton rows={6} cols={1} /></div>
          ) : goals.length === 0 ? (
            <div className="p-20 bg-white rounded-[3rem] shadow-premium"><EmptyState title="No growth goals" message="Establish professional milestones to track your career evolution." icon={Trophy} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {goals.map((goal) => (
                <Card key={goal.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-premium-lg transition-all duration-500">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex justify-between items-start mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                        {goal.status === 'completed' ? <Star className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
                      </div>
                      <StatusBadge status={goal.status} />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                      {goal.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <p className="text-slate-500 font-medium text-sm leading-relaxed h-20 overflow-hidden line-clamp-3 italic">
                      {goal.description}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Calendar className="h-3.5 w-3.5" />
                        Target: {goal.target_date ? format(parseISO(goal.target_date), 'MMM d, yyyy') : 'No date'}
                      </div>
                      {goal.status !== 'completed' && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-4 rounded-xl font-black text-emerald-600 text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all"
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

        <TabsContent value="notes" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><TableSkeleton rows={4} cols={1} /></div>
          ) : notes.length === 0 ? (
            <div className="p-20 bg-white rounded-[3rem] shadow-premium"><EmptyState title="Notes clear" message="Capture technical insights and breakthrough moments here." icon={Brain} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {notes.map((note) => (
                <Card key={note.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden p-10 group relative">
                  <div className="absolute top-0 right-0 p-8">
                      <Badge variant="outline" className="h-6 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 border-slate-100 bg-slate-50">
                        {note.category}
                      </Badge>
                  </div>
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {note.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                        <History className="h-3.5 w-3.5" />
                        Logged on {format(parseISO(note.created_at), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-slate-600 font-medium text-sm leading-relaxed whitespace-pre-wrap italic">
                      "{note.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
