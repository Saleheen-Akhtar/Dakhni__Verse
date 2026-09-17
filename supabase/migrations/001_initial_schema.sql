-- 0. CLEANUP (Safe to re-run)
DROP TABLE IF EXISTS activity_logs, targets, equipment, expenses, contributions, releases, sessions, project_status_history, projects, artist_social_links, artist_music_profiles, artists, users CASCADE;
DROP TYPE IF EXISTS artist_status, user_role, project_status, session_type, release_status, contribution_status, expense_category, equipment_owner_type, equipment_condition CASCADE;

-- 1. ENUMS
CREATE TYPE artist_status AS ENUM ('Active', 'Inactive', 'Left');
CREATE TYPE user_role AS ENUM ('Manager', 'Artist', 'Producer');
CREATE TYPE project_status AS ENUM ('Idea', 'Writing', 'Production', 'Recording', 'Editing', 'Mixing', 'Mastering', 'Ready', 'Released', 'On Hold', 'Cancelled');
CREATE TYPE session_type AS ENUM ('Recording', 'Production', 'Editing', 'Mixing', 'Mastering', 'Rehearsal', 'Other');
CREATE TYPE release_status AS ENUM ('Planned', 'Scheduled', 'Released');
CREATE TYPE contribution_status AS ENUM ('Planned', 'Pending', 'Confirmed');
CREATE TYPE expense_category AS ENUM ('Rent', 'Deposit/Advance', 'Renovation', 'Equipment', 'Furniture', 'Software', 'Internet', 'Utilities', 'Marketing', 'Miscellaneous');
CREATE TYPE equipment_owner_type AS ENUM ('Dakhni Verse', 'Individual');
CREATE TYPE equipment_condition AS ENUM ('New', 'Good', 'Fair', 'Poor', 'Needs Repair');

-- 2. TABLES

-- Step 1: Create users table without artist_id to break circular dependency
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Artist',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create artists table
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_name TEXT NOT NULL,
    legal_name TEXT,
    profile_image_url TEXT,
    location TEXT,
    phone TEXT,
    email TEXT,
    date_joined DATE NOT NULL,
    status artist_status NOT NULL DEFAULT 'Active',
    dakhni_verse_role TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Alter users table to add artist_id foreign key
ALTER TABLE users ADD COLUMN artist_id UUID REFERENCES artists(id) ON DELETE SET NULL;

CREATE TABLE artist_music_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE UNIQUE,
    primary_role TEXT,
    genres TEXT[] DEFAULT '{}',
    subgenres TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    vocal_style TEXT,
    songwriting BOOLEAN DEFAULT false,
    composition BOOLEAN DEFAULT false,
    instruments TEXT[] DEFAULT '{}',
    influences TEXT,
    preferred_producers TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artist_social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    producer_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    mix_engineer_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    mastering_engineer_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    status project_status NOT NULL DEFAULT 'Idea',
    created_at TIMESTAMPTZ DEFAULT now(),
    target_release_date DATE,
    release_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    old_status project_status,
    new_status project_status NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES users(id)
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    session_type session_type NOT NULL,
    engineer_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status release_status NOT NULL DEFAULT 'Planned',
    release_date DATE,
    distributor TEXT,
    isrc TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    youtube_url TEXT,
    other_platform_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL,
    purpose TEXT,
    status contribution_status NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL,
    category expense_category NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    paid_by TEXT,
    description TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    model TEXT,
    owner_type equipment_owner_type NOT NULL DEFAULT 'Dakhni Verse',
    owner_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    purchase_date DATE,
    purchase_value DECIMAL(12,2),
    condition equipment_condition DEFAULT 'Good',
    location TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly',
    effective_from DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, metric, period)
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. TRIGGERS

-- a) calculate_session_duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
DECLARE
    diff_minutes INTEGER;
BEGIN
    IF NEW.end_time < NEW.start_time THEN
        -- Crosses midnight
        diff_minutes := EXTRACT(EPOCH FROM ((NEW.end_time + interval '1 day') - NEW.start_time)) / 60;
    ELSE
        diff_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    
    NEW.duration_minutes := diff_minutes;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_session_duration_trigger
    BEFORE INSERT OR UPDATE OF start_time, end_time ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_duration();


-- b) log_project_status_change
CREATE OR REPLACE FUNCTION log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO project_status_history (project_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_status_change_trigger
    AFTER UPDATE OF status ON projects
    FOR EACH ROW
    EXECUTE FUNCTION log_project_status_change();


-- c) update_updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_artists BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_artist_music_profiles BEFORE UPDATE ON artist_music_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_artist_social_links BEFORE UPDATE ON artist_social_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_sessions BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_releases BEFORE UPDATE ON releases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_contributions BEFORE UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_equipment BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_targets BEFORE UPDATE ON targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 4. INDEXES
CREATE INDEX idx_artists_status ON artists(status);
CREATE INDEX idx_artists_date_joined ON artists(date_joined);

CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_projects_producer_id ON projects(producer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_mix_eng_id ON projects(mix_engineer_id);
CREATE INDEX idx_projects_master_eng_id ON projects(mastering_engineer_id);

CREATE INDEX idx_sessions_artist_id ON sessions(artist_id);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_engineer_id ON sessions(engineer_id);

CREATE INDEX idx_releases_artist_id ON releases(artist_id);
CREATE INDEX idx_releases_project_id ON releases(project_id);
CREATE INDEX idx_releases_status ON releases(status);

CREATE INDEX idx_contributions_person_id ON contributions(person_id);
CREATE INDEX idx_contributions_status ON contributions(status);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_equipment_owner_type ON equipment(owner_type);
CREATE INDEX idx_equipment_owner_id ON equipment(owner_id);

CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX idx_project_status_history_project_id ON project_status_history(project_id);


-- 5. ROW LEVEL SECURITY (RLS)

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_artist_id()
RETURNS UUID AS $$
  SELECT artist_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_music_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "Managers can perform full CRUD on users" ON users 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Users can read their own record" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow user insert on signup" ON users 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own user record" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- Artists Policies
CREATE POLICY "Managers can perform full CRUD on artists" ON artists 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Artists can read all artists" ON artists 
    FOR SELECT USING (true); -- assuming any authenticated user can view artists

CREATE POLICY "Artists can update their own linked artist record" ON artists 
    FOR UPDATE USING (id = public.get_user_artist_id());

-- Artist Music Profiles & Social Links (cascade the same read logic)
CREATE POLICY "Managers can perform full CRUD on artist profiles" ON artist_music_profiles 
    FOR ALL USING (public.get_user_role() = 'Manager');
CREATE POLICY "Artists can read all artist profiles" ON artist_music_profiles 
    FOR SELECT USING (true);
CREATE POLICY "Artists can update their own profile" ON artist_music_profiles 
    FOR UPDATE USING (artist_id = public.get_user_artist_id());

CREATE POLICY "Managers can perform full CRUD on artist social links" ON artist_social_links 
    FOR ALL USING (public.get_user_role() = 'Manager');
CREATE POLICY "Artists can read all social links" ON artist_social_links 
    FOR SELECT USING (true);
CREATE POLICY "Artists can update their own social links" ON artist_social_links 
    FOR UPDATE USING (artist_id = public.get_user_artist_id());
CREATE POLICY "Artists can insert their own social links" ON artist_social_links 
    FOR INSERT WITH CHECK (artist_id = public.get_user_artist_id());
CREATE POLICY "Artists can delete their own social links" ON artist_social_links 
    FOR DELETE USING (artist_id = public.get_user_artist_id());

-- Projects Policies
CREATE POLICY "Managers can perform full CRUD on projects" ON projects 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Artists can read their own projects" ON projects 
    FOR SELECT USING (artist_id = public.get_user_artist_id());

-- Project Status History Policies
CREATE POLICY "Managers can perform full CRUD on project status history" ON project_status_history 
    FOR ALL USING (public.get_user_role() = 'Manager');
CREATE POLICY "Artists can read project status history for their own projects" ON project_status_history 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = project_status_history.project_id AND projects.artist_id = public.get_user_artist_id())
    );

-- Sessions Policies
CREATE POLICY "Managers can perform full CRUD on sessions" ON sessions 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Artists can read their own sessions" ON sessions 
    FOR SELECT USING (artist_id = public.get_user_artist_id());

-- Releases Policies
CREATE POLICY "Managers can perform full CRUD on releases" ON releases 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Artists can read their own releases" ON releases 
    FOR SELECT USING (artist_id = public.get_user_artist_id());

-- Contributions Policies
CREATE POLICY "Managers can perform full CRUD on contributions" ON contributions 
    FOR ALL USING (public.get_user_role() = 'Manager');

-- Expenses Policies
CREATE POLICY "Managers can perform full CRUD on expenses" ON expenses 
    FOR ALL USING (public.get_user_role() = 'Manager');

-- Equipment Policies
CREATE POLICY "Managers can perform full CRUD on equipment" ON equipment 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Authenticated users can read equipment" ON equipment 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Targets Policies
CREATE POLICY "Managers can perform full CRUD on targets" ON targets 
    FOR ALL USING (public.get_user_role() = 'Manager');

CREATE POLICY "Users can read their own targets" ON targets 
    FOR SELECT USING (auth.uid() = user_id);

-- Activity Logs Policies
CREATE POLICY "Authenticated users can read activity logs" ON activity_logs 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity logs" ON activity_logs 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- 7. SUPABASE STORAGE BUCKET POLICY COMMENT
/*
=============================================================================
MANUAL SUPABASE STORAGE SETUP REQUIRED
=============================================================================
Please ensure you manually create the following storage buckets in the 
Supabase Dashboard (Storage section):

1. 'profile-images' - For storing artist profile images.
2. 'receipts'       - For storing expense receipts.

Make sure to configure the appropriate Storage RLS policies for these 
buckets based on your application's security requirements.
=============================================================================
*/
