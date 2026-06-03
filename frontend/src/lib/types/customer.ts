export interface Customer {
  id: string
  name: string
  // Core
  website: string
  description: string
  industry: string
  primary_sector: string
  sectors: string[]
  assigned_frameworks: string[]
  contacts: Record<string, unknown>[]
  // Address
  street_address: string
  street_address_2: string
  city: string
  state: string
  postal_code: string
  country: string
  // Communication
  phone: string
  phone_alt: string
  fax: string
  email: string
  // Sales
  salesperson: string
  lead_source: string
  annual_revenue: number | null
  employee_count: number | null
  // Classification
  customer_type: string
  tier: string
  status: string
  // Engagement
  last_contact_date: string | null
  next_followup: string | null
  engagement_score: number
  // Social
  linkedin_url: string
  twitter_url: string
  facebook_url: string
  // Metadata
  tags: string[]
  internal_notes: string
  import_batch_id: string | null
  import_source: string | null
  // Timestamps
  created: string
  updated: string
}

export interface CustomerMetrics extends Customer {
  notebook_count: number
  total_value: number
  compliance_progress: number
  contact_count: number
}

export interface CustomerCreate {
  name: string
  website?: string
  description?: string
  industry?: string
  primary_sector?: string
  sectors?: string[]
  assigned_frameworks?: string[]
  contacts?: Record<string, unknown>[]
  street_address?: string
  street_address_2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  phone?: string
  phone_alt?: string
  fax?: string
  email?: string
  salesperson?: string
  lead_source?: string
  annual_revenue?: number | null
  employee_count?: number | null
  customer_type?: string
  tier?: string
  status?: string
  last_contact_date?: string | null
  next_followup?: string | null
  engagement_score?: number
  linkedin_url?: string
  twitter_url?: string
  facebook_url?: string
  tags?: string[]
  internal_notes?: string
  import_batch_id?: string | null
  import_source?: string | null
}

export interface CustomerUpdate extends Partial<CustomerCreate> {}
