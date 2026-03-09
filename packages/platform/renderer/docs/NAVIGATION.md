# Navigation Documentation

This document describes the navigation structure, routes, and keyboard shortcuts for the AI Ecosystem Dashboard application.

## Routes

The application uses React Router for client-side routing with lazy-loaded route components for optimal performance.

### Overview Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Main dashboard overview with system status and quick links |

### Training Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/grpo` | `GRPODashboardPage` | GRPO (Generalized Reward-weighted Policy Optimization) training dashboard with real-time metrics and loss curves |
| `/pipeline` | `PipelineDashboardPage` | ML pipeline monitoring dashboard showing training job status, resource usage, and pipeline health |

### Tools Routes

| Route | Component | Description | Icon |
|-------|-----------|-------------|------|
| `/composition-editor` | `CompositionEditorPage` | HoloScript composition editor with visual trait matrix for building and testing HoloScript compositions | ⊞ |
| `/a11y-audit` | `AccessibilityAuditPage` | WCAG 2.1 Level AA compliance scanner for auditing application accessibility | ♿ |

## Keyboard Shortcuts

The application provides keyboard shortcuts for quick navigation to commonly used tools.

| Shortcut | Action | Route |
|----------|--------|-------|
| `Ctrl+E` | Navigate to Composition Editor | `/composition-editor` |
| `Ctrl+A` | Navigate to Accessibility Audit | `/a11y-audit` |

**Note**: These shortcuts work globally across all pages. The browser's default behavior for these shortcuts (e.g., Ctrl+A for "Select All") is prevented when the shortcuts are triggered.

## Navigation Component

The main navigation is implemented in `AppLayout.tsx` and includes:

- **Semantic Structure**: Uses proper landmark elements (`<nav>`, `<main>`, `<aside>`)
- **Accessibility**: WCAG 2.1 Level AA compliant with proper ARIA labels, skip navigation link, and keyboard navigation support
- **Route Groups**: Navigation items are visually grouped by category (Overview, Training, Tools)
- **Prefetching**: Route components are prefetched on hover/focus to reduce perceived load time
- **Active State**: Current route is highlighted with visual indicators
- **Icons**: Tool routes display icons for visual identification

### Navigation Groups

#### Overview
- General dashboard and system overview pages

#### Training
- Machine learning training and pipeline monitoring tools

#### Tools
- Development and quality assurance tools (Composition Editor, A11y Audit)

## Adding New Routes

To add a new route to the navigation:

1. **Create the page component** in `src/app/pages/[route-name]/[PageName].tsx`

2. **Add lazy import** in `src/app/lazy-routes.tsx`:
   ```typescript
   const NewPage = React.lazy(
     () => import('./pages/new-route/NewPage'),
   );
   ```

3. **Create prefetch function** in `src/app/lazy-routes.tsx`:
   ```typescript
   export function prefetchNewPage(): void {
     import('./pages/new-route/NewPage');
   }
   ```

4. **Add route element** in `src/app/lazy-routes.tsx`:
   ```typescript
   export const NewRoute: React.FC = () => (
     <Suspense fallback={<RouteLoadingFallback label="New Page" />}>
       <NewPage />
     </Suspense>
   );
   ```

5. **Add route definition** to `lazyRoutes` array:
   ```typescript
   {
     path: '/new-route',
     element: React.createElement(NewRoute),
   }
   ```

6. **Add prefetch mapping** to `routePrefetchMap`:
   ```typescript
   '/new-route': prefetchNewPage,
   ```

7. **Add navigation item** in `AppLayout.tsx`:
   ```typescript
   {
     to: '/new-route',
     label: 'New Page',
     group: 'overview' | 'training' | 'tools',
     icon: '🆕', // Optional
     description: 'Description for tooltips and aria-label', // Optional
   }
   ```

8. **Update tests** in `src/app/__tests__/AppLayout.test.tsx`:
   - Add mock prefetch function
   - Add route coverage test
   - Update prefetch behavior tests

9. **Add keyboard shortcut** (optional) in `AppLayout.tsx`:
   ```typescript
   if (event.ctrlKey && event.key === 'n') {
     event.preventDefault();
     navigate('/new-route');
   }
   ```

10. **Document the route** in this file (NAVIGATION.md)

## Accessibility Features

The navigation system includes the following accessibility features:

- **Skip Navigation Link**: Allows keyboard users to skip directly to main content (`#main-content`)
- **Semantic Landmarks**: Proper use of `<nav>`, `<main>`, `<aside>` elements
- **ARIA Labels**: All navigation items have descriptive `aria-label` attributes
- **Active State**: Current page indicated with `aria-current="page"` (handled by NavLink)
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space)
- **Focus Indicators**: Visible 2px outline on focused elements
- **Contrast Ratios**: All text meets WCAG 2.1 AA minimum 4.5:1 contrast ratio
- **Group Labels**: Navigation groups have `role="group"` with `aria-label`
- **Tooltips**: Tool routes include descriptive `title` attributes
- **Icon Semantics**: Icons marked with `aria-hidden="true"` to prevent screen reader duplication

## Performance Optimization

The navigation system implements several performance optimizations:

1. **Lazy Loading**: All route components are loaded on-demand using `React.lazy()`
2. **Prefetching**: Route bundles are prefetched on hover/focus of navigation links
3. **Code Splitting**: Each route is bundled separately to reduce initial load time
4. **Suspense Boundaries**: Loading states prevent UI blocking during route transitions

## Testing

Navigation tests are located in `src/app/__tests__/AppLayout.test.tsx` and cover:

- Component rendering
- Navigation item presence
- Route accessibility
- Prefetch behavior
- Keyboard shortcuts (Ctrl+E, Ctrl+A)
- Semantic structure
- Skip navigation link

Run tests with:
```bash
npm test src/app/__tests__/AppLayout.test.tsx
```

## Route Registration

Routes are registered in the main App component using React Router v6:

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazyRoutes } from './lazy-routes';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      ...lazyRoutes,
    ],
  },
]);
```

This setup provides:
- Nested routing with `<Outlet />` in AppLayout
- Lazy-loaded child routes
- Automatic code splitting
- Loading states during transitions
