# API Contracts — New and Modified Endpoints

> All endpoints follow existing FastAPI patterns in `api/routers/`.  
> All responses are Pydantic models.  
> All new routers are registered in `api/main.py`.

---

## Path A: New Endpoint

### POST /api/transformations/run-inline

**File**: `api/routers/transformations.py` (MODIFY — add endpoint)  
**Purpose**: Execute a transformation with inline instruction, no saved `Transformation` record required. Powers the SocialBuilder real LLM call (Task A4).

```python
class InlineTransformRequest(BaseModel):
    input_text: str
    instruction: str
    model_id: Optional[str] = None  # None = use default model

class InlineTransformResponse(BaseModel):
    output: str
    model_used: str
    tokens_used: Optional[int] = None

@router.post("/transformations/run-inline", response_model=InlineTransformResponse)
async def run_inline_transformation(request: InlineTransformRequest):
    """
    Run a one-off transformation without a saved Transformation record.
    Used by SocialBuilder and any ad-hoc LLM text generation.
    """
    from open_notebook.domain.models import get_default_model
    model = await get_default_model(model_type="language", model_id=request.model_id)
    
    messages = [
        SystemMessage(content=request.instruction),
        HumanMessage(content=request.input_text),
    ]
    response = await model.ainvoke(messages)
    output = extract_text_content(response.content)
    
    return InlineTransformResponse(
        output=output,
        model_used=model.model_name or "unknown",
    )
```

**Test**:
```python
def test_run_inline_endpoint():
    """POST /api/transformations/run-inline returns 200 or 422 (not 404)."""
    client = TestClient(app)
    res = client.post('/api/transformations/run-inline', json={
        'input_text': 'hello',
        'instruction': 'Say this back',
    })
    assert res.status_code != 404
```

---

## Path B: New Routers

### Tasks Router — api/routers/tasks.py

**Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks (filter by project_id, customer_id, status, assigned_to) |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/{task_id}` | Get a task |
| PUT | `/api/tasks/{task_id}` | Update a task (uses `model_dump(exclude_unset=True)`) |
| DELETE | `/api/tasks/{task_id}` | Delete a task (requires 'editor' role) |
| GET | `/api/tasks/board` | Get tasks grouped by status (kanban board view) |
| GET | `/api/tasks/my` | Get tasks assigned to the authenticated user |
| POST | `/api/tasks/{task_id}/relate` | Relate a task to another entity |

**Pydantic models**:
```python
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    customer_id: Optional[str] = None
    notebook_id: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    priority: Optional[str]
    due_date: Optional[str]
    project_id: Optional[str]
    customer_id: Optional[str]
    notebook_id: Optional[str]
    assigned_to: Optional[str]
    tags: List[str]
    created: str
    updated: str
```

**Full GET /api/tasks handler**:
```python
@router.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    conditions = []
    params = {}
    if project_id:
        conditions.append("project_id = $project_id")
        params["project_id"] = project_id
    if customer_id:
        conditions.append("customer_id = $customer_id")
        params["customer_id"] = customer_id
    if status:
        conditions.append("status = $status")
        params["status"] = status
    if assigned_to:
        conditions.append("assigned_to = $assigned_to")
        params["assigned_to"] = assigned_to
    
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"SELECT * FROM task {where} ORDER BY created DESC LIMIT {limit} START {offset}"
    results = await repo_query(query, params)
    return [_build_task_response(r) for r in results]
```

---

### Campaigns Router — api/routers/campaigns.py

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/campaigns` | List campaigns (filter by status, customer_id) |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/campaigns/{id}` | Get a campaign |
| PUT | `/api/campaigns/{id}` | Update a campaign |
| DELETE | `/api/campaigns/{id}` | Delete a campaign |

**Pydantic models** follow same pattern as `TaskCreate / TaskUpdate / TaskResponse`.

---

## Path B: Modified Endpoints

### PUT /api/notebooks/{notebook_id} — Add activity emit on stage change

**File**: `api/routers/notebooks.py` (MODIFY)

After saving the updated notebook:
```python
# Emit activity if stage changed
if stage_changed and notebook.customer_id:
    await repo_create("activity", {
        "customer_id": notebook.customer_id,
        "activity_type": "stage_changed",
        "description": f"Deal stage: {original_stage} → {notebook.stage}",
        "actor": "system",
        "metadata": {"notebook_id": str(notebook.id), "new_stage": notebook.stage},
    })
```

### PUT /api/projects/{project_id} — Remove embedded tasks, add activity emit

**File**: `api/routers/projects.py` (MODIFY)  
After Path B, `project.tasks` field is deprecated. Response still returns `tasks=[]` for backward compatibility.

---

## API Registration in api/main.py

```python
# Add these imports:
from api.routers import tasks, campaigns

# Add these router inclusions (after existing ones):
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
app.include_router(campaigns.router, prefix="/api", tags=["campaigns"])
```

---

## Frontend API Hook Patterns

All hooks follow this pattern (from `use-customers.ts`):

**`frontend/src/lib/hooks/use-tasks.ts`** (NEW):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export function useTasks(filters?: {
  projectId?: string
  customerId?: string
  status?: string
  assignedTo?: string
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.projectId) params.project_id = filters.projectId
      if (filters?.customerId) params.customer_id = filters.customerId
      if (filters?.status) params.status = filters.status
      if (filters?.assignedTo) params.assigned_to = filters.assignedTo
      const { data } = await axios.get('/api/tasks', { params })
      return data
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (task: TaskCreate) => axios.post('/api/tasks', task).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & TaskUpdate) =>
      axios.put(`/api/tasks/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
```

**`frontend/src/lib/hooks/use-campaigns.ts`** (NEW) — same pattern.

---

## Endpoint Test Requirements (Karpathy P3)

Every new endpoint must have a test that:
1. Verifies the endpoint exists (not 404)
2. Creates a record and verifies it's returned
3. Updates the record and verifies changes
4. Deletes the record and verifies it's gone
5. Verifies filtering parameters work

Template (follow `tests/test_activities_api.py` pattern if it exists, else create new):
```python
# tests/test_tasks_api.py
def test_task_crud():
    client = TestClient(app)
    # Create
    res = client.post('/api/tasks', json={"title": "test task"})
    assert res.status_code == 200
    task_id = res.json()["id"]
    # Read
    res = client.get(f'/api/tasks/{task_id}')
    assert res.json()["title"] == "test task"
    # Update
    res = client.put(f'/api/tasks/{task_id}', json={"status": "done"})
    assert res.json()["status"] == "done"
    # Delete
    res = client.delete(f'/api/tasks/{task_id}')
    assert res.status_code == 200
    # Verify gone
    res = client.get(f'/api/tasks/{task_id}')
    assert res.status_code == 404
```
