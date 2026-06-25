'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { messagesApi } from '@/lib/api/messages';
import { User } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { 
  Plus, Loader2, Briefcase, CheckCircle2, UserPlus, Search, ShieldCheck, Zap, Calendar, ExternalLink, Target, Users, MessageSquare, Pencil, Archive
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getAssigneeLabel,
  makeAssigneeOptions,
  makeProjectOptions,
  resolveOptionLabel,
  buildUsersById,
  getUserLabel,
} from '@/lib/display-labels';
import { TaskEditDialog } from '@/components/tasks/TaskEditDialog';
import { ManagerCompletionRequestsPanel } from '@/components/tasks/ManagerCompletionRequestsPanel';
import { modalFormClass, modalFormFieldClass, modalFormGridClass } from '@/lib/modal-layout';
import {
  DEFAULT_TASK_FILTERS,
  applyTaskFilters,
  hasActiveTaskFilters,
  type TaskFilterState,
  type TaskDeadlineFilter,
  type TaskPriorityFilter,
  type TaskSortOption,
  type TaskStatusFilter,
} from '@/lib/tasks/task-filters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const assignTaskSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type AssignTaskFormValues = z.infer<typeof assignTaskSchema>;

const STATUS_FILTER_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'created', label: 'Created' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'reopened', label: 'Reopened' },
];

const PRIORITY_FILTER_OPTIONS: { value: TaskPriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const DEADLINE_FILTER_OPTIONS: { value: TaskDeadlineFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'no_deadline', label: 'No Deadline' },
];

const SORT_OPTIONS: { value: TaskSortOption; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'deadline_soonest', label: 'Deadline Soonest' },
  { value: 'deadline_latest', label: 'Deadline Latest' },
  { value: 'priority_high', label: 'Priority High to Low' },
  { value: 'priority_low', label: 'Priority Low to High' },
];

export default function ManagerTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') === 'completion-requests' ? 'completion-requests' : 'tasks';
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_TASK_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [archivingTask, setArchivingTask] = useState<Task | null>(null);

  const handleDiscussTask = async (task: Task) => {
    try {
      const conv = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'task',
        related_entity_id: task.id,
        title: `Task: ${task.title}`
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error('Failed to open discussion: ' + getErrorMessage(error));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        tasksApi.getTasks(),
        projectsApi.getTaskEligibleProjects(),
        usersApi.getUsers()
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setAllUsers(usersData);
      const directReports = usersData.filter(
        (u) =>
          u.manager_id === currentUser?.id &&
          !['admin', 'hr_operations'].includes(u.role)
      );
      const assigneeCandidates = [...directReports];
      if (currentUser && !assigneeCandidates.some((u) => u.id === currentUser.id)) {
        assigneeCandidates.unshift(currentUser);
      }
      setTeamMembers(assigneeCandidates);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchData();
    }
  }, [currentUser?.id]);

  const projectOptions = makeProjectOptions(projects);
  const assigneeOptions = makeAssigneeOptions(teamMembers, currentUser?.id);

  const usersById = useMemo(() => {
    const seen = new Set<string>();
    const relevant: User[] = [];
    const addUser = (user?: User | null) => {
      if (!user || seen.has(user.id)) return;
      seen.add(user.id);
      relevant.push(user);
    };
    if (currentUser) addUser(currentUser);
    teamMembers.forEach(addUser);
    tasks.forEach((task) => {
      if (task.assigned_to) {
        addUser(allUsers.find((user) => user.id === task.assigned_to));
      }
    });
    return buildUsersById(relevant);
  }, [teamMembers, currentUser, tasks, allUsers]);

  const assigneeFilterOptions = useMemo(() => {
    const options = [
      { value: 'all', label: 'All' },
      { value: 'you', label: 'You' },
      ...teamMembers
        .filter((member) => member.id !== currentUser?.id)
        .map((member) => ({ value: member.id, label: getUserLabel(member) })),
    ];
    return options;
  }, [teamMembers, currentUser?.id]);

  const filteredTasks = useMemo(
    () =>
      applyTaskFilters(tasks, filters, {
        currentUserId: currentUser?.id,
        usersMap: usersById,
      }),
    [tasks, filters, currentUser?.id, usersById]
  );

  const resetFilters = () => setFilters(DEFAULT_TASK_FILTERS);

  const updateFilter = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const form = useForm<AssignTaskFormValues>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      project_id: '',
      assigned_to: '',
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const onSubmit = async (data: AssignTaskFormValues) => {
    try {
      await tasksApi.createTask({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined
      });
      if (data.assigned_to === currentUser?.id) {
        toast.success('Task assigned to you.');
      } else {
        const assignee = teamMembers.find((u) => u.id === data.assigned_to);
        toast.success(
          assignee ? `Task assigned to ${assignee.full_name}.` : 'Task assigned successfully.'
        );
      }
      setIsDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleArchiveTask = async () => {
    if (!archivingTask) return;
    try {
      await tasksApi.archiveTask(archivingTask.id);
      toast.success('Task archived');
      setArchivingTask(null);
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <ManagerPageShell>
      <ManagerPageHeader
        title="Team Tasks"
        subtitle="Create, assign, and track team delivery"
        icon={ShieldCheck}
        actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs px-4 rounded-xl">
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-2xl border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] text-[var(--text-primary)]">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">Assign Task</DialogTitle>
              <DialogDescription className="text-sm text-[var(--text-muted)]">
                Assign a new task to a team member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className={modalFormClass}>
                <div className={modalFormGridClass}>
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className={`${modalFormFieldClass} md:col-span-2`}>
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Task Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Infrastructure Audit" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><span className="truncate">{resolveOptionLabel(projectOptions, field.value, 'Select project')}</span></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          {projectOptions.map((p) => (
                            <SelectItem key={p.value} value={p.value} className="text-xs font-bold">{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><span className="truncate">{resolveOptionLabel(assigneeOptions, field.value, 'Select member')}</span></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          {assigneeOptions.map((u) => (
                            <SelectItem key={u.value} value={u.value} className="text-xs font-bold">
                                {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Description</FormLabel>
                    <FormControl><Textarea placeholder="Define objectives and implementation steps..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[100px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className={modalFormGridClass}>
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Set level" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          <SelectItem value="low" className="text-[10px] font-black uppercase tracking-widest">Low</SelectItem>
                          <SelectItem value="medium" className="text-[10px] font-black uppercase tracking-widest">Medium</SelectItem>
                          <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest">High</SelectItem>
                          <SelectItem value="critical" className="text-[10px] font-black uppercase tracking-widest text-rose-600">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-[var(--accent-primary)] hover:opacity-90 text-white">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                    Assign Task
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-2">
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          className="rounded-lg text-xs"
          onClick={() => router.push('/manager/tasks')}
        >
          Team Tasks
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'completion-requests' ? 'default' : 'ghost'}
          className="rounded-lg text-xs"
          onClick={() => router.push('/manager/tasks?tab=completion-requests')}
        >
          Completion Requests
        </Button>
      </div>

      {activeTab === 'completion-requests' ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold">Pending Completion Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <ManagerCompletionRequestsPanel />
          </CardContent>
        </Card>
      ) : (
      <Card className="border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="px-5 pt-5 pb-4 border-b border-[var(--border-subtle)] space-y-4">
          <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-[var(--accent-primary)]" />
            Task Queue
          </CardTitle>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search tasks, projects, or assignees..."
                className="pl-10 h-10 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={filters.assignee} onValueChange={(value) => updateFilter('assignee', value)}>
                <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Assignee">
                    {assigneeFilterOptions.find((o) => o.value === filters.assignee)?.label ?? 'Assignee'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assigneeFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value as TaskStatusFilter)}>
                <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Status">
                    {STATUS_FILTER_OPTIONS.find((o) => o.value === filters.status)?.label ?? 'Status'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value as TaskPriorityFilter)}>
                <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Priority">
                    {PRIORITY_FILTER_OPTIONS.find((o) => o.value === filters.priority)?.label ?? 'Priority'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.deadline} onValueChange={(value) => updateFilter('deadline', value as TaskDeadlineFilter)}>
                <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Deadline">
                    {DEADLINE_FILTER_OPTIONS.find((o) => o.value === filters.deadline)?.label ?? 'Deadline'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEADLINE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.sort} onValueChange={(value) => updateFilter('sort', value as TaskSortOption)}>
                <SelectTrigger className="h-9 w-[170px] rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Sort">
                    {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Sort'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveTaskFilters(filters) && (
                <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg text-xs font-bold" onClick={resetFilters}>
                  Reset
                </Button>
              )}
            </div>

            {!isLoading && tasks.length > 0 && (
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={6} /></div>
          ) : tasks.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No team tasks found"
                  message="No tasks have been assigned to your team yet."
                  icon={Briefcase}
              />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-16">
              <EmptyState
                title="No tasks match your filters"
                message={
                  filters.status === 'in_progress'
                    ? 'No in-progress tasks found. Change Status to All to view created or completed tasks.'
                    : 'No tasks match your filters.'
                }
                icon={Search}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <TableRow className="hover:bg-transparent h-16">
                    <TableHead className="w-[30%] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Task Title</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Project</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Assignee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Priority</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Deadline</TableHead>
                    <TableHead className="text-right pr-6 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28 text-[var(--text-primary)]">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{task.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 gap-1"
                              onClick={() => handleDiscussTask(task)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              Discuss
                            </Button>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] leading-relaxed italic line-clamp-1 max-w-[250px]">
                            {task.description || 'No brief provided'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            {task.project_title || 'General'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black text-[var(--text-primary)] tracking-tight">
                              {getAssigneeLabel(task, usersById, currentUser?.id)}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.priority} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          {task.due_date ? formatPKDate(task.due_date) : 'No Date'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTask(task)} title="Edit task">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => setArchivingTask(task)} title="Archive task">
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        projects={projects}
        assignees={teamMembers}
        currentUserId={currentUser?.id}
        onSaved={fetchData}
      />

      <AlertDialog open={!!archivingTask} onOpenChange={(open) => !open && setArchivingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this task?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from active task lists but history and time logs will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveTask}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ManagerPageShell>
  );
}
