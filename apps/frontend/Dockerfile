# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Serve Stage ----
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: all routes -> index.html
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
