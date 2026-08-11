# Findings & Research Log: Documentation Wiki Publication Module

## Codebase Discoveries

1. **Existing Documentation Wiki Location:**
   - Path: [`frontend/src/app/(dashboard)/documentation/page.tsx`](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/documentation/page.tsx)
   - Current implementation: A single React Client Component containing a `DOCUMENTATION: DocSection[]` array with 12 sections.
   - Features: Search bar, section filtering by audience (All, End Users, Developers, Compliance), copy snippet buttons, interactive code execution protocol (`code:` protocol handlers), and sidebar section links.

2. **Required Reconciliation Content:**
   - **C4 Enterprise Architecture Specification:** Levels 1-3 Mermaid diagrams, OpenAPI 3.1 YAML specifications, PyTorch vector math formulas ($\mathbf{v}_{\text{blended}} = w\mathbf{v}_a + (1-w)\mathbf{v}_b$), FFmpeg ducking algorithms.
   - **Business Operations & User Master Manual:** Sales Engineer Demo Playbook, Marketing & Social Media Repurposing Playbook, Delivery Operations Playbook, Jeff Patton User Story Mapping matrices (Backbone $\rightarrow$ Steps $\rightarrow$ Tasks $\rightarrow$ Release Slices).
   - **General Counsel Legal Review:** Voice Biometric Consent requirements (BIPA/GDPR), FFmpeg LGPL licensing compliance, DPA requirements, and AI output warranty disclaimers.
   - **Technical Glossary:** 40+ domain-specific terms.

3. **Rendering & Publication Requirements:**
   - The Wiki Publication Module must support Markdown text rendering with global Tailwind/vanilla CSS variables, dark mode styling, custom font stacks (Inter, JetBrains Mono), code syntax blocks, rendered HTML tables, LaTeX formulas, and Mermaid diagram components.
   - Add a tab/selector on `/documentation` allowing users to toggle between:
     1. **Interactive Structured Wiki** (Tabbed sections, search, code protocols, role filtering)
     2. **Full Master Markdown Manual** (Raw/Rendered combined Wiki publication file with export capability)
     3. **User Story Mapping & Playbooks** (Visual business matrices for Sales, Marketing, and Operations)
     4. **C4 Architecture & Specifications** (Deep technical specifications & OpenAPI 3.1 YAML contracts)
     5. **Legal & Compliance Audit** (General Counsel risk assessment & licensing disclosures)
