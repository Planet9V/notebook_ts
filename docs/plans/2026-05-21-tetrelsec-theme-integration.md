# Tetrel Security Theme Integration Plan

This implementation plan outlines the steps required to integrate the `tetrelsec.com` design system tokens, typography, and premium signature elements into the Open-Notebook Next.js frontend, replacing the default Tailwind oklch color values with strict Slate neutrals, corporate Blue primary accents, and Cyan secondary highlighting accents.

---

## User Review Required

> [!IMPORTANT]
> **Data-Theme Compatibility:** The project uses a custom Zustand-based `useThemeStore` that sets the class `.dark` or `.light` and a `data-theme` attribute on the `html` element. The proposed stylesheet changes integrate seamlessly with this mechanism by overriding root CSS custom variables inside `:root` and `.dark`.
>
> **Global Color Palette Overwrite:** This change replaces the default browser/Tailwind colors across all components with strict Slate-neutral values, corporate Blue, and Cyan highlights to conform strictly with the `tetrelsec.com` visual identity.

---

## Open Questions

- None at the moment. All design tokens are pre-verified against `tetrelsec.com` and mapped to standard Tailwind CSS v4 variables in `globals.css`.

---

## Proposed Changes

### Frontend Design System

---

#### [MODIFY] [globals.css](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/globals.css)

Overhaul the default color system, semantic theme mappings, custom scrollbar styling, card elements, and corporate buttons to align strictly with `docs/tetrelsec-design-system.css`.

1. **Inject Tetrel Design System Color Variables:**
   Add standard Slate neutrals, corporate Blue accents, and alternate Cyan highlights inside `:root` using OKLCH or Hex equivalents.
2. **Override Semantic Variables:**
   Configure `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, and `--ring` variables for both light mode and dark mode to map precisely to the new palette.
3. **Establish Premium Custom Scrollbars:**
   Style default scrollbars to be thin, rounded, and themed elegantly across both light and dark backgrounds.
4. **Append Signature Component Classes:**
   Add high-fidelity custom classes (`.tetrel-highlight-box`, `.tetrel-card`, and `.tetrel-btn`) using Tailwind's `@apply` directive for clean and strict layout-level consumption.

---

## Verification Plan

### Automated Checks
- Validate that the frontend still builds successfully without any TS/PostCSS errors:
  ```bash
  cd frontend && npm run build
  ```
- Run frontend linter checks to ensure code quality:
  ```bash
  cd frontend && npm run lint
  ```

### Manual Verification
- Launch the development server locally and navigate to `http://localhost:8502`.
- Verify the overall color theme change:
  - Background is white in light mode, dark Slate (`#0f172a`) in dark mode.
  - Text is dark Slate (`#0f172a`) in light mode, light Slate (`#f8fafc`) in dark mode.
  - Sidebar exhibits clean Slate tints.
  - Active interactive elements (buttons, focus borders, active tabs) are themed in Tetrel Blue (`#3b82f6`).
  - Hover states on lists/cards show smooth micro-interaction highlights.
- Verify custom scrollbars render cleanly on scrollable panels (e.g. source lists and notebook main panel).
- Verify custom classes (`.tetrel-highlight-box`, `.tetrel-card`, `.tetrel-btn`) render properly inside test pages.
