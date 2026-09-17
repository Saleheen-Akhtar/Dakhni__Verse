"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Share2, Check, Copy, ExternalLink } from 'lucide-react';

export function ShareArtistFormButton() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const getJoinUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join`;
    }
    return '/join';
  };

  const handleCopy = async () => {
    const url = getJoinUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      toast({
        title: 'Form Link Copied!',
        description: 'Share this link with artists to fill in or update their profile on their own.',
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: 'Share Link',
        description: url,
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleCopy}
        className="gap-1.5 border-neutral-300 hover:border-neutral-400 bg-white"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Link Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4 text-[#D71920]" />
            <span>Share Artist Form</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        asChild
        title="Open public form in new tab"
        className="text-neutral-500 hover:text-neutral-900"
      >
        <a href="/join" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}
