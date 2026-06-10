# Findings - Bento Gateway Design & Architecture

## Codebase Discoveries

### Route Structure
- `/` currently has two files:
  - `src/app/page.tsx` which redirects to `/notebooks`.
  - `src/app/(dashboard)/page.tsx` which redirects to `/notebooks`.
- To route `/` to the bento gateway:
  - We will replace `src/app/(dashboard)/page.tsx` with the Bento Gateway component.
  - We will modify `src/app/page.tsx` to redirect to `/` or simply delete it so `(dashboard)/page.tsx` takes precedence. Removing `src/app/page.tsx` is cleaner.

### Sidebar / Navigation Hubs
The sidebar defines the following route paths:
- Sources: `/sources`
- Operations: `/operations`
- Search/Intelligence: `/search`
- Creative: `/media`
- Settings: `/settings`

These match the 4 bento cards we will render.

## Design Decisions
Following `/design-taste-frontend` and `/ui-ux-pro-max` rules:
- **No Emojis**: Replace mock icon emojis with Lucide SVG icons.
- **Accents**: Cyan (`text-cyan-400`, `bg-cyan-500`) as the single unified accent.
- **Visual Density**: High density (`VISUAL_DENSITY: 8`), use monospace numbers (`font-mono`) for numerical values.
- **Interactive UI**: Spring physics micro-actions on active cards. Hover states showing spotlight boundaries or glowing border highlights without shifting the layout.
