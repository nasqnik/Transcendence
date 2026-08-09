# KiddoPath — Makefile

SSL_CERT := security/ssl/server.crt
SSL_KEY := security/ssl/server.key

# Backend microservices.
AUTH_SERVICE := auth-service
TASK_SERVICE := task-service
GAMIFICATION_SERVICE := gamification-service
ANALYTICS_SERVICE := analytics-service
NOTIFICATION_SERVICE := notification-service
CATALOG_SERVICE := catalog-service
SOCIAL_SERVICE := social-service

SERVICES := $(AUTH_SERVICE) $(TASK_SERVICE) $(GAMIFICATION_SERVICE) $(ANALYTICS_SERVICE) $(NOTIFICATION_SERVICE) $(CATALOG_SERVICE) $(SOCIAL_SERVICE)

.PHONY: all dev up down build build-all restart logs ps shell clean fclean re ssl ssl-if-missing migrate init-dbs \
        up-front build-front restart-front logs-front shell-front \
        logs-auth shell-auth logs-task shell-task restart-task seed-catalog

include makefiles/seed.mk

# App only: frontend + APIs. No /admin/ and no Swagger (/api/*/docs/).
all: export DJANGO_DEBUG := false
all: ssl-if-missing
	docker compose up -d --build
	$(MAKE) init-dbs
	$(MAKE) migrate
	$(MAKE) seed-catalog
	@echo "==> Stack ready (production-like). Open https://localhost — admin/docs are off."

# Same stack, with Django admin + Swagger for local development.
dev: export DJANGO_DEBUG := true
dev: ssl-if-missing
	docker compose up -d --build
	$(MAKE) init-dbs
	$(MAKE) migrate
	$(MAKE) seed-catalog
	@echo "==> Dev tools on: https://localhost/admin/ and https://localhost/api/docs/ (and /api/<service>/docs/)."

init-dbs: init-auth-db init-task-db init-gamification-db init-analytics-db init-notification-db init-catalog-db init-social-db

init-auth-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'auth_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE auth_db;"'

init-task-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'task_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE task_db;"'

init-gamification-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'gamification_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE gamification_db;"'

init-analytics-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'analytics_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE analytics_db;"'

init-notification-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'notification_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE notification_db;"'

init-catalog-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'catalog_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE catalog_db;"'

init-social-db:
	docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname='"'"'social_db'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "CREATE DATABASE social_db;"'

migrate:
	@for svc in $(SERVICES); do \
		echo "==> migrate $$svc"; \
		docker compose exec $$svc python manage.py migrate; \
	done

seed-catalog:
	@echo "==> seed catalog items (catalog-service)"
	@docker compose exec $(CATALOG_SERVICE) python manage.py seed_catalog

ssl-if-missing:
	@test -f $(SSL_CERT) && test -f $(SSL_KEY) || $(MAKE) ssl

build-all:
	docker compose build

up:
	docker compose up -d $(SERVICES)

down:
	docker compose down

clean:
	docker compose down --remove-orphans

fclean:
	@bash scripts/docker-fclean.sh

re:
	$(MAKE) fclean
	$(MAKE) all

build:
	docker compose build $(AUTH_SERVICE)

restart:
	docker compose restart $(AUTH_SERVICE)

logs:
	docker compose logs -f $(AUTH_SERVICE)

logs-auth:
	docker compose logs -f $(AUTH_SERVICE)

logs-task:
	docker compose logs -f $(TASK_SERVICE)

ps:
	docker compose ps

shell:
	docker compose exec $(AUTH_SERVICE) /bin/sh

shell-auth:
	docker compose exec $(AUTH_SERVICE) /bin/sh

shell-task:
	docker compose exec $(TASK_SERVICE) /bin/sh

restart-task:
	docker compose restart $(TASK_SERVICE)

up-front:
	docker compose up -d frontend

build-front:
	docker compose build frontend

restart-front:
	docker compose restart frontend

logs-front:
	docker compose logs -f frontend

shell-front:
	docker compose exec frontend /bin/sh

ssl:
	bash security/ssl/certificate_gen.sh
