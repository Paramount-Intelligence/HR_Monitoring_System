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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Growth & Achievements</h1>
        <p className="text-sm text-slate-500">Track milestones and professional development across your team.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {isLoading ? (
          <div className="col-span-2 flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : records.length === 0 ? (
          <Card className="col-span-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <TrendingUp className="h-12 w-12 mb-4 text-slate-200" />
              <p>No growth records found for your team.</p>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="border-none shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <CardTitle className="text-base">{record.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {format(new Date(record.achievement_date), 'PPP')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 capitalize">
                  {record.category}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{record.description}</p>
                <div className="mt-4 flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Milestone Reached</span>
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
