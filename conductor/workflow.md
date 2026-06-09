# Workflow & Process Rules: Conductor

## 1. Test-Driven Development (TDD) Workflow
We enforce a strict TDD development lifecycle:
1.  **Red Phase**: Write a failing integration or unit test first. Run the test and verify it fails.
2.  **Green Phase**: Implement the minimal production code necessary to pass the test. Run the test and verify it passes.
3.  **Refactor Phase**: Clean up formatting, structures, and types while keeping tests passing.

## 2. Commit Strategy
All changes must be committed task-by-task.
-   **Task Commit Message**: `{prefix}: {task description} ({trackId})`
    -   Example: `feat: add Google OAuth consent form (google-workspace-exporter_20260609)`
-   **Plan Commit Message**: `chore: mark task X.Y complete ({trackId})`

## 3. Verification Gates
After completing all tasks in a phase, we run complete test sweeps (`pytest` and `npx tsc --noEmit`) and halt for explicit user approval before starting the next phase.
