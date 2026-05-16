'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building, Calendar, Megaphone, Clock, Plus, Trash2, Edit, ShieldCheck, Target, Users, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { holidaysApi } from '@/lib/api/holidays';
import { announcementsApi } from '@/lib/api/announcements';
import { departmentsApi } from '@/lib/api/departments';
import { shiftsApi } from '@/lib/api/shifts';
import { getErrorMessage } from '@/lib/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPKDate } from '@/lib/time';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const deptSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
});

const shiftSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  grace_period_minutes: z.coerce.number().min(0),
  working_days: z.string().min(1, 'Working days required (e.g. 1,2,3,4,5)'),
  timezone: z.string().min(1, 'Timezone is required'),
});

const holidaySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  holiday_date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

const announcementSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  audience: z.string().min(1, 'Audience is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export default function AdminOrgPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('departments');
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isAnnounceDialogOpen, setIsAnnounceDialogOpen] = useState(false);

  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const [depts, shiftsData, hols, ann] = await Promise.all([
        departmentsApi.getDepartments(),
        shiftsApi.getShifts(),
        holidaysApi.getHolidays(),
        announcementsApi.getAllAnnouncements()
      ]);
      setDepartments(depts);
      setShifts(shiftsData);
      setHolidays(hols);
      setAnnouncements(ann);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  const deptForm = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '', description: '' }
  });

  const shiftForm = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { 
      name: '', start_time: '', end_time: '', 
      grace_period_minutes: 15, working_days: '1,2,3,4,5', 
      timezone: 'Asia/Karachi' 
    }
  });

  const holidayForm = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { name: '', holiday_date: '', description: '' }
  });

  const announceForm = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', audience: 'all', start_date: '', end_date: '' }
  });

  const onDeptSubmit = async (data: any) => {
    try {
      await departmentsApi.createDepartment(data);
      toast.success('Department established');
      setIsDeptDialogOpen(false);
      deptForm.reset();
      fetchOrgData();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const onShiftSubmit = async (data: any) => {
    try {
      await shiftsApi.createShift({ ...data, is_active: true });
      toast.success('Work shift configured');
      setIsShiftDialogOpen(false);
      shiftForm.reset();
      fetchOrgData();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const onHolidaySubmit = async (data: any) => {
    try {
      await holidaysApi.createHoliday(data);
      toast.success('Holiday recorded');
      setIsHolidayDialogOpen(false);
      holidayForm.reset();
      fetchOrgData();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const onAnnounceSubmit = async (data: any) => {
    try {
      await announcementsApi.createAnnouncement({ 
        ...data, 
        is_active: true,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : undefined
      });
      toast.success('Announcement published');
      setIsAnnounceDialogOpen(false);
      announceForm.reset();
      fetchOrgData();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await holidaysApi.deactivateHoliday(id);
      toast.success('Holiday removed');
      fetchOrgData();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-full overflow-x-hidden animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Master Configuration</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Organization</h1>
        <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Global Governance & Infrastructure Settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <div className="w-full border-b border-slate-100 mb-8">
            <TabsList className="h-16 p-1 bg-transparent rounded-none border-none">
                <TabsTrigger value="departments" className="h-14 px-8 rounded-none border-b-2 border-transparent font-black text-[10px] uppercase tracking-widest data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all bg-transparent shadow-none">
                    <Building className="mr-2 h-4 w-4" /> Departments
                </TabsTrigger>
                <TabsTrigger value="shifts" className="h-14 px-8 rounded-none border-b-2 border-transparent font-black text-[10px] uppercase tracking-widest data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all bg-transparent shadow-none">
                    <Clock className="mr-2 h-4 w-4" /> Work Shifts
                </TabsTrigger>
                <TabsTrigger value="holidays" className="h-14 px-8 rounded-none border-b-2 border-transparent font-black text-[10px] uppercase tracking-widest data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all bg-transparent shadow-none">
                    <Calendar className="mr-2 h-4 w-4" /> Holidays
                </TabsTrigger>
                <TabsTrigger value="announcements" className="h-14 px-8 rounded-none border-b-2 border-transparent font-black text-[10px] uppercase tracking-widest data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 transition-all bg-transparent shadow-none">
                    <Megaphone className="mr-2 h-4 w-4" /> Announcements
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="departments" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-400 m-0">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Departments</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Functional units & resource distribution</CardDescription>
              </div>
              <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Create Department
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Establish Department</DialogTitle>
                  </DialogHeader>
                  <Form {...deptForm}>
                    <form onSubmit={deptForm.handleSubmit(onDeptSubmit)} className="space-y-6 pt-6">
                      <FormField control={deptForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Department Name</FormLabel><FormControl><Input placeholder="e.g. Engineering" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={deptForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Description (Optional)</FormLabel><FormControl><Textarea className="resize-none rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className="w-full h-14 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Create Department</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <div className="p-10"><TableSkeleton rows={5} cols={4} /></div> : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="h-16 border-b border-slate-100">
                      <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Department Name</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Department Head</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Established</TableHead>
                      <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id} className="h-20 border-b border-slate-50 last:border-0">
                        <TableCell className="pl-10 font-black text-slate-900">{dept.name}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <Users className="h-3.5 w-3.5 text-indigo-400" />
                                {dept.admin_name || 'Not Assigned'}
                            </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-400">{formatPKDate(dept.created_at)}</TableCell>
                        <TableCell className="text-right pr-10">
                            <Badge className={cn("rounded-lg text-[8px] font-black uppercase tracking-widest", dept.is_active ? "bg-emerald-500" : "bg-slate-400")}>
                                {dept.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && <TableRow><TableCell colSpan={4} className="p-20"><EmptyState title="No Departments" icon={Building} /></TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-400 m-0">
           <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Work Shifts</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Timing & Attendance Governance</CardDescription>
              </div>
              <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Create Shift
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Configure Shift</DialogTitle>
                  </DialogHeader>
                  <Form {...shiftForm}>
                    <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-4 pt-6">
                      <FormField control={shiftForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Shift Name</FormLabel><FormControl><Input placeholder="e.g. Standard Shift" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={shiftForm.control} name="start_time" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Start Time</FormLabel><FormControl><Input type="time" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={shiftForm.control} name="end_time" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">End Time</FormLabel><FormControl><Input type="time" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={shiftForm.control} name="grace_period_minutes" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Grace (Mins)</FormLabel><FormControl><Input type="number" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={shiftForm.control} name="working_days" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Working Days</FormLabel><FormControl><Input placeholder="1,2,3,4,5" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={shiftForm.control} name="timezone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Timezone</FormLabel><FormControl><Input className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className="w-full h-14 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4">Save Configuration</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {shifts.map((shift) => (
                  <Card key={shift.id} className={cn(
                      "border-none shadow-premium bg-slate-50/30 rounded-[2rem] overflow-hidden group hover:bg-indigo-50/40 transition-all duration-500 relative",
                      shift.start_time === "17:00" && shift.end_time === "02:00" && "ring-2 ring-indigo-500 bg-indigo-50/50"
                  )}>
                    {shift.start_time === "17:00" && shift.end_time === "02:00" && (
                        <div className="absolute top-4 right-4"><Zap className="h-4 w-4 text-indigo-600 animate-pulse" /></div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{shift.name}</CardTitle>
                        <Badge className="bg-emerald-500 text-[8px] font-black tracking-widest">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">Timing</span>
                        <span className="text-indigo-600">{shift.start_time} - {shift.end_time} <span className="text-[10px] opacity-40 ml-1">PKT</span></span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-widest">Grace</span>
                        <span className="text-slate-900">{shift.grace_period_minutes} Minutes</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold pt-4 border-t border-slate-100">
                        <span className="text-slate-400 uppercase tracking-widest">Days</span>
                        <span className="text-slate-900">{shift.working_days}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {shifts.length === 0 && <div className="py-20"><EmptyState title="No Shifts Configured" icon={Clock} /></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-400 m-0">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Holiday Calendar</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Scheduled non-operational periods</CardDescription>
              </div>
              <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Record Holiday</DialogTitle>
                  </DialogHeader>
                  <Form {...holidayForm}>
                    <form onSubmit={holidayForm.handleSubmit(onHolidaySubmit)} className="space-y-6 pt-6">
                      <FormField control={holidayForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Event Name</FormLabel><FormControl><Input placeholder="e.g. Eid-ul-Fitr" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={holidayForm.control} name="holiday_date" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Date</FormLabel><FormControl><Input type="date" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className="w-full h-14 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl">Save Holiday</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
               {isLoading ? <div className="p-10"><TableSkeleton rows={5} cols={3} /></div> : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="h-16 border-b border-slate-100">
                      <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Event Identity</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Schedule</TableHead>
                      <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map((hol) => (
                      <TableRow key={hol.id} className="h-20 border-b border-slate-50 last:border-0">
                        <TableCell className="pl-10 font-black text-slate-900">{hol.name}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-600 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                            {formatPKDate(hol.holiday_date)}
                        </TableCell>
                        <TableCell className="text-right pr-10">
                            <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteHoliday(hol.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {holidays.length === 0 && <TableRow><TableCell colSpan={3} className="p-20"><EmptyState title="No Holidays Recorded" icon={Calendar} /></TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-400 m-0">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Announcements</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Organization-wide broadcasting hub</CardDescription>
              </div>
              <Dialog open={isAnnounceDialogOpen} onOpenChange={setIsAnnounceDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-2xl shadow-xl transition-all">
                    <Megaphone className="mr-2 h-4 w-4" /> New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Broadcast Message</DialogTitle>
                  </DialogHeader>
                  <Form {...announceForm}>
                    <form onSubmit={announceForm.handleSubmit(onAnnounceSubmit)} className="space-y-4 pt-6">
                      <FormField control={announceForm.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Brief Title</FormLabel><FormControl><Input placeholder="e.g. Town Hall Schedule" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={announceForm.control} name="audience" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Target Audience</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50"><SelectValue placeholder="Select audience" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-2xl shadow-premium-lg">
                              <SelectItem value="all">All Employees</SelectItem>
                              <SelectItem value="admin">Admins Only</SelectItem>
                              <SelectItem value="hr_operations">HR Only</SelectItem>
                              <SelectItem value="manager">Managers Only</SelectItem>
                              <SelectItem value="employee">General Employees</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={announceForm.control} name="content" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Message Detail</FormLabel><FormControl><Textarea className="resize-none rounded-xl bg-slate-50/50 min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={announceForm.control} name="start_date" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">Start Date</FormLabel><FormControl><Input type="datetime-local" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={announceForm.control} name="end_date" render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px] font-black text-slate-400 uppercase ml-1">End Date</FormLabel><FormControl><Input type="datetime-local" className="h-12 rounded-xl bg-slate-50/50" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <Button type="submit" className="w-full h-14 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4">Publish Announcement</Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-10">
              <div className="space-y-6">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-8 rounded-[2rem] bg-slate-50/40 border border-slate-100/50 space-y-4 hover:bg-white hover:shadow-premium transition-all duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 tracking-tight">{ann.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <Badge className="bg-indigo-500 text-[8px] font-black uppercase tracking-widest">{ann.audience}</Badge>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatPKDate(ann.created_at)}</span>
                            </div>
                        </div>
                      </div>
                      <Badge className={cn("rounded-lg text-[8px] font-black uppercase tracking-widest", ann.is_active ? "bg-emerald-500" : "bg-slate-400")}>
                        {ann.is_active ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-2 border-indigo-100 pl-4">
                      {ann.content}
                    </p>
                  </div>
                ))}
                {announcements.length === 0 && <div className="py-20"><EmptyState title="No Announcements" icon={Megaphone} /></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
