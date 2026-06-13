# --- Build Stage ---
FROM node:24-alpine AS builder
WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of your code
COPY . .

# 👇 1. DECLARE AND MAP THE BUILD ARG INTO THE BUILDER STAGE
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Production Stage ---
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary production artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
# 👇 2. SEE IMPORTANT NOTE BELOW ABOUT THIS CONFIG
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]