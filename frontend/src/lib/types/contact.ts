export interface Contact {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  mobile: string
  title: string
  department: string
  seniority: string
  linkedin_url: string
  customer_id: string | null
  customer_name: string | null
  location_id: string | null
  location_name: string | null
  location_ids: string[]
  location_names?: string[]
  status: string
  tags: string[]
  notes: string
  last_contacted: string | null
  source: string
  import_batch_id: string | null
  created: string
  updated: string
}

export interface ContactCreate {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  seniority?: string
  linkedin_url?: string
  customer_id?: string | null
  location_id?: string | null
  location_ids?: string[]
  status?: string
  tags?: string[]
  notes?: string
  last_contacted?: string | null
  source?: string
  import_batch_id?: string | null
}

export interface ContactUpdate extends Partial<ContactCreate> {}
