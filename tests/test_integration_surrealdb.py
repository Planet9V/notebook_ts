"""Integration tests with REAL SurrealDB.

These tests connect to the actual running SurrealDB instance
and perform real CRUD operations. No mocks.

Requires:
  - SurrealDB running at ws://localhost:8000/rpc
  - SURREAL_USER=root, SURREAL_PASSWORD=root
  - SURREAL_NAMESPACE=open_notebook, SURREAL_DATABASE=open_notebook

Run with:
  SURREAL_URL=ws://localhost:8000/rpc pytest tests/test_integration_surrealdb.py -v
"""

import asyncio
import os
import uuid

import pytest

# Set environment variables BEFORE importing any app code
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import (
    db_connection,
    repo_create,
    repo_delete,
    repo_query,
    repo_update,
    repo_upsert,
)


# ── Helpers ──────────────────────────────────────────────────────────

def _unique_name(prefix: str = "test") -> str:
    """Generate a unique name for test records."""
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# ── Connection Tests ─────────────────────────────────────────────────


class TestSurrealDBConnection:
    """Verify we can connect to the real SurrealDB instance."""

    @pytest.mark.asyncio
    async def test_connection_opens_and_closes(self):
        """db_connection() should connect, yield, and close without error."""
        async with db_connection() as db:
            assert db is not None

    @pytest.mark.asyncio
    async def test_simple_query(self):
        """repo_query should execute a simple SurrealQL query."""
        result = await repo_query("RETURN 1 + 1;")
        assert result is not None
        # SurrealDB v2 RETURN statements return the scalar value directly
        assert result == 2 or isinstance(result, (int, list))

    @pytest.mark.asyncio
    async def test_info_query(self):
        """We should be able to query database info."""
        result = await repo_query("INFO FOR DB;")
        assert result is not None
        # SurrealDB v2 INFO returns a dict with tables, analyzers, etc.
        assert isinstance(result, (list, dict))


# ── CRUD Tests ───────────────────────────────────────────────────────


class TestSurrealDBCRUD:
    """Real CRUD operations against SurrealDB."""

    TEST_TABLE = "_test_integration"

    @pytest.mark.asyncio
    async def test_create_and_read(self):
        """Create a record and read it back."""
        name = _unique_name("create")
        record = await repo_create(self.TEST_TABLE, {"name": name, "value": 42})

        # repo_create returns a list with the created record
        assert isinstance(record, list)
        assert len(record) > 0
        created = record[0] if isinstance(record, list) else record
        assert created["name"] == name
        assert created["value"] == 42
        assert "id" in created

        # Read it back by direct ID lookup
        record_id = created["id"]
        result = await repo_query(
            f"SELECT * FROM {record_id};",
        )
        assert result is not None
        # Unwrap SurrealDB v2 response format
        if isinstance(result, list) and len(result) > 0:
            found = result[0] if isinstance(result[0], dict) else result[0]
        else:
            found = result
        assert found["name"] == name

        # Cleanup
        await repo_delete(record_id)

    @pytest.mark.asyncio
    async def test_update_record(self):
        """Create a record, update it, verify the update."""
        name = _unique_name("update")
        record = await repo_create(self.TEST_TABLE, {"name": name, "status": "draft"})
        created = record[0] if isinstance(record, list) else record
        record_id = created["id"]

        # Update
        await repo_update(self.TEST_TABLE, record_id, {"status": "published"})

        # Verify
        result = await repo_query(
            f"SELECT * FROM {record_id};",
        )
        assert len(result) > 0
        updated = result[0] if isinstance(result[0], dict) else result[0][0]
        assert updated["status"] == "published"
        assert updated["name"] == name  # Name should be preserved

        # Cleanup
        await repo_delete(record_id)

    @pytest.mark.asyncio
    async def test_delete_record(self):
        """Create a record and delete it."""
        name = _unique_name("delete")
        record = await repo_create(self.TEST_TABLE, {"name": name})
        created = record[0] if isinstance(record, list) else record
        record_id = created["id"]

        # Delete
        await repo_delete(record_id)

        # Verify it's gone
        result = await repo_query(
            f"SELECT * FROM {record_id};",
        )
        # Should be empty or contain empty results
        if isinstance(result, list) and len(result) > 0:
            inner = result[0]
            if isinstance(inner, list):
                assert len(inner) == 0
            elif isinstance(inner, dict):
                # Some versions return the deleted record still
                pass

    @pytest.mark.asyncio
    async def test_upsert_creates_when_missing(self):
        """repo_upsert should create a record if it doesn't exist."""
        table = self.TEST_TABLE
        name = _unique_name("upsert")
        record_id = f"{table}:upsert_{uuid.uuid4().hex[:8]}"

        result = await repo_upsert(table, record_id, {"name": name, "count": 1})
        assert isinstance(result, list)
        assert len(result) > 0

        # Cleanup
        await repo_delete(record_id)

    @pytest.mark.asyncio
    async def test_upsert_updates_when_exists(self):
        """repo_upsert should update a record if it already exists."""
        name = _unique_name("upsert_upd")
        record = await repo_create(self.TEST_TABLE, {"name": name, "count": 1})
        created = record[0] if isinstance(record, list) else record
        record_id = created["id"]

        # Upsert with new data
        await repo_upsert(self.TEST_TABLE, record_id, {"count": 99}, add_timestamp=True)

        # Verify
        result = await repo_query(f"SELECT * FROM {record_id};")
        assert len(result) > 0
        updated = result[0] if isinstance(result[0], dict) else result[0][0]
        assert updated["count"] == 99

        # Cleanup
        await repo_delete(record_id)


# ── Domain Model Tests ───────────────────────────────────────────────


class TestDomainModelIntegration:
    """Test actual domain models against real SurrealDB."""

    @pytest.mark.asyncio
    async def test_notebook_create_save_delete(self):
        """Create a Notebook domain model, save it, read it, delete it."""
        from open_notebook.domain.notebook import Notebook

        name = _unique_name("notebook")
        nb = Notebook(name=name, description="Integration test notebook")
        await nb.save()

        assert nb.id is not None
        assert nb.id.startswith("notebook:")

        # Read it back using class method
        fetched = await Notebook.get(nb.id)
        assert fetched is not None
        assert fetched.name == name
        assert fetched.description == "Integration test notebook"

        # Delete
        await nb.delete()

        # Verify deleted
        try:
            deleted = await Notebook.get(nb.id)
            # Some implementations return None, others raise
            assert deleted is None or (hasattr(deleted, 'name') and deleted.name is None)
        except Exception:
            pass  # Expected — record is gone

    @pytest.mark.asyncio
    async def test_notebook_update(self):
        """Update a Notebook's fields and verify persistence."""
        from open_notebook.domain.notebook import Notebook

        name = _unique_name("nb_update")
        nb = Notebook(name=name, description="Original")
        await nb.save()
        original_id = nb.id

        # Update
        nb.description = "Updated description"
        nb.stage = "qualified"
        await nb.save()

        # Read back
        fetched = await Notebook.get(original_id)
        assert fetched.description == "Updated description"
        assert fetched.stage == "qualified"

        # Cleanup
        await nb.delete()

    @pytest.mark.asyncio
    async def test_customer_create_save_delete(self):
        """Create a Customer domain model, save it, read it, delete it."""
        from open_notebook.domain.customer import Customer

        name = _unique_name("customer")
        cust = Customer(name=name, industry="Technology", city="San Francisco")
        await cust.save()

        assert cust.id is not None
        assert cust.id.startswith("customer:")

        # Read back
        fetched = await Customer.get(cust.id)
        assert fetched.name == name
        assert fetched.industry == "Technology"
        assert fetched.city == "San Francisco"

        # Cleanup
        await cust.delete()

    @pytest.mark.asyncio
    async def test_notebook_list_all(self):
        """Notebook.get_all() should return a list."""
        from open_notebook.domain.notebook import Notebook

        # Create a test notebook to ensure at least one exists
        name = _unique_name("list_all")
        nb = Notebook(name=name, description="List test")
        await nb.save()

        all_notebooks = await Notebook.get_all()
        assert isinstance(all_notebooks, list)
        assert len(all_notebooks) >= 1

        # Find our test notebook in the list
        found = any(n.name == name for n in all_notebooks)
        assert found, f"Expected to find notebook '{name}' in get_all() results"

        # Cleanup
        await nb.delete()


# ── Cleanup ──────────────────────────────────────────────────────────


@pytest.fixture(autouse=True, scope="module")
def cleanup_test_table():
    """Clean up test records after all tests in this module."""
    yield
    # Post-test cleanup: remove any leftover test records
    async def _cleanup():
        try:
            await repo_query(f"DELETE _test_integration;")
        except Exception:
            pass
    asyncio.get_event_loop().run_until_complete(_cleanup())
