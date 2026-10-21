# Premium UI / UX Standards

Read this when styling components or building the visual layer. These rules make the interface feel polished and consistent.

## Design tokens (zero hardcoded colors)

Never write raw hex colors in components. Use semantic tokens such as `bg-primary`, `text-muted`. This keeps theming centralized and consistent.

```tsx
// Wrong
<div className="bg-[#1e293b] text-[#94a3b8]">

// Right
<div className="bg-primary text-muted">
```

## CVA (Class Variance Authority)

Standardize component variants with CVA instead of ad-hoc conditional class strings. This is how `ui/` atoms expose variants.

```tsx
<Button variant="outline">Cancel</Button>
<Button variant="solid">Save</Button>
```

## Micro-animations

Give controls tactile feedback:

- `active:scale-95` on clickable elements.
- `transition-all duration-150` on hover and state changes.

## Loading UX

Choose the loading indicator by context:

- **Skeletons** are mandatory for initial data fetching, so the layout structure stays visible while content loads.
- **Spinners** are reserved for AI processing or explicit "Save" actions.

## Responsive "Mirror" strategy

Do not try to cram complex tables onto small screens. Show an optimized card list on mobile with the same data.

Prefer the table component's own mobile renderer, so search, filters and pagination are shared between both views:

```tsx
<DataTable
  columns={columns}
  data={rows}
  renderMobileCard={(row) => <EntityCard row={row} />}
/>
```

Only if the table component has no mobile renderer, toggle two views by breakpoint, wrapping the table (never put `hidden md:block` on the `<table>` itself, it breaks table layout):

```tsx
<div className="hidden md:block"><Table>...</Table></div>
<div className="md:hidden">...cards...</div>
```
