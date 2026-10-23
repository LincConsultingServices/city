# CEO City frontend — production image for Cloud Run.
#
# Two stages: Node builds the static site, nginx serves it. The final image is
# nginx and the built files only — no Node, no source, no node_modules.
#
# Configuration is baked in AT BUILD TIME. Vite inlines every VITE_* value into
# the JavaScript bundle (src/framework/config/appConfig.ts), so changing the
# backend URL or the Firebase key means rebuilding the image, not editing the
# Cloud Run service's env vars. Pass them as build args:
#
#   docker build \
#     --build-arg VITE_FIREBASE_API_KEY=<firebase web api key> \
#     -t city .
#
# The local .env is NOT used: .dockerignore keeps it out of the build context,
# so what ships is exactly what the build args say.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, on their own layer, so a code-only change rebuilds in
# seconds instead of reinstalling every package.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Everything here ships to the browser — none of it is a secret. The Firebase
# web key is a public client identifier (see .env.example); it has no default
# so it never lives in the repo.
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_PROJECT_ID="warroom-498513"
ARG VITE_API_BASE_URL="https://warroom-academy-backend-262374983592.us-central1.run.app"
ARG VITE_REGISTER_URL="https://warroom.humanfirstbykk.com/register"

# Without the key the site builds but nobody can sign in, and the symptom — a
# login button that does nothing — looks like a broken backend. Fail here
# instead, where the cause is obvious.
RUN test -n "$VITE_FIREBASE_API_KEY" || \
    (echo "ERROR: build arg VITE_FIREBASE_API_KEY is required (sign-in is disabled without it)." >&2 && exit 1)

# Typecheck + bundle (package.json "build": tsc --noEmit && vite build).
RUN VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
    VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
    VITE_API_BASE_URL="$VITE_API_BASE_URL" \
    VITE_REGISTER_URL="$VITE_REGISTER_URL" \
    npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
# The unprivileged nginx image runs as a non-root user and listens on 8080,
# which is Cloud Run's default port.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Cloud Run sets PORT; the template reads it, and 8080 covers running locally.
ENV PORT=8080

# nginx renders /etc/nginx/templates/*.template into conf.d at startup,
# substituting ${PORT}.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
