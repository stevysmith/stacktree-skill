#!/usr/bin/env bash
# Publish HTML on stdin to stacktr.ee. Prints the JSON response on stdout.
# See SKILL.md for usage.
set -euo pipefail

API_URL="${STACKTREE_API_URL:-https://api.stacktr.ee}"
API_KEY="${STACKTREE_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "STACKTREE_API_KEY env var is required (generate at https://app.stacktr.ee)" >&2
  exit 1
fi

UPDATE_TARGET=""
PASSWORD=""
EXPIRES_IN_HOURS=""
PUBLIC_SLUG=""
PII_CHECK=""
CLIENT=""
CLIENT_PATH=""
BURN=0
AGENTATION=0
# "The plan's shorter deadline is fine." Only meaningful alongside a request for
# a page that never expires: on a plan that caps page lifetime that request is
# refused (409 expiry_clamped) rather than silently turned into a 7-day page, so
# without this flag --expires-never simply fails there, which is the point.
ACCEPT_CLAMP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --update)             UPDATE_TARGET="$2"; shift 2 ;;
    --password)           PASSWORD="$2"; shift 2 ;;
    --expires-in-hours)   EXPIRES_IN_HOURS="$2"; shift 2 ;;
    --expires-never)      EXPIRES_IN_HOURS="never"; shift ;;
    --accept-clamp)       ACCEPT_CLAMP=1; shift ;;
    --public-slug)        PUBLIC_SLUG="$2"; shift 2 ;;
    --pii-check)          PII_CHECK="$2"; shift 2 ;;
    --client)             CLIENT="$2"; shift 2 ;;
    --client-path)        CLIENT_PATH="$2"; shift 2 ;;
    --burn-after-read)    BURN=1; shift ;;
    --agentation)         AGENTATION=1; shift ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
done

TMP="$(mktemp -t stacktree.XXXXXX.html)"
trap 'rm -f "$TMP"' EXIT
cat > "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "no HTML on stdin" >&2
  exit 1
fi

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

if [[ -n "$UPDATE_TARGET" ]]; then
  # PUT /sites/<id> swaps the file and reads no other form field, so the option
  # flags are applied afterwards with PATCH rather than silently dropped.
  UPDATE_ARGS=(-sS -H "Authorization: Bearer $API_KEY" -F "file=@$TMP;filename=index.html;type=text/html")
  [[ -n "$PII_CHECK" ]] && UPDATE_ARGS+=(-F "pii_check=$PII_CHECK")
  RESPONSE="$(curl -X PUT "${UPDATE_ARGS[@]}" "$API_URL/sites/$UPDATE_TARGET")"

  PATCH_FIELDS=""
  [[ -n "$PASSWORD" ]]      && PATCH_FIELDS="$PATCH_FIELDS,\"password\":\"$(json_escape "$PASSWORD")\""
  [[ -n "$PUBLIC_SLUG" ]]   && PATCH_FIELDS="$PATCH_FIELDS,\"public_slug\":\"$(json_escape "$PUBLIC_SLUG")\""
  [[ -n "$CLIENT" ]]        && PATCH_FIELDS="$PATCH_FIELDS,\"client\":\"$(json_escape "$CLIENT")\""
  [[ "$BURN" -eq 1 ]]       && PATCH_FIELDS="$PATCH_FIELDS,\"burn_after_read\":true"
  [[ "$AGENTATION" -eq 1 ]] && PATCH_FIELDS="$PATCH_FIELDS,\"agentation\":true"
  if [[ "$EXPIRES_IN_HOURS" == "never" ]]; then
    PATCH_FIELDS="$PATCH_FIELDS,\"expires_in_hours\":null"
    [[ "$ACCEPT_CLAMP" -eq 1 ]] && PATCH_FIELDS="$PATCH_FIELDS,\"accept_clamp\":true"
  elif [[ -n "$EXPIRES_IN_HOURS" ]]; then
    PATCH_FIELDS="$PATCH_FIELDS,\"expires_in_hours\":$EXPIRES_IN_HOURS"
  fi

  if [[ -n "$PATCH_FIELDS" ]]; then
    RESPONSE="$(curl -sS -X PATCH -H "Authorization: Bearer $API_KEY" \
      -H 'content-type: application/json' \
      -d "{${PATCH_FIELDS#,}}" "$API_URL/sites/$UPDATE_TARGET")"
  fi
  # No PATCH equivalent: the path inside a space is derived when the page is
  # created. Say so rather than accepting the flag and doing nothing.
  [[ -n "$CLIENT_PATH" ]] && echo "note: --client-path applies only when creating a page; on --update the page keeps its existing path in the client space." >&2
  printf '%s' "$RESPONSE"
else
  ARGS=(-sS -H "Authorization: Bearer $API_KEY" -F "file=@$TMP;filename=index.html;type=text/html")
  [[ -n "$PASSWORD" ]]         && ARGS+=(-F "password=$PASSWORD")
  [[ -n "$EXPIRES_IN_HOURS" ]] && ARGS+=(-F "expires_in_hours=$EXPIRES_IN_HOURS")
  [[ "$ACCEPT_CLAMP" -eq 1 ]]  && ARGS+=(-F "accept_clamp=true")
  [[ -n "$PUBLIC_SLUG" ]]      && ARGS+=(-F "public_slug=$PUBLIC_SLUG")
  [[ -n "$PII_CHECK" ]]        && ARGS+=(-F "pii_check=$PII_CHECK")
  [[ -n "$CLIENT" ]]           && ARGS+=(-F "client=$CLIENT")
  [[ -n "$CLIENT_PATH" ]]      && ARGS+=(-F "client_path=$CLIENT_PATH")
  [[ "$BURN" -eq 1 ]]          && ARGS+=(-F "burn_after_read=true")
  [[ "$AGENTATION" -eq 1 ]]    && ARGS+=(-F "agentation=true")

  curl -X POST "${ARGS[@]}" "$API_URL/sites"
fi
echo
