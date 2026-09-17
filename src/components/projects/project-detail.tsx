"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateProject, deleteProject } from '@/lib/queries/projects';
import { formatDate } from '@/lib/utils/format';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';

export function ProjectDetail({
  project,
  history,
  isManager,
}: {
  project: any;
  history: any[];
  isManager: boolean;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [notes, setNotes] = useState(project.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProject(project.id, { status: newStatus });
      toast({ title: 'Status updated' });
      router.refresh();
    } catch (err) {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      toast({ title: 'Project deleted' });
      router.push('/projects');
    } catch (err) {
      toast({ title: 'Error deleting project', variant: 'destructive' });
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateProject(project.id, { notes });
      setIsEditingNotes(false);
      toast({ title: 'Notes updated' });
      router.refresh();
    } catch (err) {
      toast({ title: 'Error saving notes', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-heading">{project.title}</CardTitle>
            {isManager ? (
              <Select defaultValue={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Idea', 'Writing', 'Production', 'Recording', 'Editing', 'Mixing', 'Mastering', 'Ready', 'Released', 'On Hold', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Badge>{project.status}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-secondary-text">Artist</p>
                <p className="font-medium">{project.artist?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-text">Producer</p>
                <p className="font-medium">{project.producer?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-text">Mix Engineer</p>
                <p className="font-medium">{project.mix_engineer?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-text">Mastering Engineer</p>
                <p className="font-medium">{project.mastering_engineer?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-text">Target Release</p>
                <p className="font-medium">{project.target_release_date ? formatDate(project.target_release_date) : 'Not set'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border-gray">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-secondary-text font-medium">Notes</p>
                {!isEditingNotes && isManager && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>Edit</Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingNotes(false); setNotes(project.notes || ''); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{project.notes || 'No notes added.'}</p>
              )}
            </div>
            
            {isManager && (
              <div className="pt-6 border-t border-border-gray flex justify-end">
                <Button variant="destructive" onClick={() => setIsDeleting(true)}>Delete Project</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((record, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-red" />
                    <div>
                      <p className="font-medium text-sm">{record.status}</p>
                      <p className="text-xs text-secondary-text">{formatDate(record.changed_at)} by {record.changed_by?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-text">No history recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog 
        open={isDeleting} 
        onOpenChange={setIsDeleting}
        title="Delete Project?"
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
