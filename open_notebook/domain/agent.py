from datetime import datetime
from typing import Any, ClassVar, Dict, List, Literal, Optional, Union

from pydantic import Field, field_validator
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError


class AgentConfig(ObjectModel):
    """
    Domain model for autonomous agent configurations.
    """
    table_name: ClassVar[str] = "agent_config"
    
    name: str
    description: str
    type: Literal["researcher", "coder", "analyst", "orchestrator"]
    default_model: str
    system_prompt: str
    allowed_tools: List[str] = Field(default_factory=list)
    tenant_id: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise InvalidInputError("Agent name cannot be empty")
        return v

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None

    async def get_executions(self) -> List["AgentExecution"]:
        """Fetch all execution instances for this agent configuration."""
        try:
            results = await repo_query(
                "SELECT * FROM agent_execution WHERE agent_config_id = $id ORDER BY started_at DESC",
                {"id": ensure_record_id(self.id)}
            )
            return [AgentExecution(**exec_data) for exec_data in results] if results else []
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch executions for agent {self.id}: {str(e)}")


class AgentExecution(ObjectModel):
    """
    Domain model representing active or completed agent executions.
    """
    table_name: ClassVar[str] = "agent_execution"

    agent_config_id: Union[str, RecordID]
    status: Literal["queued", "running", "completed", "failed", "paused"]
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output_results: Dict[str, Any] = Field(default_factory=dict)
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    @field_validator("agent_config_id", mode="before")
    @classmethod
    def parse_config_id(cls, value):
        if isinstance(value, str) and value:
            return ensure_record_id(value)
        return value

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None

    async def get_logs(self) -> List["AgentLog"]:
        """Retrieve step-by-step logs for this execution."""
        try:
            results = await repo_query(
                "SELECT * FROM agent_log WHERE execution_id = $id ORDER BY created ASC",
                {"id": ensure_record_id(self.id)}
            )
            return [AgentLog(**log_data) for log_data in results] if results else []
        except Exception as e:
            raise DatabaseOperationError(f"Failed to fetch logs for execution {self.id}: {str(e)}")


class AgentLog(ObjectModel):
    """
    Domain model representing step thought traces and tool outputs.
    """
    table_name: ClassVar[str] = "agent_log"

    execution_id: Union[str, RecordID]
    step_name: str
    tool_call: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    tool_output: Optional[Dict[str, Any]] = None
    trace_level: Literal["info", "debug", "error"]

    @field_validator("execution_id", mode="before")
    @classmethod
    def parse_execution_id(cls, value):
        if isinstance(value, str) and value:
            return ensure_record_id(value)
        return value

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None


class AgentPrompt(ObjectModel):
    """
    Domain model for persisting user-defined custom agent prompts per notebook.
    """
    table_name: ClassVar[str] = "agent_prompt"

    notebook_id: str
    agent_name: str
    prompt_text: str

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None

