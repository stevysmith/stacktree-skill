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
# Privacy-first defaults — applied only when the caller didn't pass an
# override. 7-day expiry, PII scan in block mode. Pass --expires-never or
# --pii-check warn to relax.
EXPIRES_IN_HOURS="168"
PUBLIC_SLUG=""
PII_CHECK="block"
BURN=0
AGENTATION=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --update)             UPDATE_TARGET="$2"; shift 2 ;;
    --password)           PASSWORD="$2"; shift 2 ;;
    --expires-in-hours)   EXPIRES_IN_HOURS="$2"; shift 2 ;;
    --expires-never)      EXPIRES_IN_HOURS="never"; shift ;;
    --public-slug)        PUBLIC_SLUG="$2"; shift 2 ;;
    --pii-check)          PII_CHECK="$2"; shift 2 ;;
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

ARGS=(-sS -H "Authorization: Bearer $API_KEY" -F "file=@$TMP;filename=index.html;type=text/html")
[[ -n "$PASSWORD" ]]         && ARGS+=(-F "password=$PASSWORD")
[[ -n "$EXPIRES_IN_HOURS" ]] && ARGS+=(-F "expires_in_hours=$EXPIRES_IN_HOURS")
[[ -n "$PUBLIC_SLUG" ]]      && ARGS+=(-F "public_slug=$PUBLIC_SLUG")
[[ -n "$PII_CHECK" ]]        && ARGS+=(-F "pii_check=$PII_CHECK")
[[ "$BURN" -eq 1 ]]          && ARGS+=(-F "burn_after_read=true")
[[ "$AGENTATION" -eq 1 ]]    && ARGS+=(-F "agentation=true")

if [[ -n "$UPDATE_TARGET" ]]; then
  curl -X PUT "${ARGS[@]}" "$API_URL/sites/$UPDATE_TARGET"
else
  curl -X POST "${ARGS[@]}" "$API_URL/sites"
fi
echo
