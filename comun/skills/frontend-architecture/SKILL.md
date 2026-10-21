---
name: frontend-architecture
description: Standards and step-by-step workflow for building React and Next.js frontend code following the Page to Component to Hook to Zustand store to Service pattern, premium UI tokens, and form resilience rules. Use this whenever creating or editing React or Next.js components, hooks, services, Zustand stores, interfaces, forms, or tables in this codebase, even when the user does not explicitly mention the architecture. Also use when reviewing frontend code for compliance with the dumb-component, hook-as-door and store-calls-service conventions.
---

# Frontend Architecture (React / Next.js)

This skill encodes the official frontend standard for this ecosystem. The frontend layer is focused on User Experience and Performance. The guiding idea is that the UI stays "dumb" (presentational) while the Zustand store holds the "brain" (async actions, loading and error state).

## The core layering rule

Build every feature along this one-directional flow:

```text
Page  →  Component  →  Hook  →  Zustand store  →  Service  →  API
```

Responsibilities are strict and non-overlapping:

- **Page** (`app/**/page.tsx`) only renders the functional component. No `'use client'`, no logic.
- **Component** is presentational. It consumes **only the hook** and renders. It never imports a store or a service.
- **Hook** (`store/hooks/`) wraps the store with selective subscriptions (`useXStore((s) => s.field)`) and is the component's only door to state. It never calls a service.
- **Zustand store** (`store/zustand/`) is the source of truth. Its async actions call the service and own the result plus `isLoading`, `hasError` and `errorMessage`. Every action releases state in `finally`.
- **Service** (`store/services/`) holds pure Axios calls and nothing else. No state, no business logic.

No layer may skip another. Typical violation to flag in reviews: a component or table-columns file importing a function straight from a service (e.g. a `checkDependencies` call) instead of going through store + hook.

When you are asked to "add a feature" or "wire up a screen", do not collapse these layers into one component.

## Directory placement

Place files exactly here under `/src`:

```text
app/                      Next.js App Router (routes and layouts)
components/
  functional/             Logic-heavy orchestrator components
  layout/                 Structural skeletons (Headers, Sidebars)
  ui/                     Atomic CVA-based components (Buttons, Inputs)
store/
  hooks/                  The orchestrators - business logic and loading states
  services/               Pure API fetching logic (Axios / Fetch)
  zustand/                Global state, the source of truth
  interfaces/             Strict TypeScript data contracts
```

## Hard limits and naming

- **Avoid God Components.** A component over 800 lines is a defect. If a functional component approaches this, extract logic into hooks and split the view into smaller `ui/` or `layout/` pieces.
- **Naming** (see also the project naming standard):
  - Components and UI files use `PascalCase` (for example `RiskMatrix.tsx`).
  - Hooks, functions, and logic use `camelCase` (for example `useAuditData()`, `validateUser()`).
- Every data shape crossing a layer boundary must have a strict TypeScript contract in `store/interfaces/`. Do not pass untyped objects between hook and service.

## Validation engine

Use **Zod** for frontend schema validation in **all** projects, including Barnard-SGSI. (Barnard-SGSI differs only on the backend, where it uses Joi. New and all other projects use Zod on both ends.) Forms validate with a Zod schema through `react-hook-form` + `zodResolver` before calling the store action; the schema lives next to the interfaces, never inline in the component.

## Build workflow

Follow these steps when implementing a frontend feature:

1. Define or update the TypeScript contracts in `store/interfaces/` (model + `I{Entity}UpsertPayload`) and the Zod schema for its form.
2. Create the `store/services/` functions that perform the raw API calls and return typed data.
3. Create the `store/zustand/` store: state, async actions that call the service, and `isLoading` / `hasError` / `errorMessage` released in `finally`. Mutations return `true`/`false` so the UI knows whether to close a dialog without importing the store.
4. Create the `store/hooks/` hook that exposes only what components need.
5. Build the functional component in `components/functional/` consuming only the hook, and a one-line page in `app/`.
6. Apply the premium UI standard and the form resilience standard (see references below). If the project has its own UI standard (e.g. `docs/ui-standard.md`), it takes precedence for screen structure.

## When to read the reference files

This skill keeps detailed material in separate files so it only loads when needed:

- For visual and styling rules (design tokens, CVA variants, micro-animations, loading UX, responsive strategy), read `references/premium-ui.md`.
- For any screen that submits data or contains a form (input validation, mutation lockdown, keyboard handling, error layout stability, guaranteed state release), read `references/form-resilience.md`.
- To **scaffold a new frontend project** or add a complete new entity end to end (project setup, Axios instance with refresh interceptor, auth store, route middleware, Docker, Vitest setup), read `references/frontend-guide.md`.

Read the relevant reference file before writing the corresponding code, not after.
