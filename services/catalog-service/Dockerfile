FROM python:3.12.13-slim

ARG DOCKER_UID
ARG DOCKER_GID

RUN groupadd --gid "${DOCKER_GID}" app \
    && useradd --uid "${DOCKER_UID}" --gid app --create-home --shell /bin/bash --home-dir /home/app app

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY . /app
RUN if [ -f /app/requirements.txt ]; then pip install --no-cache-dir -r /app/requirements.txt; fi \
    && mkdir -p /app/media/parent_avatars \
    && chown -R app:app /app \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

# Start as root so the entrypoint can chown the named media volume, then
# runuser drops to "app" before Django starts.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
