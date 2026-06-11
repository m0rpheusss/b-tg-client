# --- Build Stage ---
FROM node:24-alpine AS builder
WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of your code and build
COPY . .
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

EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]