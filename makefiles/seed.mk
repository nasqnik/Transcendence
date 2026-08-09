# Dev-only user seed helpers (not required for evaluation — use the frontend to sign up).
# Included from the root Makefile; still run as: make seed-dev
# Requires `make dev` first (DJANGO_DEBUG=true). Seeds refuse when DEBUG is false.

.PHONY: seed-dev seed-dev-friend seed-custom-friend seed-dual-parent \
        seed-parent-two-kids seed-parent-many-kids

seed-dev:
	@echo "==> seed dev parent + kid (auth-service)"
	@docker compose exec $(AUTH_SERVICE) python manage.py seed_dev_users

seed-dev-friend:
	@echo "==> migrate auth-service (bio columns required)"
	@docker compose exec $(AUTH_SERVICE) python manage.py migrate users
	@echo "==> seed two parent+kid pairs for friend testing (auth-service, not linked)"
	@docker compose exec $(AUTH_SERVICE) python manage.py seed_dev_friend_users

# Custom two kid pairs for friend testing.
# Preferred: pass usernames as args.
#   make seed-custom-friend KID1=alice KID2=bob
# Optional display names:
#   make seed-custom-friend KID1=alice KID2=bob NAME1="Alice" NAME2="Bob"
# If KID1/KID2 are omitted, the command prompts interactively (-it).
seed-custom-friend:
	@echo "==> migrate auth-service (bio columns required)"
	@docker compose exec $(AUTH_SERVICE) python manage.py migrate users
	@echo "==> seed custom parent+kid pairs for friend testing"
	@docker compose exec -it $(AUTH_SERVICE) python manage.py seed_custom_friend_users \
		$(if $(KID1),--kid1 $(KID1),) \
		$(if $(KID2),--kid2 $(KID2),) \
		$(if $(NAME1),--name1 "$(NAME1)",) \
		$(if $(NAME2),--name2 "$(NAME2)",)

seed-dual-parent:
	@echo "==> migrate auth-service (bio columns required)"
	@docker compose exec $(AUTH_SERVICE) python manage.py migrate users
	@echo "==> seed one kid with two parents (auth-service)"
	@docker compose exec $(AUTH_SERVICE) python manage.py seed_dual_parent_users

# One parent with two kids (parent is primary guardian of both).
# Defaults: dev_parent_multi + dev_kid_one / dev_kid_two.
# Override any of them:
#   make seed-parent-two-kids PARENT=sara KID1=alice KID2=bob NAME1="Alice" NAME2="Bob"
seed-parent-two-kids:
	@echo "==> migrate auth-service (bio columns required)"
	@docker compose exec $(AUTH_SERVICE) python manage.py migrate users
	@echo "==> seed one parent with two kids (auth-service)"
	@docker compose exec $(AUTH_SERVICE) python manage.py seed_parent_two_kids_users \
		$(if $(PARENT),--parent $(PARENT),) \
		$(if $(KID1),--kid1 $(KID1),) \
		$(if $(KID2),--kid2 $(KID2),) \
		$(if $(NAME1),--name1 "$(NAME1)",) \
		$(if $(NAME2),--name2 "$(NAME2)",)

# One parent with many kids (15 by default), all primary-guardian linked.
# Override count, parent username, kid prefix, or print every kid's token:
#   make seed-parent-many-kids COUNT=20 PARENT=sara PREFIX=child TOKENS=1
seed-parent-many-kids:
	@echo "==> migrate auth-service (bio columns required)"
	@docker compose exec $(AUTH_SERVICE) python manage.py migrate users
	@echo "==> seed one parent with $(or $(COUNT),15) kids (auth-service)"
	@docker compose exec $(AUTH_SERVICE) python manage.py seed_parent_many_kids_users \
		$(if $(COUNT),--count $(COUNT),) \
		$(if $(PARENT),--parent $(PARENT),) \
		$(if $(PREFIX),--prefix $(PREFIX),) \
		$(if $(TOKENS),--tokens,)
