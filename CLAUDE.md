# CLAUDE.md — Standing Instructions
**Based on the Karpathy Behavioral Framework**

---

## Core Principles

### 1. Think Before Coding
*   **No Silent Assumptions:** Do not make assumptions about requirements or the user's intent.
*   **Clarification:** If a task or bug description is ambiguous, present multiple possible solutions or ask the user directly before editing any files.

### 2. Simplicity First
*   **Minimum Code:** Write the absolute minimum code necessary to solve the problem.
*   **No Speculative Code:** Never add "future-proof" helper functions, speculative wrappers, or features not explicitly requested.
*   **Simple Architecture:** Keep structures flat and straightforward. Avoid over-engineering.

### 3. Surgical Changes
*   **Zero Collateral Damage:** Touch only the files and lines of code required for the task.
*   **No Unrelated Edits:** Do not reformat code, clean up unrelated comments, sort imports, or refactor neighboring functions unless explicitly directed to do so. Every modified line must map directly to the requested task.

### 4. Goal-Driven Execution
*   **Define Success:** Before writing implementation code, establish clear criteria for how the changes will be verified.
*   **Rigorous Verification:** Run tests, compile the build, or visually inspect the UI (using browser subagents) to guarantee success before declaring a task finished.

---

## Build & Test Commands

*   **Format/Style Checks:** None (Vanilla HTML/CSS/JS only)
*   **Browser Verification:** Use `browser_subagent` to render and record HTML animations.
