# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
ARG API_URL=http://backend:8000
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
COPY . .
# Instala a partir do package.json porque o pacote recebido ainda não traz pnpm-lock.yaml.
# Quando o lockfile for versionado, a instalação passa a usar --frozen-lockfile.
RUN pnpm install --no-frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
