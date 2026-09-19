"use client"

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteArtist } from '@/lib/queries/artists';
import { formatDate, formatDuration } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui/empty-state';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { GenerateArtistLoginDialog } from '@/components/artists/generate-artist-login-dialog';
import type { LinkedArtistUser } from '@/lib/auth/artist-login-actions';
import { ArrowRight, Calendar, Disc, Music, Clock } from 'lucide-react';

interface ArtistProfileProps {
  artist: any;
  kpis: any;
  canEdit: boolean;
  canDelete: boolean;
  isManager?: boolean;
  linkedUser?: LinkedArtistUser | null;
  projects?: any[];
  sessions?: any[];
  releases?: any[];
}

export function ArtistProfile({
  artist,
  kpis,
  canEdit,
  canDelete,
  isManager,
  linkedUser,
  projects = [],
  sessions = [],
  releases = [],
}: ArtistProfileProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleArchive = async () => {
    setIsDeleting(true);
    try {
      await deleteArtist(artist.id);
      toast({ title: 'Artist archived', description: 'Artist status set to Inactive.', variant: 'success' });
      router.push('/artists');
    } catch (error: any) {
      toast({ title: 'Error archiving artist', description: error.message, variant: 'destructive' });
      setIsDeleting(false);
      setShowArchiveConfirm(false);
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
    { id: 'Projects', label: `Projects (${projects.length})` },
    { id: 'Sessions', label: `Sessions (${sessions.length})` },
    { id: 'Releases', label: `Releases (${releases.length})` },
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
        if (!projects || projects.length === 0) {
          return <EmptyState title="No Projects" description="This artist has not been assigned to any projects yet." />;
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: any) => (
              <Card key={proj.id} className="hover:border-neutral-300 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-neutral-900 font-display text-base">{proj.title}</h4>
                      {proj.target_release_date && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Target: {formatDate(proj.target_release_date)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{proj.status}</Badge>
                  </div>
                  <div className="pt-2 border-t border-neutral-100 flex justify-end">
                    <Link
                      href={`/projects/${proj.id}`}
                      className="text-xs font-semibold text-[#D71920] hover:underline flex items-center gap-1"
                    >
                      View Project <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 'Sessions':
        if (!sessions || sessions.length === 0) {
          return <EmptyState title="No Sessions" description="No studio sessions recorded for this artist yet." />;
        }
        return (
          <div className="space-y-3">
            {sessions.map((sess: any) => (
              <Card key={sess.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 text-sm">
                        {sess.project?.title || sess.session_type}
                      </span>
                      <Badge variant="outline" className="text-[11px]">{sess.session_type}</Badge>
                      {sess.status === 'Cancelled' ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">Cancelled</Badge>
                      ) : sess.status === 'Completed' ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(sess.session_date)}
                      </span>
                      {sess.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {sess.start_time.slice(0, 5)} - {sess.end_time?.slice(0, 5)}
                        </span>
                      )}
                      {sess.duration_minutes ? (
                        <span>({formatDuration(sess.duration_minutes)})</span>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href="/sessions"
                    className="text-xs font-semibold text-[#D71920] hover:underline flex items-center gap-1 self-start sm:self-center"
                  >
                    Sessions <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 'Releases':
        if (!releases || releases.length === 0) {
          return <EmptyState title="No Releases" description="No releases recorded for this artist yet." />;
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {releases.map((rel: any) => (
              <Card key={rel.id}>
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-neutral-900 font-display text-sm">{rel.title}</h4>
                      {rel.release_date && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Released: {formatDate(rel.release_date)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{rel.status}</Badge>
                  </div>
                  {rel.spotify_url && (
                    <a
                      href={rel.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Disc className="h-3 w-3" /> Listen on Spotify
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );
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
              size="2xl"
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
          {canDelete && (
            <Button
              variant="outline"
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => setShowArchiveConfirm(true)}
            >
              Archive Artist
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {showArchiveConfirm && (
        <ConfirmDialog
          title="Archive Artist"
          description={`Are you sure you want to archive ${artist.stage_name}? Their status will be set to Inactive and their profile will be archived.`}
          confirmLabel={isDeleting ? 'Archiving...' : 'Archive Artist'}
          cancelLabel="Cancel"
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveConfirm(false)}
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
