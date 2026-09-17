// Database enum types as union types
export type ArtistStatus = 'Active' | 'Inactive' | 'Left' | 'Pending' | 'Rejected';
export type UserRole = 'Manager' | 'Artist' | 'Producer';
export type ProjectStatus = 'Idea' | 'Writing' | 'Production' | 'Recording' | 'Editing' | 'Mixing' | 'Mastering' | 'Ready' | 'Released' | 'On Hold' | 'Cancelled';
export type SessionType = 'Recording' | 'Production' | 'Editing' | 'Mixing' | 'Mastering' | 'Rehearsal' | 'Other';
export type ReleaseStatus = 'Planned' | 'Scheduled' | 'Released';
export type ContributionStatus = 'Planned' | 'Pending' | 'Confirmed';
export type ExpenseCategory = 'Rent' | 'Deposit/Advance' | 'Renovation' | 'Equipment' | 'Furniture' | 'Software' | 'Internet' | 'Utilities' | 'Marketing' | 'Miscellaneous';
export type EquipmentOwnerType = 'Dakhni Verse' | 'Individual';
export type EquipmentCondition = 'New' | 'Good' | 'Fair' | 'Poor' | 'Needs Repair';

// Row types for each table
export interface User { id: string; email: string; name: string; role: UserRole; artist_id: string | null; created_at: string; updated_at: string; }
export interface Artist { id: string; stage_name: string; legal_name: string | null; profile_image_url: string | null; location: string | null; phone: string | null; email: string | null; date_joined: string; status: ArtistStatus; dakhni_verse_role: string | null; duplicate_of_id?: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface ArtistMusicProfile { id: string; artist_id: string; primary_role: string | null; genres: string[]; subgenres: string[]; languages: string[]; vocal_style: string | null; songwriting: boolean; composition: boolean; instruments: string[]; influences: string | null; preferred_producers: string | null; bio: string | null; created_at: string; updated_at: string; }
export interface ArtistSocialLink { id: string; artist_id: string; platform: string; url: string; created_at: string; updated_at: string; }
export interface Project { id: string; title: string; artist_id: string | null; producer_id: string | null; mix_engineer_id: string | null; mastering_engineer_id: string | null; status: ProjectStatus; created_at: string; target_release_date: string | null; release_date: string | null; notes: string | null; created_by: string | null; updated_at: string; }
export interface ProjectStatusHistory { id: string; project_id: string; old_status: ProjectStatus | null; new_status: ProjectStatus; changed_at: string; changed_by: string | null; }
export interface Session { id: string; artist_id: string | null; project_id: string | null; session_type: SessionType; engineer_id: string | null; session_date: string; start_time: string; end_time: string; duration_minutes: number | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Release { id: string; project_id: string | null; artist_id: string | null; title: string; status: ReleaseStatus; release_date: string | null; distributor: string | null; isrc: string | null; spotify_url: string | null; apple_music_url: string | null; youtube_url: string | null; other_platform_url: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Contribution { id: string; person_id: string | null; amount: number; contribution_date: string; purpose: string | null; status: ContributionStatus; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Expense { id: string; expense_date: string; category: ExpenseCategory; amount: number; paid_by: string | null; description: string | null; receipt_url: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Equipment { id: string; name: string; category: string | null; brand: string | null; model: string | null; owner_type: EquipmentOwnerType; owner_id: string | null; purchase_date: string | null; purchase_value: number | null; condition: EquipmentCondition | null; location: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string; }
export interface Target { id: string; user_id: string | null; metric: string; target_value: number; period: string; effective_from: string | null; effective_until: string | null; created_at: string; updated_at: string; }
export interface ActivityLog { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null; description: string; created_at: string; }

// Extended types with joins
export interface ArtistWithProfile extends Artist { music_profile?: ArtistMusicProfile | null; social_links?: ArtistSocialLink[]; }
export interface ProjectWithRelations extends Project { artist?: Artist | null; producer?: Artist | null; mix_engineer?: Artist | null; mastering_engineer?: Artist | null; }
export interface SessionWithRelations extends Session { artist?: Artist | null; project?: Project | null; engineer?: Artist | null; }
export interface ReleaseWithRelations extends Release { artist?: Artist | null; project?: Project | null; }
export interface ContributionWithPerson extends Contribution { person?: Artist | null; }
export interface EquipmentWithOwner extends Equipment { owner?: Artist | null; }

// KPI types
export interface DateRange { from: Date; to: Date; }
export interface KPIValue { label: string; value: number | string; href?: string; trend?: { value: number; isPositive: boolean }; }
export interface ProductionWorkload { production: { assigned: number; inProgress: number; completed: number }; mixing: { assigned: number; inProgress: number; completed: number }; mastering: { assigned: number; inProgress: number; completed: number }; }
export interface TargetProgress { actual: number; target: number | null; percentage: number | null; hasTarget: boolean; }

// Current user profile
export interface CurrentUser { id: string; email: string; name: string; role: UserRole; artist_id: string | null; }
