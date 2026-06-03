export interface DiscoveredSkill {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  config_vars: Record<string, any>
  created: string
  updated: string
}

export interface SkillCreate {
  name: string
  description: string
  category: string
  enabled?: boolean
  config_vars?: Record<string, any>
}

export interface SkillUpdate {
  description?: string
  category?: string
  enabled?: boolean
  config_vars?: Record<string, any>
}

export interface McpTool {
  name: string
  description: string
  input_schema: Record<string, any>
}

export interface McpServer {
  server_name: string
  status: 'connected' | 'inactive'
  tools: McpTool[]
}
