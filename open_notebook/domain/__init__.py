"""
Domain models for Open Notebook.

This module exports the core domain models used throughout the application.
"""

from open_notebook.domain.contact import Contact
from open_notebook.domain.customer import Customer
from open_notebook.domain.project import Project
from open_notebook.domain.research_item import ResearchItem
from open_notebook.domain.agent import AgentConfig, AgentExecution, AgentLog
from open_notebook.domain.skill import SkillRegistry

__all__: list[str] = [
    "Contact",
    "Customer",
    "Project",
    "ResearchItem",
    "AgentConfig",
    "AgentExecution",
    "AgentLog",
    "SkillRegistry",
]

