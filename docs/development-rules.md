# Strict Development & Documentation Rules

This project enforces strict development and documentation guidelines to ensure a high-quality, predictable, and robust codebase. All contributors (including AI pair programmers) must adhere to these policies.

---

## 1. Test-Driven Development (TDD)

Every bugfix or new feature MUST follow a strict TDD cycle:
1. **Write a Failing Test:** Create a unit or integration test that exercises the target behavior.
2. **Verify Failure (Red):** Run the test suite and confirm the new test fails.
3. **Implement Minimal Code (Green):** Write the absolute minimum implementation necessary to make the test pass. Do not write premature optimizations or unrelated code.
4. **Verify Success (Refactor/Verification):** Run all tests and ensure they all pass. Refactor the implementation if needed without breaking any test.
5. **Commit:** Commit the code immediately.

---

## 2. Commit and Branching Guidelines

### Branching Name Standards
All branches must have prefixes identifying their type:
- `feat/` for new features (e.g. `feat/google-drive-ingestion`)
- `fix/` for bugfixes (e.g. `fix/auth-token-decryption`)
- `docs/` for documentation updates (e.g. `docs/add-api-specs`)
- `refactor/` for code restructuring (e.g. `refactor/pydantic-validation`)
- `test/` for testing changes (e.g. `test/add-surreal-db-mock`)

### Commit Messages (Conventional Commits)
All commit messages must strictly conform to the Conventional Commits format:
- `feat: [description]` for new features
- `fix: [description]` for bugfixes
- `docs: [description]` for documentation changes
- `refactor: [description]` for code cleanups
- `test: [description]` for adding/updating tests
- `chore: [description]` for updates to build scripts, configurations, package files, etc.

---

## 3. Strict Code Quality & Type Safety

### Frontend (Next.js 15 / React 19 / TypeScript)
- **No `any` types:** Implicit or explicit usage of `any` is strictly prohibited. Everything must be explicitly and strictly typed.
- **Pre-commit Quality check:** Execute Next.js linting commands before committing (`npm run lint`).
- **Harmonious Styles:** Adhere to defined design tokens (Tailwind CSS config/Shadcn theme). Avoid custom inline style exceptions.

### Backend (FastAPI / Python 3.11+)
- **Strict Typing:** Python type hinting must be used for all functions, parameters, and return types.
- **Pydantic Validation:** All incoming payloads, API responses, and configuration schemas must use Pydantic v2 validation.
- **No Global Mutables:** Keep functions pure and side-effect free where possible.

---

## 4. Strict Documentation Rules

- **Design Plans First:** For any major feature, you must write an implementation plan matching the `writing-plans` skill format inside `docs/plans/YYYY-MM-DD-<feature-name>.md` and obtain approval before writing code.
- **C4 Architecture Diagrams:** Keep system diagrams current using Mermaid.js inside `docs/architecture.md`.
- **In-code Documentation:** All public APIs, hooks, classes, functions, and database schemas must be clearly documented with either JSDoc/TSDoc (frontend) or clear docstrings (backend).
