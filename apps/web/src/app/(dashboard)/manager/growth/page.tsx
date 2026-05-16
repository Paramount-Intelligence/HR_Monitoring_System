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
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Target className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Talent Development</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Team Growth</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Milestones & Professional History</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-premium border border-slate-50">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregating Team Achievements...</p>
          </div>
        ) : records.length === 0 ? (
          <Card className="col-span-2 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden text-center py-24">
            <CardContent className="flex flex-col items-center">
              <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 ring-8 ring-slate-50/50 shadow-inner">
                <TrendingUp className="h-12 w-12 text-slate-300" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No Growth Records Found</h2>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                Your team's professional development ledger is currently empty. Achievements will appear here as they are recorded.
              </p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-premium-lg transition-all duration-500">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{record.title}</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-[3.25rem]">
                    Recorded {format(new Date(record.achievement_date), 'PPP')}
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm">
                  {record.category}
                </Badge>
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <p className="text-sm text-slate-600 font-bold leading-relaxed italic border-l-2 border-amber-100 pl-4 mb-6">
                  {record.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Strategic Milestone Reached</span>
                   </div>
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
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
