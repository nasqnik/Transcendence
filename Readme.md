*This project has been created as part of the 42 curriculum by meid, hparveen, mnazar, anikiti.*

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

- **OS:** Linux (Ubuntu recommended) or any host that runs Docker
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
5. Optionally: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (see `.env.example`)

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

Then open **https://localhost** (accept the self-signed certificate warning in development).

| URL | When | What |
| --- | --- | --- |
| https://localhost/ | `make all` or `make dev` | App (frontend) |
| https://localhost/admin/ | `make dev` only | Django admin |
| https://localhost/api/docs/ | `make dev` only | Auth Swagger (`/api/<service>/docs/` for others) |

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

- All public traffic goes through nginx on ports **80** / **443**.
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
- Internal setup notes: `Developer.md`, `docs/backend/`

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
| **anikiti** | Anastasiia Nikitina | Project Manager / Scrum Master, Developer | Planned with the PO; set project flow and team organization; scheduled meetings and agendas; enforced the GitHub pipeline and commit conventions; built the **frontend base** and **accessibility** foundations so Madiha had a solid starting point; also built the **kid dashboard**. |
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
| **Other** | Docker / Compose for the local stack; OpenRouter for task AI categorization (required — AI is how tasks get categorized); Google Identity (optional) for OAuth; Recharts for analytics charts |

**Why these choices**

- **Microservices + DRF:** Clear ownership per domain (auth, tasks, XP, shop, etc.) and parallel work between Mariam and Henna.
- **PostgreSQL:** Relational integrity for users ↔ kids ↔ guardians, tasks/completions, and progression ledgers; mature with Django.
- **React + Vite:** Fast frontend iteration for two dashboards and avatar UI.
- **nginx + Docker:** One entrypoint (`https://localhost`) matching how the project is evaluated and run locally.

### Database Schema

Conceptual model (see also `schema.sql` for a full reference). Runtime uses **per-service PostgreSQL databases** with the same domain ideas:

```text
users (parents)
  └── guardianship / links ──► kids
                                ├── kid_progress (category XP, honesty, coins, levels)
                                ├── tasks ──► task_category_rewards
                                │              └── task_completions (pending / confirmed / rejected)
                                ├── points_log / honesty_log
                                ├── kid_avatars ──► avatar_items (catalog)
                                └── friends / notifications (social & notification services)
analytics reads progress over time for parent dashboards
```

| Area | Main tables / ideas | Key fields |
| --- | --- | --- |
| Auth / users | `users`, `kids`, guardian links | UUID ids, email/username, role, bio, password hash |
| Tasks | `tasks`, `task_category_rewards`, `task_completions` | categories (`health` / `learning` / `responsibility` / `creativity`), status, reviewer |
| Gamification | `kid_progress`, `points_log`, `honesty_log` | points/level/%, honesty score, coins |
| Catalog / avatar | `avatar_items`, `kid_avatars` | item type, coin cost, unlocked items |
| Social / notify | friends & notification entities (own services) | relationships, delivery state |

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

**Point calculation:** Major = 2 pts, Minor = 1 pt → **8 Major (16) + 7 Minor (7) = 23 points**.

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


### Individual Contributions

#### meid — Mariam Eid (PO + Developer)

- **Product:** Scope, feature priority (now vs later), submission/docs coordination with peers and staff.
- **Backend:** `auth-service`, `task-service`, `gamification-service`, `social-service`, plus shared infra with Henna.
- **Modules:** Standard auth, OAuth, advanced permissions, LLM categorization + AI moderation, social presence WebSockets, microservices/ORM share, backend half of the stack.

#### anikiti — Anastasiia Nikitina (PM + Developer)

- **Process:** Planning with the PO, meeting schedule, GitHub pipeline and commit conventions.
- **Frontend:** App base, accessibility (WCAG-oriented foundation), i18n (EN / RU / AR) and RTL, kid dashboard; set patterns so Madiha could extend the UI.
- **Modules:** Frontend frameworks share, design system base, accessibility + languages + RTL, real-time client wiring share.

#### mnazar — Madiha Nazar (Tech Lead + Developer)

- **Architecture:** Critical stack decisions; reviews PRs into `main`.
- **Frontend:** Parent dashboard (reviews + analytics UI) and avatar feature in the kid dashboard — similar frontend volume to Anastasiia’s side.
- **Modules:** Advanced analytics UI, activity insights UI, design system extension, frameworks/real-time client share.

#### hparveen — Henna Parveen (Developer + main tester)

- **Backend:** `analytics-service`, `catalog-service`, `notification-service`, infra support with Mariam.
- **Quality:** Main tester — found bugs early so the team could fix them.
- **Modules:** Microservices/ORM share, notification WebSockets, analytics APIs, catalog for avatar shop.

#### Challenges (and how they helped)

Madiha and Henna could not join from the very start. At first that looked like a delay; in practice it became a strength. Mariam and Anastasiia built the backend and frontend bases with only two people, which kept early decisions clear. When Madiha and Henna joined, the expected structure and conventions were already visible in the codebase, so they could plug into services and UI with less ambiguity.
