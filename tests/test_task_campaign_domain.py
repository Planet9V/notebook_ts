"""
Unit tests for Task and Campaign domain validation logic.
"""
import pytest
from pydantic import ValidationError

from open_notebook.domain.task import Task
from open_notebook.domain.campaign import Campaign
from open_notebook.exceptions import InvalidInputError


class TestTaskDomain:
    """Test suite for Task validation rules."""

    def test_task_title_validation(self):
        """Test empty/whitespace titles are rejected."""
        with pytest.raises(InvalidInputError, match="Task title cannot be empty"):
            Task(title="", description="Test description")

        with pytest.raises(InvalidInputError, match="Task title cannot be empty"):
            Task(title="   ", description="Test description")

        task = Task(title="Valid Title", description="Test description")
        assert task.title == "Valid Title"

    def test_task_status_validation(self):
        """Test only allowed statuses are accepted."""
        with pytest.raises(InvalidInputError, match="Invalid task status"):
            Task(title="Test", status="invalid_status")

        for status in ["todo", "in_progress", "review", "done", "cancelled"]:
            task = Task(title="Test", status=status)
            assert task.status == status

    def test_task_priority_validation(self):
        """Test only allowed priorities are accepted."""
        with pytest.raises(InvalidInputError, match="Invalid task priority"):
            Task(title="Test", priority="invalid_priority")

        for priority in ["low", "medium", "high", "critical", None]:
            task = Task(title="Test", priority=priority)
            assert task.priority == priority


class TestCampaignDomain:
    """Test suite for Campaign validation rules."""

    def test_campaign_name_validation(self):
        """Test empty/whitespace names are rejected."""
        with pytest.raises(InvalidInputError, match="Campaign name cannot be empty"):
            Campaign(name="")

        with pytest.raises(InvalidInputError, match="Campaign name cannot be empty"):
            Campaign(name="   ")

        campaign = Campaign(name="Valid Campaign")
        assert campaign.name == "Valid Campaign"

    def test_campaign_status_validation(self):
        """Test only allowed statuses are accepted."""
        with pytest.raises(InvalidInputError, match="Invalid campaign status"):
            Campaign(name="Test", status="invalid_status")

        for status in ["draft", "active", "paused", "completed", "archived"]:
            campaign = Campaign(name="Test", status=status)
            assert campaign.status == status
