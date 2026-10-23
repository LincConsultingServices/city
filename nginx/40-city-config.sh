#!/bin/sh
# Writes the app's runtime configuration from the container's environment.
#
# Runs once at container start (the nginx image executes every script in
# /docker-entrypoint.d/ before nginx starts). It turns the environment variables
# set on the Cloud Run service into /config.js:
#
#   window.__CITY_CONFIG__ = { firebaseApiKey: "...", apiBaseUrl: "...", ... };
#
# which index.html loads before the app, and which src/framework/config/
# appConfig.ts reads ahead of anything baked in at build time. So the settings
# live on the Cloud Run service, and changing one is a new revision, not a
# rebuild.
#
# Each setting accepts the names it is likely to be found under: this app's own
# VITE_* names, the main WarRoom frontend's NEXT_PUBLIC_* names, and plain ones.
# A setting with no value is left out, so the build-time value or the app's
# default still applies.
set -eu

OUT="${CITY_CONFIG_OUT:-/usr/share/nginx/html/config.js}"

# The first of the named variables that is set and non-empty.
first() {
  for name in "$@"; do
    eval "value=\${$name:-}"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 0
}

# A value made safe to sit inside a JavaScript string.
escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g' | tr -d '\r\n'
}

body=""
set_keys=""
add() {
  if [ -n "$2" ]; then
    body="${body}  $1: \"$(escape "$2")\",
"
    set_keys="${set_keys} $1"
  fi
}

add firebaseApiKey "$(first VITE_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_API_KEY FIREBASE_API_KEY)"
add firebaseProjectId "$(first VITE_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_PROJECT_ID FIREBASE_PROJECT_ID)"
add firebaseAuthDomain "$(first VITE_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN FIREBASE_AUTH_DOMAIN)"
add apiBaseUrl "$(first VITE_API_BASE_URL NEXT_PUBLIC_API_URL API_BASE_URL)"
add registerUrl "$(first VITE_REGISTER_URL NEXT_PUBLIC_REGISTER_URL REGISTER_URL)"

printf 'window.__CITY_CONFIG__ = {\n%s};\n' "$body" > "$OUT"

# Say which settings were found, never their values: the logs are readable by
# anyone with Viewer on the project.
if [ -n "$set_keys" ]; then
  echo "city-config: wrote $OUT with:${set_keys}"
else
  echo "city-config: no settings in the environment; the built-in values apply"
fi
case " $set_keys " in
  *" firebaseApiKey "*) ;;
  *) echo "city-config: WARNING no Firebase key (VITE_FIREBASE_API_KEY) — sign-in is disabled unless one was built in" ;;
esac
