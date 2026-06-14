# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
# Prisma config resolves DATABASE_URL at generate time; no DB connection is made.
ENV DATABASE_URL="postgresql://flowops:flowops@localhost:5432/flowops?schema=public"
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS development
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM base AS production
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://flowops:flowops@localhost:5432/flowops?schema=public"
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 5000
USER node
CMD ["npm", "start"]
