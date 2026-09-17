# Changelog

All notable changes to the **DAKHNI VERSE** application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-17

### Added
- **Public Shareable Artist Intake Portal (`/join` & `/artist-form`)**:
  - Direct, publicly accessible self-service registration and update form without requiring login.
  - Mobile-responsive layout matching the collective's brand identity.
  - Complete field capture across basic identity, contact info, musical profile (roles, genres, subgenres, languages, vocal style, songwriting/composition skills, instruments, influences), bio, and social/streaming links.
  - Profile photo uploader with drag-and-drop and the interactive `ImageCropDialog` (pan & zoom face-framing).
- **Smart Duplicate Matching & Auto-Sync Engine (`submitArtistSelfService`)**:
  - Automatically matches submissions against existing collective artists via `email` (case-insensitive), `stage_name` (case-insensitive), or `phone`.
  - If a matching artist exists, updates their profile with the latest submitted details instead of creating duplicates.
  - If no match exists, registers a new active artist profile.
  - Automatically syncs and revalidates `/artists`, `/dashboard`, `/projects`, `/sessions`, and `/artists/[id]`.
  - Logs an audit event in `activity_logs`.
- **Manager One-Click Share Button (`ShareArtistFormButton`)**:
  - Added to the `/artists` management header to copy the public `/join` link to the clipboard with one click or open it in a new tab.
- **Repository Security (`.gitignore` & `.env.example`)**:
  - Comprehensive, categorized `.gitignore` guarding secrets (`.env*.local`, keys, tokens), build caches (`.next/`), OS files, and scratch directories.
  - Safe `.env.example` configuration template for repository setup.

---

## [1.1.0] - 2026-09-17

### Added
- **Interactive Photo Crop & Adjuster Modal (`ImageCropDialog`)**:
  - Zoom slider (100% to 300%) with reset control.
  - Interactive mouse/touch dragging to reposition and center the artist's face inside the circular boundary.
  - High-resolution HTML5 canvas rendering (500x500 px) for crisp avatar output.
- **Full-Screen Image Lightbox (`ImageLightbox`)**:
  - Clicking on any artist's avatar on their profile page opens a full-screen preview on a dark backdrop.
  - Keyboard navigation (`Esc` to dismiss) and backdrop-click to close.
- **Drag & Drop Profile Picture Upload Zone**:
  - Removed technical text inputs showing raw URLs and base64 strings.
  - Replaced with a modern drag-and-drop box with click-to-browse fallback.
  - Added direct "Adjust / Crop" and "Remove" quick-actions.
- **Artist Profile Editor (`/artists/[id]/edit`)**:
  - Full edit page pre-populated with existing artist data, musical attributes, and social links.
  - Sanitized multi-table updates across `artists`, `artist_music_profiles`, and `artist_social_links`.
- **Navigation Shortcuts**:
  - Direct "Create Account / Setup" link on the Login screen (`/login`).
  - Direct "Sign In" link on the Setup screen (`/setup`).
- **Global Toast Notification Provider**:
  - Wrapped `<ToastProvider>` in root layout to make alerts accessible across all routes.
  - Added safe fallback inside `useToast()` to prevent uncaught runtime errors.

### Fixed
- **PostgreSQL Case-Sensitive Enum Query**:
  - Fixed `getArtistOptions` query in `artists.ts` from lowercase `'active'` to exact database enum `'Active'`, resolving `invalid input value for enum artist_status: "active"` errors on Project and Session creation pages.
- **Artist KPI Metric Alignment**:
  - Added `studioHours` formatted hours return in `artist-kpi.ts` so the artist profile KPI card displays accurate studio hours.
- **Supabase URL Configuration**:
  - Corrected `.env.local` to remove trailing `/rest/v1/` path causing `"Invalid path specified in request URL"` during Supabase auth requests.
- **First-Time Setup RLS Policy**:
  - Updated `users` table Row-Level Security policies to allow self-insert during first-time registration at `/setup`.
  - Added automatic backfill script in migrations for existing auth registrations.
- **Browser Extension Hydration Conflicts**:
  - Added `suppressHydrationWarning` to `<html>` and `<body>` in root layout.
  - Added client-mount guards (`useEffect`) on `/login` and `/setup` to eliminate hydration diff overlays triggered by extensions injecting attributes like `bis_skin_checked="1"`.
- **Artist Creation Column Routing**:
  - Fixed `createArtist` query to cleanly isolate core artist fields from child music profiles (`artist_music_profiles`) and social links (`artist_social_links`), resolving PostgREST schema cache errors for columns like `composition` and `genres`.

---

## [1.0.0] - 2026-09-17

### Added
- **Initial Production Architecture**:
  - Fully functional private internal web application for DAKHNI VERSE collective.
  - Next.js 15 (App Router with Turbopack), React 19, TypeScript 5.8, Tailwind CSS v4.
- **Zero Demo Data Standard**:
  - Zero mock records, seed users, or placeholder KPI values.
  - Contextual `EmptyState` components across all empty lists and tables.
- **Database Schema (`supabase/migrations/001_initial_schema.sql`)**:
  - 10 custom PostgreSQL enums.
  - 13 relational tables: `users`, `artists`, `artist_music_profiles`, `artist_social_links`, `projects`, `project_status_history`, `sessions`, `releases`, `contributions`, `expenses`, `equipment`, `targets`, `activity_logs`.
  - Automated triggers for duration calculations (`calculate_session_duration`), overnight studio shifts, project status audits (`log_project_status_change`), and timestamps (`update_updated_at`).
  - Row-Level Security (RLS) policies for `Manager`, `Artist`, and `Producer` roles.
- **Real-Time KPI Calculation Engine (`src/lib/calculations/`)**:
  - Available Funds gauge: `Confirmed Contributions − Total Expenses`.
  - Studio Hours summation from actual logged session minutes.
  - Production workload distributions across Production, Mixing, and Mastering.
  - Period-sensitive filtering (`This Month`, `Last Month`, `Last 3 Months`, `This Year`, `Custom`).
- **Currency & Formatting**:
  - Indian Rupee (`₹`) formatting with Indian numbering system (`en-IN`).
  - Date and duration formatting utilities.
- **8 Core Functional Modules**:
  - **Dashboard**: 8 drill-down KPI cards, available funds gauge, activity chart, expense breakdown donut, production summary, activity feed.
  - **Artists**: Roster directory, 7-step onboarding wizard, profile with calculated metrics.
  - **Projects**: Production pipeline tracking, team role assignment, status history audit timeline.
  - **Studio Sessions**: Session logger with live duration preview and midnight-crossing calculation.
  - **Releases**: Release tracker, distributor/ISRC metadata, direct streaming platform badges.
  - **Finance**: Financial summary, contributions and categorized expenses tables.
  - **Equipment**: Studio gear inventory, condition tracking, collective vs. individual ownership.
  - **Settings**: Monthly production target manager per producer.
