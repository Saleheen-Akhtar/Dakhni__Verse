"use client";
import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { setTarget } from '@/lib/queries/settings';

export function SettingsPage({ producers, initialTargets }: { producers: any[]; initialTargets: any[] }) {
  const [targets, setTargets] = useState<any[]>(initialTargets || []);
  const [selectedProducer, setSelectedProducer] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTarget = async () => {
    if (!selectedProducer || !targetValue) return;
    const parsedVal = parseInt(targetValue, 10);
    if (isNaN(parsedVal) || parsedVal < 0) {
      toast({ title: 'Invalid Value', description: 'Please enter a valid target number.', variant: 'destructive' });
      return;
    }
    
    setIsSaving(true);
    try {
      const saved = await setTarget({
        user_id: selectedProducer,
        metric: 'songs_per_month',
        target_value: parsedVal,
      });

      // Optimistically update local targets state
      setTargets((prev) => {
        const filtered = prev.filter((t) => !(t.user_id === selectedProducer && t.metric === 'songs_per_month'));
        return [...filtered, saved];
      });

      toast({ title: 'Target saved successfully', variant: 'default' });
    } catch (err: any) {
      toast({ title: 'Error saving target', description: err.message || 'Failed to save target.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentTarget = targets.find(t => t.user_id === selectedProducer && t.metric === 'songs_per_month');

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" description="Application configuration" />

      <Card>
        <CardHeader>
          <CardTitle>Production Targets</CardTitle>
          <CardDescription>Set monthly production targets for team members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Member</label>
              <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                <SelectTrigger><SelectValue placeholder="Select producer" /></SelectTrigger>
                <SelectContent>
                  {producers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Songs Per Month</label>
              <Input 
                type="number" 
                value={targetValue} 
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={currentTarget ? currentTarget.target_value.toString() : 'e.g. 4'} 
              />
            </div>
            <Button onClick={handleSaveTarget} disabled={isSaving || !selectedProducer || !targetValue}>
              {isSaving ? 'Saving...' : 'Save Target'}
            </Button>
          </div>
          {selectedProducer && (
            <p className="text-sm text-secondary-text mt-2">
              {currentTarget ? `Current target: ${currentTarget.target_value} songs/month` : 'No target configured'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>User accounts are managed through Supabase Auth</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-secondary-text mb-4">
            To add new users, reset passwords, or manage access roles, please use the Supabase project dashboard.
          </p>
          <Button variant="outline" asChild>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase Dashboard</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
