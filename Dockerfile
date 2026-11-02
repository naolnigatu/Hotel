# Multi-stage Dockerfile for Woliso Hotel Management System (HMS)

# Stage 1: Build stage
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Set build-time dummy database url for Prisma schema compilation
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54332/postgres"

# Copy package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy application source code
COPY . .

# Generate Prisma Client & compile production bundle
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx web directory
RUN rm -rf ./*

# Copy built web artifacts and custom nginx configuration
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Default HTTP port inside container
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
