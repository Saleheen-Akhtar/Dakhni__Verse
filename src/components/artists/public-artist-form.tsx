"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';
import { useToast } from '@/components/ui/toast';
import { submitArtistSelfService } from '@/lib/queries/artists';
import { 
  UploadCloud, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Music, 
  User, 
  Share2, 
  Globe, 
  Plus, 
  Trash2,
  ExternalLink
} from 'lucide-react';

const COMMON_GENRES = [
  'Dakhni Rap',
  'Hip-Hop / Rap',
  'Trap',
  'Drill',
  'R&B / Soul',
  'Classical / Ghazal',
  'Sufi Fusion',
  'Electronic',
  'Pop',
  'Boom Bap',
];

const COMMON_LANGUAGES = [
  'Dakhni',
  'Urdu',
  'Hindi',
  'English',
  'Telugu',
  'Kannada',
  'Marathi',
];

const PRIMARY_ROLES = [
  'Rapper / MC',
  'Singer / Vocalist',
  'Music Producer',
  'Audio / Mix Engineer',
  'Songwriter',
  'Composer',
  'DJ',
  'Instrumentalist',
  'Other',
];

export function PublicArtistForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    action: 'created' | 'updated';
    artist_id: string;
    stage_name: string;
  } | null>(null);

  const [formData, setFormData] = useState<any>({
    stage_name: '',
    legal_name: '',
    profile_image_url: '',
    location: 'Bengaluru',
    phone: '',
    email: '',
    primary_role: 'Rapper / MC',
    genres: ['Dakhni Rap', 'Hip-Hop / Rap'],
    subgenres: '',
    languages: ['Dakhni', 'Urdu', 'Hindi'],
    vocal_style: '',
    songwriting: true,
    composition: false,
    instruments: '',
    influences: '',
    preferred_producers: '',
    bio: '',
    socialLinks: [
      { platform: 'Spotify', url: '' },
      { platform: 'Instagram', url: '' },
      { platform: 'YouTube', url: '' },
      { platform: 'Apple Music', url: '' },
    ],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const toggleGenre = (genre: string) => {
    setFormData((prev: any) => {
      const current = prev.genres || [];
      const updated = current.includes(genre)
        ? current.filter((g: string) => g !== genre)
        : [...current, genre];
      return { ...prev, genres: updated };
    });
  };

  const toggleLanguage = (lang: string) => {
    setFormData((prev: any) => {
      const current = prev.languages || [];
      const updated = current.includes(lang)
        ? current.filter((l: string) => l !== lang)
        : [...current, lang];
      return { ...prev, languages: updated };
    });
  };

  const updateSocialLink = (index: number, field: string, value: string) => {
    const updated = [...formData.socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, socialLinks: updated }));
  };

  const addSocialLink = () => {
    setFormData((prev: any) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'Other', url: '' }],
    }));
  };

  const removeSocialLink = (index: number) => {
    const updated = [...formData.socialLinks];
    updated.splice(index, 1);
    setFormData((prev: any) => ({ ...prev, socialLinks: updated }));
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (PNG, JPG, etc.)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageForCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setFormData((prev: any) => ({ ...prev, profile_image_url: croppedDataUrl }));
    toast({ title: 'Profile photo updated', variant: 'success' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stage_name || !formData.stage_name.trim()) {
      toast({ title: 'Stage Name Required', description: 'Please provide your stage or artist name', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Process subgenres and instruments from comma strings if needed
      const subgenres = typeof formData.subgenres === 'string'
        ? formData.subgenres.split(',').map((s: string) => s.trim()).filter(Boolean)
        : formData.subgenres;

      const instruments = typeof formData.instruments === 'string'
        ? formData.instruments.split(',').map((i: string) => i.trim()).filter(Boolean)
        : formData.instruments;

      const payload = {
        ...formData,
        subgenres,
        instruments,
      };

      const result = await submitArtistSelfService(payload);

      if (result?.success) {
        setSubmissionResult({
          success: true,
          action: result.action,
          artist_id: result.artist_id,
          stage_name: result.stage_name || formData.stage_name,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({
          title: result.action === 'updated' ? 'Profile Updated!' : 'Welcome to Dakhni Verse!',
          description: result.action === 'updated'
            ? `Your existing artist profile for "${result.stage_name}" has been updated.`
            : `Your new profile for "${result.stage_name}" was successfully registered.`,
          variant: 'success',
        });
      } else {
        throw new Error('Failed to save profile. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit profile. Please check your connection and try again.';
      toast({ title: 'Submission Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <Card className="border border-neutral-200 shadow-xl overflow-hidden bg-white text-center">
          <div className="h-2 bg-[#D71920]" />
          <CardContent className="pt-10 pb-8 px-6 sm:px-10">
            <div className="w-16 h-16 bg-red-50 text-[#D71920] rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm ring-8 ring-red-50/50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-100 text-[#D71920] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {submissionResult.action === 'updated' ? 'Profile Synced & Updated' : 'Registration Complete'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold font-display text-neutral-900 mb-2">
              {submissionResult.action === 'updated' ? 'Welcome Back!' : 'You’re In The Collective!'}
            </h2>

            <p className="text-neutral-600 max-w-md mx-auto mb-8 text-sm sm:text-base">
              {submissionResult.action === 'updated' ? (
                <>
                  Your artist details for <strong className="text-neutral-900 font-semibold">{submissionResult.stage_name}</strong> were matched with an existing profile and updated with your latest information.
                </>
              ) : (
                <>
                  Your profile for <strong className="text-neutral-900 font-semibold">{submissionResult.stage_name}</strong> has been registered in the Dakhni Verse database.
                </>
              )}
            </p>

            {/* Preview Card */}
            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200/80 text-left flex items-center gap-4 mb-8 max-w-md mx-auto shadow-sm">
              <Avatar
                src={formData.profile_image_url}
                fallback={formData.stage_name.substring(0, 2).toUpperCase()}
                size="xl"
                className="w-16 h-16 border-2 border-white shadow"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-neutral-900 text-lg truncate">{formData.stage_name}</h3>
                <p className="text-sm text-[#D71920] font-medium">{formData.primary_role}</p>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {formData.location} • {formData.genres.slice(0, 2).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmissionResult(null);
                }}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Make Another Update
              </Button>
            </div>
          </CardContent>
          <div className="bg-neutral-100/70 border-t border-neutral-200 py-3 text-xs text-neutral-500">
            Dakhni Verse — Bengaluru's Hip-Hop & Creative Collective
          </div>
        </Card>
      </div>
    );
  }

  // MAIN ONBOARDING FORM VIEW
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-1.5 bg-[#D71920] rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#D71920]">
            Artist Intake & Profile Update
          </span>
          <div className="w-8 h-1.5 bg-[#D71920] rounded-full" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-neutral-900">
          DAKHNI VERSE
        </h1>
        <p className="mt-2 text-base text-neutral-600 max-w-xl mx-auto">
          Fill in your artist profile, musical attributes, and streaming links. If studio management already created a placeholder for you, this form will automatically match and update your records.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: IDENTITY & CONTACT */}
        <Card className="border border-neutral-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D71920] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#D71920]" />
                  Artist Identity & Contact
                </CardTitle>
                <CardDescription>
                  Your public stage identity, contact details, and portrait photo.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="stage_name" className="text-neutral-900 font-medium">
                  Stage Name <span className="text-[#D71920] font-bold">*</span>
                </Label>
                <Input
                  id="stage_name"
                  name="stage_name"
                  value={formData.stage_name}
                  onChange={handleInputChange}
                  placeholder="Enter your stage name"
                  required
                  className="font-medium"
                />
                <p className="text-xs text-neutral-500">How you appear on releases, posters, and credits.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="legal_name" className="text-neutral-900 font-medium">
                  Full / Legal Name
                </Label>
                <Input
                  id="legal_name"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleInputChange}
                  placeholder="For legal agreements & split sheets"
                />
                <p className="text-xs text-neutral-500">Kept private for official agreements & royalty registration.</p>
              </div>
            </div>

            {/* Profile Photo Uploader & Cropper */}
            <div className="space-y-2">
              <Label className="text-neutral-900 font-medium">Profile Picture</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50">
                {/* Avatar with click-to-crop */}
                <div className="relative group shrink-0">
                  <Avatar
                    src={formData.profile_image_url}
                    fallback={formData.stage_name ? formData.stage_name.substring(0, 2).toUpperCase() : 'DV'}
                    size="xl"
                    className="w-20 h-20 border-2 border-white shadow-md ring-2 ring-neutral-200"
                  />
                  {formData.profile_image_url && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawImageForCrop(formData.profile_image_url);
                        setCropDialogOpen(true);
                      }}
                      className="absolute inset-0 rounded-full bg-black/60 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      Adjust
                    </button>
                  )}
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDraggingOver
                      ? 'border-[#D71920] bg-red-50/50 scale-[1.01]'
                      : 'border-neutral-300 hover:border-[#D71920] bg-white hover:bg-neutral-50/80'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-6 h-6 text-neutral-400 mb-1" />
                  <p className="text-sm font-medium text-neutral-800">
                    <span className="text-[#D71920] underline font-semibold">Click to upload photo</span> or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">High-res portrait (Square 1:1, JPG/PNG)</p>
                </div>

                {formData.profile_image_url && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRawImageForCrop(formData.profile_image_url);
                        setCropDialogOpen(true);
                      }}
                      className="text-xs h-8"
                    >
                      Adjust / Crop
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData((prev: any) => ({ ...prev, profile_image_url: '' }))}
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-neutral-900 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-neutral-500">Used to match existing dashboard profile.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-neutral-900 font-medium">
                  Phone / WhatsApp
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 00000 00000"
                />
                <p className="text-xs text-neutral-500">For studio session booking notifications.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-neutral-900 font-medium">
                  City / Base Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. Bengaluru"
                />
                <p className="text-xs text-neutral-500">e.g. Bengaluru, Karnataka.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: MUSICAL PROFILE & SOUND */}
        <Card className="border border-neutral-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D71920] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#D71920]" />
                  Musical Profile & Sound
                </CardTitle>
                <CardDescription>
                  Your artistic sound, genres, languages, and sonic identity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Primary Role */}
            <div className="space-y-2">
              <Label htmlFor="primary_role" className="text-neutral-900 font-medium">
                Primary Musical Role
              </Label>
              <Select
                id="primary_role"
                name="primary_role"
                value={formData.primary_role}
                onChange={handleInputChange}
                options={PRIMARY_ROLES.map((r) => ({ label: r, value: r }))}
              />
            </div>

            {/* Primary Genres */}
            <div className="space-y-2">
              <Label className="text-neutral-900 font-medium">Primary Genres</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COMMON_GENRES.map((genre) => {
                  const selected = formData.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#D71920] text-white shadow-sm ring-2 ring-red-200'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {genre} {selected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-genres */}
            <div className="space-y-1.5">
              <Label htmlFor="subgenres" className="text-neutral-900 font-medium">
                Sub-genres & Micro-styles
              </Label>
              <Input
                id="subgenres"
                name="subgenres"
                value={formData.subgenres}
                onChange={handleInputChange}
                placeholder="e.g. Dakhni Drill, Melodic Trap, Old School Boom Bap, Ghazal Rap"
              />
              <p className="text-xs text-neutral-500">Separate multiple subgenres with commas.</p>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label className="text-neutral-900 font-medium">Languages You Rap / Sing In</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COMMON_LANGUAGES.map((lang) => {
                  const selected = formData.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        selected
                          ? 'bg-neutral-900 text-white shadow-sm'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {lang} {selected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vocal Style & Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="vocal_style" className="text-neutral-900 font-medium">
                  Vocal Style / Flow
                </Label>
                <Input
                  id="vocal_style"
                  name="vocal_style"
                  value={formData.vocal_style}
                  onChange={handleInputChange}
                  placeholder="e.g. Fast Aggressive Flow, Melodic Autotune, Baritone"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instruments" className="text-neutral-900 font-medium">
                  Instruments / Production Tools
                </Label>
                <Input
                  id="instruments"
                  name="instruments"
                  value={formData.instruments}
                  onChange={handleInputChange}
                  placeholder="e.g. FL Studio, Keys, Guitar, MPC"
                />
              </div>
            </div>

            {/* Songwriting & Composition Checkboxes */}
            <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="songwriting"
                  checked={formData.songwriting}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded text-[#D71920] focus:ring-[#D71920] border-neutral-300"
                />
                <div>
                  <span className="text-sm font-semibold text-neutral-900">Songwriter / Lyricist</span>
                  <p className="text-xs text-neutral-500">I write original lyrics, verses, or hooks.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="composition"
                  checked={formData.composition}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded text-[#D71920] focus:ring-[#D71920] border-neutral-300"
                />
                <div>
                  <span className="text-sm font-semibold text-neutral-900">Music Composer</span>
                  <p className="text-xs text-neutral-500">I compose melodies, chords, or beats.</p>
                </div>
              </label>
            </div>

            {/* Influences & Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="influences" className="text-neutral-900 font-medium">
                Musical Influences
              </Label>
              <Input
                id="influences"
                name="influences"
                value={formData.influences}
                onChange={handleInputChange}
                placeholder="e.g. Tupac, J. Cole, Nusrat Fateh Ali Khan, Sidhu Moosewala"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-neutral-900 font-medium">
                Artist Bio / Story
              </Label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about your background, journey, what inspires your music, and what you aim to achieve with Dakhni Verse..."
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: STREAMING & SOCIAL LINKS */}
        <Card className="border border-neutral-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D71920] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#D71920]" />
                  Social & Streaming Links
                </CardTitle>
                <CardDescription>
                  Connect your Spotify, YouTube, Instagram, and other artist platforms.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {formData.socialLinks.map((link: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <Select
                    value={link.platform}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSocialLink(index, 'platform', e.target.value)}
                    options={[
                      { label: 'Spotify', value: 'Spotify' },
                      { label: 'Instagram', value: 'Instagram' },
                      { label: 'YouTube', value: 'YouTube' },
                      { label: 'Apple Music', value: 'Apple Music' },
                      { label: 'SoundCloud', value: 'SoundCloud' },
                      { label: 'Twitter / X', value: 'Twitter' },
                      { label: 'Other', value: 'Other' },
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder={`https://${link.platform.toLowerCase()}.com/...`}
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSocialLink(index)}
                  className="text-neutral-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSocialLink}
              className="text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Another Link
            </Button>
          </CardContent>

          <CardFooter className="bg-neutral-50/80 border-t border-neutral-100 py-5 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-neutral-500 text-center sm:text-left">
              By submitting, your profile will be synced immediately to the collective dashboard.
            </p>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#D71920] hover:bg-[#b5141a] text-white px-8 font-semibold shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit & Sync Profile
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        imageUrl={rawImageForCrop}
        onCrop={handleCropComplete}
        onClose={() => setCropDialogOpen(false)}
      />
    </div>
  );
}
