ARG NODE_IMAGE=node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2
ARG SOURCE_DATE_EPOCH=0

FROM ${NODE_IMAGE} AS dependencies
ARG SOURCE_DATE_EPOCH
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}
COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS production-dependencies
ARG SOURCE_DATE_EPOCH
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM ${NODE_IMAGE} AS builder
ARG SOURCE_DATE_EPOCH
WORKDIR /app
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
ARG OCI_CREATED=unknown
ARG OCI_REVISION=unknown
ARG OCI_VERSION=dev
ARG SOURCE_DATE_EPOCH=0
LABEL org.opencontainers.image.title="Spandan Clinic API" \
      org.opencontainers.image.description="Express API for the Spandan Clinic platform" \
      org.opencontainers.image.source="https://github.com/SauravM0/website-spandan" \
      org.opencontainers.image.created="${OCI_CREATED}" \
      org.opencontainers.image.revision="${OCI_REVISION}" \
      org.opencontainers.image.version="${OCI_VERSION}" \
      org.opencontainers.image.licenses="UNLICENSED"
WORKDIR /app
ENV NODE_ENV=production \
    APP_VERSION=${OCI_REVISION} \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PORT=4000
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 express
COPY --from=builder --chown=express:nodejs /app/dist ./dist
COPY --from=production-dependencies --chown=express:nodejs /app/node_modules ./node_modules
COPY --chown=express:nodejs package.json ./package.json
COPY --chown=express:nodejs migrations ./migrations
USER express
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/index.js"]
