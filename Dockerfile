# CEO City frontend — production image for Cloud Run.
#
# Two stages: Node builds the static site, nginx serves it. The final image is
# nginx and the built files only — no Node, no source, no node_modules.
#
# Configuration comes from the Cloud Run service's environment variables, read
# when the container STARTS — not baked in at build time. At startup,
# nginx/40-city-config.sh writes them into /config.js, which index.html loads
# ahead of the app (src/framework/config/appConfig.ts reads it first). So the
# build needs no settings at all, and changing one is a new revision on the
# Cloud Run service, not a rebuild.
#
# Set on the Cloud Run service (Variables & Secrets):
#   VITE_FIREBASE_API_KEY      required for sign-in (NEXT_PUBLIC_FIREBASE_API_KEY
#                              or FIREBASE_API_KEY also work)
#   VITE_API_BASE_URL          the academy backend (defaults to the GCP one)
#   VITE_FIREBASE_PROJECT_ID   optional, defaults to warroom-498513
#   VITE_REGISTER_URL          optional, defaults to the WarRoom register page
#
# Build args with the same names still work, as a fallback baked into the
# bundle; a value set on the service always wins.
#
# The local .env is NOT used: .dockerignore keeps it out of the build context.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, on their own layer, so a code-only change rebuilds in
# seconds instead of reinstalling every package.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Optional build-time fallbacks. Everything here ships to the browser — none of
# it is a secret (see .env.example).
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_PROJECT_ID="warroom-498513"
ARG VITE_API_BASE_URL="https://warroom-academy-backend-262374983592.us-central1.run.app"
ARG VITE_REGISTER_URL="https://warroom.humanfirstbykk.com/register"

# Typecheck + bundle (package.json "build": tsc --noEmit && vite build).
RUN VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
    VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
    VITE_API_BASE_URL="$VITE_API_BASE_URL" \
    VITE_REGISTER_URL="$VITE_REGISTER_URL" \
    npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
# The unprivileged nginx image runs as a non-root user (uid 101) and listens on
# 8080, which is Cloud Run's default port.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Cloud Run sets PORT; the template reads it, and 8080 covers running locally.
ENV PORT=8080

# nginx renders /etc/nginx/templates/*.template into conf.d at startup,
# substituting ${PORT}.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# The startup script that writes /config.js from the service's environment.
# Root for this one step only: the script must be executable (with any Windows
# line endings stripped), and config.js must be writable by the user nginx runs
# as, since it is rewritten on every start.
USER root
COPY nginx/40-city-config.sh /docker-entrypoint.d/40-city-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-city-config.sh \
 && chmod 755 /docker-entrypoint.d/40-city-config.sh \
 && chown 101:101 /usr/share/nginx/html/config.js
USER 101

EXPOSE 8080
