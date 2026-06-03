import { Control, FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'

/**
 * Shared form data shape used across AddSourceDialog wizard steps.
 * This is the canonical type — both the Zod schema and child components
 * must conform to this shape.
 */
export interface CreateSourceFormData {
  type: 'link' | 'upload' | 'text'
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

export type CreateSourceControl = Control<CreateSourceFormData>
export type CreateSourceRegister = UseFormRegister<CreateSourceFormData>
export type CreateSourceSetValue = UseFormSetValue<CreateSourceFormData>
export type CreateSourceErrors = FieldErrors<CreateSourceFormData>
