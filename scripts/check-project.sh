#!/usr/bin/env bash
set -u

errors=0
required=(
  README.md
  .gitignore
  .gitattributes
  .env.example
  .env.staging.example
  .github/workflows/ci.yml
  compose.yaml
  compose.staging.yaml
  scripts/wait-healthy.sh
  backend/.env.example
  backend/pom.xml
  backend/mvnw
  backend/Dockerfile
  backend/.dockerignore
  frontend/.env.example
  frontend/package.json
  frontend/package-lock.json
  frontend/Dockerfile
  frontend/.dockerignore
  proxy/Dockerfile
  proxy/.dockerignore
  proxy/nginx.conf
)

echo "[CHECK] EventFlow"
for file in "${required[@]}"; do
  if [[ -f "$file" ]]; then
    echo "[OK] $file"
  else
    echo "[ERREUR] fichier absent: $file" >&2
    errors=$((errors + 1))
  fi
done

tracked_env=$(git ls-files | grep -E '(^|/)\.env($|\.)|\.env$' | grep -v '\.example$' || true)
if [[ -n "$tracked_env" ]]; then
  echo "[ERREUR] fichier .env suivi par Git :" >&2
  echo "$tracked_env" >&2
  errors=$((errors + 1))
else
  echo "[OK] aucun .env suivi"
fi

dirty_files=$(git status --porcelain)
if [[ -n "$dirty_files" ]]; then
  echo "[ERREUR] modifications locales non validées (git status --porcelain) :" >&2
  echo "$dirty_files" >&2
  errors=$((errors + 1))
else
  echo "[OK] dépôt propre (aucune modification locale non validée)"
fi

if [[ $errors -gt 0 ]]; then
  echo "[ECHEC] $errors erreur(s)" >&2
  exit 1
fi

echo "[SUCCES] contrôles validés"
exit 0
