# KiddoPath — Frontend

A gamified task app for children aged 8–12. React 19 + TypeScript single-page
app, served by nginx at **https://localhost:8000/** (default `HTTPS_PORT`), talking to seven Django
microservices under `/api/`.

Two roles, **kid** and **parent**, decided by the JWT. The same bundle serves
both; routing and layout branch on `role`.

Backend contracts live in [`docs/backend/services_api_references/`](../docs/backend/services_api_references/).
Interactive docs per service are listed in the [root Readme](../Readme.md).

---

## Running

The frontend is a container in the compose stack — it is not run standalone.

```bash
make all          # start everything + migrate
```

Then open **https://localhost:8000/** and accept the self-signed certificate.

> `make all` seeds the **catalog only** — it creates no accounts. After a
> `make re` or `make fclean` the database has zero users. Run `make seed-dev`
> (or `seed-dev-friend` / `seed-dual-parent`) before testing anything.

| Command | What it does |
|---|---|
| `make up-front` | Start just the frontend container |
| `make build-front` | Rebuild the frontend image (needed after adding a package) |
| `make logs-front` | Tail the Vite dev server |
| `make shell-front` | Shell into the container |

### Tests

```bash
npm run test:run    # 300 tests across 42 files
npm run lint
npx tsc -b          # typecheck
```

Tests run on the host, not in Docker. `npm install` locally first.

### Adding a package

Add it to `package.json`, then rebuild the image so it is baked in —
installing inside a running container does not survive a restart.

```bash
make build-front
```

---

## Architecture

| Tool | Purpose |
|---|---|
| React 19 + TypeScript | UI |
| Vite | Dev server + bundler |
| Tailwind CSS v4 | Styling (tokens in `src/index.css` under `@theme`) |
| React Router v7 | Routing — layout routes + `<Outlet />` |
| Zustand | Auth state, persisted to `localStorage` |
| TanStack Query | Server state, caching, invalidation |
| Axios | HTTP, with token attach + refresh interceptors |
| i18next | EN / RU / AR with RTL |
| Recharts | Parent insight charts |

```
src/
├── api/          one file per backend service, all through client.ts
├── auth/         session + login orchestration
├── components/   shared, then kid/ and parent/
├── constants/    categories, XP economy, contact
├── hooks/        data hooks and a11y primitives
├── i18n/         config + en/ru/ar locales
├── pages/        one per route
├── store/        authStore
├── utils/        pure helpers (validation, dates, ws, tokens)
└── tests/        Vitest, mirrors the tree above
```

---

## Routes

Defined in `src/App.tsx`. Guards are **layout routes** — they render
`<Outlet />` rather than wrapping each page.

| Path | Access | Page | Purpose |
|---|---|---|---|
| `/` | guest | `Landing` | Marketing page |
| `/login` | guest | `Login` | Parent or kid login |
| `/signup` | guest | `Signup` | Parent or kid signup |
| `/forgot-password` | open | `ForgotPassword` | Request a reset link |
| `/reset-password` | open | `ResetPassword role="parent"` | Set a new password |
| `/kid/reset-password` | open | `ResetPassword role="kid"` | Same, kid endpoints |
| `/accept-invite` | open | `AcceptInvite` | Parent accepts a guardian invite |
| `/verify-email` | open | `VerifyEmail` | Parent email verification |
| `/kid/verify-email` | open | `VerifyKidEmail` | Kid email verification |
| `/verify-email-change` | open | `VerifyEmailChange` | Confirm an email change |
| `/privacy`, `/terms` | open | `PrivacyPolicy`, `TermsOfService` | Legal |
| `/dashboard` | kid | `ChildDashboard` | Tasks, stats, streak |
| `/tasks` | kid | `KidTasks` | Full task list |
| `/friends` | kid | `KidFriends` | Friends + requests + search |
| `/avatar` | kid | `AvatarStudio` | Buy and equip items with coins |
| `/settings` | kid | `KidSettings` | Visibility, password, email, guardians |
| `/parent/dashboard` | parent | `ParentDashboard` | Kid overview |
| `/parent/approvals` | parent | `ParentApprovals` | Confirm or reject completions |
| `/parent/profile` | parent | `ParentProfile` | Profile + avatar |
| `/parent/settings` | parent | `ParentSettings` | Account settings |
| `*` | — | `NotFound` | 404 |

Kid routes render inside `KidLayout`, parent routes inside `ParentLayout`
(sidebar on desktop, bottom nav on mobile).

**Why the reset and legal routes are `open`, not `GuestRoute`:** a signed-in
user following a reset link from their mail, or a footer link to the terms,
should reach the page. `GuestRoute` would bounce them to their dashboard.

`/reset-password` and `/kid/reset-password` render the same component with a
`role` prop — only the token endpoints differ.

---

## Auth

### Store

`src/store/authStore.ts` — Zustand, persisted to `localStorage` under the key
`auth`, so a refresh keeps the session.

```ts
interface User {
  id: string
  username: string
  email?: string          // parents have one, kids may not
  role: 'parent' | 'kid'
}
```

### Guards and the hydration flash

`ProtectedRoute` and `GuestRoute` call `useAuthHydrated()` and render
`AuthHydrationFallback` until Zustand has rehydrated. Without this, a hard
refresh on `/dashboard` briefly shows the login page before the store loads.

| Guard | Once hydrated |
|---|---|
| `GuestRoute` | Logged in → role's dashboard; else → `<Outlet />` |
| `ProtectedRoute` | Not logged in → `/login`; wrong role → other dashboard; else → `<Outlet />` |

`App` deliberately does **not** subscribe to the auth store — it reads
`getState()` once for the startup token verify. Guards and pages subscribe
where they actually need to re-render.

### Login

`src/auth/loginFlow.ts` handles that one form serves both roles. A single
email/username field cannot say which it is, so the parent endpoint is tried
and the kid endpoint is the fallback — for both password and Google. The
combined failure is mapped by `dualLoginErrorKey` so the user sees one honest
message rather than whichever call failed last.

`src/auth/session.ts` turns a token pair into store state.

### Password reset

Both the parent and kid request endpoints are called, for the same reason: an
address cannot say which kind of account it belongs to, and asking would leak
which accounts exist. The request only reports failure when **every** call
failed, so an offline device is never told to go check mail that never left.

---

## Data layer

### `src/api/client.ts`

The single axios instance. Points at `VITE_API_URL` (`https://localhost/api`).
Never call `fetch()` directly.

- **Request interceptor** attaches `Authorization: Bearer <token>`, unless the
  call opts out with `skipAuth`.
- **Response interceptor** refreshes on `401` and replays the request. Login
  and register paths are excluded — a `401` there means bad credentials, not an
  expired session, and refreshing would swallow the real error.

### API files map to backend services

| File | Service | Covers |
|---|---|---|
| `auth.ts` | auth | login, signup, Google, invites, verification, password reset |
| `account.ts` | auth | parent profile, username, password, email change, deletion |
| `kidAccount.ts` | auth | kid profile reads and updates |
| `tasks.ts` | task | tasks, completions, category visibility, AI streaming |
| `gamification.ts` | gamification | stats, profile, pending rewards |
| `social.ts` | social | friends, requests, search |
| `notifications.ts` | notification | list and mark-read |
| `catalog.ts` | catalog | shop items, base characters, purchase, equip |
| `avatar.ts` | auth | parent avatar upload |
| `parent.ts` | several | parent-side reads across task, gamification, analytics |
| `errors.ts` | — | maps backend error keys to translated messages |

### Query keys

TanStack Query keys are the cache contract — invalidate these, not ad-hoc
refetches.

| Key | Holds |
|---|---|
| `['tasks']` | Kid's task list |
| `['completions']` | Kid's completions (drives streak and pending XP) |
| `['gamificationStats']` | Per-category level and XP |
| `['gamificationProfile']` | Main level, overall XP, coin balance |
| `['categorySettings']` | Which categories the parent can see |
| `['me']` / `['kidMe']` | Current parent / kid profile |
| `['friendRequests']` | Incoming and outgoing requests |
| `['kidSearch', query]` | Debounced friend search |
| `['kidAvatar']` / `['parentAvatar']` / `['kidsAvatars']` | Avatars |
| `['shopItems']` / `['baseCharacters']` | Catalog |
| `['parentCompletions']` | Pending approvals |
| `['kidStats', kidId]` / `['kidAnalytics', kidId]` | Parent's per-kid views |

### Errors

`src/api/errors.ts` turns backend error keys into translated strings and
exposes predicates (`isEmailNotVerified`, `isAccountNotFound`, …) for the cases
the UI branches on. An unmapped key falls back to a generic message — if a
backend string surfaces as "Something went wrong", it needs a mapping here.

---

## Kid features

### Tasks

`TodaysTasks` groups by state (pending, done, rejected) via `utils/taskGroups`.
Adding a task streams the AI classification back as it is produced
(`createTaskStream`, rendered by `StreamingView`), so the kid sees categories
appear rather than waiting on a spinner. Rejected tasks show the parent's note.

### Stats, XP and coins

`useKidLevel` composes one view from four queries — stats, profile, tasks and
completions — reusing the cache `TodaysTasks` already filled, so the dashboard
costs no extra requests.

It returns **two** error flags, deliberately:

| Flag | Meaning |
|---|---|
| `isError` | Gamification failed — level, XP and coins are placeholders |
| `activityError` | Tasks/completions failed — streak, week strip and pending XP are placeholders |

Every number falls back to `0`, so a failed fetch would otherwise render as a
real "Level 0". One combined flag fixed a zero streak masquerading as fact but
created the opposite bug: a failed completions fetch blanked a level and coin
balance that had loaded perfectly well.

`constants/xp.ts` mirrors the backend economy — category bar 50, 50 XP and 50
coins per stat level, main level at 100 XP. **These must match
gamification-service.** While they disagreed, the bar read "80 / 200" at 40%
for a kid who was 80% of the way to the next level.

### Categories

Four categories can appear on a task: health, learning, responsibility,
creativity. A fifth, **honesty**, is a stat a kid holds but that never appears
on a task — it is awarded when a parent *confirms* a pending completion, worth
the sum of that task's rewards. Auto-confirmed tasks earn none.

That is why `constants/categories.ts` splits the types:

```ts
type TaskCategory = 'health' | 'learning' | 'responsibility' | 'creativity'
type StatCategory = TaskCategory | 'honesty'
```

`TaskCategory` gates anything offerable in a task form or a visibility toggle —
there is no `show_honesty` setting. `StatCategory` gates anything that renders
progress.

> **Backend dependency.** Honesty requires gamification-service migration
> `0003_honesty_category`, which is on `backend_as_microservices` and not yet
> in `main`. Against a `main` backend the honesty bar renders at level 0
> permanently, because the stats serializer's `ChoiceField` cannot return it.

### Reward celebrations

`RewardModal` lives in `KidLayout`, not on the dashboard, so it fires wherever
the kid is. Awards come from gamification's pending feed
(`/rewards/pending/`), which means one earned while the kid was not looking —
a parent confirming overnight, where the response goes to the parent — is
replayed on next open, then acknowledged via `/rewards/seen/`.

This replaced a level-up modal rather than sitting beside it: the server grants
coins at the exact moment a category bar fills, so a coin popup and a level-up
popup would be two dialogs over one event. It also closed a real gap —
level-ups were detected by diffing stats between refetches, which could never
fire on the first load after opening the app.

`useCountUp` animates the balance and respects `prefers-reduced-motion`.

### Friends

Search is debounced and queries with status `all`, so someone the kid already
knows is still findable rather than silently missing. Each result offers only
the action that applies to it. Presence is stated in **text**, not colour
alone. A failed list shows a retry block while search and add stay usable.

### Guardians

`MyGrownUps` lists a kid's grown-ups in place, marks the primary, shows a
waiting state for an unaccepted invitation, and hides the invite form once both
slots are taken.

### Avatar studio

Buy and equip items with coins. Coin balance lives in gamification;
catalog-service deducts internally on purchase, so the balance is re-read from
`['gamificationProfile']` rather than tracked locally.

---

## Parent features

- **Dashboard** — per-kid cards, switcher for multiple children.
- **Approvals** — confirm or reject a completion with a note; notification
  clicks route straight here.
- **Insights** — Recharts category breakdowns with empty states, plus CSV
  export.
- **Settings and profile** — account details and avatar upload, with explicit
  errors for oversized or wrong-type files.

---

## Real-time

Two WebSockets, both deriving their origin from `utils/wsBase.ts` — a single
place that rewrites the REST base to `ws`/`wss` and strips `/api`. Both hooks
derived this identically before; a change to the scheme had to be made twice or
one socket silently pointed at the wrong host.

- **Notifications** (`useNotifications`) — the list is server-owned. There is
  **no** client-side persistence; that was a workaround for an older
  unread-only endpoint and must not come back. Incoming frames are deduped by
  id and then **explicitly sorted by `created_at` descending**, because the
  backend pushes unread items on connect with no ordering guarantee.
- **Task streaming** (`useTaskStream`) — AI classification as it is generated.

---

## Conventions

### i18n

Every user-facing string goes through `t()`. Add the key to **all three**
locale files (`en`, `ru`, `ar`) — a missing key renders the key itself.

```tsx
const { t } = useTranslation()
t('auth.login')
t('greeting', { name: 'Ana' })   // "Hello, {{name}}!"
```

### Design tokens

Defined once in `src/index.css` under `@theme`, used as normal Tailwind
classes.

| Token | Used for |
|---|---|
| `primary` (purple) | Brand, creativity |
| `teal` | Success, health |
| `blue` | Learning |
| `amber` | Warnings, XP, responsibility |
| `rose` | Honesty |
| `danger` | Errors, destructive actions |
| `gray` | Backgrounds, text, borders |

Fonts: `font-heading` (Fredoka), `font-body` (Nunito).

Category colours are contrast-checked. The `-700` shades run 6.70–10.01:1 for
text; the `-500` shades are used only for progress fills, held to the looser
3:1 non-text rule. Do not put white text on a `-500`.

### RTL

Always use logical properties — `ps-4` / `pe-4`, never `pl-4` / `pr-4`.
`App.tsx` sets `documentElement.lang` and `.dir` in a `useLayoutEffect`. Email
and username inputs keep `dir="ltr"` even in RTL locales.

### Accessibility

WCAG 2.1 AA:

- Semantic HTML — `<button>`, `<main>`, a `<label>` for every input
- `aria-labelledby` on `<main>` pointing at the page `<h1>`
- `role="alert"` on errors, `aria-live="polite"` on dynamic regions
- `focus-ring` on every interactive element; never remove `outline`
- Colour is never the only carrier of meaning
- `useFocusTrap` in modals, `useFocusOnSwap` when a view replaces another

### Testing

Vitest + Testing Library, `src/tests/` mirroring the source tree. Tests assert
what a user sees — text and roles, not classes.

---

## Known gaps

- **Honesty needs backend PR #89** merged (see above).
- **The bundle is one 1.06 MB chunk** (299 kB gzip), mostly Recharts. No
  route-level code splitting yet.
- **`act()` warnings** in the `useNotifications` tests — unwrapped state
  updates in the WebSocket mock. Tests pass.
- **Character creation** is a base-character picker, not a builder.
