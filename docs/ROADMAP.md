# DAKHNI VERSE — Product Roadmap & Future Architecture Proposals

This document outlines the strategic product roadmap and engineering blueprints for upcoming features and architectural evolutions in **DAKHNI VERSE**. 

---

## Roadmap Overview

```
Phase 1: Immediate Enhancements (v1.2.0)
 ├── 🎧 Inline Audio Player & Demo Previews (WAV/MP3)
 ├── 🖼️ 1:1 Square Cover Artwork Cropper for Releases & Projects
 └── 📑 Expense Receipt Upload & CSV Financial Export

Phase 2: Studio Workflow & Scheduling (v1.3.0)
 ├── 📅 Interactive Studio Calendar & Conflict-Free Slot Booking
 ├── 🌓 Studio Dark Mode (Optimized for Low-Light Control Rooms)
 └── 🎹 Equipment Borrowing & Gear Check-out Tracker

Phase 3: Legal & Distribution Intelligence (v2.0.0)
 ├── 📜 Automated Song Split Sheets & PDF Contract Generator
 ├── ⌨️ Global Command Palette (Ctrl + K)
 └── 📲 Studio Session WhatsApp/Email Notifications
```

---

## Phase 1: Immediate Enhancements (v1.2.0)

### 1. 🎧 Inline Audio Player & Demo Previews
**Goal**: Allow producers and artists to attach WIP demos, rough vocals, mix iterations, and mastered bounces directly to projects and studio sessions, listening to them inside the browser without leaving the application.

#### Features & User Experience:
- **Multi-Version Track Stacking**: Support uploading `Mix v1`, `Mix v2`, `Master Draft`, and `Final Master`.
- **Persistent Bottom Player / Inline Waveform**:
  - Waveform visualizer (using Wavesurfer.js or Web Audio API).
  - Play / Pause, Seek bar, Time elapsed / Remaining, and Volume slider.
  - Keyboard shortcuts (`Space` to toggle playback, `←` / `→` for 5s jumps).
- **Timecoded Feedback Comments**: Engineers and artists can click a specific timestamp on the waveform to leave notes (e.g., *“01:24 — bring up ad-libs and cut 250Hz on snare”*).

#### Technical Architecture:
- **Storage**: Supabase Storage private bucket `project-audio/`.
- **Signed URLs**: Time-limited signed URLs generated server-side for authenticated collective members to prevent public scraping.
- **Database Schema Addition**:
  ```sql
  CREATE TABLE project_audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    version_tag VARCHAR(50) NOT NULL DEFAULT 'v1',
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    waveform_data JSONB,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

---

### 2. 🖼️ Square Cover Artwork Cropper for Releases & Projects
**Goal**: Expand the existing profile avatar cropper into a dedicated release artwork preparation tool that ensures artwork complies with streaming platform standards (Spotify, Apple Music, YouTube Music).

#### Features & User Experience:
- **1:1 Square Aspect Ratio Mask**: Enforces the industry standard square format (up to 3000×3000 px).
- **Resolution Quality Inspector**: Warns if the source upload is under 1400×1400 px or has incorrect DPI for DSP submission.
- **Explicit Content Badge Placement Preview**: Toggle an overlay preview showing where the Spotify "Explicit" tag and parental advisory logos will appear, avoiding text obstruction.

#### Technical Architecture:
- Reuse the proven canvas transform pipeline from `ImageCropDialog` with an adjustable `aspectRatio="1:1"` mode and export resolution up to `3000x3000`.
- Store artwork in Supabase Storage bucket `release-artwork/` with automatic WebP optimization.

---

### 3. 📑 Expense Receipt Lightbox & CSV / Excel Financial Export
**Goal**: Upgrade the financial management module with verifiable proof of purchases (studio gear, rent bills, electricity, plugin licenses) and one-click reporting for studio accounting.

#### Features & User Experience:
- **Receipt Attachment**: Upload receipt images (`.jpg`, `.png`, `.pdf`) directly when logging studio expenses.
- **Click-to-Preview Lightbox**: Integrated with `ImageLightbox` to inspect receipts and invoices in full screen.
- **One-Click Financial Export**: Export filtered contribution and expense ledgers into standard `.csv` and Excel formats, formatted with Indian Rupee totals and category classifications.

---

## Phase 2: Studio Workflow & Scheduling (v1.3.0)

### 4. 📅 Interactive Studio Calendar & Conflict-Free Slot Booking
**Goal**: Transform the Studio Sessions module into a visual calendar interface displaying scheduled recording blocks, mix reviews, and rehearsals.

#### Features & User Experience:
- **Week & Month Timeline Views**: Color-coded time blocks by session type (🔴 Recording, 🟣 Production, 🔵 Mixing, 🟢 Mastering).
- **Overnight Recording Visualization**: Distinct graphical indicators for late-night sessions that stretch past midnight into the morning.
- **Double-Booking Prevention**: Automatic client-side and server-side validation preventing overlapping sessions for the same physical recording booth or assigned engineer.
- **Google Calendar / iCal Sync**: Exportable `.ics` calendar feed enabling artists and engineers to sync studio schedules with their personal smartphones.

---

### 5. 🌓 Studio Dark Mode
**Goal**: Provide an eye-friendly, deeply immersive dark interface designed specifically for dimly lit control rooms and night recording sessions.

#### Visual Palette:
- **Background Primary**: `#0D0E11` (Deep Onyx)
- **Card Surface**: `#16181D` (Smoked Charcoal with 1px border `#262930`)
- **Accent Primary**: `#D71920` (Dakhni Signature Crimson)
- **Text Primary**: `#F3F4F6` (Cool Platinum)
- **Text Muted**: `#9CA3AF` (Refined Silver)

#### Technical Architecture:
- Next-themes integration supporting `System`, `Light`, and `Dark` modes with zero flash of unstyled content (FOUC).
- Tailwind CSS v4 CSS variables mapping color tokens dynamically.

---

### 6. 🎹 Equipment Borrowing & Gear Check-Out Tracker
**Goal**: Prevent loss and track the physical location of studio gear (expensive condenser mics, audio interfaces, dynamic processors, guitars, synthesizers) when collective members take equipment off-site.

#### Features & User Experience:
- **Check-Out Flow**: Record who borrowed the equipment, check-out timestamp, anticipated return date, and purpose (e.g. *“Live gig at Hard Rock Cafe”* or *“Home writing session”*).
- **Overdue Alerts**: Visual badges flagging equipment that has exceeded its expected return date.
- **Condition Log on Return**: Prompts the engineer to certify equipment condition upon return (`Good`, `Cable damaged`, `Needs repair`).

---

## Phase 3: Legal & Distribution Intelligence (v2.0.0)

### 7. 📜 Automated Song Split Sheets & PDF Contract Generator
**Goal**: Eliminate revenue and copyright disputes before release day by generating legally binding split sheets agreed upon by all collaborators.

#### Features & User Experience:
- **4-Way Royalty Distribution Engine**:
  1. Master Rights % (Sound recording ownership)
  2. Publishing Rights % (Composition & melodies)
  3. Lyrics / Songwriting %
  4. Producer Points %
- **Real-Time 100% Validation**: Interactive pie chart ensuring the sum of all contributor shares equals exactly 100%.
- **One-Click PDF Export**: Generates a clean, branded PDF agreement document containing artist real legal names, stage names, IPI/CAE numbers, signature lines, and collective letterhead.

---

### 8. ⌨️ Global Command Palette (`Ctrl + K` / `Cmd + K`)
**Goal**: Enable power users and studio managers to navigate anywhere in the system in less than two keystrokes.

#### Features & Shortcuts:
- `Ctrl + K`: Open search modal across entire collective database.
- Direct fuzzy search across:
  - Artists (*“Mc Stud”*, *“Yash”*)
  - Projects (*“Dakhni Drill Vol 1”*)
  - Studio Sessions by date or engineer
  - Equipment by brand or serial number
- Quick Actions:
  - `> New Session`: Immediately opens session logger modal.
  - `> New Artist`: Launches 7-step wizard.
  - `> Log Expense`: Opens expense entry.

---

### 9. 📲 Automated WhatsApp & Email Studio Session Alerts
**Goal**: Reduce studio no-shows and ensure artists arrive prepared with prepared lyrics and instrumental tracks.

#### Features & Integrations:
- **2-Hour Prior WhatsApp Reminder**: Automated WhatsApp template message sent to the artist's phone number with session time, studio address, and booked engineer.
- **Project Milestone Notifications**: Automatically triggers an alert to the executive producer when a track moves from `Recording` to `Mixing`.
- **Integration Options**: Twilio WhatsApp API or Interakt / Gupshup for direct Indian phone number delivery.

---

## Summary of Priority Matrix

| Feature | Impact | Effort | Target Version |
|---|:---:|:---:|:---:|
| **Inline Audio Player & Demo Previews** | 🔥 High | Medium | v1.2.0 |
| **1:1 Release Artwork Cropper** | 🎨 High | Low | v1.2.0 |
| **Receipt Lightbox & CSV Accounting Export** | 📊 High | Low | v1.2.0 |
| **Interactive Studio Calendar** | 📅 High | Medium | v1.3.0 |
| **Studio Dark Mode** | 🌓 Medium | Low | v1.3.0 |
| **Equipment Check-Out System** | 🎹 Medium | Low | v1.3.0 |
| **Automated Song Split Sheets & PDF** | 📜 High | Medium | v2.0.0 |
| **Global Command Palette (`Ctrl+K`)** | ⚡ Medium | Low | v2.0.0 |
| **WhatsApp Studio Reminders** | 📲 High | Medium | v2.0.0 |

---

*Last Updated: 2026-09-17 | Maintained by DAKHNI VERSE Engineering*
