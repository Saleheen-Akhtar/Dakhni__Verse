"use client";
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { equipmentSchema } from '@/lib/validation/equipment';
import { createEquipment } from '@/lib/queries/equipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

export function EquipmentForm({ artists }: { artists: any[] }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { owner_type: 'Dakhni Verse', condition: 'Good' }
  });

  const ownerType = useWatch({ control: form.control, name: 'owner_type' });

  const onSubmit = async (data: any) => {
    try {
      if (data.owner_type === 'Dakhni Verse') data.owner_id = null;
      await createEquipment(data);
      toast({ title: 'Equipment added successfully' });
      router.push('/equipment');
    } catch (error) {
      toast({ title: 'Error adding equipment', variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="condition" render={({ field }) => (
            <FormItem><FormLabel>Condition *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
              <SelectContent>
                {['New', 'Good', 'Fair', 'Poor', 'Needs Repair'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="brand" render={({ field }) => (
            <FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="model" render={({ field }) => (
            <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="owner_type" render={({ field }) => (
            <FormItem><FormLabel>Owner Type *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select owner type" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Dakhni Verse">Dakhni Verse</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
          )} />
          {ownerType === 'Individual' && (
            <FormField control={form.control} name="owner_id" render={({ field }) => (
              <FormItem><FormLabel>Owner</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                <SelectContent>{artists.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>
            )} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="purchase_date" render={({ field }) => (
            <FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="purchase_value" render={({ field }) => (
            <FormItem><FormLabel>Purchase Value (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Adding...' : 'Add Equipment'}
        </Button>
      </form>
    </Form>
  );
}
