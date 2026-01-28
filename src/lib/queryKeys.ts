// Centralized query keys for React Query
// This ensures consistency and enables efficient cache invalidation

export const queryKeys = {
  // Auth & Profile
  profile: (userId: string | null) => ['profile', userId] as const,
  users: ['users'] as const,
  
  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organization', id] as const,
  
  // Condominiums
  condominiums: ['condominiums'] as const,
  condominium: (id: string) => ['condominium', id] as const,
  
  // Units
  units: (condominiumId?: string) => ['units', { condominiumId }] as const,
  unit: (id: string) => ['unit', id] as const,
  unitUsers: (unitId?: string) => ['unit-users', unitId] as const,
  unitMembers: (unitId?: string) => ['unit-members', unitId] as const,
  
  // Residents
  residents: (condominiumId?: string) => ['residents', { condominiumId }] as const,
  resident: (id: string) => ['resident', id] as const,
  
  // Common Areas
  commonAreas: (condominiumId?: string) => ['common-areas', { condominiumId }] as const,
  commonArea: (id: string) => ['common-area', id] as const,
  
  // Reservations
  reservations: (condominiumId?: string) => ['reservations', { condominiumId }] as const,
  reservation: (id: string) => ['reservation', id] as const,
  
  // Financial
  financialCharges: (condominiumId?: string) => ['financial-charges', { condominiumId }] as const,
  residentCharges: (unitId?: string) => ['resident-charges', unitId] as const,
  overdueCharges: (condominiumId?: string) => ['overdue-charges', { condominiumId }] as const,
  
  // Documents
  documents: (condominiumId?: string) => ['documents', { condominiumId }] as const,
  
  // Packages
  packages: (condominiumId?: string) => ['packages', { condominiumId }] as const,
  
  // Vehicles
  vehicles: (condominiumId?: string) => ['vehicles', { condominiumId }] as const,
  
  // Employees
  employees: (condominiumId?: string) => ['employees', { condominiumId }] as const,
  
  // Maintenance
  maintenanceRequests: (condominiumId?: string) => ['maintenance-requests', { condominiumId }] as const,
  
  // Block Groups & Chat
  blockGroups: (condominiumId?: string) => ['block-groups', { condominiumId }] as const,
  groupChat: (groupId: string) => ['group-chat', groupId] as const,
  
  // Notifications
  notifications: (userId?: string) => ['notifications', userId] as const,
  
  // AI
  aiConversations: (userId?: string) => ['ai-conversations', userId] as const,
  aiKnowledgeBase: (condominiumId?: string) => ['ai-knowledge-base', { condominiumId }] as const,
  
  // Utility Readings
  waterReadings: (condominiumId?: string) => ['water-readings', { condominiumId }] as const,
  gasReadings: (condominiumId?: string) => ['gas-readings', { condominiumId }] as const,
  electricityReadings: (condominiumId?: string) => ['electricity-readings', { condominiumId }] as const,
  utilityRates: (condominiumId?: string) => ['utility-rates', { condominiumId }] as const,
  
  // System
  systemLogs: ['system-logs'] as const,
  systemAlerts: ['system-alerts'] as const,
} as const;

// Cache time configurations (in milliseconds)
export const cacheConfig = {
  // Static data - rarely changes
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  
  // Semi-dynamic data
  semiDynamic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Dynamic data - frequent updates
  dynamic: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Realtime data
  realtime: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  },
} as const;
