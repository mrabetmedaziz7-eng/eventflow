# EventFlow — Frontend (Next.js 16)

Plateforme de gestion et de réservation d'événements étudiants pour l'**ISET Nabeul** (Projet d'Intégration).

---

## 1. Prérequis & Environnement

- **Node.js** : v22.19.0 (exige Node 20.9 ou supérieur)
- **npm** : v10.9.3
- **Système d'exploitation** : Windows (PowerShell)
- **Backend Spring Boot** : en écoute sur `http://localhost:2525`
- **Port Frontend** : `http://localhost:3000` (imposé par la configuration CORS du backend)

---

## 2. Installation & Lancement

1. **Variables d'environnement** :
   Fichier `.env.local` créé avec :
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:2525
   ```
   Un modèle est disponible dans `.env.example`.

2. **Lancement du serveur de développement** :
   ```powershell
   npm run dev
   ```
   L'application est accessible sur [http://localhost:3000](http://localhost:3000).

3. **Exécution des tests et vérifications** :
   ```powershell
   npm run lint   # Analyse de code ESLint
   npm run build  # Compilation de production Next.js App Router
   npm test       # Tests unitaires et d'intégration Vitest
   ```

---

## 3. Structure du Projet

```text
src/
├── app/
│   ├── layout.tsx                     # Layout racine, polices Inter/Cairo, bootstrap RTL switch
│   ├── page.tsx                       # Page d'accueil publique & événements à la une
│   ├── login/                         # Page de connexion
│   ├── register/                      # Page d'inscription (Étudiant / Enseignant)
│   ├── profile/                       # Profil connecté & changement de mot de passe
│   ├── pending/                       # Écran compte en attente de validation
│   ├── access-denied/                 # Écran accès non autorisé
│   ├── events/                        # Catalogue des événements publics
│   │   ├── page.tsx                   # Liste, recherche, filtres, tri et pagination
│   │   └── [id]/                      # Détail de l'événement et programme
│   │       └── reserve/               # Récapitulatif et validation de réservation
│   ├── reservations/
│   │   └── [id]/
│   │       ├── pay/                   # Simulation du paiement (succès / échec)
│   │       └── ticket/                # Justificatif de réservation imprimable (CSS print)
│   ├── notifications/                 # Centre de notifications (marquer comme lu, etc.)
│   └── dashboard/
│       ├── admin/                     # Dashboard global admin, stats graphiques
│       │   ├── pending/               # Validation ou rejet des comptes étudiants/profs
│       │   └── users/                 # Gestion et activation/désactivation des utilisateurs
│       ├── teacher/                   # Dashboard statistiques enseignant
│       │   └── events/                # Liste, création, modification, programme, participants
│       └── student/                   # Dashboard étudiant
│           └── reservations/          # Historique et annulation de réservations
├── components/
│   ├── layout/                        # Navbar réactive & Footer
│   ├── events/                        # EventCard & EventFilters
│   └── common/                        # RoleGuard pour protection des routes par profil
├── lib/
│   ├── api.ts                         # Client API centralisé, parsing d'erreurs, gestionnaire 401
│   ├── auth.ts                        # Gestion de session (sessionStorage & mémoire)
│   ├── i18n.ts                        # Couche de traduction sans routage, détection RTL, formateurs
│   ├── events.ts                      # Logique métier des événements (jauges, tri, pagination)
│   ├── validation.ts                  # Validations formulaires côté client
│   └── errors.ts                      # Traduction et extraction des erreurs serveur
├── locales/
│   ├── fr.json                        # Dictionnaire Français
│   ├── en.json                        # Dictionnaire Anglais
│   └── ar.json                        # Dictionnaire Arabe (avec dir="rtl")
├── styles/
│   └── theme.css                      # Thème unique "Campus bleu" & variables CSS
└── types/
    └── api.ts                         # Types TypeScript fidèles au contrat API
```

---

## 4. Choix d'Architecture & Décisions Techniques

### A. Thème & Design ("Campus bleu")
- Toutes les couleurs de la charte sont définies **une seule fois** dans `src/styles/theme.css`.
- Palette : Navy `#1E3A8A`, Primaire `#2563EB`, Fond `#F8FAFC`, Texte `#0F172A`, Bordures `#E2E8F0`.
- Couleurs de statuts réservées :
  - *Disponible* : Vert (`#DCFCE7` / `#166534`)
  - *Bientôt complet* : Orange (`#FFEDD5` / `#9A3412`)
  - *Complet, Annulé, Échoué* : Rouge (`#FEE2E2` / `#991B1B`)
  - *En attente* : Gris-bleu (`#E2E8F0` / `#334155`)
- Seuil "Bientôt complet" : fixé à **20% de la capacité totale** de l'événement (avec un minimum de 1 place restante).

### B. Gestion de Session
- Le JWT est stocké en **`sessionStorage`** et en mémoire vive dans l'instance de l'API client.
- L'objet utilisateur n'est pas stocké en dur : au chargement d'une page, la session est restaurée en appelant `GET /api/users/me`.
- Déconnexion : vide immédiatement le token et redirige vers `/login`.

### C. Internationalisation (i18n) & RTL
- Support complet du Français (`fr`), de l'Anglais (`en`) et de l'Arabe (`ar`).
- Pour l'Arabe, l'attribut `dir="rtl"` est appliqué dynamiquement sur la balise `<html>` et la feuille de style Bootstrap permute vers `bootstrap.rtl.min.css`.
- Les icônes directionnelles s'inversent via la classe `.ef-flip-rtl`.
- Les montants sont formatés avec `Intl.NumberFormat` en devise **TND** (Dinar Tunisien).

---

## 5. Comptes de Démonstration

- **Administrateur par défaut** :
  - Identifiant : `admin@example.com`
  - Mot de passe : `admin12345678`
- **Comptes Enseignants et Étudiants** :
  - Création libre via la page `/register`.
  - Après inscription, le compte est au statut `EN_ATTENTE` et doit être validé par l'administrateur depuis `/dashboard/admin/pending`.

