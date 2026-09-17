"use client"

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import { createArtist } from '@/lib/queries/artists';
import { createArtistSchema, artistMusicProfileSchema, artistSocialLinkSchema } from '@/lib/validation/artist';
import { ARTIST_STATUSES } from '@/lib/utils/constants';
import { UploadCloud } from 'lucide-react';

const STEPS = ['Basic Info', 'Music Profile', 'Career', 'Social Links', 'Dakhni Verse', 'Review', 'Save'];

export function AddArtistForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState<any>({
    status: 'Active',
    date_joined: new Date().toISOString().split('T')[0],
    socialLinks: []
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  const goToStep = (stepIndex: number) => setCurrentStep(stepIndex);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const value = e.target.value;
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value.split(',').map(item => item.trim()).filter(Boolean)
    }));
  };

  const addSocialLink = () => {
    setFormData((prev: any) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'Instagram', url: '' }]
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

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file (PNG, JPG, etc.)', variant: 'destructive' });
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData };
      const response = await createArtist(dataToSubmit);
      if (response?.error) {
        throw new Error(response.error);
      }
      toast({ title: 'Success', description: 'Artist created successfully', variant: 'success' });
      router.push(`/artists/${response?.id}`);
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'string' ? error : 'Failed to create artist');
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="stage_name">Stage Name *</Label>
              <Input id="stage_name" name="stage_name" placeholder="Enter stage name" value={formData.stage_name || ''} onChange={handleInputChange} required />
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

            <div>
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input id="legal_name" name="legal_name" value={formData.legal_name || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="e.g. Bengaluru" value={formData.location || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={formData.phone || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="date_joined">Date Joined *</Label>
              <Input id="date_joined" name="date_joined" type="date" value={formData.date_joined || ''} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select 
                id="status" 
                name="status" 
                value={formData.status || 'Active'} 
                onChange={handleInputChange as any}
                options={ARTIST_STATUSES.map(s => ({ label: s, value: s }))}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="primary_role">Primary Role</Label>
              <Input id="primary_role" name="primary_role" value={formData.primary_role || ''} onChange={handleInputChange} placeholder="e.g., Vocalist, Rapper, Beatmaker" />
            </div>
            <div>
              <Label htmlFor="genres">Genres (comma-separated)</Label>
              <Input id="genres" name="genres" value={(formData.genres || []).join(', ')} onChange={(e) => handleArrayInputChange(e, 'genres')} />
            </div>
            <div>
              <Label htmlFor="subgenres">Subgenres (comma-separated)</Label>
              <Input id="subgenres" name="subgenres" value={(formData.subgenres || []).join(', ')} onChange={(e) => handleArrayInputChange(e, 'subgenres')} />
            </div>
            <div>
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input id="languages" name="languages" value={(formData.languages || []).join(', ')} onChange={(e) => handleArrayInputChange(e, 'languages')} />
            </div>
            <div>
              <Label htmlFor="vocal_style">Vocal Style</Label>
              <Input id="vocal_style" name="vocal_style" value={formData.vocal_style || ''} onChange={handleInputChange} />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Input type="checkbox" id="songwriting" name="songwriting" checked={formData.songwriting || false} onChange={handleInputChange} className="w-4 h-4" />
                <Label htmlFor="songwriting">Songwriting</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input type="checkbox" id="composition" name="composition" checked={formData.composition || false} onChange={handleInputChange} className="w-4 h-4" />
                <Label htmlFor="composition">Composition</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="instruments">Instruments (comma-separated)</Label>
              <Input id="instruments" name="instruments" value={(formData.instruments || []).join(', ')} onChange={(e) => handleArrayInputChange(e, 'instruments')} />
            </div>
            <div>
              <Label htmlFor="influences">Influences</Label>
              <Textarea id="influences" name="influences" value={formData.influences || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="preferred_producers">Preferred Producers</Label>
              <Input id="preferred_producers" name="preferred_producers" value={formData.preferred_producers || ''} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={formData.bio || ''} onChange={handleInputChange} rows={4} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-secondary-foreground">Career information can be added in the Music Profile section.</p>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {formData.socialLinks.map((link: any, index: number) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Platform</Label>
                  <Select 
                    value={link.platform} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSocialLink(index, 'platform', e.target.value)}
                    options={['Instagram', 'YouTube', 'Spotify', 'Apple Music', 'SoundCloud', 'Other'].map(p => ({ label: p, value: p }))}
                  />
                </div>
                <div className="flex-[2]">
                  <Label>URL</Label>
                  <Input value={link.url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSocialLink(index, 'url', e.target.value)} type="url" />
                </div>
                <Button variant="destructive" onClick={() => removeSocialLink(index)} type="button">X</Button>
              </div>
            ))}
            <Button type="button" onClick={addSocialLink} variant="outline">Add Link</Button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dakhni_verse_role">Dakhni Verse Role</Label>
              <Input id="dakhni_verse_role" name="dakhni_verse_role" value={formData.dakhni_verse_role || ''} onChange={handleInputChange} placeholder="e.g., Artist, Producer, Manager" />
            </div>
            <p className="text-sm text-secondary-foreground">Note: Contribution details are tracked separately in the Finance section</p>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Basic Info</h3>
                <Button variant="outline" size="sm" onClick={() => goToStep(0)}>Edit</Button>
              </div>
              <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">{JSON.stringify({
                stage_name: formData.stage_name,
                legal_name: formData.legal_name,
                date_joined: formData.date_joined,
                status: formData.status
              }, null, 2)}</pre>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">Music Profile</h3>
                <Button variant="outline" size="sm" onClick={() => goToStep(1)}>Edit</Button>
              </div>
              <pre className="bg-gray-50 p-2 rounded text-sm overflow-auto">{JSON.stringify({
                genres: formData.genres,
                languages: formData.languages
              }, null, 2)}</pre>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-bold">Ready to save</h3>
            <p>Click submit to create this artist profile.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <div className="p-4 border-b flex justify-between items-center overflow-x-auto">
        <div className="flex gap-2">
          {STEPS.map((step, idx) => (
            <span key={step} className={`text-sm px-2 py-1 rounded ${currentStep === idx ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
              {idx + 1}. {step}
            </span>
          ))}
        </div>
      </div>
      <CardContent className="pt-6">
        {renderStep()}
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0 || isSubmitting}>Back</Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={nextStep}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.stage_name || !formData.date_joined}>
            {isSubmitting ? 'Saving...' : 'Submit'}
          </Button>
        )}
      </CardFooter>

      {cropDialogOpen && rawImageForCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={rawImageForCrop}
          onCrop={handleCropComplete}
          onClose={() => setCropDialogOpen(false)}
        />
      )}
    </Card>
  );
}
