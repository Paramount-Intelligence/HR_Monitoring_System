'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Task, tasksApi } from '@/lib/api/tasks';
import { Project } from '@/lib/api/projects';
import { User } from '@/types';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  makeAssigneeOptions,
  makeProjectOptions,
  resolveOptionLabel,
} from '@/lib/display-labels';
import { modalFormClass, modalFormFieldClass, modalFormGridClass } from '@/lib/modal-layout';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  project_id: z.string().min(1, 'Project is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['created', 'approved', 'in_progress', 'blocked', 'completed', 'reviewed', 'reopened']),
  due_date: z.string().optional(),
});

type EditTaskFormValues = z.infer<typeof editTaskSchema>;

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  assignees: User[];
  currentUserId?: string;
  onSaved: () => void;
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  projects,
  assignees,
  currentUserId,
  onSaved,
}: TaskEditDialogProps) {
  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      project_id: '',
      assigned_to: '',
      priority: 'medium',
      status: 'created',
      due_date: '',
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description || '',
        project_id: task.project_id,
        assigned_to: task.assigned_to,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
      });
    }
  }, [task, open, form]);

  const projectOptions = makeProjectOptions(projects, task ? { id: task.project_id, title: task.project_title } : undefined);
  const assigneeOptions = makeAssigneeOptions(
    assignees,
    currentUserId,
    task ? { id: task.assigned_to, name: task.assigned_to_name } : undefined
  );

  const onSubmit = async (data: EditTaskFormValues) => {
    if (!task) return;
    try {
      await tasksApi.updateTask(task.id, {
        title: data.title,
        description: data.description || undefined,
        project_id: data.project_id,
        assigned_to: data.assigned_to,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date?.trim() ? data.due_date : undefined,
      } as Partial<Task>);
      toast.success('Task updated successfully.');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details. All fields show readable labels.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <DialogBody className={modalFormClass}>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className={modalFormFieldClass}>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className={modalFormFieldClass}>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea className="resize-none min-h-[96px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className={modalFormGridClass}>
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <span className="truncate">{resolveOptionLabel(projectOptions, field.value, 'Select project')}</span>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectOptions.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="assigned_to" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <span className="truncate">{resolveOptionLabel(assigneeOptions, field.value, 'Select assignee')}</span>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assigneeOptions.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className={modalFormGridClass}>
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><span className="capitalize">{field.value}</span></SelectTrigger></FormControl>
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
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><span className="capitalize">{field.value.replace(/_/g, ' ')}</span></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="created">Created</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="reopened">Reopened</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem className={modalFormFieldClass}>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
