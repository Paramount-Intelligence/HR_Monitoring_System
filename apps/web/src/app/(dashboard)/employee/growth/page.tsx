'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Award, Target, BookOpen, Plus, TrendingUp, Star, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { growthApi } from '@/lib/api/growth';
import { format } from 'date-fns';

export default function EmployeeGrowthPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGrowthData();
  }, []);

  const fetchGrowthData = async () => {
    setIsLoading(true);
    try {
      const [goalsData, achievementsData, notesData] = await Promise.all([
        growthApi.getGoals(),
        growthApi.getAchievements(),
        growthApi.getNotes()
      ]);
      setGoals(goalsData);
      setAchievements(achievementsData);
      setNotes(notesData);
    } catch (error) {
      console.error('Failed to fetch growth data');
      toast.error('Failed to load growth data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await growthApi.createNote(newNote);
      toast.success('Note added to journal');
      setNewNote('');
      setIsNoteDialogOpen(false);
      fetchGrowthData();
    } catch (error) {
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Personal Growth</h1>
        <p className="text-slate-500">Track your goals, achievements, and professional development.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Goals Section */}
        <Card className="col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Goals</CardTitle>
              <CardDescription>Your professional targets and key results.</CardDescription>
            </div>
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Set New Goal</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Title</Label><Input placeholder="e.g. Complete Advanced React Course" /></div>
                  <div className="space-y-2"><Label>Target Metric</Label><Input placeholder="e.g. Modules completed" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Target Value</Label><Input type="number" /></div>
                    <div className="space-y-2"><Label>Deadline</Label><Input type="date" /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => setIsGoalDialogOpen(false)}>Create Goal</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-6">
            {goals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic">No active goals found. Time to set some!</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900">{goal.title}</div>
                    <Badge variant="outline">{goal.current_value} / {goal.target_value} {goal.target_metric}</Badge>
                  </div>
                  <Progress value={(goal.current_value / goal.target_value) * 100} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Target Date: {format(new Date(goal.deadline), 'PP')}</span>
                    <span className="font-medium text-blue-600">{Math.round((goal.current_value / goal.target_value) * 100)}% complete</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Achievements Section */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Achievements
            </CardTitle>
            <CardDescription>Badges you've earned.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {achievements.length === 0 ? (
                <div className="col-span-3 text-center py-4 text-xs text-slate-400">Keep up the good work to earn badges!</div>
              ) : (
                achievements.map((ach) => (
                  <div key={ach.id} className="flex flex-col items-center gap-2 text-center">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Star className="h-6 w-6 fill-current" />
                    </div>
                    <span className="text-[10px] font-medium leading-tight">{ach.badge_name}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Notes Section */}
        <Card className="col-span-full border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-500" />
                Growth Journal
              </CardTitle>
              <CardDescription>Reflect on your daily learnings and wins.</CardDescription>
            </div>
            
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Journal Entry</DialogTitle>
                  <DialogDescription>Record a learning, win, or reflection for today.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="note">Your Note</Label>
                    <Textarea 
                      id="note" 
                      placeholder="Today I learned how to..." 
                      className="min-h-[150px] resize-none"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddNote} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Note'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic">Start your journal today.</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="flex gap-4 p-4 rounded-lg bg-slate-50/50">
                    <div className="flex flex-col items-center pt-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-semibold text-slate-900">{format(new Date(note.note_date), 'EEEE, MMMM do')}</div>
                      <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
