export interface Project {
  id: string
  name: string
  description: string
  customer_id: string | null
  notebook_id: string | null
  stage: string
  status: string
  project_type: string
  priority: string
  start_date: string | null
  end_date: string | null
  budget: number | null
  assigned_to: string
  tags: string[]
  tasks: ProjectTask[]
  progress: number
  created: string
  updated: string
}

export interface ProjectTask {
  index: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: string
  assigned_to: string
  due_date: string | null
  subtasks: ProjectSubtask[]
  created: string
  updated?: string
}

export interface ProjectSubtask {
  title: string
  status: 'todo' | 'done'
}

export interface CreateProjectRequest {
  name: string
  description?: string
  customer_id?: string | null
  notebook_id?: string | null
  stage?: string
  status?: string
  project_type?: string
  priority?: string
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  assigned_to?: string
  tags?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  customer_id?: string | null
  notebook_id?: string | null
  stage?: string
  status?: string
  project_type?: string
  priority?: string
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  assigned_to?: string
  tags?: string[]
  progress?: number
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: string
  priority?: string
  assigned_to?: string
  due_date?: string | null
  subtasks?: ProjectSubtask[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: string
  priority?: string
  assigned_to?: string
  due_date?: string | null
}

export interface LinkRequest {
  target_id: string
}
