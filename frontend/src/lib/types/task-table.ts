export interface TaskTable {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  due_date?: string
  project_id?: string
  customer_id?: string
  notebook_id?: string
  assigned_to?: string
  created_by?: string
  tags: string[]
  created: string
  updated: string
}

export interface CreateTaskTableRequest {
  title: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  project_id?: string
  customer_id?: string
  notebook_id?: string
  assigned_to?: string
  created_by?: string
  tags?: string[]
}

export interface UpdateTaskTableRequest {
  title?: string
  description?: string
  status?: string
  priority?: string
  due_date?: string
  project_id?: string
  customer_id?: string
  notebook_id?: string
  assigned_to?: string
  created_by?: string
  tags?: string[]
}
