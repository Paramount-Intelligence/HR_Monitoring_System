'use client';

import { useEffect, useState } from 'react';
import { leavesApi } from '@/lib/api/leaves'; // Assuming shared location for shifts api
import api from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Clock, Users, Edit3, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  working_days: string;
  is_active: boolean;
}

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [workingDays, setWorkingDays] = useState('1,2,3,4,5');

  const fetchShifts = async () => {
    try {
      const { data } = await api.get<Shift[]>('/shifts');
      setShifts(data);
    } catch (error) {
      toast.error('Failed to load shifts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitLoading(true);
    try {
      const payload = {
        name,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        grace_period_minutes: gracePeriod,
        working_days: workingDays,
      };

      if (editingShift) {
        await api.patch(`/shifts/${editingShift.id}`, payload);
        toast.success('Shift updated successfully');
      } else {
        await api.post('/shifts', payload);
        toast.success('Shift created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save shift');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setName(shift.name);
    setStartTime(shift.start_time.slice(0, 5));
    setEndTime(shift.end_time.slice(0, 5));
    setGracePeriod(shift.grace_period_minutes);
    setWorkingDays(shift.working_days);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setStartTime('09:00');
    setEndTime('18:00');
    setGracePeriod(15);
    setWorkingDays('1,2,3,4,5');
    setEditingShift(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shift Management</h1>
          <p className="text-sm text-slate-500">Configure and assign working hours for the organization.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Add New Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
                <DialogDescription>
                  Define the timing and rules for this shift.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Shift Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Morning Shift" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="bg-slate-50"
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-slate-50" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-slate-50" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grace">Grace Period (Minutes)</Label>
                  <Input 
                    id="grace" 
                    type="number" 
                    value={gracePeriod} 
                    onChange={(e) => setGracePeriod(parseInt(e.target.value))} 
                    className="bg-slate-50"
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="days">Working Days (CSV: 1=Mon, 7=Sun)</Label>
                  <Input id="days" value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} placeholder="1,2,3,4,5" className="bg-slate-50" required />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitLoading} className="bg-slate-900 hover:bg-slate-800">
                  {isSubmitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingShift ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No shifts defined yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6">Shift Name</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="pl-6 font-medium text-slate-900">{shift.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm font-mono">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{shift.grace_period_minutes} mins</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {shift.working_days.split(',').map(day => (
                            <span key={day} className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {['M','T','W','T','F','S','S'][parseInt(day)-1]}
                            </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                        {shift.is_active ? 
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Active</Badge> : 
                            <Badge variant="secondary">Inactive</Badge>
                        }
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleEdit(shift)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
