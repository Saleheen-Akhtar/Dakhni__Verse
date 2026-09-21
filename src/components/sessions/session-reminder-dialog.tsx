'use client';

import { useState } from 'react';
import { Send, Copy, Check, MessageCircle, Phone, Clock, Calendar, User, MapPin, X, Users, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatDuration } from '@/lib/utils/format';
import { useToast } from '@/components/ui/toast';

interface SessionReminderDialogProps {
  session: any | null;
  onClose: () => void;
}

export function formatWhatsAppSessionReminder(session: any): string {
  if (!session) return '';

  const artistName = session.artist?.stage_name || session.artist?.name || 'Artist';
  const dateStr = formatDate(session.session_date || session.date);
  const startTime = session.start_time ? session.start_time.substring(0, 5) : '';
  const endTime = session.end_time ? session.end_time.substring(0, 5) : '';
  const duration = formatDuration(session.duration_minutes || 0);
  const sessionType = session.session_type || 'Recording';
  const projectTitle = session.project?.title ? `"${session.project.title}"` : 'Studio Project';
  const engineerName = session.engineer?.stage_name || session.engineer?.name || 'Studio Engineer';
  const studioLocation = 'Dakhni Verse Main Studio, Bengaluru';
  const notes = session.notes ? session.notes.trim() : '';

  let message = `🎙️ *STUDIO SESSION REMINDER — DAKHNI VERSE*\n\n`;
  message += `Hey *${artistName}*! Here are the booking details for your upcoming studio session:\n\n`;
  message += `📅 *Date:* ${dateStr}\n`;
  message += `⏰ *Call Time:* ${startTime} – ${endTime} (${duration})\n`;
  message += `🎛️ *Session Type:* ${sessionType} Session\n`;
  message += `🎵 *Project:* ${projectTitle}\n`;
  message += `🎧 *Engineer / Producer:* ${engineerName}\n`;
  message += `📍 *Studio Location:* ${studioLocation}\n\n`;

  if (notes) {
    message += `📝 *Session Prep & Notes:*\n"${notes}"\n\n`;
  }

  message += `💡 *Studio Protocol:* Please arrive 10–15 minutes before your call time with any lyric sheets, references, or audio stems ready.\n\n`;
  message += `Let's make heat! 🔥\n— *Dakhni Verse Management*`;

  return message;
}

export function SessionReminderDialog({ session, onClose }: SessionReminderDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const initialPhone = session?.artist?.phone || '';
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);

  if (!session) return null;

  const reminderText = formatWhatsAppSessionReminder(session);
  const artistName = session.artist?.stage_name || session.artist?.name || 'Artist';

  const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(reminderText)}`
    : `https://wa.me/?text=${encodeURIComponent(reminderText)}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reminderText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reminderText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      toast({
        title: 'Reminder Copied! 📋',
        description: 'Session reminder message copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Please copy the message manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white p-5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                WhatsApp Studio Reminder
              </h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Pre-formatted reminder for <span className="text-emerald-400 font-semibold">{artistName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Phone Number Field */}
          <div>
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block mb-1">
              Recipient WhatsApp Number
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9876543210 (10-digit number)"
                  className="w-full text-xs font-mono pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {!formattedPhone && (
                <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Enter number or send directly in chat
                </span>
              )}
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-sans text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
              {reminderText}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs border-neutral-300 w-full sm:w-auto"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Text
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Send to Group / Pick Chat on WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(reminderText)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="inline-flex items-center justify-center text-xs font-semibold px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm transition-colors text-center"
                title="Choose any WhatsApp Group or Contact to send this reminder"
              >
                <Users className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Send to Group / Chat
              </a>

              {/* Direct to Artist */}
              {formattedPhone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="inline-flex items-center justify-center text-xs font-semibold px-3.5 py-2 rounded-md bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-sm transition-colors text-center"
                  title={`Send directly to ${artistName}`}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Direct to Artist
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
