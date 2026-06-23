'use client';

import { useEffect, useState, useMemo } from 'react';
import { tasksApi, Task } from '@/lib/api/tasks';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ManagerWorkloadPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, teamData] = await Promise.all([
          tasksApi.getTasks(), 
          usersApi.getUsers()
        ]);
        setTasks(tasksData);
        setTeam(teamData);
      } catch (error) {
        toast.error('Failed to load workload data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const workloadData = useMemo(() => {
    if (team.length === 0) return [];

    return team.map(user => {
      // Filter active tasks (not completed, not rejected)
      const userTasks = tasks.filter(t => 
        t.assigned_to === user.id && 
        !['completed', 'rejected', 'archived'].includes(t.status)
      );

      const totalExpectedMins = userTasks.reduce((sum, t) => sum + (t.expected_duration_minutes || 0), 0);
      const totalActualMins = userTasks.reduce((sum, t) => sum + (t.actual_duration_minutes || 0), 0);

      return {
        name: user.full_name.split(' ')[0], // First name for chart labels
        fullName: user.full_name,
        activeTasks: userTasks.length,
        expectedHours: Number((totalExpectedMins / 60).toFixed(1)),
        loggedHours: Number((totalActualMins / 60).toFixed(1)),
      };
    }).sort((a, b) => b.expectedHours - a.expectedHours);
  }, [team, tasks]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Team Workload</h1>
        <p className="text-sm text-[var(--text-secondary)]">Distribution of active tasks and estimated hours across team members</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-[var(--shadow-soft)] md:col-span-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Workload Hours by Employee</CardTitle>
            <CardDescription className="text-xs text-[var(--text-muted)] font-medium">Estimated remaining hours vs actual logged hours on active tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {workloadData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mb-4 opacity-40" />
                <p className="font-bold text-sm">No workload data available.</p>
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={workloadData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold'}} />
                    <RechartsTooltip 
                      cursor={{fill: 'var(--bg-subtle)'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: 10, fontWeight: 'bold'}} />
                    <Bar dataKey="expectedHours" name="Expected Hours" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="loggedHours" name="Logged Hours" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {workloadData.map((data, index) => (
          <Card key={index} className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-[var(--text-primary)]">{data.fullName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-2">
                <div className="text-center">
                  <div className="text-2xl font-black text-[var(--text-primary)]">{data.activeTasks}</div>
                  <div className="text-xs text-[var(--text-muted)] font-black uppercase tracking-wider">Active Tasks</div>
                </div>
                <div className="text-center border-l border-[var(--border-subtle)] px-4">
                  <div className="text-2xl font-black text-[var(--accent-primary)]">{data.expectedHours}h</div>
                  <div className="text-xs text-[var(--text-muted)] font-black uppercase tracking-wider">Expected</div>
                </div>
                <div className="text-center border-l border-[var(--border-subtle)] pl-4">
                  <div className="text-2xl font-black text-[var(--text-secondary)]">{data.loggedHours}h</div>
                  <div className="text-xs text-[var(--text-muted)] font-black uppercase tracking-wider">Logged</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
