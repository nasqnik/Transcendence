# Developer setup

Local development uses **Docker Compose**.

## Quick start

```bash
cp .env.example .env
# Edit .env: set DOCKER_UID / DOCKER_GID from `id -u` and `id -g`

make all   # app + APIs only (no admin / Swagger)
make dev   # same stack + /admin/ and /api/*/docs/
```

`make all` / `make dev` create SSL certs if missing, build images (only when Dockerfiles or build context changed), start **db**, microservices, **frontend**, and **nginx**, ensure per-service DBs exist, and run **database migrations**. Admin and Swagger are registered only when `DJANGO_DEBUG=true` (`make dev`).

First-time only (optional):

```bash
docker compose exec auth-service python manage.py createsuperuser
```

To run migrations again later: `make migrate`

### App & admin (via nginx)

| What | URL |
|------|-----|
| Frontend | https://localhost/ |
| Django admin | https://localhost/admin/ (`make dev` only) |
| API | https://localhost/api/… |

### API docs — Swagger (`make dev` only)

| Service | URL |
|---------|-----|
| Auth | https://localhost/api/docs/ |
| Task | https://localhost/api/task/docs/ |
| Gamification | https://localhost/api/gamification/docs/ |
| Analytics | https://localhost/api/analytics/docs/ |
| Notification | https://localhost/api/notification/docs/ |
| Catalog | https://localhost/api/catalog/docs/ |
| Social | https://localhost/api/social/docs/ |

All public traffic goes through **nginx** on ports **80** and **443** only (services are not published on the host).

Accept the self-signed certificate warning in the browser (dev only).

## System packages (Ubuntu)

```bash
sudo apt update
sudo apt install docker.io docker-compose-v2 docker-buildx util-linux-extra
```

| Package | Purpose |
|---------|---------|
| `docker.io` | Docker engine and CLI |
| `docker-compose-v2` | `docker compose` subcommand (Compose v2) |
| `docker-buildx` | Build plugin for Compose Bake (`make all` / `--build`) |
| `util-linux-extra` | `newgrp` (apply `docker` group without logging out) |

Verify:

```bash
docker --version
docker compose version
docker buildx version
```

**Bake / buildx warning:** If you see `Docker Compose is configured to build using Bake, but buildx isn't installed`, run `sudo apt install docker-buildx`.

Do **not** install Docker via `sudo snap install docker` if you use the apt packages above (avoid mixing installs).

## Docker daemon and permissions

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Apply the `docker` group (pick one):

```bash
newgrp docker
```

Or log out and back in (or reboot).

Verify (no `sudo`):

```bash
docker compose ps
```

## Environment file

Compose reads `.env` from the project root (see `.env.example`).

```bash
cp .env.example .env
id -u    # → DOCKER_UID
id -g    # → DOCKER_GID (may differ from UID, e.g. 116)
```

`DOCKER_UID` / `DOCKER_GID` match the container user to your host user so files in `./services/auth-service` keep correct permissions.

After changing them, rebuild the auth-service image:

```bash
make build
```

## SSL certificates (dev)

Self-signed certs for nginx HTTPS:

```bash
make ssl
```

Writes `security/ssl/server.key` and `security/ssl/server.crt`. `make all` runs this automatically if certs are missing.

## Services (docker-compose)

| Service | Container | Role |
|---------|-------------|------|
| `db` | `django_db` | PostgreSQL 16 |
| `redis` | `redis_broker` | Redis (Channels / WebSockets) |
| `auth-service` | `auth_service` | Auth API (JWT, users, guardians) |
| `task-service` | `task_service` | Tasks, completions, AI |
| `gamification-service` | `gamification_service` | XP, levels, coins |
| `analytics-service` | `analytics_service` | Parent analytics |
| `catalog-service` | `catalog_service` | Avatar shop / avatars |
| `notification-service` | `notification_service` | Notifications + `/ws/notifications/` |
| `social-service` | `social_service` | Friends + `/ws/presence/` |
| `frontend` | `react_frontend` | Vite/React SPA |
| `nginx` | `nginx_proxy` | HTTPS reverse proxy on 80/443 |

Compose creates a default network; services reach each other by name (`auth-service`, `frontend`, `db`, …). Each Django service listens on **:8000** inside Docker only.

**Nginx routing** (`security/nginx/nginx.conf`):

- `/` → frontend
- `/admin/`, `/static/` → auth-service (`make dev` for admin)
- `/api/task/` → task-service
- `/api/gamification/` → gamification-service
- `/api/analytics/` → analytics-service
- `/api/notification/` → notification-service
- `/api/catalog/`, `/media/` → catalog-service
- `/api/social/` → social-service
- `/api/` (catch-all) → auth-service
- `/ws/notifications/` → notification-service
- `/ws/presence/` → social-service

After editing nginx config:

```bash
docker compose restart nginx
```

## Makefile commands

### Scaffold a new service

```bash
./scripts/new-service.sh <slug> <port> [db_name] [nginx_prefixes]
```

Example: `./scripts/new-service.sh gamification 8003`

Copies `services/_template/` → `services/<slug>-service/` and prints wiring steps. Template includes JWT validation (`common/`) and `GET /api/health/` only.

### Full stack

| Command | Description |
|---------|-------------|
| `make all` | SSL if needed, build (cached), start all services, init DBs, migrate (no admin/docs) |
| `make dev` | Same as `make all`, but enables Django admin + Swagger |
| `make init-dbs` | Create per-service DBs if missing (`auth_db`, `task_db`, …) |
| `make init-auth-db` | Create `auth_db` only (legacy alias — use `init-dbs`) |
| `make build-all` | Build all images without starting |
| `make down` | Stop all services |
| `make ps` | List containers |
| `make clean` | Stop and remove orphans |
| `make fclean` | Stop, remove orphans and volumes |
| `make ssl` | Generate self-signed TLS certs |

Rebuilds use Docker layer cache: running `make all` again is fast if nothing in Dockerfiles or `COPY` context changed.

`make all` / `make dev` already run `make seed-catalog` (shop items). Optional **user** seeds for local testing live in `makefiles/seed.mk` (still invoked as `make seed-…`). Run **`make dev` first** — seeds refuse when `DJANGO_DEBUG=false` (`make all`).

| Command | Description |
|---------|-------------|
| `make seed-dev` | One parent + kid |
| `make seed-dev-friend` | Two fixed parent+kid pairs (friend testing) |
| `make seed-custom-friend` | Two custom parent+kid pairs (see below) |
| `make seed-dual-parent` | One kid with two accepted parents (see below) |
| `make seed-parent-two-kids` | One parent with two kids |
| `make seed-parent-many-kids` | One parent with many kids |

Evaluation should use the frontend to sign up; these are developer shortcuts only.

#### Custom friend seed

Create two parent+kid pairs with your own kid usernames (kids are **not** friends). Password for all: `DevPass123!`

```bash
# Preferred: pass usernames
make seed-custom-friend KID1=alice KID2=bob

# Optional display names
make seed-custom-friend KID1=alice KID2=bob NAME1="Alice" NAME2="Bob"

# Or run without args — it will prompt for usernames
make seed-custom-friend
```

The command prints JWTs you can paste into Social Swagger to test search / friend requests.

#### Dual-parent seed

One kid linked to **two** accepted parents (for testing parent delete when another guardian exists):

```bash
make seed-dual-parent
```

Accounts (password `DevPass123!`):

- Kid: `dev_kid_shared`
- Primary parent: `dev_parent_a` / `dev-parent-a@localhost`
- Secondary parent: `dev_parent_b` / `dev-parent-b@localhost`

### auth-service

| Command | Description |
|---------|-------------|
| `make migrate` | Apply database migrations |
| `make up` | Start auth-service (+ db) |
| `make build` | Build auth-service image |
| `make restart` | Restart auth-service |
| `make logs` | Follow auth-service logs |
| `make shell` | Shell into auth-service container |

### Frontend

| Command | Description |
|---------|-------------|
| `make up-front` | Start frontend |
| `make build-front` | Build frontend image |
| `make restart-front` | Restart frontend |
| `make logs-front` | Follow frontend logs |
| `make shell-front` | Shell into frontend container |

### Migrations (after models change)

```bash
docker compose exec auth-service python manage.py makemigrations
make migrate
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `permission denied` on docker.sock | `usermod -aG docker $USER`, then `newgrp docker` or re-login |
| `docker-compose` not found | Use `docker compose` (v2), not hyphen |
| Vite: host `frontend` not allowed | nginx must send `Host $host` (already in config) |
| nginx mount error on `nginx.config` | Config lives at `security/nginx/nginx.conf` |
| auth-service 404 via HTTPS | Use `/admin/` or `/api/…`, not only `/` for Django |
| Compose Bake / buildx warning | `sudo apt install docker-buildx` |
| `auth_db` does not exist | Run `make init-dbs` then `make migrate` |
| `task_db` does not exist | Run `make init-dbs` then `make migrate` |
