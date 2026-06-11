'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Mic,
  Search,
  Download,
  Trash2,
  Eye,
  Phone,
  Video,
  HardDrive,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TableSkeleton } from '@/components/ui/skeletons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { callsApi, CallRecordingItem, CallRecordingStats } from '@/lib/api/calls';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AdminCallRecordingsPage() {
  const [stats, setStats] = useState<CallRecordingStats | null>(null);
  const [items, setItems] = useState<CallRecordingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [callType, setCallType] = useState<string>('all');
  const [recordingType, setRecordingType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('available');
  const [selected, setSelected] = useState<CallRecordingItem | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CallRecordingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pageSize = 20;

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      call_type: callType !== 'all' ? callType : undefined,
      recording_type: recordingType !== 'all' ? recordingType : undefined,
      status: statusFilter,
      page,
      page_size: pageSize,
    }),
    [search, callType, recordingType, statusFilter, page]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        callsApi.adminGetCallRecordingStats(),
        callsApi.adminListCallRecordings(filters),
      ]);
      setStats(statsRes);
      setItems(listRes.items);
      setTotal(listRes.total);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to load call recordings.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDetail = async (item: CallRecordingItem) => {
    setSelected(item);
    setStreamUrl(null);
    setStreamError('');
    setStreamLoading(true);
    try {
      const url = await callsApi.adminFetchCallRecordingStreamUrl(item.id);
      setStreamUrl(url);
    } catch (err) {
      setStreamError(getErrorMessage(err) || 'Unable to load recording.');
    } finally {
      setStreamLoading(false);
    }
  };

  const closeDetail = () => {
    if (streamUrl) {
      URL.revokeObjectURL(streamUrl);
    }
    setSelected(null);
    setStreamUrl(null);
    setStreamError('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await callsApi.adminDeleteCallRecording(deleteTarget.id);
      toast.success('Recording archived.');
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) closeDetail();
      void loadData();
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Failed to delete recording.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statCards = [
    { label: 'Total Recordings', value: stats?.total_recordings ?? 0, icon: Mic },
    { label: "Today's Recordings", value: stats?.today_recordings ?? 0, icon: Phone },
    { label: 'Voice Recordings', value: stats?.voice_recordings ?? 0, icon: Phone },
    { label: 'Video Recordings', value: stats?.video_recordings ?? 0, icon: Video },
    { label: 'Failed Uploads', value: stats?.failed_uploads ?? 0, icon: AlertTriangle },
    {
      label: 'Storage Used',
      value: formatBytes(stats?.storage_used_bytes ?? 0),
      icon: HardDrive,
      isText: true,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Mic className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Compliance Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Call Recordings</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">
            Review recorded internal calls, participants, duration, and recording files.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-2xl border-[var(--border-default)] bg-[var(--bg-surface)]">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                  {card.label}
                </span>
                <card.icon className="h-4 w-4 text-[var(--accent-primary)]" />
              </div>
              <p className="text-2xl font-black">{card.isText ? card.value : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)] space-y-4">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Filter className="h-5 w-5 text-[var(--accent-primary)]" />
              Recorded Calls
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-tight mt-1">
              Admin-only access · {total} recordings
            </CardDescription>
          </div>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Search participant name or email..."
                className="h-11 pl-12 rounded-xl"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={callType} onValueChange={(v) => { setCallType(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-40 h-11 rounded-xl">
                <SelectValue placeholder="Call type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All call types</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recordingType} onValueChange={(v) => { setRecordingType(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-44 h-11 rounded-xl">
                <SelectValue placeholder="Recording type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recording types</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-36 h-11 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setSearch('');
                setCallType('all');
                setRecordingType('all');
                setStatusFilter('available');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--bg-subtle)]">
                <TableRow>
                  <TableHead className="pl-10">Participants</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right pr-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-10">
                      <TableSkeleton rows={5} cols={8} />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-10 text-center text-[var(--text-muted)]">
                      No call recordings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-10">
                        <div className="space-y-0.5">
                          {item.participants.slice(0, 2).map((p) => (
                            <p key={p.id} className="text-xs font-bold">
                              {p.full_name}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{formatDuration(item.duration_seconds)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-[10px] w-fit">
                            {item.call_type || 'call'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] w-fit">
                            {item.recording_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.recorded_by.full_name}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-[10px]',
                            item.status === 'available'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatBytes(item.file_size_bytes)}</TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => void openDetail(item)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => void callsApi.adminDownloadCallRecording(item.id, item.file_name)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => setDeleteTarget(item)}
                            title="Archive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-10 py-6 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Recording Details</SheetTitle>
                <SheetDescription>
                  {selected.participants.map((p) => p.full_name).join(' · ')}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)] uppercase font-black text-[10px]">Call type</p>
                    <p className="font-bold">{selected.call_type}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] uppercase font-black text-[10px]">Recording type</p>
                    <p className="font-bold">{selected.recording_type}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] uppercase font-black text-[10px]">Duration</p>
                    <p className="font-bold">{formatDuration(selected.duration_seconds)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] uppercase font-black text-[10px]">File size</p>
                    <p className="font-bold">{formatBytes(selected.file_size_bytes)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--text-muted)] uppercase font-black text-[10px]">Recorded by</p>
                    <p className="font-bold">{selected.recorded_by.full_name}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-subtle)]">
                  {streamLoading ? (
                    <p className="text-sm text-[var(--text-muted)]">Loading player...</p>
                  ) : streamError ? (
                    <p className="text-sm text-red-500">{streamError}</p>
                  ) : streamUrl ? (
                    selected.recording_type === 'video' || selected.mime_type.startsWith('video/') ? (
                      <video controls src={streamUrl} className="w-full rounded-lg" />
                    ) : (
                      <audio controls src={streamUrl} className="w-full" />
                    )
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => void callsApi.adminDownloadCallRecording(selected.id, selected.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteTarget(selected)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Archive
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Archive recording?"
        description="This recording will be soft-deleted and removed from the admin library."
        confirmLabel="Archive"
        onConfirm={() => void handleDelete()}
        isLoading={isDeleting}
        confirmVariant="destructive"
      />
    </div>
  );
}
