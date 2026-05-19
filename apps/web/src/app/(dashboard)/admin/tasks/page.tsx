'use client';

import React, { useState, useEffect } from 'react';
import { tasksApi } from '@/lib/api/tasks';
import { usersApi } from '@/lib/api/users';
import { projectsApi, Project } from '@/lib/api/projects';
import { getErrorMessage } from '@/lib/api/client';
import { User } from '@/types';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Pause, Clock, AlertCircle, CheckCircle, 
  User as UserIcon, Calendar, Briefcase, RefreshCw, X, ChevronRight, Award
} from 'lucide-react';

export default function AdminTasksPage() {
  // Data states
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [timerState, setTimerState] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Real-time ticking trigger
  const [tick, setTick] = useState(0);

  // Dialog/Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Create task states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  
  // Feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load organizational task overview
  const fetchOverview = async (showSilently = false) => {
    try {
      if (!showSilently) setLoading(true);
      const params: any = {
        limit,
        offset: (page - 1) * limit
      };
      if (search.trim()) params.search = search.trim();
      if (employeeId) params.employee_id = employeeId;
      if (projectId) params.project_id = projectId;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (timerState) params.timer_state = timerState;

      const overview = await tasksApi.getAdminTaskOverview(params);
      setData(overview);
    } catch (err: any) {
      console.error('Failed to load task overview', err);
    } finally {
      setLoading(false);
    }
  };

  // Load initial dropdown options
  const fetchDropdownOptions = async () => {
    try {
      const [allUsers, allProjects] = await Promise.all([
        usersApi.getUsers(),
        projectsApi.getProjects()
      ]);
      setUsers(allUsers);
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [search, employeeId, projectId, status, priority, timerState, page]);

  // dynamic client-side timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
      
      // Update durations locally so they tick up beautifully!
      setData((prev: any) => {
        if (!prev) return null;
        
        // 1. Tick up main task timers
        const updatedTasks = prev.tasks.map((task: any) => {
          if (task.timer_state === 'running') {
            return {
              ...task,
              timer_duration_seconds: (task.timer_duration_seconds || 0) + 1
            };
          }
          return task;
        });

        // 2. Tick up live active timer sessions
        const updatedActiveWork = prev.active_work.map((session: any) => {
          if (session.timer_state === 'running') {
            return {
              ...session,
              current_duration_seconds: (session.current_duration_seconds || 0) + 1
            };
          }
          return session;
        });

        return {
          ...prev,
          tasks: updatedTasks,
          active_work: updatedActiveWork
        };
      });

    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into HH:MM:SS
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const titleVal = newTitle.trim();
    const descriptionVal = newDescription.trim() || null;
    const projectIdVal = newProjectId;
    const assignedToVal = newAssignedTo;
    const priorityVal = newPriority.toLowerCase();
    const dueDateVal = newDueDate && newDueDate.trim() !== '' ? newDueDate : null;

    if (!titleVal || !projectIdVal || !assignedToVal) {
      setErrorMsg('Task Title, Project, and Assignee are required.');
      return;
    }

    try {
      setActionLoading(true);
      await tasksApi.createTask({
        title: titleVal,
        description: descriptionVal,
        project_id: projectIdVal,
        assigned_to: assignedToVal,
        priority: priorityVal,
        due_date: dueDateVal
      });
      
      toast.success('Task assigned successfully.');
      setNewTitle('');
      setNewDescription('');
      setNewProjectId('');
      setNewAssignedTo('');
      setNewPriority('medium');
      setNewDueDate('');
      setShowAssignModal(false);
      fetchOverview();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setErrorMsg(msg || 'Unable to create task. Please try again.');
      toast.error(msg || 'Failed to create task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setActionLoading(true);
      const updated = await tasksApi.updateTask(taskId, { status: newStatus as any });
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: updated.status });
      }
      fetchOverview(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'border-red-500/20 bg-red-500/10 text-red-500';
      case 'high': return 'border-orange-500/20 bg-orange-500/10 text-orange-500';
      case 'medium': return 'border-blue-500/20 bg-blue-500/10 text-blue-500';
      default: return 'border-gray-500/20 bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'completed':
      case 'reviewed':
        return 'border-green-500/20 bg-green-500/10 text-green-500';
      case 'in_progress':
        return 'border-blue-500/20 bg-blue-500/10 text-blue-500';
      case 'blocked':
        return 'border-amber-500/20 bg-amber-500/10 text-amber-500';
      case 'cancelled':
        return 'border-red-500/20 bg-red-500/10 text-red-500';
      default:
        return 'border-gray-500/20 bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1 sm:p-4 text-[var(--text-primary)]">
      
      {/* Header and top buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            Org Tasks Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track real-time employee timers, audit organizational tasks, and distribute workloads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => fetchOverview(true)} 
            variant="outline" 
            className="rounded-2xl border border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] h-11 px-4 flex items-center gap-2 font-bold text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowAssignModal(true)} 
            className="rounded-2xl h-11 px-6 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[var(--accent-primary)]/20"
          >
            <Plus className="h-4.5 w-4.5" />
            Assign New Task
          </Button>
        </div>
      </div>

      {/* 6 Column HSL-Tailored KPI Cards Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Total Tasks</p>
          <p className="text-2xl font-black">{data?.summary?.total_tasks ?? 0}</p>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Active Tasks</p>
          <p className="text-2xl font-black">{data?.summary?.active_tasks ?? 0}</p>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">In Progress</p>
          <p className="text-2xl font-black">{data?.summary?.in_progress ?? 0}</p>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Completed</p>
          <p className="text-2xl font-black">{data?.summary?.completed ?? 0}</p>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Overdue</p>
          <p className="text-2xl font-black text-red-500">{data?.summary?.overdue ?? 0}</p>
        </Card>

        <Card className="relative overflow-hidden p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-2">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Currently Working</p>
          <p className="text-2xl font-black text-emerald-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            {data?.summary?.currently_working ?? 0}
          </p>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            />
          </div>

          <div>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            >
              <option value="">All Statuses</option>
              <option value="created">Created</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="reviewed">Reviewed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <select
              value={timerState}
              onChange={(e) => setTimerState(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] transition-colors h-10"
            >
              <option value="">All Timer States</option>
              <option value="running">Timer Running</option>
              <option value="paused">Timer Paused</option>
              <option value="not_started">Not Working</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid: Tasks list vs Live Workforce Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Main Tasks List Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">Task Records Overview</h2>
              <span className="text-xs text-[var(--text-muted)] font-bold bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-1 rounded-full">
                {data?.total_count ?? 0} Tasks Found
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="h-10 w-10 rounded-full border-t-2 border-b-2 border-[var(--accent-primary)] animate-spin" />
                <p className="text-xs font-bold text-[var(--text-muted)]">Retrieving team worksheets...</p>
              </div>
            ) : !data?.tasks || data.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)]">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">No tasks matched criteria</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm">Try resetting filters or checking spelling.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.tasks.map((task: any) => {
                  let seconds = task.timer_duration_seconds || 0;
                  
                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-sidebar-hover)] cursor-pointer transition-colors duration-150 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          {task.project_title && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] font-bold">
                              {task.project_title}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                          {task.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3.5 w-3.5" />
                            {task.assigned_to_name || 'Unassigned'}
                          </span>
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right timer details */}
                      <div className="flex items-center gap-3">
                        {task.timer_state !== 'not_started' && (
                          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-xs font-bold ${
                            task.timer_state === 'running'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                          }`}>
                            <Clock className={`h-3.5 w-3.5 ${task.timer_state === 'running' ? 'animate-pulse' : ''}`} />
                            {formatDuration(seconds)}
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Live Workforce Tracker */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">Live Workforce</h2>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-default)] px-2.5 py-0.5 rounded-full">
                Active Counters
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-semibold text-[var(--text-muted)]">
                Syncing workspace telemetry...
              </div>
            ) : !data?.active_work || data.active_work.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Clock className="h-8 w-8 text-[var(--text-muted)] mx-auto animate-pulse" />
                <p className="text-xs font-extrabold text-[var(--text-muted)]">No active employee timers right now</p>
                <p className="text-[10px] text-[var(--text-muted)]">When employees start timers, they will live-tick here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] p-2">
                {data.active_work.map((session: any) => {
                  let initialSeconds = session.current_duration_seconds || 0;
                  
                  return (
                    <div key={session.id} className="p-4 space-y-3 hover:bg-[var(--bg-sidebar-hover)] rounded-2xl transition-all duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-default)] font-bold text-xs text-[var(--accent-primary)] uppercase">
                            {session.employee_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[var(--text-primary)]">{session.employee_name}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{session.employee_role}</p>
                          </div>
                        </div>

                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider flex items-center gap-1 ${
                          session.timer_state === 'running'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${session.timer_state === 'running' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                          {session.timer_state}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-1">
                        <p className="text-[10px] font-extrabold text-[var(--text-muted)] flex items-center gap-1 truncate">
                          <Briefcase className="h-3 w-3" />
                          {session.project_title}
                        </p>
                        <p className="text-xs font-black text-[var(--text-primary)] truncate">
                          {session.task_title}
                        </p>
                      </div>

                      <div className="flex items-center justify-between font-mono text-xs font-bold text-[var(--text-muted)] pt-1">
                        <span>Timer duration</span>
                        <span className="text-[var(--text-primary)] flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-default)] px-2.5 py-1 rounded-xl">
                          <Clock className={`h-3 w-3 ${session.timer_state === 'running' ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
                          {formatDuration(initialSeconds)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* Task Details Drawer Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-[var(--bg-elevated)] border-l border-[var(--border-default)] shadow-2xl p-6 overflow-y-auto flex flex-col space-y-6 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                  Task Detail Sheet
                </span>
                <h2 className="text-lg font-black text-[var(--text-primary)]">
                  {selectedTask.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedTask(null)}
                className="h-8 w-8 rounded-xl hover:bg-[var(--bg-sidebar-hover)] flex items-center justify-center border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Description</h3>
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm font-semibold whitespace-pre-wrap">
                {selectedTask.description || 'No description provided.'}
              </div>
            </div>

            {/* Parameters list */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Priority</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider inline-block mt-1 ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Task Status</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider inline-block mt-1 ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Assignee</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{selectedTask.assigned_to_name || 'Unassigned'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Due Date</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                  {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No Due Date'}
                </p>
              </div>
            </div>

            {/* Admin Controls */}
            <div className="border-t border-[var(--border-default)] pt-6 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Administrative Action Panel</h3>
              <div className="flex flex-wrap items-center gap-2">
                {selectedTask.status !== 'completed' && selectedTask.status !== 'reviewed' && (
                  <Button 
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-600/90 text-white rounded-2xl font-bold text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="h-4 w-4 text-white" />
                    Force Complete Task
                  </Button>
                )}
                {selectedTask.status === 'completed' && (
                  <Button 
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'reviewed')}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-600/90 text-white rounded-2xl font-bold text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <Award className="h-4 w-4 text-white" />
                    Mark Reviewed
                  </Button>
                )}
                {selectedTask.status !== 'blocked' && selectedTask.status !== 'completed' && selectedTask.status !== 'reviewed' && (
                  <Button 
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, 'blocked')}
                    disabled={actionLoading}
                    className="flex-1 bg-amber-600 hover:bg-amber-600/90 text-white rounded-2xl font-bold text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <Pause className="h-4 w-4 text-white" />
                    Mark Blocked
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Assign Task Popup Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <Card className="w-full max-w-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-2xl p-6 rounded-3xl overflow-hidden relative flex flex-col space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                Assign Organizational Task
              </h2>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="h-8 w-8 rounded-xl hover:bg-[var(--bg-sidebar-hover)] flex items-center justify-center border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Task Title</label>
                <input
                  type="text"
                  placeholder="Analyze workforce optimization matrix..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Description / Instructions</label>
                <textarea
                  placeholder="Provide precise scope and delivery parameters for this assignment..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold text-xs focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Project</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] h-10"
                  >
                    <option value="">Select Project</option>
                    {projects
                      .filter(p => p.project_status === 'approved' || p.project_status === 'active')
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Eligible Employee</label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] h-10"
                  >
                    <option value="">Select Assignee</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Priority Level</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] h-10"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-xs focus:outline-none focus:border-[var(--accent-primary)] h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white rounded-xl font-extrabold text-xs"
                >
                  {actionLoading ? 'Assigning...' : 'Assign & Start'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
