"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  acceptArtistApplication,
  rejectArtistApplication,
  approveAndCreateArtistAccount,
  type ApproveArtistAccountResult,
} from '@/lib/queries/artists';
import type { ArtistWithProfile } from '@/types';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Music,
  User,
  Share2,
  Calendar,
  AlertCircle,
  Eye,
  RotateCcw,
  Sparkles,
  Key,
  Copy,
  Check,
  Send,
  ShieldCheck,
} from 'lucide-react';

interface ArtistReviewClientProps {
  initialPending: ArtistWithProfile[];
  initialRejected: ArtistWithProfile[];
}

export function ArtistReviewClient({
  initialPending,
  initialRejected,
}: ArtistReviewClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');
  const [pendingList, setPendingList] = useState<ArtistWithProfile[]>(initialPending);
  const [rejectedList, setRejectedList] = useState<ArtistWithProfile[]>(initialRejected);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistWithProfile | null>(null);
  const [accountModalData, setAccountModalData] = useState<ApproveArtistAccountResult | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const copyToClipboard = async (text: string, type: 'password' | 'message') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (type === 'password') {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2500);
      } else {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2500);
      }

      toast({
        title: type === 'password' ? 'Password Copied' : 'Invite Message Copied',
        description: 'Copied to clipboard ready to paste.',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Please copy manually.',
        variant: 'destructive',
      });
    }
  };

  const handleApproveAndCreateAccount = async (artist: ArtistWithProfile) => {
    if (processingId) return;
    if (!artist.email) {
      toast({
        title: 'Email Required',
        description: `Cannot create portal account: "${artist.stage_name}" has no email address on file.`,
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(artist.id);

    try {
      const res = await approveAndCreateArtistAccount(artist.id);

      // Update local state
      setPendingList((prev) => prev.filter((a) => a.id !== artist.id));
      setRejectedList((prev) => prev.filter((a) => a.id !== artist.id));
      if (selectedArtist?.id === artist.id) setSelectedArtist(null);

      setAccountModalData(res);

      toast({
        title: 'Artist Approved & Account Created! 🎉',
        description: `Portal account ready for ${res.stage_name} (${res.email}). Credentials generated.`,
      });

      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Account Creation Failed',
        description: err.message || 'Could not approve artist and create account.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async (artist: ArtistWithProfile) => {
    if (processingId) return;
    setProcessingId(artist.id);

    try {
      await acceptArtistApplication(artist.id);
      
      // Update local state
      setPendingList((prev) => prev.filter((a) => a.id !== artist.id));
      setRejectedList((prev) => prev.filter((a) => a.id !== artist.id));
      if (selectedArtist?.id === artist.id) setSelectedArtist(null);

      toast({
        title: 'Artist Accepted!',
        description: `"${artist.stage_name}" is now active in the collective and visible on the Artists roster.`,
      });

      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Could not accept artist application.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (artist: ArtistWithProfile) => {
    if (processingId) return;
    setProcessingId(artist.id);

    try {
      await rejectArtistApplication(artist.id);

      // Update local state
      setPendingList((prev) => prev.filter((a) => a.id !== artist.id));
      setRejectedList((prev) => [
        { ...artist, status: 'Rejected', dakhni_verse_role: 'Rejected Applicant' },
        ...prev.filter((a) => a.id !== artist.id),
      ]);
      if (selectedArtist?.id === artist.id) setSelectedArtist(null);

      toast({
        title: 'Application Rejected',
        description: `"${artist.stage_name}" has been marked as Rejected. You can review or reconsider anytime under the Rejected tab.`,
      });

      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Could not reject artist application.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const currentList = activeTab === 'pending' ? pendingList : rejectedList;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/artists"
              className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Artists Roster
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
            Artist Applications & Review
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review self-service intake submissions from artists, inspect profiles, and accept or reject.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/join" target="_blank" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 border border-border rounded-md px-3 py-1.5 bg-white shadow-sm">
            View Public Form
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-[#D71920] text-[#D71920]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          Pending Review
          <span
            className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
              pendingList.length > 0
                ? 'bg-red-100 text-[#D71920]'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {pendingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'rejected'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <XCircle className="h-4 w-4" />
          Rejected Submissions
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold">
            {rejectedList.length}
          </span>
        </button>
      </div>

      {/* Empty State */}
      {currentList.length === 0 && (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
            {activeTab === 'pending' ? <Clock className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </div>
          <h3 className="text-lg font-bold font-display text-neutral-900">
            {activeTab === 'pending' ? 'No pending applications' : 'No rejected applications'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'All artist intake submissions have been reviewed. When an artist fills out the public join form, their application will appear here.'
              : 'There are no rejected applications on record.'}
          </p>
        </Card>
      )}

      {/* Applications Cards Grid */}
      {currentList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentList.map((artist) => {
            const profile = artist.music_profile;
            const links = artist.social_links || [];
            const isProcessing = processingId === artist.id;

            return (
              <Card
                key={artist.id}
                className="overflow-hidden border border-neutral-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar
                          src={artist.profile_image_url || undefined}
                          fallback={artist.stage_name}
                          alt={artist.stage_name}
                          size="lg"
                          className="h-14 w-14 border border-neutral-200 shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold font-display text-neutral-950">
                              {artist.stage_name}
                            </h2>
                            {activeTab === 'pending' ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                                Pending Review
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold">
                                Rejected
                              </Badge>
                            )}
                            {(artist.duplicate_of_id || artist.dakhni_verse_role === 'Re-Application') && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] font-bold">
                                ⚠️ Re-Application
                              </Badge>
                            )}
                          </div>
                          {artist.legal_name && (
                            <p className="text-xs text-muted-foreground font-medium">
                              Legal: {artist.legal_name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{artist.location || 'Bengaluru'}</span>
                            <span>•</span>
                            <Calendar className="h-3 w-3" />
                            <span>Applied {artist.date_joined || 'Recently'}</span>
                          </div>
                        </div>
                      </div>

                      {profile?.primary_role && (
                        <Badge className="bg-neutral-900 text-white font-medium text-xs">
                          {profile.primary_role}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-2 space-y-4">
                    {(artist.duplicate_of_id || artist.dakhni_verse_role === 'Re-Application') && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Re-Application for Existing Artist.</span> Approving will merge submitted updates into their active profile without creating a duplicate artist.
                        </div>
                      </div>
                    )}
                    {/* Music Profile Genres & Languages */}
                    <div className="space-y-2 text-xs">
                      {profile?.genres && profile.genres.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">Genres:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.genres.map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] font-medium"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile?.languages && profile.languages.length > 0 && (
                        <div>
                          <span className="text-muted-foreground font-medium block mb-1">Languages:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.languages.map((lang) => (
                              <span
                                key={lang}
                                className="px-2 py-0.5 rounded bg-red-50 text-[#D71920] border border-red-100 text-[11px] font-medium"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bio snippet */}
                    {profile?.bio && (
                      <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-md border border-neutral-100 line-clamp-3">
                        {profile.bio}
                      </div>
                    )}

                    {/* Contact details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-neutral-100">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Phone className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{artist.phone || 'No phone provided'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Mail className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="truncate">{artist.email || 'No email provided'}</span>
                      </div>
                    </div>

                    {/* Social links */}
                    {links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {links.map((link) => (
                          <a
                            key={link.id || link.platform}
                            href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                          >
                            <span>{link.platform}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <CardFooter className="p-5 pt-3 border-t border-neutral-100 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedArtist(artist)}
                    className="text-xs text-neutral-700"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Full Details
                  </Button>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === 'pending' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleReject(artist)}
                          className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          {isProcessing ? 'Processing...' : 'Reject'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleAccept(artist)}
                          className="text-xs text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                          {isProcessing ? 'Processing...' : 'Accept Only'}
                        </Button>
                        <Button
                          size="sm"
                          disabled={isProcessing || !artist.email}
                          onClick={() => handleApproveAndCreateAccount(artist)}
                          className="text-xs bg-[#D71920] hover:bg-[#b0141a] text-white shadow-sm font-semibold"
                          title={!artist.email ? 'Artist has no email address' : 'Approve & create artist portal account'}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                          {isProcessing ? 'Creating...' : 'Approve & Create Account'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleAccept(artist)}
                        className="text-xs bg-neutral-900 hover:bg-neutral-800 text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        {isProcessing ? 'Processing...' : 'Reconsider & Accept'}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Detail Modal / Dialog */}
      {selectedArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedArtist.profile_image_url || undefined}
                  fallback={selectedArtist.stage_name}
                  alt={selectedArtist.stage_name}
                  size="lg"
                  className="h-16 w-16"
                />
                <div>
                  <h3 className="text-2xl font-bold font-display text-neutral-950">
                    {selectedArtist.stage_name}
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Legal Name: {selectedArtist.legal_name || 'Not specified'} • {selectedArtist.location || 'Bengaluru'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArtist(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Profile Content */}
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Phone</p>
                  <p className="font-medium text-neutral-900 mt-0.5">{selectedArtist.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Email</p>
                  <p className="font-medium text-neutral-900 mt-0.5">{selectedArtist.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Primary Role</p>
                  <p className="font-medium text-neutral-900 mt-0.5">{selectedArtist.music_profile?.primary_role || 'Artist'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Application Date</p>
                  <p className="font-medium text-neutral-900 mt-0.5">{selectedArtist.date_joined || 'Recent'}</p>
                </div>
              </div>

              {selectedArtist.music_profile?.bio && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Artist Bio</p>
                  <div className="p-3.5 bg-neutral-50 rounded-lg text-neutral-700 leading-relaxed">
                    {selectedArtist.music_profile.bio}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Genres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedArtist.music_profile?.genres?.map((g) => (
                      <span key={g} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-xs font-medium">
                        {g}
                      </span>
                    )) || <span className="text-neutral-400 text-xs">None listed</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedArtist.music_profile?.languages?.map((l) => (
                      <span key={l} className="px-2 py-0.5 rounded bg-red-50 text-[#D71920] border border-red-100 text-xs font-medium">
                        {l}
                      </span>
                    )) || <span className="text-neutral-400 text-xs">None listed</span>}
                  </div>
                </div>
              </div>

              {selectedArtist.music_profile?.vocal_style && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Vocal Style / Tone</p>
                  <p className="text-neutral-800">{selectedArtist.music_profile.vocal_style}</p>
                </div>
              )}

              {selectedArtist.music_profile?.influences && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Key Influences</p>
                  <p className="text-neutral-800">{selectedArtist.music_profile.influences}</p>
                </div>
              )}

              {selectedArtist.music_profile?.preferred_producers && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Preferred Production Style / Producers</p>
                  <p className="text-neutral-800">{selectedArtist.music_profile.preferred_producers}</p>
                </div>
              )}

              {selectedArtist.social_links && selectedArtist.social_links.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Social & Streaming Profiles</p>
                  <div className="space-y-1.5">
                    {selectedArtist.social_links.map((link) => (
                      <a
                        key={link.id || link.platform}
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 text-xs text-neutral-800 transition-colors"
                      >
                        <span className="font-semibold">{link.platform}</span>
                        <span className="text-blue-600 flex items-center gap-1 truncate max-w-xs">
                          {link.url}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <Button
                variant="outline"
                onClick={() => setSelectedArtist(null)}
              >
                Close
              </Button>
              {activeTab === 'pending' ? (
                <>
                  <Button
                    variant="outline"
                    disabled={processingId === selectedArtist.id}
                    onClick={() => handleReject(selectedArtist)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="outline"
                    disabled={processingId === selectedArtist.id}
                    onClick={() => handleAccept(selectedArtist)}
                    className="text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-600" />
                    Accept Only
                  </Button>
                  <Button
                    disabled={processingId === selectedArtist.id || !selectedArtist.email}
                    onClick={() => handleApproveAndCreateAccount(selectedArtist)}
                    className="bg-[#D71920] hover:bg-[#b0141a] text-white shadow-sm font-semibold"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-amber-300" />
                    {processingId === selectedArtist.id ? 'Creating Account...' : 'Approve & Create Account'}
                  </Button>
                </>
              ) : (
                <Button
                  disabled={processingId === selectedArtist.id}
                  onClick={() => handleAccept(selectedArtist)}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white"
                >
                  Reconsider & Accept
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Created & Credentials Modal */}
      {accountModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white p-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                    Artist Portal Account Ready! 🎉
                  </h3>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Account active with role <span className="text-amber-400 font-semibold">Artist</span> and live roster access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalData(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {accountModalData.merged && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Merged Profile:</span> Submitted details were merged into the existing artist profile without creating a duplicate. Credentials updated.
                  </div>
                </div>
              )}

              {/* Credentials Box */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2.5">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Artist</span>
                  <span className="text-sm font-bold text-neutral-900">{accountModalData.stage_name}</span>
                </div>

                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2.5">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Portal URL</span>
                  <span className="text-xs font-mono text-neutral-800 bg-white px-2 py-1 rounded border border-neutral-200">
                    /login
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2.5">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Login Email</span>
                  <span className="text-xs font-mono font-medium text-neutral-900 bg-white px-2 py-1 rounded border border-neutral-200">
                    {accountModalData.email}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Temporary Password</span>
                    <span className="text-[11px] text-neutral-400">Can be changed after login</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-[#D71920] bg-red-50 border border-red-200 px-2.5 py-1 rounded select-all">
                      {accountModalData.temp_password}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(accountModalData.temp_password || '', 'password')}
                      className="h-8 px-2 text-neutral-600 hover:text-neutral-900"
                      title="Copy password"
                    >
                      {copiedPassword ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ready-to-send Message Preview */}
              <div>
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1.5">
                  Invitation Message (WhatsApp / Email / DM)
                </label>
                <div className="p-3 bg-neutral-100 rounded-lg text-xs font-sans text-neutral-700 whitespace-pre-wrap leading-relaxed border border-neutral-200 select-all max-h-36 overflow-y-auto">
{`🎵 Welcome to Dakhni Verse, ${accountModalData.stage_name}!

Your artist portal account is ready. You can now log in to view your projects, upcoming studio sessions, and collective updates:

🔗 Portal Login: ${typeof window !== 'undefined' ? window.location.origin : 'https://dakhni-verse.vercel.app'}/login
📧 Email: ${accountModalData.email}
🔑 Temporary Password: ${accountModalData.temp_password}

(Please log in and update your password when you first sign in!)`}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dakhni-verse.vercel.app';
                    const msg = `🎵 Welcome to Dakhni Verse, ${accountModalData.stage_name}!\n\nYour artist portal account is ready. You can now log in to view your projects, upcoming studio sessions, and collective updates:\n\n🔗 Portal Login: ${origin}/login\n📧 Email: ${accountModalData.email}\n🔑 Temporary Password: ${accountModalData.temp_password}\n\n(Please log in and update your password when you first sign in!)`;
                    copyToClipboard(msg, 'message');
                  }}
                  className="w-full sm:flex-1 text-xs border-neutral-300 hover:bg-neutral-100 font-medium"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Invitation Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Invitation Message
                    </>
                  )}
                </Button>

                {(() => {
                  const cleanPhone = (accountModalData.phone || '').replace(/[^0-9]/g, '');
                  const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dakhni-verse.vercel.app';
                  const msg = `🎵 Welcome to Dakhni Verse, ${accountModalData.stage_name}!\n\nYour artist portal account is ready. You can now log in to view your projects, upcoming studio sessions, and collective updates:\n\n🔗 Portal Login: ${origin}/login\n📧 Email: ${accountModalData.email}\n🔑 Temporary Password: ${accountModalData.temp_password}\n\n(Please log in and update your password when you first sign in!)`;
                  const waUrl = intlPhone
                    ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`
                    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Open WhatsApp
                    </a>
                  );
                })()}

                <Button
                  type="button"
                  onClick={() => setAccountModalData(null)}
                  className="w-full sm:w-auto text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-medium"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
