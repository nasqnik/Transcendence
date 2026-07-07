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

All traffic goes through nginx on ports **80** and **443** only.

## Useful commands

| Command | What it does |
|---------|----------------|
| `make all` | Start everything + migrate database |
| `make migrate` | Run database migrations only |
| `make down` | Stop all services |

More details: [Developer.md](Developer.md)
