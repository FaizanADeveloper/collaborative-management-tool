# ==========================================
# Flowdesk Backend Production Dockerfile
# ==========================================

FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init or use node built-in signal handling
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code
COPY src ./src

# Create non-root user security context
USER node

# Default environment configuration
ENV NODE_ENV=production \
    PORT=5000

EXPOSE 5000

# Native container health check against Flowdesk health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
