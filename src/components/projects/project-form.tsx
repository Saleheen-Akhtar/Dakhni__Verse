"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { projectSchema } from '@/lib/validation/projects';
import { createProject } from '@/lib/queries/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

export function ProjectForm({ artists }: { artists: any[] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: '', status: 'Idea' }
  });

  const onSubmit = async (data: any) => {
    try {
      await createProject(data);
      toast({ title: 'Project created successfully' });
      router.push('/projects');
    } catch (error) {
      toast({ title: 'Error creating project', variant: 'destructive' });
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
              <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="producer_id" render={({ field }) => (
            <FormItem><FormLabel>Producer</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select producer" /></SelectTrigger></FormControl>
              <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="mix_engineer_id" render={({ field }) => (
            <FormItem><FormLabel>Mix Engineer</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select mix engineer" /></SelectTrigger></FormControl>
              <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="mastering_engineer_id" render={({ field }) => (
            <FormItem><FormLabel>Mastering Engineer</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select mastering engineer" /></SelectTrigger></FormControl>
              <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Status *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
              <SelectContent>
                {['Idea', 'Writing', 'Production', 'Recording', 'Editing', 'Mixing', 'Mastering', 'Ready', 'Released', 'On Hold', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="target_release_date" render={({ field }) => (
            <FormItem><FormLabel>Target Release Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </Form>
  );
}
