'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, Loader2, Star, Target } from 'lucide-react';
import { growthApi, GrowthRecord } from '@/lib/api/growth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function ManagerGrowthPage() {
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGrowth();
  }, []);

  const fetchGrowth = async () => {
    try {
      const data = await growthApi.getTeamGrowth();
      setRecords(data);
    } catch (error) {
      toast.error('Failed to load growth data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Target className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Career Growth</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Team Growth</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Track professional milestones and growth records of your team</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-24 bg-[var(--bg-surface)] rounded-[2.5rem] shadow-[var(--shadow-soft)] border border-[var(--border-subtle)]">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-primary)] mb-4" />
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Loading Achievements...</p>
          </div>
        ) : records.length === 0 ? (
          <Card className="col-span-2 border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden text-center py-24 text-[var(--text-primary)]">
            <CardContent className="flex flex-col items-center">
              <div className="bg-[var(--bg-subtle)] p-6 rounded-[2rem] mb-6 shadow-inner border border-[var(--border-subtle)]">
                <TrendingUp className="h-12 w-12 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">No records found</h2>
              <p className="text-[var(--text-secondary)] font-medium max-w-sm leading-relaxed">
                Your team's career growth records are currently empty. Achievements will appear here when recorded.
              </p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden group hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)] flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-amber-100">
                        <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <CardTitle className="text-lg font-black text-[var(--text-primary)] tracking-tight">{record.title}</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-[3.25rem]">
                    Recorded {format(new Date(record.achievement_date), 'PPP')}
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-50 text-[var(--accent-primary)] border-none font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm">
                  {record.category}
                </Badge>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <p className="text-sm text-[var(--text-secondary)] font-bold leading-relaxed italic border-l-2 border-amber-100 pl-4 mb-6">
                  {record.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                   <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">Milestone Reached</span>
                   </div>
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-[var(--bg-subtle)] flex items-center justify-center text-[8px] font-black text-[var(--text-muted)]">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
