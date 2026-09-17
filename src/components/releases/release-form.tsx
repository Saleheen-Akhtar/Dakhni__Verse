"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { releaseSchema } from '@/lib/validation/releases';
import { createRelease } from '@/lib/queries/releases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

export function ReleaseForm({ artists, projects }: { artists: any[]; projects: any[] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(releaseSchema),
    defaultValues: { title: '', status: 'Planned' }
  });

  const onSubmit = async (data: any) => {
    try {
      await createRelease(data);
      toast({ title: 'Release added successfully' });
      router.push('/releases');
    } catch (error) {
      toast({ title: 'Error adding release', variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
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
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Status *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
              <SelectContent>
                {['Planned', 'Scheduled', 'Released'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="release_date" render={({ field }) => (
            <FormItem><FormLabel>Release Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="distributor" render={({ field }) => (
            <FormItem><FormLabel>Distributor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="isrc" render={({ field }) => (
            <FormItem><FormLabel>ISRC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="space-y-4 pt-4 border-t border-border-gray">
          <h3 className="font-medium text-sm text-secondary-text">Platform Links</h3>
          <FormField control={form.control} name="spotify_url" render={({ field }) => (
            <FormItem><FormLabel>Spotify URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="apple_music_url" render={({ field }) => (
            <FormItem><FormLabel>Apple Music URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="youtube_url" render={({ field }) => (
            <FormItem><FormLabel>YouTube URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="other_platform_url" render={({ field }) => (
            <FormItem><FormLabel>Other URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Adding...' : 'Add Release'}
        </Button>
      </form>
    </Form>
  );
}
