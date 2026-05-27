FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run check

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV SYMPHONY_WEB_LEASE_ACK=recorded
ENV SYMPHONY_WEB_SERVER_BIND_ACK=ubuntu-26.04lts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
EXPOSE 8080
CMD ["npm", "run", "serve"]
