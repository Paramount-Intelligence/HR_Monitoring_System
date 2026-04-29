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
import { Building, Calendar, Megaphone, Clock, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { organizationApi } from '@/lib/api/organization';
import { holidaysApi } from '@/lib/api/holidays';
import { announcementsApi } from '@/lib/api/announcements';
import apiClient from '@/lib/api/client';
import { formatPKDate } from '@/lib/time';

export default function AdminOrgPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');

  useEffect(() => {
    fetchOrgData();
  }, []);

  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const [depts, shiftsData, hols, ann] = await Promise.all([
        organizationApi.getDepartments(),
        apiClient.get('/shifts').then((r) => r.data),
        holidaysApi.getHolidays(),
        announcementsApi.getAnnouncements()
      ]);
      setDepartments(depts);
      setShifts(shiftsData);
      setHolidays(hols);
      setAnnouncements(ann);
    } catch (error) {
      toast.error('Failed to fetch organization data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    try {
      await apiClient.post('/departments', { name: newDepartmentName });
      toast.success('Department created');
      setNewDepartmentName('');
      fetchOrgData();
    } catch {
      toast.error('Failed to create department');
    }
  };

  const handleCreateHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate) return;
    try {
      await holidaysApi.createHoliday({ name: newHolidayName, holiday_date: newHolidayDate });
      toast.success('Holiday created');
      setNewHolidayName('');
      setNewHolidayDate('');
      fetchOrgData();
    } catch {
      toast.error('Failed to create holiday');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) return;
    try {
      await announcementsApi.createAnnouncement({ title: newAnnouncementTitle, content: newAnnouncementContent });
      toast.success('Announcement published');
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      fetchOrgData();
    } catch {
      toast.error('Failed to publish announcement');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organization Management</h1>
        <p className="text-slate-500">Configure departments, work shifts, holidays, and company-wide announcements.</p>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-slate-100/50 rounded-xl mb-8 gap-1">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building className="h-4 w-4" /> Departments
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Work Shifts
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Holidays
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Organize your workforce into functional units.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Department</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Department</DialogTitle>
                    <DialogDescription>Create a new functional unit in the organization.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input id="dept-name" placeholder="e.g. Marketing" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="bg-blue-600 w-full" onClick={handleCreateDepartment}>Create Department</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Admin/Head</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">No departments defined.</TableCell></TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell>{dept.admin_id ? `User ${dept.admin_id.substring(0,5)}` : 'Not Assigned'}</TableCell>
                        <TableCell>{formatPKDate(dept.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Shifts</CardTitle>
                <CardDescription>Define standard working hours and grace periods.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Create Shift</Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {shifts.map((shift) => (
                  <Card key={shift.id} className="border-slate-100 shadow-none">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{shift.name}</CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Timing:</span>
                        <span className="font-medium text-slate-900">{shift.start_time} - {shift.end_time}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Grace Period:</span>
                        <span className="font-medium text-slate-900">{shift.grace_period_minutes} mins</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Days:</span>
                        <span className="font-medium text-slate-900">{shift.working_days}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {shifts.length === 0 && <div className="col-span-3 text-center py-8 text-slate-500 italic">No shifts configured.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Holiday Calendar</CardTitle>
                <CardDescription>Manage public and company holidays.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Holiday</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Holiday</DialogTitle>
                    <DialogDescription>Create a holiday entry for the calendar.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input placeholder="Holiday name" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
                    <Input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button className="bg-blue-600 w-full" onClick={handleCreateHoliday}>Save Holiday</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holiday Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((hol) => (
                    <TableRow key={hol.id}>
                      <TableCell className="font-medium">{hol.name}</TableCell>
                      <TableCell>{formatPKDate(hol.holiday_date)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {holidays.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8">No holidays added.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company Announcements</CardTitle>
                <CardDescription>Broadcast messages to the entire organization.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm"><Megaphone className="mr-2 h-4 w-4" /> New Announcement</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Broadcast Announcement</DialogTitle>
                    <DialogDescription>Send a message to all employees.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="ann-title">Title</Label>
                      <Input id="ann-title" placeholder="e.g. Office Closure" value={newAnnouncementTitle} onChange={(e) => setNewAnnouncementTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-content">Content</Label>
                      <Textarea id="ann-content" placeholder="Details..." value={newAnnouncementContent} onChange={(e) => setNewAnnouncementContent(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="bg-blue-600 w-full" onClick={handleCreateAnnouncement}>Publish</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">{ann.title}</h4>
                      <Badge className={ann.is_active ? 'bg-emerald-500' : 'bg-slate-500'}>
                        {ann.is_active ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{ann.content}</p>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest pt-2 font-bold">
                      Posted on {formatPKDate(ann.created_at)}
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <div className="text-center py-8 text-slate-500 italic">No announcements.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
