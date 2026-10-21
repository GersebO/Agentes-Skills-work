# Form Resilience and Mutation Control

Read this before building any form or any screen that triggers a mutation. The frontend must act as a defensive barrier against user errors, duplicate submissions, and inconsistent data leaking out.

## 1. Strict input validation (the filter)

- Run every text field through `.trim()` before final validation to strip accidental whitespace.
- Unless the context explicitly requires it, apply regex validation that blocks emojis, control sequences, and non-standard special characters.
- Always define explicit minimum and maximum lengths.

## 2. Total mutation lockdown (the barrier)

When an async request is in flight (`isLoading`, `isSubmitting`), disabling only the submit button is insufficient. Propagate `disabled` or `readOnly` to **all** `inputs`, `selects`, and `textareas` in the interactive form so data cannot change mid-request.

```tsx
const locked = isSubmitting;
<input disabled={locked} ... />
<select disabled={locked} ... />
<textarea readOnly={locked} ... />
<button disabled={locked}>Save</button>
```

## 3. Keyboard leak prevention

Block keyboard submission in invalid states. Pressing `Enter` inside an input must not fire the request if the form has errors or the mutation state is locked.

```tsx
const onKeyDown = (e) => {
  if (e.key === "Enter" && (hasErrors || locked)) e.preventDefault();
};
```

## 4. Visual stability (zero layout shift)

Render validation error messages in containers with reserved space and a minimum height. An appearing error must never push other elements or break the screen layout.

```tsx
<p className="min-h-[20px] text-error">{error ?? ""}</p>
```

## 5. Guaranteed state release

Every async mutation block must use a `finally` clause to turn spinners off and re-enable the interface, so a network failure or server rejection can never leave the UI permanently locked.

This lives in the Zustand store action (the component never calls the service):

```ts
entityUpsert: async (payload) => {
  set({ isLoading: true, hasError: false, errorMessage: '' })
  try {
    const { data: response } = await entityService.upsert(payload)
    if (!response.success) throw new Error(response.error ?? 'Unknown error')
    const saved = response.data!
    set((s) => ({
      entityList: payload.id
        ? s.entityList.map((e) => (e.id === saved.id ? saved : e))
        : [...s.entityList, saved],
    }))
    return true
  } catch (err: unknown) {
    set({ hasError: true, errorMessage: err instanceof Error ? err.message : 'Error' })
    return false
  } finally {
    set({ isLoading: false }) // always runs
  }
}
```
