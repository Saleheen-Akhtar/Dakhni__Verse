"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import { saveArtistFull } from '@/lib/queries/artists';
import { ARTIST_STATUSES } from '@/lib/utils/constants';
import { uploadProfileImage } from '@/lib/storage/upload';
import { UploadCloud } from 'lucide-react';

interface EditArtistFormProps {
  artist: any;
}

export function EditArtistForm({ artist }: EditArtistFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const musicProfile = artist.music_profile || {};
  const initialSocialLinks = (artist.social_links || []).map((l: any) => ({
    platform: l.platform || 'Instagram',
    url: l.url || '',
  }));

  const [formData, setFormData] = useState<any>({
    // Basic
    stage_name: artist.stage_name || '',
    legal_name: artist.legal_name || '',
    profile_image_url: artist.profile_image_url || '',
    location: artist.location || '',
    phone: artist.phone || '',
    email: artist.email || '',
    date_joined: artist.date_joined || '',
    status: artist.status || 'Active',
    dakhni_verse_role: artist.dakhni_verse_role || 'Artist',
    // Music profile
    primary_role: musicProfile.primary_role || '',
    genres: musicProfile.genres || [],
    subgenres: musicProfile.subgenres || [],
    languages: musicProfile.languages || [],
    vocal_style: musicProfile.vocal_style || '',
    songwriting: Boolean(musicProfile.songwriting),
    composition: Boolean(musicProfile.composition),
    instruments: musicProfile.instruments || [],
    influences: musicProfile.influences || '',
    preferred_producers: musicProfile.preferred_producers || '',
    bio: musicProfile.bio || '',
    // Social links
    socialLinks: initialSocialLinks,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const value = e.target.value;
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value.split(',').map((item) => item.trim()).filter(Boolean),
    }));
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (PNG, JPG, WebP)', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Profile picture must be 2MB or smaller.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setRawImageForCrop(result);
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

  const handleOpenCropForCurrent = () => {
    if (formData.profile_image_url) {
      setRawImageForCrop(formData.profile_image_url);
      setCropDialogOpen(true);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setFormData((prev: any) => ({ ...prev, profile_image_url: croppedDataUrl }));
    toast({ title: 'Photo updated', variant: 'success' });
  };

  const addSocialLink = () => {
    setFormData((prev: any) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'Instagram', url: '' }],
    }));
  };

  const updateSocialLink = (index: number, field: string, value: string) => {
    const newLinks = [...formData.socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, socialLinks: newLinks }));
  };

  const removeSocialLink = (index: number) => {
    const newLinks = [...formData.socialLinks];
    newLinks.splice(index, 1);
    setFormData((prev: any) => ({ ...prev, socialLinks: newLinks }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.profile_image_url || null;
      if (finalImageUrl) {
        finalImageUrl = await uploadProfileImage(finalImageUrl, formData.stage_name || 'artist');
      }

      const artistData = {
        stage_name: formData.stage_name,
        legal_name: formData.legal_name || null,
        profile_image_url: finalImageUrl,
        location: formData.location || null,
        phone: formData.phone || null,
        email: formData.email || null,
        date_joined: formData.date_joined,
        status: formData.status,
        dakhni_verse_role: formData.dakhni_verse_role || null,
      };

      const musicProfileData = {
        primary_role: formData.primary_role || null,
        genres: formData.genres,
        subgenres: formData.subgenres,
        languages: formData.languages,
        vocal_style: formData.vocal_style || null,
        songwriting: formData.songwriting,
        composition: formData.composition,
        instruments: formData.instruments,
        influences: formData.influences || null,
        preferred_producers: formData.preferred_producers || null,
        bio: formData.bio || null,
      };

      await saveArtistFull(artist.id, artistData, musicProfileData, formData.socialLinks);

      toast({ title: 'Success', description: 'Artist profile updated successfully', variant: 'success' });
      router.push(`/artists/${artist.id}`);
      router.refresh();
    } catch (error: any) {
      const msg = error?.message || 'Failed to update artist';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="stage_name">Stage Name *</Label>
            <Input
              id="stage_name"
              name="stage_name"
              placeholder="Enter stage name"
              value={formData.stage_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label>Profile Picture</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-2">
              {/* Avatar preview with quick-adjust overlay */}
              <div className="relative group shrink-0">
                <Avatar
                  src={formData.profile_image_url}
                  fallback={formData.stage_name?.substring(0, 2).toUpperCase() || 'AR'}
                  size="xl"
                  className="w-20 h-20 border-2 border-[#E5E5E5] shadow-sm"
                />
                {formData.profile_image_url && (
                  <button
                    type="button"
                    onClick={handleOpenCropForCurrent}
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
                    : 'border-neutral-300 hover:border-[#D71920] bg-neutral-50/50 hover:bg-neutral-50'
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
                <p className="text-sm font-medium text-neutral-700">
                  <span className="text-[#D71920] underline font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-secondary-foreground mt-0.5">PNG, JPG, WEBP</p>
              </div>

              {/* Adjust / Remove Actions */}
              {formData.profile_image_url && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCropForCurrent}
                    className="text-xs"
                  >
                    Adjust / Crop
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev: any) => ({ ...prev, profile_image_url: '' }))}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="location">Location / City</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g. Bengaluru"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date_joined">Date Joined *</Label>
              <Input
                id="date_joined"
                name="date_joined"
                type="date"
                value={formData.date_joined}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange as any}
                options={ARTIST_STATUSES.map((s) => ({ label: s, value: s }))}
              />
            </div>
            <div>
              <Label htmlFor="dakhni_verse_role">Dakhni Verse Role</Label>
              <Input
                id="dakhni_verse_role"
                name="dakhni_verse_role"
                value={formData.dakhni_verse_role}
                onChange={handleInputChange}
                placeholder="e.g. Core Artist, Resident Producer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Music Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Music Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary_role">Primary Musical Role</Label>
            <Input
              id="primary_role"
              name="primary_role"
              value={formData.primary_role}
              onChange={handleInputChange}
              placeholder="e.g. Rapper / Lyricist / Music Producer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genres">Genres (comma-separated)</Label>
              <Input
                id="genres"
                name="genres"
                value={(formData.genres || []).join(', ')}
                onChange={(e) => handleArrayInputChange(e, 'genres')}
                placeholder="Dakhni Hip-Hop, Drill, Boombap"
              />
            </div>
            <div>
              <Label htmlFor="subgenres">Subgenres (comma-separated)</Label>
              <Input
                id="subgenres"
                name="subgenres"
                value={(formData.subgenres || []).join(', ')}
                onChange={(e) => handleArrayInputChange(e, 'subgenres')}
                placeholder="Old School, Trap"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                name="languages"
                value={(formData.languages || []).join(', ')}
                onChange={(e) => handleArrayInputChange(e, 'languages')}
                placeholder="Dakhni, Urdu, Hindi, English"
              />
            </div>
            <div>
              <Label htmlFor="vocal_style">Vocal Style</Label>
              <Input
                id="vocal_style"
                name="vocal_style"
                value={formData.vocal_style}
                onChange={handleInputChange}
                placeholder="Aggressive, Melodic, Fast-flow"
              />
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                name="songwriting"
                checked={formData.songwriting}
                onChange={handleInputChange}
                className="w-4 h-4 rounded text-[#D71920] focus:ring-[#D71920]"
              />
              Songwriting
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                name="composition"
                checked={formData.composition}
                onChange={handleInputChange}
                className="w-4 h-4 rounded text-[#D71920] focus:ring-[#D71920]"
              />
              Composition
            </label>
          </div>

          <div>
            <Label htmlFor="instruments">Instruments Played (comma-separated)</Label>
            <Input
              id="instruments"
              name="instruments"
              value={(formData.instruments || []).join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'instruments')}
              placeholder="Keyboard, Guitar, Sampler"
            />
          </div>

          <div>
            <Label htmlFor="influences">Influences</Label>
            <Input
              id="influences"
              name="influences"
              value={formData.influences}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Social Links */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Social & Streaming Links</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
            + Add Link
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.socialLinks.length === 0 ? (
            <p className="text-sm text-secondary-foreground">No social links added yet.</p>
          ) : (
            formData.socialLinks.map((link: any, index: number) => (
              <div key={index} className="flex gap-3 items-center">
                <Select
                  value={link.platform}
                  onChange={(e: any) => updateSocialLink(index, 'platform', e.target.value)}
                  options={[
                    { label: 'Instagram', value: 'Instagram' },
                    { label: 'YouTube', value: 'YouTube' },
                    { label: 'Spotify', value: 'Spotify' },
                    { label: 'Apple Music', value: 'Apple Music' },
                    { label: 'Twitter / X', value: 'Twitter' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  className="w-40"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSocialLink(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/artists/${artist.id}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </Button>
      </div>

      {cropDialogOpen && rawImageForCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={rawImageForCrop}
          onCrop={handleCropComplete}
          onClose={() => setCropDialogOpen(false)}
        />
      )}
    </form>
  );
}