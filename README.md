# DAKHNI VERSE — Artist & Studio Collective Management

A private internal operating system and KPI dashboard built specifically for **DAKHNI VERSE** — managing collective artists, recording studio sessions, production pipelines, releases, finances, and studio equipment.

---

## Table of Contents
1. [Core Principles](#core-principles)
2. [Feature Modules](#feature-modules)
3. [Tech Stack & Architecture](#tech-stack--architecture)
4. [Getting Started & Local Setup](#getting-started--local-setup)
5. [Database Architecture & Triggers](#database-architecture--triggers)
6. [Design & Typography System](#design--typography-system)
7. [Project Directory Structure](#project-directory-structure)
8. [Changelog & Roadmap](#changelog--roadmap)

---

## 1. Core Principles

- **Zero Demo Data**: The application contains strictly **zero mock records, fake users, or placeholder KPI values**. Every view is powered by real database records or renders contextual `EmptyState` interfaces with direct action triggers.
- **Dynamic KPI Engine**: All metrics (Active Projects, Studio Hours, Available Funds, etc.) are computed on-the-fly using pure calculation functions in `src/lib/calculations/`.
- **Currency Standard**: All monetary values are formatted in **Indian Rupee (`₹`)** adhering to the Indian numbering system (`en-IN`, e.g. `₹1,50,000.00`).
- **Overnight Studio Handling**: Studio sessions spanning midnight automatically calculate exact minute durations across date boundaries.

---

## 2. Feature Modules

### 🎛️ Dashboard (`/dashboard`)
- **8 Drill-Down KPI Cards**: Active Artists, Active Projects, In Production, Songs Released, Studio Sessions, Studio Hours, Contributions, and Expenses.
- **Available Funds Gauge**: Calculated in real-time (`Confirmed Contributions − Total Expenses`) with pending contributions alerts.
- **Studio Activity Breakdown Chart**: Visual distribution of studio time across Recording, Production, Editing, Mixing, and Mastering.
- **Expense Category Chart**: Interactive donut breakdown of studio overhead (Rent, Equipment, Software, Utilities, etc.).
- **Production Workload Overview**: Real-time project tracking across Production, Mixing, and Mastering stages.
- **Recent Activity Feed**: Audit trail of recent additions and project status transitions.

### 🎤 Artists (`/artists`, `/artists/new`, `/artists/[id]`, `/artists/[id]/edit`, `/join`)
- **Public Shareable Intake Portal (`/join` & `/artist-form`)**: Direct, mobile-friendly intake form shareable with artists via WhatsApp or email. Requires zero login.
- **Smart Duplicate Matching & Auto-Sync**: Automatically compares submissions against existing database records by `email` (case-insensitive), `stage_name` (case-insensitive), or `phone`. If an artist already exists, it updates their profile with the latest details rather than creating duplicates.
- **Manager One-Click Share Button**: Direct "Share Artist Form" button on the Artists page header with clipboard copy and instant new-tab preview.
- **Artist Directory**: Real-time search by stage name, location, and status filtering (`Active`, `Inactive`, `Left`).
- **7-Step Onboarding Wizard**: Step-by-step registration covering Basic Info, Music Profile, Career, Social Links, Dakhni Verse Role, Review, and Save.
- **Photo Upload & Drag-and-Drop**: Drag images directly onto the upload zone without dealing with raw links.
- **Interactive 1:1 Photo Cropper & Adjuster**: Zoom and pan to frame the artist's face inside the circular aperture before saving.
- **Full-Screen Image Lightbox**: Clicking on any artist's avatar displays the high-resolution photo in an interactive preview modal.
- **Artist Profile**: 6-tab detailed view displaying personal KPIs (Active/Completed Projects, Released Songs, Studio Hours), musical traits, bio, and streaming links.
- **Full Profile Editor**: Edit all basic details, musical traits, and social links with instant database synchronization.

### 🎵 Projects (`/projects`, `/projects/new`, `/projects/[id]`)
- **Production Tracker**: Comprehensive pipeline tracking from `Idea` ➔ `Writing` ➔ `Production` ➔ `Recording` ➔ `Editing` ➔ `Mixing` ➔ `Mastering` ➔ `Ready` ➔ `Released`.
- **Collaborative Assignment**: Relational assignment of Artist, Producer, Mix Engineer, and Mastering Engineer.
- **Status History Timeline**: Automated database-triggered audit log recording every status transition with timestamps and user details.

### 🎙️ Studio Sessions (`/sessions`, `/sessions/new`)
- **Session Logger**: Track date, start time, end time, session type, artist, and assigned engineer.
- **Automated Duration Preview**: Real-time duration calculation that supports overnight recording shifts crossing midnight.
- **Type Filtering**: Quick filters for Recording, Production, Mixing, Mastering, and Rehearsal sessions.

### 💿 Releases (`/releases`, `/releases/new`, `/releases/[id]`)
- **Catalog Management**: Track release dates, release status (`Planned`, `Scheduled`, `Released`), distributor, and ISRC codes.
- **Streaming Platform Links**: Direct clickable links to Spotify, Apple Music, YouTube, and other platforms.

### 💰 Finance (`/finance`)
- **Manager-Only Financial Overview**: Available balance, confirmed funds, and categorized expenditure.
- **Tabbed Tables**: Detailed transaction ledgers for Contributions and Categorized Expenses.
- **INR Formatting**: Strict Indian numbering format (`formatCurrency`).

### 🎸 Equipment (`/equipment`, `/equipment/new`)
- **Studio Inventory**: Track brand, model, purchase value, and location.
- **Ownership Classification**: `Dakhni Verse` collective ownership vs. `Individual` artist ownership.
- **Condition Lifecycle**: `New`, `Good`, `Fair`, `Poor`, `Needs Repair`.

### ⚙️ Settings (`/settings`)
- **Producer Production Targets**: Configure monthly song targets per producer to drive collective output.

---

## 3. Tech Stack & Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15.5+ (App Router with Turbopack) | Server Components, Server Actions, Dynamic Routes |
| **Runtime** | React 19 | Fast modern UI component rendering |
| **Language** | TypeScript 5.8 (Strict Mode) | End-to-end type safety across queries and UI |
| **Styling** | Tailwind CSS v4 + `@theme` CSS tokens | Brand colors, responsive layouts, utility classes |
| **Database & Auth** | Supabase (PostgreSQL 15+) | RLS, Database Triggers, Foreign Keys, Custom Enums |
| **Validation** | Zod 3.x + React Hook Form | Schema validation for forms and server actions |
| **Charts** | Recharts 2.x | Responsive data visualizations |
| **Icons** | Lucide React | Lightweight, scalable vector icons |

---

## 4. Getting Started & Local Setup

### Prerequisites
- Node.js 18.18+ or 20+
- A Supabase project (Free or Pro at [supabase.com](https://supabase.com))

### 1. Clone & Install Dependencies
```powershell
git clone <repository-url>
cd "Dakhni Verse"
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Apply Database Migration
1. Open your **Supabase Dashboard** ➔ **SQL Editor**.
2. Run the migration script located at [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
3. *(Optional)* In Supabase **Storage**, create public buckets `profile-images` and `receipts`.
4. In **Authentication ➔ Providers ➔ Email**, ensure **"Allow new users to sign up"** is enabled and **"Confirm email"** is turned off for local development.

### 4. Run Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. First-Time Setup
- Navigate to [http://localhost:3000/setup](http://localhost:3000/setup) to register your initial **Manager** account.
- Once created, sign in at `/login` to access the full collective suite.

---

## 5. Database Architecture & Triggers

The database is built on PostgreSQL with strict relational integrity:

### 10 Custom PostgreSQL Enums
- `artist_status`: `Active`, `Inactive`, `Left`
- `user_role`: `Manager`, `Artist`, `Producer`
- `project_status`: `Idea`, `Writing`, `Production`, `Recording`, `Editing`, `Mixing`, `Mastering`, `Ready`, `Released`, `On Hold`, `Cancelled`
- `session_type`: `Recording`, `Production`, `Editing`, `Mixing`, `Mastering`, `Rehearsal`, `Other`
- `release_status`: `Planned`, `Scheduled`, `Released`
- `contribution_status`: `Planned`, `Pending`, `Confirmed`
- `expense_category`: `Rent`, `Deposit/Advance`, `Renovation`, `Equipment`, `Furniture`, `Software`, `Internet`, `Utilities`, `Marketing`, `Miscellaneous`
- `equipment_owner_type`: `Dakhni Verse`, `Individual`
- `equipment_condition`: `New`, `Good`, `Fair`, `Poor`, `Needs Repair`

### Automated Triggers
1. **`calculate_session_duration`**: Automatically computes `duration_minutes` upon session insertion or time updates. If `end_time < start_time`, it seamlessly adds 24 hours to calculate overnight studio sessions accurately.
2. **`log_project_status_change`**: Automatically writes an audit row to `project_status_history` whenever `projects.status` changes, logging the previous status, new status, timestamp, and user ID.
3. **`update_updated_at`**: Automatically touches `updated_at = now()` across all tables.

### Row-Level Security (RLS)
- Full CRUD access for users with the `Manager` role.
- Fine-grained access for `Artist` and `Producer` roles (view collective roster & gear, manage own assigned projects and profile).
- Self-insert policies enabling seamless account creation through the `/setup` interface.

---

## 6. Design & Typography System

- **Primary Brand Color**: Dakhni Red (`#D71920`)
- **Background Palette**: Studio Light Gray (`#F4F4F4`), Card White (`#FFFFFF`), Dark Contrast (`#111111`)
- **Typography**:
  - **Display / Headers**: `Space Grotesk` (bold, modern, punchy collective identity)
  - **Interface / Body**: `Inter` (neutral, legible, high-density dashboard readability)

---

## 7. Project Directory Structure

```
dakhni-verse/
├── docs/
│   └── ROADMAP.md                   # Future architecture & roadmap enhancements
├── src/
│   ├── app/
│   │   ├── (app)/                   # Protected application routes
│   │   │   ├── artists/             # Directory, Add Wizard, Detail, and Edit
│   │   │   ├── dashboard/           # Dynamic KPI cards, charts, workload
│   │   │   ├── equipment/           # Inventory management
│   │   │   ├── finance/             # Ledger for contributions & expenses
│   │   │   ├── projects/            # Track pipelines from Idea to Release
│   │   │   ├── releases/            # Catalog, ISRC, streaming links
│   │   │   ├── sessions/            # Studio session logger
│   │   │   └── settings/            # Producer targets & configuration
│   │   ├── login/                   # User authentication
│   │   ├── setup/                   # First-time Manager initialization
│   │   ├── layout.tsx               # Root layout with ToastProvider & Fonts
│   │   └── globals.css              # Tailwind v4 theme tokens
│   ├── components/
│   │   ├── artists/                 # AddArtistForm, EditArtistForm, ArtistProfile
│   │   ├── dashboard/               # Charts, KPI cards, activity feed
│   │   ├── layout/                  # AppShell, Sidebar, Header
│   │   └── ui/                      # Button, Input, Modal, Avatar, ImageCropDialog, Lightbox, etc.
│   ├── lib/
│   │   ├── auth/                    # Server authentication helpers & actions
│   │   ├── calculations/            # Pure KPI & metric calculation engine
│   │   ├── queries/                 # Server actions for database operations
│   │   ├── supabase/                # Client, Server, and Middleware clients
│   │   ├── utils/                   # Formatting (currency, date) & constants
│   │   └── validation/              # Zod schemas for all forms
│   └── types/                       # TypeScript models & database schemas
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Complete PostgreSQL schema, triggers & RLS
├── CHANGELOG.md                     # Release version history
├── package.json
└── README.md
```

---

## 8. Changelog & Roadmap

- See [CHANGELOG.md](CHANGELOG.md) for detailed version history and recent bug fixes.
- See [docs/ROADMAP.md](docs/ROADMAP.md) for upcoming features including audio players, visual studio calendars, and royalty split sheets.
