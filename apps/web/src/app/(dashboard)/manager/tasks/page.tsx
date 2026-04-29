'use client';

import { useEffect, useState } from 'react';
import { tasksApi, Task } from '@/lib/api/tasks';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckSquare, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { projectsApi, Project } from '@/lib/api/projects';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const taskSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [complexity, setComplexity] = useState<number>(1);
  const [expectedDuration, setExpectedDuration] = useState<number>(60);
  const [isUpdating, setIsUpdating] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project_id: '',
      assigned_to: '',
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const fetchData = async () => {
    try {
      const [tasksData, teamData, projectsData] = await Promise.all([
        tasksApi.getTasks(),
        usersApi.getUsers(),
        projectsApi.getProjects({ projectStatus: 'active' })
      ]);
      setTasks(tasksData);
      setTeam(teamData.filter(u => u.role !== 'admin')); // Exclude admins from assignees
      setProjects(projectsData);
    } catch (error) {
      toast.error('Failed to load team tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onCreateSubmit = async (data: TaskFormValues) => {
    try {
      await tasksApi.createTask({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined
      });
      toast.success('Task created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create task');
    }
  };

  const handleUpdateComplexity = async () => {
    if (!selectedTask) return;
    setIsUpdating(true);
    try {
      await tasksApi.setComplexity(selectedTask.id, complexity, expectedDuration);
      toast.success('Task complexity updated');
      setSelectedTask(null);
      await fetchData();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update complexity');
    } finally {
      setIsUpdating(false);
    }
  };

  const getAssigneeName = (id: string) => {
    const user = team.find(u => u.id === id);
    return user ? user.full_name : 'Unknown';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Completed</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Tasks</h1>
          <p className="text-sm text-slate-500">Monitor task progress and define complexity.</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Assign a new task to a team member.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem><FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assigned_to" render={({ field }) => (
                  <FormItem><FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {team.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input placeholder="Implement API" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Details..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem><FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 w-full">
                    {form.formState.isSubmitting ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Complexity</DialogTitle>
            <DialogDescription>
              Define the complexity level and expected duration for "{selectedTask?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="complexity">Complexity Level (1-5)</Label>
              <Input 
                id="complexity" 
                type="number" 
                min={1} 
                max={5} 
                value={complexity}
                onChange={(e) => setComplexity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Expected Duration (Minutes)</Label>
              <Input 
                id="duration" 
                type="number" 
                min={15} 
                step={15}
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(parseInt(e.target.value) || 60)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateComplexity} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckSquare className="h-12 w-12 text-slate-200 mb-4" />
              <p>No tasks found for your team.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[300px]">Task</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className={task.status === 'blocked' ? 'bg-rose-50/30' : ''}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{task.title}</div>
                        {task.status === 'blocked' && task.blocked_reason && (
                          <div className="text-xs text-rose-600 font-medium mt-1">
                            Blocked: {task.blocked_reason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{getAssigneeName(task.assigned_to)}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        {task.complexity_level ? (
                          <div className="text-sm">
                            <span className="font-medium">L{task.complexity_level}</span>
                            <span className="text-xs text-slate-500 ml-1">({task.expected_duration_minutes}m)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium italic">Unset</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={selectedTask?.id === task.id} onOpenChange={(open) => !open && setSelectedTask(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setComplexity(task.complexity_level || 1);
                                setExpectedDuration(task.expected_duration_minutes || 60);
                                setSelectedTask(task);
                              }}
                            >
                              Set Target
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Set Complexity</DialogTitle>
                              <DialogDescription>
                                Define the complexity level and expected duration for "{task.title}".
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="complexity">Complexity Level (1-5)</Label>
                                <Input 
                                  id="complexity" 
                                  type="number" 
                                  min={1} 
                                  max={5} 
                                  value={complexity}
                                  onChange={(e) => setComplexity(parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="duration">Expected Duration (Minutes)</Label>
                                <Input 
                                  id="duration" 
                                  type="number" 
                                  min={15} 
                                  step={15}
                                  value={expectedDuration}
                                  onChange={(e) => setExpectedDuration(parseInt(e.target.value) || 60)}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={handleUpdateComplexity} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
