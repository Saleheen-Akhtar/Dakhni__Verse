"use client";
import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { sessionSchema } from '@/lib/validation/sessions';
import { createSession } from '@/lib/queries/sessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { formatDuration, toLocalDateString } from '@/lib/utils/format';
import { checkSessionConflicts, SessionConflict } from '@/lib/queries/session-conflicts';
import { AlertTriangle, Clock } from 'lucide-react';

export function SessionForm({ artists, projects }: { artists: any[]; projects: any[] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: { session_date: toLocalDateString(new Date()), session_type: 'Recording', start_time: '', end_time: '' }
  });

  const sessionDate = useWatch({ control: form.control, name: 'session_date' });
  const startTime = useWatch({ control: form.control, name: 'start_time' });
  const endTime = useWatch({ control: form.control, name: 'end_time' });
  const artistId = useWatch({ control: form.control, name: 'artist_id' });
  const engineerId = useWatch({ control: form.control, name: 'engineer_id' });

  const [duration, setDuration] = useState(0);
  const [conflicts, setConflicts] = useState<SessionConflict[]>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);

  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60; // Overnight
      setDuration(diff);
    } else {
      setDuration(0);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (!sessionDate || !startTime || !endTime) {
      setConflicts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        const res = await checkSessionConflicts({
          sessionDate,
          startTime,
          endTime,
          artistId,
          engineerId,
        });
        setConflicts(res.conflicts);
      } catch (err) {
        console.error('Error checking session conflicts:', err);
      } finally {
        setCheckingConflict(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [sessionDate, startTime, endTime, artistId, engineerId]);

  const onSubmit = async (data: any) => {
    try {
      await createSession(data);
      toast({ title: 'Session logged successfully' });
      router.push('/sessions');
    } catch (error) {
      toast({ title: 'Error logging session', variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="session_date" render={({ field }) => (
            <FormItem><FormLabel>Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="session_type" render={({ field }) => (
            <FormItem><FormLabel>Session Type *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
              <SelectContent>
                {['Recording', 'Mixing', 'Writing', 'Production', 'Mastering', 'Rehearsal', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="artist_id" render={({ field }) => (
            <FormItem><FormLabel>Artist</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select artist" /></SelectTrigger></FormControl>
              <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.stage_name || a.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="project_id" render={({ field }) => (
            <FormItem><FormLabel>Project (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="start_time" render={({ field }) => (
            <FormItem><FormLabel>Start Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="end_time" render={({ field }) => (
            <FormItem><FormLabel>End Time *</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        {duration > 0 && (
          <p className="text-sm text-secondary-text font-medium">Duration: {formatDuration(duration)}</p>
        )}
        <FormField control={form.control} name="engineer_id" render={({ field }) => (
          <FormItem><FormLabel>Engineer (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="Select engineer" /></SelectTrigger></FormControl>
            <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.stage_name || a.name}</SelectItem>)}</SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-50/80 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Studio Double-Booking Conflict Detected</span>
            </div>
            <p className="text-xs text-amber-800">
              {conflicts.length === 1 ? "An existing session overlaps" : `${conflicts.length} existing sessions overlap`} with this scheduled time slot:
            </p>
            <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside bg-white/60 p-2.5 rounded border border-amber-200">
              {conflicts.map((c: SessionConflict) => (
                <li key={c.id}>
                  <strong className="font-semibold">{c.session_type} Session</strong> (
                  {c.start_time ? c.start_time.substring(0, 5) : "?"} - {c.end_time ? c.end_time.substring(0, 5) : "?"}
                  ):
                  {c.artist_name ? ` Artist: ${c.artist_name}` : ""}
                  {c.engineer_name ? ` • Engineer: ${c.engineer_name}` : ""}
                  {c.project_title ? ` • "${c.project_title}"` : ""}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-700 italic">
              Please verify if another room/setup is available or select an alternative time.
            </p>
          </div>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging...' : conflicts.length > 0 ? 'Log Session Anyway' : 'Log Session'}
        </Button>
      </form>
    </Form>
  );
}
