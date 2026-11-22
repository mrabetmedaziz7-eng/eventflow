# Journal des commandes et preuves — EventFlow DevOps

Ce fichier trace les commandes exécutées et leurs sorties vérifiées étape par étape (aucun secret enregistré).

## Étape 0 — Audit du code et préparation du monorepo
- Initialisation du dépôt Git à la racine (`main`), configuration du `.gitignore` racine (exclusion de `consignes/`, des fichiers `.env*` hors `*.example`, des caches/IDE `.classpath`, `.project`, `.settings/`, `HELP.md`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.probe/`, `node_modules/`, `.next/`, `target/`).
- Remplacement de `JWT_SECRET` dans `backend/.env.example` par un placeholder.
- Import atomique en 3 commits : `init`, `frontend/`, `backend/`.
