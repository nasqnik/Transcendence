# KiddoPath

## First time setup

```bash
cp .env.example .env
```

Edit `.env`: set `DOCKER_UID` and `DOCKER_GID` (`id -u` and `id -g`).

```bash
make all
```

That starts Docker and runs database migrations.

Open **https://localhost** (accept the self-signed certificate warning).

### App & admin (via nginx)

| What | URL |
|------|-----|
| Frontend | [https://localhost/](https://localhost/) |
| Django admin | [https://localhost/admin/](https://localhost/admin/) |

### API docs — Swagger

| Service | URL |
|---------|-----|
| Auth | [https://localhost/api/docs/](https://localhost/api/docs/) |
| Task | [https://localhost/api/task/docs/](https://localhost/api/task/docs/) |
| Gamification | [https://localhost/api/gamification/docs/](https://localhost/api/gamification/docs/) |
| Analytics | [https://localhost/api/analytics/docs/](https://localhost/api/analytics/docs/) |
| Notification | [https://localhost/api/notification/docs/](https://localhost/api/notification/docs/) |
| Catalog | [https://localhost/api/catalog/docs/](https://localhost/api/catalog/docs/) |
| Social | [https://localhost/api/social/docs/](https://localhost/api/social/docs/) |

All traffic goes through nginx on ports **80** and **443** only.

## Useful commands

| Command | What it does |
|---------|----------------|
| `make all` | Start everything + migrate database |
| `make migrate` | Run database migrations only |
| `make down` | Stop all services |
| `make seed-dev` | Seed one default parent + kid |
| `make seed-dev-friend` | Seed two fixed parent+kid pairs for friend testing |
| `make seed-custom-friend` | Seed two custom parent+kid pairs (see below) |
| `make seed-dual-parent` | Seed one kid with two accepted parents |

### Custom friend seed

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

### Dual-parent seed

One kid linked to **two** accepted parents (for testing parent delete when another guardian exists):

```bash
make seed-dual-parent
```

Accounts (password `DevPass123!`):
- Kid: `dev_kid_shared`
- Primary parent: `dev_parent_a` / `dev-parent-a@localhost`
- Secondary parent: `dev_parent_b` / `dev-parent-b@localhost`

More details: [Developer.md](Developer.md)
