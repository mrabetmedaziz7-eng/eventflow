# Journal des commandes et preuves — EventFlow DevOps

Ce fichier trace les commandes exécutées et leurs sorties vérifiées étape par étape (aucun secret enregistré).

## Étape 0 — Audit du code et préparation du monorepo

### Actions
- Création de `.gitignore` racine (`consignes/`, `.env*` sauf `*.example`, `node_modules/`, `.next/`, `target/`, `.classpath`, `.project`, `.settings/`, `HELP.md`, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.probe/`).
- Remplacement de `JWT_SECRET` dans `backend/.env.example` par un placeholder.
- Initialisation Git (`main`), ajout du remote `origin` (`git@github.com:mrabetmedaziz7-eng/eventflow.git`), 3 commits atomiques (`init`, `frontend/`, `backend/`), puis `git push -u origin main`.

### Sorties vérifiées
```text
$ git status
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean

$ git log --oneline --graph --decorate --all
* d1eec51 (HEAD -> main, origin/main) chore: importer le code source du backend EventFlow
* b37cc9f chore: importer le code source du frontend EventFlow
* e3f1d0c chore: initialiser le dépôt, le gitignore et le journal des preuves

$ git ls-files | wc -l
173

$ git check-ignore -v consignes/ backend/.env frontend/.env.local
.gitignore:2:consignes/	consignes/
backend/.gitignore:5:*.env	backend/.env
frontend/.gitignore:28:.env*.local	frontend/.env.local

$ (git ls-files | grep -v '\.example$' | grep -E '\.env|consignes|\.probe|tsconfig\.tsbuildinfo|next-env\.d\.ts|\.classpath|\.project|\.settings|HELP\.md') || echo "OK: aucun fichier sensible ou exclu suivi"
OK: aucun fichier sensible ou exclu suivi

$ grep -n "JWT_SECRET" backend/.env.example
7:JWT_SECRET=replace-with-base64-encoded-secret-min-32-bytes

$ git push -u origin main
To github.com:mrabetmedaziz7-eng/eventflow.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

## Étape 1 — Branche `docs/readme`, README minimal et `.gitattributes`

### Vérification des fins de ligne CRLF sur les fichiers suivis
```text
CRLF files: ['frontend/docs/EventFlow_Cahier_des_Charges_DevOps.pdf', 'frontend/public/vendor/fonts/bootstrap-icons.woff', 'frontend/public/vendor/fonts/bootstrap-icons.woff2', 'frontend/src/app/favicon.ico']
```
Aucun fichier texte suivi ne contenait de CRLF ; ajout d'un `.gitattributes` racine (`*.sh text eol=lf`, `mvnw text eol=lf`) en prévention pour les futurs scripts.
