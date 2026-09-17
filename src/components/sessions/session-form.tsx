"use client";
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
import { formatDuration } from '@/lib/utils/format';
import { useEffect, useState } from 'react';

export function SessionForm({ artists, projects }: { artists: any[]; projects: any[] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: { session_date: new Date().toISOString().split('T')[0], session_type: 'Recording', start_time: '', end_time: '' }
  });

  const startTime = useWatch({ control: form.control, name: 'start_time' });
  const endTime = useWatch({ control: form.control, name: 'end_time' });
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff < 0) diff += 24 * 60; // Overnight
      setDuration(diff);
    }
  }, [startTime, endTime]);

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
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging...' : 'Log Session'}
        </Button>
      </form>
    </Form>
  );
}
