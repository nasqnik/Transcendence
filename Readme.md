*This project has been created as part of the 42 curriculum by meid, hparveen, mnazar, anikitin.*

# KiddoPath

## Description

**KiddoPath** is a kid-first web app: children own their tasks and progress, with parents as optional guides. Kids freely create and complete their own tasks. They choose which **categories** (health, learning, responsibility, creativity) their parent can see for review. Completing tasks earns progress in those categories. As kids level up categories, they earn coins they can spend in the Avatar store to customize how they look. When a task in a reviewed category is confirmed by a parent, the kid also earns Honesty XP a reward for being accountable. On the parent side, the dashboard is for approving those reviews and for analytics to track each linked kid’s progress over time. The stack is a React frontend and Django microservices behind nginx.

**Goal:** Give kids freedom and ownership over their habits and goals, while letting them decide which categories a parent can review and rewarding honesty when those tasks are confirmed. Progress unlocks coins for the Avatar store. Parents get a clear place to accept reviews and follow progress with analytics.

**Key features:**

| Area | What you get |
| --- | --- |
| **Auth** | Kid & parent accounts (email/password, Google); kid invites parent(s); forgot-password & profile |
| **Tasks** | Kids create/complete tasks; choose which *categories* parents review; AI scoring; parents approve/reject |
| **Gamification** | Category XP & levels; coins on level-up; Honesty XP on parent confirm; Avatar store |
| **Dashboards** | Kid: tasks & progress · Parent: reviews & analytics per kid · Friends & notifications |

**Architecture (overview):**

| Piece | Role |
| --- | --- |
| `frontend` | React + Vite UI |
| `auth-service` | Users, JWT, guardians, Google |
| `task-service` | Tasks, completions, AI moderation/scoring |
| `gamification-service` | XP, levels, coins, rewards |
| `analytics-service` | Parent progress insights |
| `notification-service` | In-app (and related) notifications |
| `catalog-service` | Avatar items / shop |
| `social-service` | Friends |
| `nginx` + PostgreSQL | Gateway and databases |

## Instructions

### Prerequisites

- **OS:** Any host that runs Docker — tested on **Linux**, **macOS**, and **Windows (WSL)**
- **Docker Engine** and **Docker Compose v2**
- **Docker Buildx** (Compose Bake)
- **Make**
- Host user in the `docker` group (so you can run without `sudo`)
- Required for task categorization:
  - `OPENROUTER_API_KEY` (AI is the only categorization path)
- Optional:
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Google Sign-In)
  - SMTP settings if you want real emails (dev can use console/locmem)

```bash
sudo apt update
sudo apt install docker.io docker-compose-v2 docker-buildx util-linux-extra make
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
newgrp docker   # or log out and back in
```

### Configuration (`.env`)

```bash
cp .env.example .env
```

Fill these in `.env` (generation commands are commented above each variable in [`.env.example`](.env.example)):

1. `DOCKER_UID` / `DOCKER_GID` — from `id -u` and `id -g`
2. `DJANGO_SECRET_KEY` — Django signing key (all services)
3. `INTERNAL_SERVICE_TOKEN` — shared secret for service-to-service calls (`X-Internal-Token`)
4. `OPENROUTER_API_KEY` — required (task AI categorization)
5. `FRONTEND_URL` — must match the HTTPS app URL (default in `.env.example`: `https://localhost:8443`). Email verify/reset/invite links use this.
6. Optionally: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (see `.env.example`)

### Run the project

**Normal (app only — no admin, no Swagger):**

```bash
make all
```

**Local development (admin + Swagger enabled):**

```bash
make dev
```

Both will:

1. Create SSL certs if missing  
2. Build and start containers (`db`, microservices, frontend, nginx)  
3. Create per-service databases  
4. Run migrations  
5. Seed catalog data  

Then open **http://localhost:8000** (redirects to **https://localhost:8443**) or go straight to HTTPS. Accept the self-signed certificate warning. Change ports with `HTTP_PORT` / `HTTPS_PORT` in `.env` if needed.

| URL | When | What |
| --- | --- | --- |
| https://localhost:8443/ | `make all` or `make dev` | App (frontend); port from `HTTPS_PORT` |
| https://localhost:8443/admin/ | `make dev` only | Django admin |
| https://localhost:8443/api/docs/ | `make dev` only | Auth Swagger (`/api/<service>/docs/` for others) |

With `make all`, those admin/docs URLs are not registered (404). Switch modes by running the other target (Compose recreates services when `DJANGO_DEBUG` changes).

### Useful commands

| Command | Purpose |
| --- | --- |
| `make all` | Start stack (production-like: frontend + APIs, no admin/docs) |
| `make dev` | Same stack + Django admin and Swagger |
| `make migrate` | Run migrations on all services |
| `make down` | Stop containers |
| `make re` | `fclean` then `make all` |
| `make logs` | Follow compose logs |

Sign up through the frontend after `make all`. Optional CLI user seeds for developers: see `makefiles/seed.mk` / `Developer.md`.

### Notes

- All public traffic goes through nginx: **`HTTP_PORT`** (default **8000** → 80, redirects to HTTPS) and **`HTTPS_PORT`** (default **8443** → 443).
- Parent JWTs carry `kid_ids` / `kids`; refresh reloads them from the DB after a kid links.
- Parent and kid must use **different** Google accounts if both sign in with Google.

## Resources

### Documentation & references

- [Django documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Docker Compose](https://docs.docker.com/compose/)
- [React](https://react.dev/) / [Vite](https://vitejs.dev/)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- Project API notes under `docs/backend/services_api_references/`
- Architecture notes: `docs/microservices_implementation_plan.md`
- Internal setup notes: `Developer.md`

### How AI was used

AI assistants (e.g. Cursor) were used as a development aid, not as a substitute for design and ownership of the system. Typical uses:

- **Scaffolding & boilerplate:** serializers, views, URL wiring, tests following existing project patterns  
- **Debugging:** tracing bugs such as parent dashboard empty after kid link (stale JWT `kid_ids` on refresh), completions filtered by `kid_id`, Google login creating unintended parents  
- **Feature implementation support:** gamification (coins per category, Honesty on parent approval), forgot-password flow, username validation, pending rewards APIs  
- **Docs & messaging:** API reference snippets, PRD text, commit/PR wording, README structure  
- **Not used for:** inventing product goals in isolation, or replacing human review of security-sensitive auth/JWT and privacy decisions  

All AI-suggested changes were reviewed, adapted to team conventions, and tested in the local Docker stack before merge.



### Team Information

| Login | Name | Role(s) | Responsibilities |
| --- | --- | --- | --- |
| **meid** | Mariam Eid | Product Owner (PO), Developer | After the team agreed on the idea, defined the product scope and which features ship now vs later; coordinated backend so Henna and the frontend team (Anastasiia, Madiha) had a stable base; gathered submission requirements from peers and staff documentation; implemented **auth-service**, **task-service**, **gamification-service**, **social-service**, and shared infra. |
| **anikitin** | Anastasiia Nikitina | Project Manager / Scrum Master, Developer | Planned with the PO; set project flow and team organization; scheduled meetings and agendas; enforced the GitHub pipeline and commit conventions; built the **frontend base** and **accessibility** foundations so Madiha had a solid starting point; also built the **kid dashboard**. |
| **mnazar** | Madiha Nazar | Technical Lead / Architect, Developer | Go-to person for critical tech-stack decisions; reviewed PRs into `main`; built the **parent dashboard**, and the **avatar** feature inside the kid dashboard. |
| **hparveen** | Henna Parveen | Developer, main tester | Active in design discussions; implemented **analytics-service**, **catalog-service**, **notification-service**, and helped with infra; as **main tester**, found bugs early so the team could fix them. |

All members also act as developers: implement assigned work, review when needed, test locally, and document what they own. On the frontend, Anastasiia (base, accessibility, kid dashboard) and Madiha (parent dashboard + avatar in the kid UI) carried a similar share of development work.

### Project Management

- **Organization:** Scope and priorities set with the PO; PM owned the delivery rhythm (when to meet, what each session covers, and that the agreed GitHub workflow is followed). Backend work was split by service (Mariam / Henna). Frontend was split so both sides stayed balanced: Anastasiia owned the base, accessibility, and kid dashboard; Madiha owned the parent dashboard and the avatar feature in the kid UI — roughly the same amount of frontend development each.
- **Tools:** GitHub (branches, PRs to `main`, commit conventions, pipeline); Tech Lead reviews merges to `main`. **Miro** for product notes and organizing the architecture. **Google Sheets** to track progress against the required modules.
- **Communication:** Scheduled team meetings (planning / sync) plus ongoing discussion while designing features. Day-to-day chat for PR updates, open questions, and asking for help from whoever owned a piece because we avoided touching each other’s code, we had to communicate a lot across services and dashboards. GitHub (PRs / reviews) between meetings.

### Technical Stack

| Layer | Choices |
| --- | --- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Zustand |
| **Backend** | Django + Django REST Framework microservices; Simple JWT for auth |
| **Gateway** | nginx (HTTPS reverse proxy to frontend and APIs) |
| **Database** | PostgreSQL — relational model with separate DBs per microservice for isolation |
| **Realtime / cache** | Redis — channel layer for WebSockets (notifications + social presence) |
| **Other** | Docker / Compose for the local stack; OpenRouter for task AI categorization (required); Google Identity (optional) for OAuth; **Recharts** (React chart library for parent analytics graphs) |

**Why these choices**

**Frontend**

- **React:** Component model fits two roles (kid + parent dashboards), reusable UI, and a large ecosystem for a11y/i18n.
- **Vite:** Fast HMR and simple Docker/dev setup; lighter than heavier bundler-first toolchains for local `make` workflows.
- **TypeScript:** Catches API/prop mistakes early across many screens and shared hooks (auth, tasks, WebSockets).
- **Tailwind CSS:** Utility-first styling so Anastasiia and Madiha could ship a consistent design system quickly without a separate CSS architecture fight.
- **React Router:** Clear route trees for kid vs parent areas and auth guards by role.
- **TanStack Query:** Server state (tasks, analytics, catalog) with caching, retries, and loading/error handling — avoids reinventing fetch logic per page.
- **Zustand:** Small client store for session/UI concerns (e.g. persisted auth tokens) without Redux boilerplate.
- **Recharts:** React chart components (line/bar/etc.) used on the **parent analytics dashboard** to draw progress over time from `analytics-service` data — not a backend tool.

**Backend / infra**

- **Django:** Batteries-included Python web framework (ORM, migrations, auth hooks, admin) well suited to structured APIs and multi-service backends; strong docs and team familiarity for a 42-style project.
- **Django REST Framework (DRF):** Turns Django into clean JSON APIs (serializers, viewsets/APIViews, permissions, browsable/Swagger schema via Spectacular) instead of hand-rolling HTTP endpoints. Pairs with **Simple JWT** so Bearer token login/refresh and per-view auth (`IsAuthenticated`, custom kid/parent JWT classes) are mostly configuration + small adapters — not a custom crypto stack.
- **Microservices (many Django apps):** Clear ownership per domain (auth, tasks, XP, shop, etc.) and parallel work between Mariam and Henna.
- **Simple JWT:** Stateless access/refresh tokens issued by auth-service; other services verify the same secret locally and build actors — no session DB on every microservice.
- **PostgreSQL:** Relational integrity for users ↔ kids ↔ guardians, tasks/completions, and progression ledgers; **first-class Django database backend** (official support, migrations, constraints) so ORM models map cleanly to SQL.
- **Redis:** Backing store for Django Channels (WebSocket fan-out): notification pushes and social **presence** (who is online). Keeps realtime traffic off PostgreSQL.
- **nginx + Docker:** One HTTPS entrypoint (`https://localhost:8443`; `http://localhost:8000` redirects) matching evaluation/local run.
- **OpenRouter:** Required LLM path for task categorization (and moderation).
- **Google Identity:** Optional Google Sign-In for parents/kids.

### Database Schema

Runtime uses **one PostgreSQL instance** with a **separate database per microservice**. There are **no foreign keys across databases**. Identity is shared by **UUIDs** copied into each service (`kid_id`, parent `user_id` / `parent_id`, `completion_id`, catalog item ids). Auth is the source of truth for who a kid/parent is; other services store only the ids they need and call auth (or each other) over HTTP when they must resolve a name or check that an id still exists.

#### How relations work

| Kind | Where | Example |
| --- | --- | --- |
| **Real FK** (DB-enforced) | Inside one service DB | `TaskCompletion.task` → `Task`; `GuardianInvitation.kid` → `Kid`; `RewardPurchase.item` → `AvatarItem` |
| **Logical link** (UUID only) | Across services | `Task.kid_id` = `Kid.id` in auth; `CompletionEvent.completion_id` = `TaskCompletion.id` in task |

```text
                    ┌──────────── auth_db ────────────┐
                    │ CustomUser ◄──┐                 │
                    │               │ FK parent        │
                    │ Kid ──────────┘                 │
                    │   ▲                             │
                    │   │ FK kid                      │
                    │ GuardianInvitation              │
                    └──────────────┬──────────────────┘
                                   │ kid_id / parent_id (UUID in JWT & APIs)
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   task_db                  gamification_db            catalog_db
   Task ──FK── TaskCategoryReward   KidProfile(kid_id)   AvatarItem
     │ ──FK── TaskCompletion          KidStat(kid_id)      │
     │        (id = completion_id)    CompletionEvent      │ FK
   KidCategoryVisibility              (PK=completion_id) KidAvatar / RewardPurchase
   ModerationLog                                           ParentProfile(parent_id)

         │ on confirm ──HTTP──► gamification + analytics + notifications
         ▼
   analytics_db.ActivityEvent(completion_id, kid_id)
   notification_db.Notification(recipient_id)
   social_db.Friendship(from_kid_id, to_kid_id)  (auth used to resolve usernames)
```
- FK: A column in one table that points to the primary key of another table

#### Cross-service flows (logical relations)

1. **Kid exists in auth** → every other service stores that kid as `kid_id` (no FK).
2. **Task create** (task) → AI moderation log + category rewards on the same `Task`.
3. **Kid completes task** → `TaskCompletion` (pending if category is parent-visible).
4. **Parent confirms** → task-service calls **gamification** with `completion_id` + category points → `CompletionEvent` + XP/coins; may call **analytics** (`ActivityEvent`) and **notifications**.
5. **Shop purchase** (catalog) → `RewardPurchase` FK to `AvatarItem`; coins deducted via **gamification** internal API (`kid_id`).
6. **Friends** (social) → two `kid_id`s; presence/enrichment may ask **auth** for username/bio.
7. **JWT** carries auth ids (`kid_id` / `user_id` / `kid_ids`) so APIs authorize without joining auth tables.

---

#### `auth_db` — `auth-service` (`users`)

**Relations:** `Kid.parent` → `CustomUser` (optional until primary guardian accepted). `GuardianInvitation.kid` → `Kid`; `GuardianInvitation.parent` → `CustomUser` (nullable until accept).

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **CustomUser** | 1→N `kids`, 1→N invitations | UUID `id`; `email` (USERNAME_FIELD), `username`; `role` `parent`\|`admin`; `google_sub`; `email_verified`; `pending_email` + verification/reset token timestamps; `bio`; `created_at` |
| **Kid** | N→1 `parent`; 1→N invitations | UUID `id`; `registration_status` (`awaiting_primary_parent`\|`active`\|`suspended`); `name`, `username`; optional `email` / `google_sub`; `password_hash`; verification/reset tokens; `avatar_url`; `bio` |
| **GuardianInvitation** | N→1 kid, N→1 parent | `invite_email`; `role` `primary`\|`secondary`; `status` pending/accepted/declined/expired/revoked; unique `token`; `expires_at`; unique pending `(kid, invite_email)` |

---

#### `task_db` — `task-service` (`tasks`)

**Relations:** `TaskCategoryReward.task` → `Task`; `TaskCompletion.task` → `Task`. `kid_id` / `created_by` / `reviewer_id` are **UUIDs** pointing at auth (not FKs).

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **Task** | 1→N rewards, 1→N completions | `kid_id`, `created_by`; `title`, `description`; `xp_reward`; `ai_evaluated`, `ai_summary`; `is_active`; `due_date`; `created_at` |
| **TaskCategoryReward** | N→1 Task | `category` health/learning/responsibility/creativity; `points_value`; unique `(task, category)` |
| **TaskCompletion** | N→1 Task | `kid_id`; `status` pending/confirmed/rejected; `completed_at`, `reviewed_at`; `reviewer_id`, `review_note` |
| **KidCategoryVisibility** | 1 per kid (logical) | `kid_id` unique; `show_health` / `show_learning` / `show_responsibility` / `show_creativity` (which categories parents may review) |
| **ModerationLog** | none (audit) | `kid_id`; title/description snapshot; `action` allowed/blocked; `reason`; `created_at` |

---

#### `gamification_db` — `gamification-service`

**Relations:** no FKs between tables; all keyed by `kid_id`. `CompletionEvent.completion_id` **equals** `TaskCompletion.id` from task-service (idempotent ingest).

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **KidProfile** | 1 per kid | `kid_id` unique; `main_level`, `overall_xp`, `coins`; timestamps |
| **KidStat** | many per kid (one row per category) | `kid_id` + `category` (same four + **`honesty`**); `level`, `xp_percent`; unique `(kid_id, category)` |
| **CompletionEvent** | logical → task completion | PK `completion_id`; `kid_id`; `payload` JSON; `coins_awarded`; `stat_level_ups` JSON; `seen_at` (null until kid UI ack) |

---

#### `analytics_db` — `analytics-service`

**Relations:** none inside DB. `completion_id` / `kid_id` match task + auth.

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **ActivityEvent** | logical → TaskCompletion + Kid | unique `completion_id`; `kid_id`; `payload` JSON (category points snapshot); `processed_at` |

---

#### `catalog_db` — `catalog-service`

**Relations:** `RewardPurchase.item` → `AvatarItem` (PROTECT). `KidAvatar` equipped_* UUIDs **logically** reference `AvatarItem.id`. `kid_id` / `parent_id` → auth.

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **AvatarItem** | 1→N purchases | `name`; `type` hair/glasses/earrings/background; `image_url`; `coin_cost`; `is_active`; DiceBear `param_key` / `param_value` |
| **KidAvatar** | 1 per kid | `kid_id` unique; `base_character`; `unlocked_items` JSON list of item UUIDs; `equipped_hair` / `_glasses` / `_earrings` / `_background` |
| **RewardPurchase** | N→1 AvatarItem | `kid_id`; `coins_spent`; `purchased_at` |
| **ParentProfile** | 1 per parent | `parent_id` unique; `profile_picture` (media upload) |

---

#### `social_db` — `social-service`

**Relations:** no FKs; both ends are auth `Kid.id`. Constraint: `from_kid_id ≠ to_kid_id`; unique directed `(from, to)`.

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **Friendship** | logical Kid↔Kid | `from_kid_id`, `to_kid_id`; `status` pending/accepted/declined/blocked; `created_at`, `responded_at` |

---

#### `notification_db` — `notification-service`

**Relations:** none. `recipient_id` is auth user or kid UUID (whoever should see the alert).

| Model | Relations | Fields (main) |
| --- | --- | --- |
| **Notification** | logical → recipient | `notification_type` (`task_confirmed`, `task_rejected`, `task_submitted`, `level_up`, `friend_request`); `message`; `is_read`; `created_at` |

Sources: `services/*/…/models.py` in each service.

### Features List

| Feature | Who | What it does |
| --- | --- | --- |
| Auth & accounts | Mariam (`auth-service`) | Kid/parent signup & login (email/password, Google), JWT, profiles, forgot-password, kid invites parent(s) |
| Tasks & reviews | Mariam (`task-service`) | Kids create/complete tasks; category-based parent review; AI scoring/moderation; parent approve/reject |
| Gamification | Mariam (`gamification-service`) | Category XP & levels; coins on level-up; Honesty XP on parent confirm |
| Friends | Mariam (`social-service`) | Kid friend relationships |
| Analytics | Henna (`analytics-service`) | Parent insights / progress over time per linked kid |
| Avatar shop catalog | Henna (`catalog-service`) | Shop items kids buy with coins |
| Notifications | Henna (`notification-service`) | In-app (and related) notifications |
| Infra / Docker stack | Mariam + Henna | Compose, nginx, Make targets, shared service wiring |
| Frontend base & accessibility | Anastasiia | Shared frontend foundations so the parent/avatar work could start on a solid base |
| Kid dashboard | Anastasiia | Kid UI: tasks, progress, day-to-day kid flow |
| Parent dashboard | Madiha | Parent UI: reviews and analytics per kid |
| Avatar (kid dashboard) | Madiha | Avatar customization feature within the kid dashboard (spend coins on shop items) |


### Modules

**Point calculation:** Major = 2 pts, Minor = 1 pt → **8 Major (16) + 8 Minor (8) = 24 points**.

| # | Module | Type | Pts | Who |
| --- | --- | --- | --- | --- |
| 1 | Web — Frameworks (frontend + backend) | Major | 2 | Frontend: Anastasiia / Madiha · Backend: Mariam / Henna |
| 2 | Web — Real-time (WebSockets / similar) | Major | 2 | Henna (notifications WS) · Mariam (social presence) · frontend (Anastasiia / Madiha) |
| 3 | Web — Custom design system | Minor | 1 | Anastasiia (base) · Madiha (extended in parent/avatar UI) |
| 4 | Web — ORM | Minor | 1 | Mariam / Henna (Django ORM per service) |
| 5 | User Management — Standard auth | Major | 2 | Mariam (`auth-service`) · frontend auth flows |
| 6 | User Management — OAuth 2.0 | Minor | 1 | Mariam · frontend Google Sign-In |
| 7 | User Management — Advanced permissions | Major | 2 | Mariam (roles, guardians, category review rules) |
| 8 | Devops — Backend as microservices | Major | 2 | Mariam / Henna (services + Docker / nginx) |
| 9 | A11y — WCAG 2.1 AA | Major | 2 | Anastasiia (accessibility foundation) |
| 10 | A11y / i18n — Multiple languages (≥3) | Minor | 1 | Anastasiia (`en` / `ru` / `ar`) |
| 11 | A11y / i18n — RTL support | Minor | 1 | Anastasiia (Arabic RTL) |
| 12 | User Management — Activity analytics / insights | Minor | 1 | Henna (`analytics-service`) · Madiha (parent UI) |
| 13 | AI — Complete LLM system interface | Major | 2 | Mariam (`task-service` + OpenRouter) |
| 14 | AI — Content moderation | Minor | 1 | Mariam (task moderation before categorize) |
| 15 | Data — Advanced analytics dashboard | Major | 2 | Henna (API) · Madiha (charts / parent dashboard) |
| 16 | A11y / i18n — Support for additional browsers | Minor | 1 | Anastasiia / Madiha (frontend QA) · full team smoke-tests |

#### 1. Web — Frameworks (Major, 2)

- **Why:** Fast, structured UI and APIs for a multi-role family app.
- **How:** React + Vite frontend; Django + DRF microservices.
- **Who:** Anastasiia / Madiha (frontend); Mariam / Henna (backend).

#### 2. Web — Real-time (Major, 2)

- **Why:** Live notifications and presence without constant polling.
- **How:** Django Channels + Redis; notification WebSockets; social presence WS; frontend hooks reconnect over `wss://`.
- **Who:** Henna (notification-service); Mariam (social-service); Anastasiia / Madiha (client wiring).

#### 3. Web — Custom design system (Minor, 1)

- **Why:** Consistent kid/parent UI (palette, type, icons, reusable pieces).
- **How:** Shared React components + Tailwind design tokens across dashboards (10+ reusable components).
- **Who:** Anastasiia (base system); Madiha (parent dashboard + avatar UI on that base).

#### 4. Web — ORM (Minor, 1)

- **Why:** Safe schema/migrations and clear models per service DB.
- **How:** Django ORM + migrations in each microservice.
- **Who:** Mariam / Henna.

#### 5. User Management — Standard auth (Major, 2)

- **Why:** Separate kid and parent accounts with secure sessions.
- **How:** Email/password signup & login, JWT (Simple JWT), profiles, forgot-password, kid–parent invites.
- **Who:** Mariam; frontend auth screens (Anastasiia / Madiha).

#### 6. User Management — OAuth 2.0 (Minor, 1)

- **Why:** Faster signup/login for families who already use Google.
- **How:** Google OAuth 2.0 (GIS + backend token exchange / signup paths).
- **Who:** Mariam; Google Sign-In UI on frontend.

#### 7. User Management — Advanced permissions (Major, 2)

- **Why:** Kids and parents must see and do different things; parents only review chosen categories.
- **How:** Role-based access (kid/parent), guardian links, JWT claims (`kid_ids` / kids), category review gates, service permissions on APIs.
- **Who:** Mariam (auth + task rules); enforced in frontend routes by role.

#### 8. Devops — Microservices (Major, 2)

- **Why:** Split ownership (auth, tasks, XP, shop, analytics, …) and scale/deploy pieces independently.
- **How:** Separate Django services, DBs, Docker Compose, nginx gateway, Make targets (`make all` / `make dev`).
- **Who:** Mariam / Henna.

#### 9. Accessibility — WCAG 2.1 AA (Major, 2)

- **Why:** Usable with keyboard, screen readers, and assistive tech — especially important for kids/families.
- **How:** Accessibility-oriented frontend base (semantics, focus, navigation patterns) carried through the UI.
- **Who:** Anastasiia / Madiha.

#### 10. Multiple languages (Minor, 1)

- **Why:** Reach families in more than one language.
- **How:** `i18next` / `react-i18next` with at least **English, Russian, Arabic** locale files.
- **Who:** Anastasiia / Madiha.

#### 11. RTL support (Minor, 1)

- **Why:** Arabic layout must mirror correctly.
- **How:** `document.documentElement.dir` from active language; RTL-aware components (`dir`, layout).
- **Who:** Anastasiia / Madiha.

#### 12. User activity analytics / insights (Minor, 1)

- **Why:** Parents need a clear view of linked kids’ activity and progress.
- **How:** `analytics-service` APIs + parent dashboard insights.
- **Who:** Henna; Madiha (UI).

#### 13. AI — LLM system interface (Major, 2)

- **Why:** Tasks are categorized by AI (only categorization path).
- **How:** OpenRouter LLM from `task-service`; streaming (SSE) of classification back to the client.
- **Who:** Mariam.

#### 14. AI — Content moderation (Minor, 1)

- **Why:** Kids’ task text must be checked before categorization.
- **How:** LLM moderation step on create/edit; block/allow; audit log; then categorize if allowed.
- **Who:** Mariam.

#### 15. Data — Advanced analytics dashboard (Major, 2)

- **Why:** Visual progress over time for parents.
- **How:** Analytics APIs + parent dashboard visualizations (e.g. Recharts).
- **Who:** Henna; Madiha.

#### 16. Accessibility / Internationalization — Support for additional browsers (Minor, 1)

- **Why:** Families do not all use Chrome; the app must behave the same on other common browsers.
- **How:** Primary development in **Chrome**; full manual regression on at least two additional browsers — **Brave** and **Safari** (auth, dashboards, tasks, WebSockets, avatar shop, i18n/RTL). Shared React/Tailwind stack; fixes applied when a browser differed. Local stack uses a **self-signed** TLS cert: first visit requires trusting the certificate (Safari is stricter; Brave/Chrome show the usual warning). After that, UI/UX and features match across the supported set.
- **Who:** Anastasiia / Madiha (frontend QA + fixes); Henna (cross-browser smoke as main tester).
- **Supported browsers:** Chrome (baseline), Brave, Safari.
- **Limitations:** Self-signed HTTPS must be accepted/trusted per browser/OS; Google Sign-In popup/COOP behavior can vary slightly by browser privacy settings (Brave shields / Safari tracking prevention) — disable aggressive blocking for `localhost` if the popup fails.

### Individual Contributions

#### meid — Mariam Eid (PO + Developer)

- **Product:** Scope, feature priority (now vs later), submission/docs coordination with peers and staff.
- **Backend:** `auth-service`, `task-service`, `gamification-service`, `social-service`, plus shared infra with Henna.
- **Modules:** Standard auth, OAuth, advanced permissions, LLM categorization + AI moderation, social presence WebSockets, microservices/ORM share, backend half of the stack.

#### anikitin — Anastasiia Nikitina (PM + Developer)

- **Process:** Planning with the PO, meeting schedule, GitHub pipeline and commit conventions.
- **Frontend:** App base, accessibility (WCAG-oriented foundation), i18n (EN / RU / AR) and RTL, kid dashboard; set patterns so Madiha could extend the UI.
- **Modules:** Frontend frameworks share, design system base, accessibility + languages + RTL, real-time client wiring share, **multi-browser QA (Chrome / Brave / Safari)**.

#### mnazar — Madiha Nazar (Tech Lead + Developer)

- **Architecture:** Critical stack decisions; reviews PRs into `main`.
- **Frontend:** Parent dashboard (reviews + analytics UI) and avatar feature in the kid dashboard — similar frontend volume to Anastasiia’s side.
- **Modules:** Advanced analytics UI, activity insights UI, design system extension, frameworks/real-time client share, **multi-browser QA (Chrome / Brave / Safari)**.

#### hparveen — Henna Parveen (Developer + main tester)

- **Backend:** `analytics-service`, `catalog-service`, `notification-service`, infra support with Mariam.
- **Quality:** Main tester — found bugs early so the team could fix them; smoke-tested flows across browsers.
- **Modules:** Microservices/ORM share, notification WebSockets, analytics APIs, catalog for avatar shop, **additional-browser smoke tests**.

#### Challenges (and how they helped)

Madiha and Henna could not join from the very start. At first that looked like a delay; in practice it became a strength. Mariam and Anastasiia built the backend and frontend bases with only two people, which kept early decisions clear. When Madiha and Henna joined, the expected structure and conventions were already visible in the codebase, so they could plug into services and UI with less ambiguity.
