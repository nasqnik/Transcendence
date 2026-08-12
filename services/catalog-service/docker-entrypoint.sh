#!/bin/sh
# Named volume catalog_media is created root-owned; the app process runs as
# user "app". Fix ownership on every start, then drop privileges.
set -e

mkdir -p /app/media/parent_avatars

if [ "$(id -u)" = "0" ]; then
  chown -R app:app /app/media
  exec runuser -u app -- "$@"
fi

exec "$@"
