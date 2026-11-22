# EventFlow — Chaîne DevOps (ISET Nabeul · L3 DSI)

Plateforme universitaire de gestion et de réservation d'événements étudiants, structurée en monorepo autour d'une chaîne DevOps complète (Git, Bash, Docker, Docker Compose, GitHub Actions, livraison `ghcr.io` et retour arrière).

## Architecture du monorepo

```text
projet/
├── frontend/          # Application Next.js 16.4.5 (TypeScript, port 3000)
├── backend/           # API REST Spring Boot 3.5.6 / Java 17 (Maven, Flyway, port 2525)
├── preuves/           # Journal des commandes et preuves de validation (sans secrets)
├── .gitignore         # Exclusions (consignes/, .env*, node_modules/, .next/, target/)
└── .gitattributes     # Fins de ligne LF pour scripts et fichiers d'infrastructure
```

## Prérequis

- Linux / Ubuntu sous WSL2 (travailler dans `~/devops-l3/projet`, jamais dans `/mnt/c`)
- Git `>= 2.40`
- Docker Engine + Docker Compose v2+ (sans `sudo`)

## Variables d'environnement

Aucun secret n'est versionné dans ce dépôt. Les gabarits à copier et adapter localement sont :
- `frontend/.env.example` → `frontend/.env.local` (non suivi par Git)
- `backend/.env.example` → `backend/.env` (non suivi par Git)

## Démarrage et chaîne DevOps

> Version minimale (Étape 1) : la pile Docker / Compose (démarrage complet en une commande) et le pipeline CI/CD seront ajoutés progressivement dans les prochaines étapes, puis validés depuis un clone propre à l'étape finale.

### Workflow Git appliqué
- Branche principale `main` : aucun push direct après l'initialisation ; toute évolution passe par une branche dédiée et une Pull Request fusionnée sans fast-forward (`--no-ff` / *Create a merge commit*).
