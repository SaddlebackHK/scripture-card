# Drop Firestore as a devotional source + simplify the Card screen

## Goal

Stop reading devotionals from Firestore — the local builtin source becomes the only origin. While we're in the Card screen code, also remove two pieces of chrome that no longer earn their keep: the "翻頁中…" loading indicator (made unnecessary by the synchronous lookup) and the hashtag-copy floating button.

## Motivation

Firestore was the override layer over the builtin data — a holdover from when admin pages allowed per-day overrides through the app. With admin removed and content authoring happening in-repo (TypeScript files), the override is no longer used. Every card view still pays a Firestore round-trip just to confirm "no override exists," producing a visible "翻頁中…" flash. Eliminating Firestore from the read path removes the latency, the flash, the override mechanism, and a chunk of dead infrastructure.

## Scope

### Removed

**Application**

- `src/application/use-cases/GetDevotional.ts`: drop the `DevotionalRepository` constructor parameter and field. `execute()` body collapses to `builtIn.findByKey(...) ?? buildPlaceholderDTO(...)`. The method stays `async` (the `UseCase<I, O>` contract requires `Promise<Result<...>>`), but the body has no awaits.

**Domain**

- Delete `src/domain/repositories/DevotionalRepository.ts`
- Drop the `DevotionalRepository` export from `src/domain/repositories/index.ts` (barrel becomes just `ClaimRepository`)

**Infrastructure**

- Delete `src/infrastructure/repositories/FirestoreDevotionalRepository.ts`
- Drop the `FirestoreDevotionalRepository` export from `src/infrastructure/repositories/index.ts` (barrel becomes just `FirestoreClaimRepository`)
- In `src/infrastructure/di/container.ts`:
  - Drop the `FirestoreDevotionalRepository` import and the `devotionalRepo` instantiation
  - Pass only `builtInDevotionals` to `new GetDevotional(...)`
  - Drop the `firestore: Firestore` field from the `Container` interface and from the `return` statement (no consumer reads `container.firestore` — the claim repo gets `firestore` injected at construction time)
  - Drop the `import type { Firestore } from 'firebase/firestore'` (only used by the removed field)

**Presentation**

- `src/presentation/pages/CardPage.tsx`:
  - Delete the `{loading && <div className="card-status">翻頁中…</div>}` line. The card renders the date label immediately; title/verse/footer appear in the same render the snapshot arrives.
  - Delete the hashtag-copy `<button>` from the floating footer (the one with the `Hash` icon and `aria-label={`複製標籤 ${SHARE_HASHTAG}`}`). The footer becomes a single-button cluster: just the Mail/claim button.
  - Delete the `SHARE_HASHTAG` constant, the `copied` `useState`, the `copyHashtag` function, and the `{copied && <div className="card-toast">…</div>}` toast block (no longer reachable once the button is gone).
  - Trim the lucide import to drop `Hash` and `Check` — both were only used by the hashtag-copy interaction. Final lucide import: `import { ArrowLeft, Mail } from 'lucide-react'`.
- `src/presentation/styles/global.css`: delete the `.card-toast` rule (used only by the removed toast). Keep `.card-screen`, `.card-screen-bg`, `.card-screen-content`, `.card-screen-actions`, `.card-action-btn`, `.card-back*`, `.card-date`, `.card-title`, `.card-verse`, `.card-ref`, `.card-status`, `.card-error-banner` — these are still in use (or, in the case of `.card-status`, used to be but no longer; see note below).
  - The `.card-status` class becomes unused after the loading indicator is removed. Delete it as well.

**Config**

- `firestore.rules`: delete the entire `match /devotionals/{key}` block. No client code reads from that path after this change; default-deny covers it.

**Docs**

- `README.md`: drop the "Devotional content is edited directly in the Firebase console (Firestore → devotionals → {MM-DD})" paragraph from the Firebase section. Editing the console no longer affects the app.
- `CLAUDE.md`: drop the `devotionals/{MM-DD}` line from the Firestore schema section. Schema list becomes claims-only.

### Kept untouched

- `BuiltInDevotionalSource` port, `InMemoryBuiltInDevotionalSource` implementation, all 12 month files
- `Devotional` entity, `DevotionalDTO`, `devotionalMapper`, `buildPlaceholderDTO`
- Firestore SDK in the app: `firebaseApp`, `firestore` module, `mapFirestoreError` — still needed by claims
- `FirestoreClaimRepository`, `SubmitClaim`, `ClaimDialog`, claim flow end-to-end
- `useDevotional` hook contract — `loading` flag still distinguishes "first paint, snapshot not yet committed" from "settled with error/data"; only the visible indicator goes
- Landing → Card navigation
- `firestore.rules` claim block

### Final shapes

**`GetDevotional` constructor and execute body:**

```ts
constructor(builtIn: BuiltInDevotionalSource) {
  this.builtIn = builtIn;
}

async execute(input: GetDevotionalInput): Promise<Result<DevotionalDTO, DomainError>> {
  const keyResult = DayKey.create(input.month, input.day);
  if (isErr(keyResult)) return err(keyResult.error);

  const builtIn = this.builtIn.findByKey(keyResult.value);
  if (builtIn !== null) {
    return ok(toDevotionalDTO(builtIn));
  }

  return ok(buildPlaceholderDTO(input.month, input.day));
}
```

**`Container` interface:**

```ts
export interface Container {
  readonly useCases: UseCases;
}
```

(Just `useCases`. The `firestore` field is gone.)

## Order of execution

Standard outside-in. No atomic phase this time — every step leaves the build green.

1. **Presentation** — strip the loading indicator, the hashtag button, the copied/toast state, and the related lucide imports from CardPage; delete the `.card-toast` and `.card-status` CSS.
2. **Application** — simplify `GetDevotional` (drop the `DevotionalRepository` import + the repo arg + the Firestore branch in `execute`).
3. **Infrastructure** — update `container.ts` (drop `FirestoreDevotionalRepository` import + instantiation; drop the `firestore` field from `Container`; pass only builtin to `GetDevotional`); delete `FirestoreDevotionalRepository.ts`; update repositories barrel.
4. **Domain** — delete `DevotionalRepository.ts`; update repositories barrel.
5. **Config & docs** — `firestore.rules`, `README.md`, `CLAUDE.md`.
6. **Verification** — `npm run typecheck && npm run lint && npm run build && npm test`. Manual browser smoke: navigate to `/card/5/12` and confirm the card content appears immediately (no `翻頁中…`) and the floating footer shows only the Mail/claim button (no hashtag button, no toast).

## Risks and known consequences

- **Orphaned Firestore `devotionals/*` documents** in production stay where they are. The app no longer reads them. Clean up via Firebase console if you want a tidy collection list — not required.
- **No more per-day overrides.** Anyone who was relying on console-edits to a specific `devotionals/MM-DD` document to change rendered content needs a different workflow (edit the builtin TS file and redeploy). With the current project usage this matches your intent.
- **`Container.firestore` field removal is a public-surface change.** Anything outside the codebase that depended on it (e.g. tests, future use cases) would need to obtain `firestore` from `@infrastructure/firebase` directly. Nothing currently does.

## Out of scope

- Scrubbing existing Firestore `devotionals/*` documents server-side.
- Adding a CLI or admin path for editing the builtin TS files.
- Any change to the claim flow, Landing page, or Card screen visual design beyond removing the loading indicator.
