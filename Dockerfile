# Pinned — production image. Data (SQLite + flyer images) lives in the /data volume.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Compilers in case better-sqlite3 has no prebuilt binary for this CPU (e.g. some ARM servers).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG SITE_URL=https://rishikesh.suhmantics.com
ENV SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/tmp/build-data
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/assets ./assets
COPY --from=build /app/seed ./seed
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
