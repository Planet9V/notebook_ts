export type AgentType = 'researcher' | 'coder' | 'analyst' | 'orchestrator';
export type AgentExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';
export type AgentTraceLevel = 'info' | 'debug' | 'error';

export interface AgentConfig {
  id: string
  name: string
  description: string
  type: AgentType
  default_model: string
  system_prompt: string
  allowed_tools: string[]
  tenant_id: string
  created: string
  updated: string
}

export interface AgentConfigCreate {
  name: string
  description: string
  type: AgentType
  default_model: string
  system_prompt: string
  allowed_tools?: string[]
  tenant_id: string
}

export interface AgentConfigUpdate {
  name?: string
  description?: string
  type?: AgentType
  default_model?: string
  system_prompt?: string
  allowed_tools?: string[]
  tenant_id?: string
}

export interface AgentExecution {
  id: string
  agent_config_id: string
  status: AgentExecutionStatus
  input_params: Record<string, any>
  output_results: Record<string, any>
  started_at: string
  completed_at: string | null
}

export interface AgentLog {
  id: string
  execution_id: string
  step_name: string
  tool_call: string | null
  tool_input: Record<string, any> | null
  tool_output: Record<string, any> | null
  trace_level: AgentTraceLevel
  created: string
}
