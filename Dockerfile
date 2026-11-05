# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (cached unless package files change)
COPY package*.json ./
RUN npm ci

# Build the production bundle
COPY . .
# Optional: bake a direct backend URL into the build (Railway passes service variables as build args).
# Leave empty to use the same-origin /api proxy below (BACKEND_URL).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: Serve with nginx ----
FROM nginx:1.27-alpine

# Default backend target; override with -e BACKEND_URL=... at runtime.
ENV BACKEND_URL=http://backend:3001
ENV PORT=80

# Place as a template so nginx's envsubst substitutes ${BACKEND_URL} on startup.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# The base image's entrypoint runs envsubst on templates, then starts nginx.
