// Style Guide types

export interface StyleGuide {
  id: string
  name: string
  description: string
  guide_type: string // report, landing_page, two_pager, memo

  // Typography
  title_font: string
  body_font: string
  title_size: string
  heading_size: string
  subheading_size: string
  body_size: string
  line_spacing: string

  // Branding
  logo_url: string
  strapline: string
  primary_color: string
  secondary_color: string
  accent_color: string

  // Layout
  page_size: string // letter, a4, custom
  page_orientation: string // portrait, landscape
  margin_top: string
  margin_bottom: string
  margin_left: string
  margin_right: string

  // Content Rules
  heading_style: string // bold, underline, caps
  color_scheme: string // dark, light, brand
  include_toc: boolean
  include_page_numbers: boolean

  created?: string
  updated?: string
}

export interface StyleGuideCreate {
  name: string
  description?: string
  guide_type?: string
  title_font?: string
  body_font?: string
  title_size?: string
  heading_size?: string
  subheading_size?: string
  body_size?: string
  line_spacing?: string
  logo_url?: string
  strapline?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  page_size?: string
  page_orientation?: string
  margin_top?: string
  margin_bottom?: string
  margin_left?: string
  margin_right?: string
  heading_style?: string
  color_scheme?: string
  include_toc?: boolean
  include_page_numbers?: boolean
}

export type StyleGuideUpdate = StyleGuideCreate

export const GUIDE_TYPES = [
  { value: 'report', label: 'Report (8.5×11)', description: 'Full-page document with TOC' },
  { value: 'two_pager', label: 'Two-Pager', description: 'Executive summary brief' },
  { value: 'landing_page', label: 'Landing Page', description: 'Single-page web layout' },
  { value: 'memo', label: 'Memo', description: 'Internal communication format' },
] as const

export const PAGE_SIZES = [
  { value: 'letter', label: 'US Letter (8.5×11")' },
  { value: 'a4', label: 'A4 (210×297mm)' },
  { value: 'custom', label: 'Custom' },
] as const

export const HEADING_STYLES = [
  { value: 'bold', label: 'Bold' },
  { value: 'underline', label: 'Underlined' },
  { value: 'caps', label: 'ALL CAPS' },
] as const

export const COLOR_SCHEMES = [
  { value: 'dark', label: 'Dark Mode' },
  { value: 'light', label: 'Light Mode' },
  { value: 'brand', label: 'Brand Colors' },
] as const
