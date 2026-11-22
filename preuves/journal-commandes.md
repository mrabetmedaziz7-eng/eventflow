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

### Fusion PR #1
```text
*   a904511 (HEAD -> main, origin/main) Merge pull request #1 from mrabetmedaziz7-eng/docs/readme
```

## Étape 2 — Script de contrôle `scripts/check-project.sh`

### Cas 1 : Succès (`exit 0`)
```text
$ ./scripts/check-project.sh
[CHECK] EventFlow
[OK] README.md
[OK] .gitignore
[OK] .gitattributes
[OK] backend/.env.example
[OK] backend/pom.xml
[OK] backend/mvnw
[OK] frontend/.env.example
[OK] frontend/package.json
[OK] frontend/package-lock.json
[OK] aucun .env suivi
[OK] dépôt propre (aucune modification locale non validée)
[SUCCES] contrôles validés
Code de sortie: 0
```

### Cas 2 : Fichier requis absent (`exit 1`)
```text
$ mv README.md README.md.tmp && ./scripts/check-project.sh; echo "Code de sortie: $?"
[CHECK] EventFlow
[ERREUR] fichier absent: README.md
...
[ERREUR] modifications locales non validées (git status --porcelain) :
 D README.md
?? README.md.tmp
[ECHEC] 2 erreur(s)
Code de sortie: 1
```

### Cas 3 : Modification locale non validée (`exit 1`)
```text
$ touch temp-untracked.txt && ./scripts/check-project.sh; echo "Code de sortie: $?"
[CHECK] EventFlow
...
[OK] aucun .env suivi
[ERREUR] modifications locales non validées (git status --porcelain) :
?? temp-untracked.txt
[ECHEC] 1 erreur(s)
Code de sortie: 1
```

### Cas 4 : Fichier `.env` suivi par Git (`exit 1`, test réversible)
```text
$ printf 'TEST_VAR=placeholder\n' > .env && git add -f .env && ./scripts/check-project.sh; echo "Code de sortie: $?"
[CHECK] EventFlow
...
[ERREUR] fichier .env suivi par Git :
.env
[ERREUR] modifications locales non validées (git status --porcelain) :
A  .env
[ECHEC] 2 erreur(s)
Code de sortie: 1
```
Nettoyage effectué (`git rm --cached .env && rm .env`), puis nouveau contrôle confirmé à `Code de sortie: 0`.
