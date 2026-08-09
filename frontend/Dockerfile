# Pinned to a patch version, like the Python and nginx images. `node:20-alpine`
# floats: a fresh build months from now would pull a different Node 20.x, which
# is the same way Django 6.1 broke the backend.
FROM node:20.20.2-alpine

WORKDIR /app

# `npm ci`, not `npm install`: install resolves package.json ranges afresh and
# can pull newer minors on a clean build, while ci installs exactly what
# package-lock.json records and fails loudly if the two disagree.
# The glob above already copies package-lock.json, which ci requires.
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
