"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteArtist } from '@/lib/queries/artists';
import { formatDate } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { GenerateArtistLoginDialog } from '@/components/artists/generate-artist-login-dialog';
import type { LinkedArtistUser } from '@/lib/auth/artist-login-actions';

interface ArtistProfileProps {
  artist: any;
  kpis: any;
  canEdit: boolean;
  canDelete: boolean;
  isManager?: boolean;
  linkedUser?: LinkedArtistUser | null;
}

export function ArtistProfile({
  artist,
  kpis,
  canEdit,
  canDelete,
  isManager,
  linkedUser,
}: ArtistProfileProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteArtist(artist.id);
      toast({ title: 'Artist deleted', variant: 'success' });
      router.push('/artists');
    } catch (error: any) {
      toast({ title: 'Error deleting artist', description: error.message, variant: 'destructive' });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  let badgeVariant: "success" | "warning" | "secondary" | "default" = "default";
  if (artist.status === 'Active') badgeVariant = "success";
  if (artist.status === 'Inactive') badgeVariant = "warning";
  if (artist.status === 'Left') badgeVariant = "secondary";

  const tabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Music', label: 'Music' },
    { id: 'Social', label: 'Social' },
    { id: 'Projects', label: 'Projects' },
    { id: 'Sessions', label: 'Sessions' },
    { id: 'Releases', label: 'Releases' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-secondary-foreground">Active Projects</p><p className="text-2xl font-display font-bold">{kpis?.activeProjects || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-secondary-foreground">Completed Projects</p><p className="text-2xl font-display font-bold">{kpis?.completedProjects || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-secondary-foreground">Released Songs</p><p className="text-2xl font-display font-bold">{kpis?.releasedSongs || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-secondary-foreground">Sessions Attended</p><p className="text-2xl font-display font-bold">{kpis?.sessionsAttended || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-secondary-foreground">Studio Hours</p><p className="text-2xl font-display font-bold">{kpis?.studioHours || 0}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(canEdit || isManager) && (
                  <>
                    <div><p className="text-sm text-secondary-foreground">Legal Name</p><p>{artist.legal_name || 'N/A'}</p></div>
                    <div><p className="text-sm text-secondary-foreground">Email</p><p>{artist.email || 'N/A'}</p></div>
                    <div><p className="text-sm text-secondary-foreground">Phone</p><p>{artist.phone || 'N/A'}</p></div>
                  </>
                )}
                <div><p className="text-sm text-secondary-foreground">Location</p><p>{artist.location || 'N/A'}</p></div>
                <div><p className="text-sm text-secondary-foreground">Date Joined</p><p>{artist.date_joined ? formatDate(artist.date_joined) : 'N/A'}</p></div>
                <div><p className="text-sm text-secondary-foreground">Dakhni Verse Role</p><p>{artist.dakhni_verse_role || 'N/A'}</p></div>
              </CardContent>
            </Card>
          </div>
        );
      case 'Music':
        if (!artist.music_profile) {
          return <EmptyState title="No Music Profile" description="This artist has not set up their music profile yet." />;
        }
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Genres</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {artist.music_profile.genres?.map((genre: string) => <Badge key={genre} variant="outline">{genre}</Badge>)}
                  {(!artist.music_profile.genres || artist.music_profile.genres.length === 0) && <p className="text-sm text-secondary-foreground">None listed</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Languages</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {artist.music_profile.languages?.map((lang: string) => <Badge key={lang} variant="outline">{lang}</Badge>)}
                  {(!artist.music_profile.languages || artist.music_profile.languages.length === 0) && <p className="text-sm text-secondary-foreground">None listed</p>}
                </CardContent>
              </Card>
            </div>
            {artist.music_profile.bio && (
              <Card>
                <CardHeader><CardTitle>Bio</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-wrap">{artist.music_profile.bio}</p></CardContent>
              </Card>
            )}
          </div>
        );
      case 'Social':
        if (!artist.social_links || artist.social_links.length === 0) {
          return <EmptyState title="No Social Links" description="No social links added for this artist." />;
        }
        return (
          <Card>
            <CardContent className="p-6">
              <ul className="space-y-4">
                {artist.social_links.map((link: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{link.platform}</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px] md:max-w-md">
                      {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      case 'Projects':
        return <EmptyState title="Projects" description="Artist projects will appear here." />;
      case 'Sessions':
        return <EmptyState title="Sessions" description="Artist sessions will appear here." />;
      case 'Releases':
        return <EmptyState title="Releases" description="Artist releases will appear here." />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="flex items-center gap-6">
          <div
            onClick={() => artist.profile_image_url && setShowLightbox(true)}
            className={artist.profile_image_url ? "cursor-pointer group relative" : ""}
            title={artist.profile_image_url ? "Click to view full photo" : ""}
          >
            <Avatar
              src={artist.profile_image_url}
              fallback={artist.stage_name?.substring(0, 2).toUpperCase()}
              size="xl"
              className="w-24 h-24 transition-all duration-200 group-hover:scale-105 ring-2 ring-transparent group-hover:ring-[#D71920]"
            />
            {artist.profile_image_url && (
              <span className="sr-only">View full photo</span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">{artist.stage_name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-secondary-foreground">{artist.dakhni_verse_role || 'Artist'}</span>
              <Badge variant={badgeVariant}>{artist.status}</Badge>
              {artist.location && <span className="text-secondary-foreground">• {artist.location}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <GenerateArtistLoginDialog artist={artist} initialLinkedUser={linkedUser} />
          )}
          {canEdit && <Button variant="outline" onClick={() => router.push(`/artists/${artist.id}/edit`)}>Edit Profile</Button>}
          {canDelete && <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Artist"
          description={`Are you sure you want to delete ${artist.stage_name}? This action cannot be undone.`}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          cancelLabel="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="destructive"
        />
      )}

      <ImageLightbox
        open={showLightbox}
        src={artist.profile_image_url}
        title={artist.stage_name}
        onClose={() => setShowLightbox(false)}
      />
    </div>
  );
}
