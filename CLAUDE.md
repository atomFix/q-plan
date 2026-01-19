# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Q-Plan is a React-based work planning and task visualization dashboard. It displays employee work plans in a calendar-like grid view, showing tasks across dates with filtering, search, and organizational hierarchy navigation.

**Key Features:**
- Interactive calendar grid showing employee tasks across multiple dates
- Organizational tree navigation for selecting departments/groups
- Task filtering by priority (P0-P3) and status
- Dark/light theme support with background image overlays
- Responsive design with collapsible sidebar on mobile
- Task context menus for copying PMO links
- LocalStorage caching with "Thursday rule" for cache invalidation
- Multi-day task merging with lane-based layout to prevent overlap

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000, host 0.0.0.0)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Note:** The app expects a `GEMINI_API_KEY` environment variable, though it's currently using mock data from `services/mockData.ts`.

## Architecture

### Application Structure

```
App.tsx                 # Main application component (all state and UI logic)
├── Components/
│   ├── OrgTree.tsx         # Recursive org hierarchy navigation
│   ├── TaskCard.tsx        # Individual task display card
│   ├── StatsPanel.tsx      # Statistics panel with charts (Recharts)
│   ├── DailyTaskPopup.tsx  # Welcome popup for today's tasks
│   └── ParticleBackground.tsx
├── Services/
│   ├── apiService.ts       # Data fetching with caching logic
│   └── mockData.ts         # Mock data source
├── Utils/
│   └── dateUtils.ts        # Date column generation utilities
└── Types.ts               # TypeScript interfaces
```

### Key Data Flow

1. **Org Structure**: `fetchRelation(path)` → `RelationResponse` → `OrgTree` component
2. **Plan Data**: `fetchPlan(path, forceRefresh)` → `PlanResponse` → filtered and rendered in grid
3. **Caching**: `apiService.ts` implements localStorage caching with:
   - 7-day expiration
   - "Thursday rule": cache is stale on Thursday if not created today

### State Management (App.tsx)

All state is managed in the root `App` component:
- **View State**: `selectedPath`, `myRtxId`, `sidebarOpen`, `centerDate`, `rangeOffset`, `showWeekends`
- **Filter State**: `filterText`, `statusFilters`, `priorityFilters`, `onlyMe`
- **Theme State**: `darkMode` with localStorage persistence
- **Data State**: `relation`, `planData`, `loading`, `refreshing`

### Important Patterns

**Task Merging Logic**: Tasks that span multiple consecutive days are merged into single blocks (`getMergedTasks`). The algorithm uses a lane-based layout to prevent overlapping tasks in the same row.

**Filtering Chain**:
1. Filter employees by `onlyMe` flag
2. Move "me" to top of list if `myRtxId` exists
3. Filter tasks by priority/status/text search
4. Rebuild `daily_plans` with only visible tasks

**Date Column Generation**: `generateCenteredDateColumns` creates a centered date range around `centerDate` with configurable offset and weekend skipping.

## Styling

- **Tailwind CSS**: Loaded via CDN in `index.html`
- **Dark Mode**: Uses `dark:` prefix with `.dark` class on `html` element
- **Background Images**: Different images for light/dark modes with backdrop blur overlays
- **Custom Scrollbars**: Defined in `index.html` with webkit-scrollbar styles

## TypeScript Configuration

- Target: ES2022
- JSX: react-jsx (automatic runtime)
- Path alias: `@/*` maps to root directory
- NoEmit: true (handled by Vite)

## External Dependencies

- **React 19**: Latest version with automatic JSX runtime
- **Lucide React**: Icon library
- **Recharts**: Charting library for StatsPanel
- **Vite**: Build tool and dev server with React plugin

## Local Storage Keys

- `qodin_my_rtx`: Current user's RTX ID
- `qodin_my_path`: Organization path where user was found
- `qodin_last_path`: Last selected org path
- `qodin_theme_dark`: Dark mode preference
- `qodin_plan_cache_{path}`: Cached plan data per path
- `qodin_rel_cache_{path}`: Cached org relation data
