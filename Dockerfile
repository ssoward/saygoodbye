# Multi-stage Dockerfile for Say Goodbye POA App with OCR
FROM node:18-alpine AS base

# Install system dependencies for image processing and OCR
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Frontend build stage
FROM base AS frontend-builder
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --only=production
COPY frontend ./frontend
RUN cd frontend && npm run build

# Backend dependencies stage
FROM base AS backend-deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy backend files
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R nextjs:nodejs logs uploads temp

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "backend/server.js"]
