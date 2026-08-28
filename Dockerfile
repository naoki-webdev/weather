FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts index.html ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY static ./static

RUN npm ci
RUN npm run build

FROM node:20-bookworm-slim AS backend-builder

RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim

RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-builder /app/server/node_modules /app/server/node_modules
COPY --from=backend-builder /app/server/package.json /app/server/package.json
COPY --from=backend-builder /app/server/package-lock.json /app/server/package-lock.json
COPY --from=backend-builder /app/server/jest.config.js /app/server/jest.config.js
COPY --from=backend-builder /app/server/dist /app/server/dist
COPY --from=backend-builder /app/server/prisma /app/server/prisma
COPY --from=frontend-builder /app/public /app/public
COPY entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

ENV NODE_ENV=production \
    PORT=3000

ENTRYPOINT ["entrypoint.sh"]

EXPOSE 3000

CMD ["node", "server/dist/main.js"]
