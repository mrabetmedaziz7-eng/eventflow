#!/usr/bin/env bash
set -u

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-eventflow-staging}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-90}"
WAIT_INTERVAL="${WAIT_INTERVAL:-3}"
services=(db backend frontend proxy)

if [[ -z "${STAGING_PORT:-}" && -f .env ]]; then
  STAGING_PORT=$(grep -E '^STAGING_PORT=' .env | tail -n 1 | cut -d= -f2- || true)
fi
if [[ -z "${STAGING_PORT:-}" && -f .env.staging ]]; then
  STAGING_PORT=$(grep -E '^STAGING_PORT=' .env.staging | tail -n 1 | cut -d= -f2- || true)
fi

if [[ -z "${STAGING_PORT:-}" ]]; then
  echo "[ERREUR] STAGING_PORT non défini (exporter STAGING_PORT ou le définir dans .env)" >&2
  exit 1
fi

if ! [[ "$WAIT_TIMEOUT" =~ ^[0-9]+$ && "$WAIT_INTERVAL" =~ ^[0-9]+$ && "$WAIT_INTERVAL" -gt 0 ]]; then
  echo "[ERREUR] WAIT_TIMEOUT et WAIT_INTERVAL doivent être des entiers positifs" >&2
  exit 1
fi

deadline=$((SECONDS + WAIT_TIMEOUT))
last_issue=""

while :; do
  all_healthy=true
  last_issue=""

  for svc in "${services[@]}"; do
    cid=$(docker ps -q \
      --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
      --filter "label=com.docker.compose.service=${svc}" | head -n 1)
    if [[ -z "$cid" ]]; then
      all_healthy=false
      last_issue="service ${svc} arrêté ou absent (projet ${PROJECT_NAME})"
      break
    fi

    state=$(docker inspect --format '{{.State.Status}}:{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "unknown:unknown")
    if [[ "$state" != "running:healthy" ]]; then
      all_healthy=false
      last_issue="service ${svc} état=${state}"
      break
    fi
  done

  if [[ "$all_healthy" == true ]]; then
    if curl -fsS "http://127.0.0.1:${STAGING_PORT}/health" >/dev/null 2>&1 \
      && curl -fsS "http://127.0.0.1:${STAGING_PORT}/" >/dev/null 2>&1; then
      for svc in "${services[@]}"; do
        echo "[OK] ${svc} healthy"
      done
      echo "[OK] http://127.0.0.1:${STAGING_PORT}/health et / répondent"
      echo "[OK] staging sain (${PROJECT_NAME}, port ${STAGING_PORT})"
      exit 0
    fi
    last_issue="endpoint HTTP http://127.0.0.1:${STAGING_PORT}/health indisponible"
  fi

  if (( SECONDS >= deadline )); then
    echo "[ERREUR] staging non sain après ${WAIT_TIMEOUT}s : ${last_issue}" >&2
    exit 1
  fi

  sleep "$WAIT_INTERVAL"
done
