#!/usr/bin/env bash
# Full teardown of this stack: containers, volumes, networks and built images.
#
# Services declare fixed container_name values, so a container started under an
# older compose project (the project name defaults to the directory name) keeps
# squatting that name and collides on the next `up`. Rather than tracking old
# project names by hand, every project that owns one of our containers or
# volumes is discovered from the compose labels Docker already stores.
set -uo pipefail

cd "$(dirname "$0")/.."

containers=$(docker compose config --format json \
	| sed -n 's/.*"container_name": *"\([^"]*\)".*/\1/p')
[ -n "$containers" ] || containers=$(awk '/^[[:space:]]*container_name:/ {print $2}' docker-compose.yml)
volumes=$(docker compose config --volumes)

echo "==> down current project"
docker compose down --remove-orphans --volumes --rmi local

stale=$({
	for c in $containers; do
		docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$c" 2>/dev/null
	done
	for v in $volumes; do
		for id in $(docker volume ls -q --filter "label=com.docker.compose.volume=$v"); do
			docker volume inspect -f '{{index .Labels "com.docker.compose.project"}}' "$id" 2>/dev/null
		done
	done
} | grep -v '^$' | sort -u)

for p in $stale; do
	echo "==> down stale project $p"
	docker compose -p "$p" down --remove-orphans --volumes
done

leftovers=$(docker ps -aq --no-trunc $(printf -- '--filter=name=^/%s$ ' $containers))
if [ -n "$leftovers" ]; then
	echo "==> force removing containers left behind"
	docker rm -f $leftovers
fi

# clean uploaded media files
# rm -rf services/catalog-service/media/parent_avatars/*
# echo "==> media cleaned"

echo "==> fclean done"
