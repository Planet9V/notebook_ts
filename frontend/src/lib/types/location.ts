export interface Location {
  id: string
  customer_id?: string | null
  organization_name?: string
  facility_name: string
  facility_type?: string
  sectors?: string[]
  address?: string
  country?: string
  zip_code?: string
  latitude?: number | null
  longitude?: number | null
  description?: string
  created: string
  updated: string
}

export interface LocationCreate {
  customer_id?: string | null
  organization_name?: string
  facility_name: string
  facility_type?: string
  sectors?: string[]
  address?: string
  country?: string
  zip_code?: string
  latitude?: number | null
  longitude?: number | null
  description?: string
}

export interface LocationUpdate {
  organization_name?: string | null
  facility_name?: string | null
  facility_type?: string | null
  sectors?: string[] | null
  address?: string | null
  country?: string | null
  zip_code?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
}
