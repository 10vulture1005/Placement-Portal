# One-shot migration runner. Compose starts this after the database is healthy
# and before the backend, so every stack boots against an up-to-date schema.
# Build context is the repository root because this is an npm workspace.

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY database/package.json ./database/
RUN npm ci --workspace @tnp/database --include-workspace-root
COPY database ./database
RUN npm run db:generate
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed"]
