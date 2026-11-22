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

### Fusion PR #2
```text
*   1b5f8d3 (HEAD -> main, origin/main) Merge pull request #2 from mrabetmedaziz7-eng/chore/project-check
```

## Étape 3a — Endpoint de santé `GET /health` (`feat/health-endpoint`)

> **Note** : Code applicatif backend modifié (`pom.xml`, `application.yml`, `SecurityConfiguration.java`, `HealthEndpointTest.java`).

### Tests backend en conteneur (`postgres:17-alpine` + `maven:3.9.9-eclipse-temurin-17`)
```text
$ ./mvnw verify
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- in com.iset.events.FullScenarioIntegrationTest
Tests run: 9, Failures: 0, Errors: 0, Skipped: 0 -- in com.iset.events.EssentialEdgeCasesTest
Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 -- in com.iset.events.HealthEndpointTest
Tests run: 1, Failures: 0, Errors: 0, Skipped: 0 -- in com.iset.events.EventsApplicationTests
Tests run: 13, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

### Fusion PR #3
```text
*   e9e4993 (HEAD -> main, origin/main) Merge pull request #3 from mrabetmedaziz7-eng/feat/health-endpoint
```

## Étape 3b — Support des URL relatives dans `api.ts` (`feat/relative-api-url`)

> **Note** : Code applicatif frontend modifié (`frontend/src/lib/api.ts`, `frontend/src/test/api.test.ts`).

### Vérifications dans `node:22.19.0`
```text
$ npm ci && npm run lint && npx tsc --noEmit && npm test
added 482 packages, and audited 483 packages in 24s
> eslint
✖ 10 problems (0 errors, 10 warnings)
# npx tsc --noEmit : 0 erreur (code 0)
> vitest run
 Test Files  7 passed (7)
      Tests  21 passed (21)
```

### Fusion PR #4
```text
*   8ec2d66 (HEAD -> main, origin/main) Merge pull request #4 from mrabetmedaziz7-eng/feat/relative-api-url
```

## Étape 3c — Polices locales `@fontsource/inter` & `@fontsource/cairo` (`feat/local-fonts`)

> **Note** : Code applicatif frontend modifié (`package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/styles/theme.css`, et correctif 1 ligne dans `src/lib/api.ts` sur le paramètre par défaut de `resolveApiBaseUrl`).

### Build hors ligne (`--network none`) & vérifications dans `node:22.19.0` (`-u 1002:1002`)
```text
$ npm ci
added 484 packages, and audited 485 packages in 17s

$ docker run --rm --network none -u 1002:1002 ... -e NEXT_PUBLIC_API_URL= ... node:22.19.0 bash -c "npm run build && npm run lint && npx tsc --noEmit && npm test"
✓ Compiled successfully in 905ms
✓ Generating static pages using 11 workers (19/19) in 648ms
✖ 10 problems (0 errors, 10 warnings)
# npx tsc --noEmit : 0 erreur (code 0)
 Test Files  7 passed (7)
      Tests  21 passed (21)
```

### Fusion PR #5
```text
*   67c2ea5 (HEAD -> main, origin/main) Merge pull request #5 from mrabetmedaziz7-eng/feat/local-fonts
```

## Étape 3d — Dockerfiles durcis, `.dockerignore` et reverse proxy (`feat/dockerfiles`)

### Tailles `1.0` vs `1.1` (`docker image ls 'eventflow-*'`)
```text
IMAGE                    ID             DISK USAGE   CONTENT SIZE
eventflow-backend:1.0    28c7114b87f5        384MB          127MB
eventflow-backend:1.1    17c36ae682b0        384MB          127MB
eventflow-frontend:1.0   e5f374ac7057       1.04GB          252MB
eventflow-frontend:1.1   cb7934b8f073        958MB          211MB
eventflow-proxy:1.0      f9cfbb2c6204       73.6MB           21MB
eventflow-proxy:1.1      fe04a5adb2b1       73.7MB           21MB
```

### Couches les plus lourdes (`docker history`)
- `eventflow-backend:1.1` : JRE 17 (`141MB`) et `app.jar` (`62.8MB`) ; `COPY --chown=appuser:appgroup` évite la duplication de couche.
- `eventflow-frontend:1.1` : `node_modules` prod (`561MB`), runtime Node 22.19.0 (`155MB`), `.next` sans `.next/cache` (`14.9MB`).
- `eventflow-proxy:1.1` : base `nginxinc/nginx-unprivileged:1.27-alpine` (`38.7MB`), `nginx.conf` (`20.5kB`).

### Démonstration du cache (commentaire temporaire dans `EventsApplication.java`)
```text
#9 [builder 3/6] COPY pom.xml .                    => CACHED
#11 [builder 4/6] RUN mvn -B dependency:go-offline => CACHED
#12 [builder 5/6] COPY src ./src                   => DONE 0.5s
#13 [builder 6/6] RUN mvn -B package -DskipTests   => DONE 22.1s
```

### Utilisateurs non-root (`docker exec ... whoami`), `HEALTHCHECK` et `curl` via proxy
```text
=== WHOAMI ===
backend:  appuser
frontend: appuser
proxy:    nginx

=== HEALTH ===
backend=healthy frontend=healthy proxy=healthy

=== CURL VIA PROXY ===
$ curl -fsS http://localhost:8080/health
{"status":"UP"}
$ curl -fsS http://localhost:8080/api/events
[]
$ curl -fsS -I http://localhost:8080/ | head -n 5
HTTP/1.1 200 OK
```

### Incident volontaire (`SERVER_ADDRESS=127.0.0.1` sur `backend-casse`)
```text
$ docker ps -a --filter name=backend-casse
backend-casse   eventflow-backend:1.1   Up 8 seconds (health: starting)   0.0.0.0:2526->2525/tcp
$ docker logs --tail=10 backend-casse
Tomcat started on port 2525 (http) with context path '/'
Started EventsApplication in 6.539 seconds
$ curl -fsSv --max-time 3 http://localhost:2526/health
curl: (56) Recv failure: Connection reset by peer
$ docker exec backend-casse wget -qO- http://127.0.0.1:2525/health
{"status":"UP"}
```
**Explication (3 lignes)** : Le conteneur tourne (`Up`) et ses journaux n'affichent aucune erreur car Tomcat a bien démarré sur le port `2525`. En écoutant sur `127.0.0.1` (boucle locale interne), il rejette toute connexion venant de l'extérieur du conteneur (`Connection reset by peer` sur `localhost:2526`) alors que `wget` depuis l'intérieur répond `{"status":"UP"}`. L'adresse d'écoute d'un service conteneurisé doit rester `0.0.0.0`.
