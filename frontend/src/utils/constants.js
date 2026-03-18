export const CATEGORIES = [
  {
    id: 'streetlight',
    label: 'Streetlight',
    description: 'Broken or faulty street lighting',
    icon: 'Zap',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'park',
    label: 'Park / Green Space',
    description: 'Damaged equipment, unsafe grounds',
    icon: 'Trees',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'footpath',
    label: 'Footpath',
    description: 'Cracked, uneven, or blocked paths',
    icon: 'Footprints',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 'road',
    label: 'Road / Pothole',
    description: 'Potholes, cracks, or road damage',
    icon: 'Construction',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'public_toilet',
    label: 'Public Toilet',
    description: 'Damaged or unclean public facilities',
    icon: 'Building2',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'bus_stop',
    label: 'Bus Stop / Shelter',
    description: 'Damaged shelters or signage',
    icon: 'Bus',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'graffiti',
    label: 'Graffiti',
    description: 'Vandalism or graffiti on public property',
    icon: 'Paintbrush',
    color: '#f472b6',
    bgColor: 'rgba(244, 114, 182, 0.12)',
    borderColor: 'rgba(244, 114, 182, 0.4)',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Any other public facility issue',
    icon: 'HelpCircle',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export const STATUSES = [
  {
    id: 'pending',
    label: 'Pending',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    icon: 'Clock',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    icon: 'Wrench',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    icon: 'CheckCircle2',
  },
  {
    id: 'closed',
    label: 'Closed',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    icon: 'XCircle',
  },
]

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

export const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Report Issue', path: '/report' },
  { label: 'View Requests', path: '/requests' },
  { label: 'Track Report', path: '/track' },
]

export const PAGE_SIZE = 9
export const MAX_FILE_SIZE_MB = 10
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Maintenance crews used for ticket assignment in the admin dashboard.
// Sprint 3 will replace this with real crew data from the backend.
export const MOCK_CREWS = [
  { id: 'crew-alpha',   label: 'Team Alpha',   specialty: 'Roads & Footpaths' },
  { id: 'crew-bravo',   label: 'Team Bravo',   specialty: 'Streetlights & Electrical' },
  { id: 'crew-charlie', label: 'Team Charlie', specialty: 'Parks & Green Spaces' },
  { id: 'crew-delta',   label: 'Team Delta',   specialty: 'Graffiti Removal' },
  { id: 'crew-echo',    label: 'Team Echo',    specialty: 'General Maintenance' },
]
