import {
  ArtistStatus,
  ProjectStatus,
  SessionType,
  ReleaseStatus,
  ContributionStatus,
  ExpenseCategory,
  EquipmentOwnerType,
  EquipmentCondition
} from '@/types';

export const ARTIST_STATUSES: ArtistStatus[] = ['Active', 'Inactive', 'Left'];

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Idea', 'Writing', 'Production', 'Recording', 'Editing', 'Mixing', 'Mastering', 'Ready', 'Released', 'On Hold', 'Cancelled'
];

export const SESSION_TYPES: SessionType[] = [
  'Recording', 'Production', 'Editing', 'Mixing', 'Mastering', 'Rehearsal', 'Other'
];

export const RELEASE_STATUSES: ReleaseStatus[] = ['Planned', 'Scheduled', 'Released'];

export const CONTRIBUTION_STATUSES: ContributionStatus[] = ['Planned', 'Pending', 'Confirmed'];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent', 'Deposit/Advance', 'Renovation', 'Equipment', 'Furniture', 'Software', 'Internet', 'Utilities', 'Marketing', 'Miscellaneous'
];

export const EQUIPMENT_OWNER_TYPES: EquipmentOwnerType[] = ['Dakhni Verse', 'Individual'];

export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = ['New', 'Good', 'Fair', 'Poor', 'Needs Repair'];

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Artists', href: '/artists', icon: 'Users' },
  { label: 'Projects', href: '/projects', icon: 'Music' },
  { label: 'Sessions', href: '/sessions', icon: 'Calendar' },
  { label: 'Releases', href: '/releases', icon: 'Disc' },
  { label: 'Finance', href: '/finance', icon: 'Wallet' },
  { label: 'Equipment', href: '/equipment', icon: 'Wrench' },
  { label: 'Settings', href: '/settings', icon: 'Settings' }
];

export const STATUS_COLORS: Record<string, string> = {
  'Idea': 'bg-gray-100 text-gray-800',
  'Writing': 'bg-blue-100 text-blue-800',
  'Production': 'bg-purple-100 text-purple-800',
  'Recording': 'bg-red-100 text-red-800',
  'Editing': 'bg-yellow-100 text-yellow-800',
  'Mixing': 'bg-indigo-100 text-indigo-800',
  'Mastering': 'bg-pink-100 text-pink-800',
  'Ready': 'bg-green-100 text-green-800',
  'Released': 'bg-emerald-100 text-emerald-800',
  'On Hold': 'bg-orange-100 text-orange-800',
  'Cancelled': 'bg-slate-100 text-slate-800'
};

export const CHART_COLORS = [
  '#D71920', // Primary Red
  '#111111', // Black
  '#666666', // Secondary Text
  '#E5E5E5', // Border Gray
  '#F4F4F4', // Light Gray
];
