# Sub-Plan: Activity A, B, and C Preparatory Implementations

To prepare the platform for the core Claude Opus reset in 2 days, we must execute a rigorous, highly deterministic, and fully verified set of changes covering Dutch i18n coverage (Task A), Developer Architecture updates (Task B), and setting up the search Reranker toggle (Task C). We strictly adhere to **Karpathy Rules** (maximum simplicity, no stub code, no placeholder comments, complete production-ready logic) and enforce compilation checks (`npx tsc --noEmit`) at every stage.

## Approach
Our approach is to establish completely unified, identical translation registries in `en-US/index.ts` and `nl-NL/index.ts` for CSET compliance interfaces. We will then surgically wrap all hardcoded strings in `/compliance` subcomponents in the standard React i18n translation hook. Furthermore, we will formally document the agent, skill, and multi-tenant systems in the core architecture file, and add a clean, functional settings toggle switch that exposes the default reranker configuration to settings administrators.

---

## Scope

* **In:**
  * Complete translation of `/compliance/components/ComparisonMatrix.tsx` and `/compliance/components/MaturityWizard.tsx`.
  * Multi-language additions in `en-US/index.ts` and `nl-NL/index.ts` under the exact same nested JSON paths.
  * System architecture documentation in `docs/7-DEVELOPMENT/architecture.md` outlining Layer 1 (Agents), Layer 2 (Skills & MCPs), and Phase 2 (Multi-Tenant Org structure).
  * Addition of a "Default Reranker Model" settings toggle in `DefaultModelSelectors.tsx`.
  * Complete, type-safe verification with frontend compilation checks.
* **Out:**
  * Implementing the actual SurrealDB schema migrations for agents/tenants in this preparatory session.
  * Creating new complex visual themes or third-party search integrations.

---

## Action Items

### 1. Discovery & Audit
* [x] Verify that the Next.js compilation works in `frontend` by running `npm run build` or `npx tsc --noEmit` before changes.
* [x] Identify all exact strings to be extracted from `ComparisonMatrix.tsx` and `MaturityWizard.tsx`.

### 2. English & Dutch Locale Registry Additions (No Placeholders)
* [x] Surgically add i18n keys for CSET Comparison Matrix control domains, column headers, and compliance levels in both `frontend/src/lib/locales/en-US/index.ts` and `frontend/src/lib/locales/nl-NL/index.ts`.
* [x] Surgically add i18n keys for CSET Maturity Wizard metadata types, overview panels, radar charts, question navigators, and drawer controls in both locales.

### 3. Translate Comparison Matrix
* [x] Import `useTranslation` in `ComparisonMatrix.tsx`.
* [x] Surgically wrap all static headers, buttons, and control descriptions in `t()` hooks.

### 4. Translate Maturity Wizard
* [x] Import `useTranslation` in `MaturityWizard.tsx`.
* [x] Wrap all directives, metadata fields, radar analytics headers, drawer guidance sections, and question navigation buttons in `t()` hooks.

### 5. Document Core Architecture (Task B)
* [x] Revise `docs/7-DEVELOPMENT/architecture.md` to add structured sections detailing:
  * **Layer 1: Autonomous Agent Framework** (config schemas, queues, execution metrics, and SurrealDB tables).
  * **Layer 2: Skills & MCP Toolsets** (registration of 46+ tools, system environment mappings, and registry hub).
  * **Phase 2: Multi-Tenant Org Folder Structures** (multi-organization workspace paths, ACL rules, and audit logs).

### 6. Reranker Settings Default Toggle (Task C)
* [x] Inspect search page settings and Default Model settings hooks.
* [x] Add a clean, native search-reranking settings default toggle or select configuration directly inside `DefaultModelSelectors.tsx` with proper descriptive captions.

---

## Validation & Verification Plan

### Automated Verification
* [x] **Frontend Compilation:** Run `npx tsc --noEmit` inside `/Users/jimmcknney/notebook_tetrel/frontend` to ensure absolutely zero TypeScript errors or translation type mismatches exist.
* [x] **Locales Match Check:** Run `npm run test` (or locale test scripts) if available to verify that the Dutch and English locale keys match exactly.

### Manual Verification
* [x] Verify that compliance grid dashboard translates fully between Dutch and English via the browser target page.
