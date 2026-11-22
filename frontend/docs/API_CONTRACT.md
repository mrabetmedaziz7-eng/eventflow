# Contrat d'Interface REST / JSON — EventFlow

> **Documentation officielle pour le développeur Frontend (Next.js)**  
> **Base URL** : `http://localhost:2525`  
> **Format des échanges** : `application/json;charset=UTF-8`  
> **Authentification** : Header `Authorization: Bearer <accessToken>`

---

## 1. Format Standard des Réponses d'Erreur

Toutes les erreurs renvoyées par l'API respectent la structure uniforme suivante :

```json
{
  "timestamp": "2026-10-12T16:51:48.475Z",
  "status": 409,
  "message": "Cet étudiant possède déjà une réservation active pour cet événement.",
  "code": "RESERVATION_CONFLICT",
  "path": "/api/reservations",
  "details": {}
}
```

### Codes d'erreurs fréquents :
| Code d'erreur | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Champs de formulaire invalides (détails dans `details.fields`) |
| `INVALID_ROLE` | 400 | Rôle demandé non autorisé (seuls `ENSEIGNANT` et `ETUDIANT` acceptés) |
| `INVALID_CREDENTIALS` | 401 | Email ou mot de passe incorrect |
| `ACCOUNT_NOT_ACTIVE` | 403 | Compte en attente (`EN_ATTENTE`) ou désactivé (`DESACTIVE`) |
| `RESOURCE_NOT_FOUND` | 404 | Ressource (événement, utilisateur, ticket) inexistante |
| `EMAIL_ALREADY_EXISTS` | 409 | Email déjà enregistré lors de l'inscription |
| `RESERVATION_CONFLICT` | 409 | Double réservation active pour le même étudiant |
| `INSUFFICIENT_CAPACITY`| 409 | Événement complet ou places restantes insuffisantes |
| `LAST_ADMIN_CONFLICT` | 409 | Tentative de désactiver le dernier administrateur actif |

---

## 2. Authentification & Utilisateurs (`/api/auth`, `/api/users`)

### 2.1 Inscription (Public)
* **Méthode** : `POST`
* **URL** : `/api/auth/register`
* **Rôle** : Public
* **Request Body** :
```json
{
  "firstName": "Salah",
  "lastName": "Ben Salem",
  "email": "professeur@example.com",
  "password": "Password123!",
  "role": "ENSEIGNANT" // Ou "ETUDIANT"
}
```
* **Response (201 Created)** :
```json
{
  "id": 11,
  "firstName": "Salah",
  "lastName": "Ben Salem",
  "email": "professeur@example.com",
  "role": "ENSEIGNANT",
  "status": "EN_ATTENTE",
  "createdAt": "2026-10-12T16:51:46.468Z",
  "updatedAt": "2026-10-12T16:51:46.468Z"
}
```

### 2.2 Connexion (Public)
* **Méthode** : `POST`
* **URL** : `/api/auth/login`
* **Rôle** : Public
* **Request Body** :
```json
{
  "email": "professeur@example.com",
  "password": "Password123!"
}
```
* **Response (200 OK)** :
```json
{
  "accessToken": "eyJraWQiOiI...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": 11,
    "firstName": "Salah",
    "lastName": "Ben Salem",
    "email": "professeur@example.com",
    "role": "ENSEIGNANT",
    "status": "ACTIF"
  }
}
```

### 2.3 Profil Connecté
* **`GET /api/users/me`** (Connecté) : Renvoie le profil courant.
* **`PUT /api/users/me`** (Connecté) :
  ```json
  { "firstName": "Salah", "lastName": "Ben Salem" }
  ```
* **`PATCH /api/users/me/password`** (Connecté) :
  ```json
  { "currentPassword": "Password123!", "newPassword": "NewPassword456!" }
  ```

---

## 3. Administration (`/api/admin/users`)

### 3.1 Liste des demandes en attente
* **`GET /api/admin/users/pending`** (ADMIN)
* **Response (200 OK)** : Tableau d'utilisateurs avec `status == "EN_ATTENTE"`.

### 3.2 Valider un compte
* **`PATCH /api/admin/users/{id}/validate`** (ADMIN)
* **Request Body** :
  ```json
  { "role": "ENSEIGNANT" } // ou "ETUDIANT"
  ```
* **Response (200 OK)** : L'utilisateur avec `status: "ACTIF"`.

### 3.3 Refuser un compte
* **`PATCH /api/admin/users/{id}/reject`** (ADMIN)
* **Response (200 OK)** : Utilisateur avec `status: "REFUSE"`.

### 3.4 Activer / Désactiver un compte
* **`PATCH /api/admin/users/{id}/status`** (ADMIN)
* **Request Body** :
  ```json
  { "status": "DESACTIVE" } // ou "ACTIF"
  ```

---

## 4. Consultation Publique des Événements (`/api/events`)

### 4.1 Liste des événements publiés
* **`GET /api/events`** (Public / Tous)
* **Paramètres de requête optionnels** :
  * `search` : mot-clé (titre ou lieu)
  * `category` : catégorie (`TECH`, `CULTURE`, `SPORT`, `CONFERENCE`, etc.)
  * `date` : date au format `YYYY-MM-DD`
  * `availableOnly` : `true` / `false`
* **Response (200 OK)** :
```json
[
  {
    "id": 1,
    "title": "Conférence Intelligence Artificielle",
    "description": "Séminaire sur les LLMs",
    "category": "TECH",
    "eventDate": "2026-10-27",
    "startTime": "09:00:00",
    "endTime": "14:00:00",
    "location": "Amphithéâtre ISET",
    "imageUrl": "https://example.com/banner.jpg",
    "ticketPrice": 20.00,
    "capacity": 50,
    "availablePlaces": 48,
    "status": "PUBLIE",
    "teacher": {
      "id": 11,
      "fullName": "Salah Ben Salem"
    },
    "actions": [
      {
        "id": 1,
        "title": "Accueil & Badges",
        "description": "Remise des badges",
        "actionDate": "2026-10-27",
        "startTime": "09:00:00",
        "endTime": "09:30:00",
        "displayOrder": 0
      }
    ]
  }
]
```

### 4.2 Détail d'un événement
* **`GET /api/events/{id}`** (Public / Tous)

---

## 5. Gestion Enseignant (`/api/teacher/events`)

> **Note de sécurité** : L'enseignant ne peut voir, modifier ou gérer que **ses propres événements**.

### 5.1 Créer un événement
* **`POST /api/teacher/events`** (ENSEIGNANT)
* **Request Body** :
```json
{
  "title": "Atelier Next.js & Spring",
  "description": "Formation pratique",
  "category": "TECH",
  "eventDate": "2026-11-15",
  "startTime": "09:00",
  "endTime": "13:00",
  "location": "Laboratoire Info 3",
  "imageUrl": "https://images.unsplash.com/...",
  "ticketPrice": 15.00,
  "capacity": 30
}
```

### 5.2 Modifier un événement
* **`PUT /api/teacher/events/{id}`** (ENSEIGNANT)

### 5.3 Publier un événement
* **`PATCH /api/teacher/events/{id}/publish`** (ENSEIGNANT)

### 5.4 Annuler un événement
* **`PATCH /api/teacher/events/{id}/cancel`** (ENSEIGNANT)

### 5.5 Ajouter une action / étape au programme
* **`POST /api/teacher/events/{id}/actions`** (ENSEIGNANT)
```json
{
  "title": "Pause café",
  "description": "Réseautage",
  "actionDate": "2026-11-15",
  "startTime": "10:30",
  "endTime": "11:00"
}
```

### 5.6 Liste des participants d'un événement
* **`GET /api/teacher/events/{id}/participants`** (ENSEIGNANT)
* **Response (200 OK)** :
```json
[
  {
    "reservationId": 1,
    "studentId": 12,
    "firstName": "Yassine",
    "lastName": "Trabelsi",
    "email": "etudiant@example.com",
    "reservationDate": "2026-10-12T16:51:48Z",
    "reservationStatus": "CONFIRMEE",
    "numberOfPlaces": 2,
    "confirmationCode": "EVT-543C5C9E2153",
    "paymentStatus": "PAYE"
  }
]
```

---

## 6. Réservations & Paiement (`/api/reservations`)

### 6.1 Créer une réservation (Étudiant)
* **`POST /api/reservations`** (ETUDIANT)
* **Request Body** :
```json
{
  "eventId": 1,
  "numberOfPlaces": 2,
  "paymentMethod": "CARTE_SIMULEE" // ou "VIREMENT_SIMULE"
}
```
* **Règles métier appliquées par le backend** :
  * Si `ticketPrice == 0`, réservation directement `CONFIRMEE`.
  * Si `ticketPrice > 0`, réservation créée en `EN_ATTENTE` avec un paiement associé en `EN_ATTENTE`.
  * Décrémente immédiatement `availablePlaces`.
  * Empêche une double réservation pour le même étudiant (409 Conflict).

### 6.2 Consulter ses réservations
* **`GET /api/reservations/me`** (ETUDIANT)

### 6.3 Payer la réservation (Simulation)
* **`POST /api/reservations/{id}/pay`** (ETUDIANT)
* **Request Body** :
```json
{
  "status": "PAYE" // ou "ECHOUE" pour tester le cas d'échec
}
```
* **Résultats** :
  * Si `"PAYE"` : Réservation passe à `CONFIRMEE`, génération du `confirmationCode` (ex: `EVT-543C5C9E2153`), notifications envoyées à l'étudiant et à l'enseignant.
  * Si `"ECHOUE"` : Réservation passe à `ANNULEE`, les places sont immédiatement remises à disposition dans `availablePlaces`.

### 6.4 Obtenir le ticket imprimable / justificatif
* **`GET /api/reservations/{id}/ticket`** (ETUDIANT)
* **Response (200 OK)** :
```json
{
  "paymentId": 1,
  "reservationId": 1,
  "eventTitle": "Conférence Intelligence Artificielle",
  "eventDate": "2026-10-27",
  "location": "Amphithéâtre ISET",
  "studentName": "Yassine Trabelsi",
  "amount": 40.00,
  "paymentMethod": "CARTE_SIMULEE",
  "paymentReference": "SIM-B667C9DCECDC401C",
  "paymentDate": "2026-10-12T16:51:48Z",
  "reservationCode": "EVT-543C5C9E2153",
  "generatedAt": "2026-10-12T16:51:48Z"
}
```

### 6.5 Annuler une réservation
* **`POST /api/reservations/{id}/cancel`** (ETUDIANT)
* **Résultat** : Statut passe à `ANNULEE`, paiement passe à `REMBOURSE`, les places sont automatiquement restaurées.

---

## 7. Notifications (`/api/notifications`)

* **`GET /api/notifications`** (Connecté) : Liste des notifications ordonnées par date décroissante.
* **`PATCH /api/notifications/{id}/read`** (Connecté) : Marque une notification comme lue.
* **`PATCH /api/notifications/read-all`** (Connecté) : Marque toutes les notifications comme lues.

---

## 8. Tableaux de Bord Statistiques (`/api/dashboard`)

### 8.1 Administrateur : `GET /api/dashboard/admin`
```json
{
  "usersByRole": { "ADMIN": 2, "ENSEIGNANT": 5, "ETUDIANT": 12 },
  "usersByStatus": { "EN_ATTENTE": 2, "ACTIF": 17, "REFUSE": 0, "DESACTIVE": 0 },
  "eventCount": 8,
  "reservationCount": 15,
  "simulatedRevenue": 450.00
}
```

### 8.2 Enseignant : `GET /api/dashboard/teacher`
```json
{
  "publishedEventCount": 3,
  "placesSold": 24,
  "fillRatePercent": 80.00,
  "totalRevenue": 360.00,
  "events": [
    {
      "eventId": 1,
      "title": "Atelier Next.js",
      "eventDate": "2026-11-15",
      "status": "PUBLIE",
      "capacity": 30,
      "placesSold": 24,
      "fillRatePercent": 80.00,
      "revenue": 360.00
    }
  ]
}
```

### 8.3 Étudiant : `GET /api/dashboard/student`
```json
{
  "confirmedReservationCount": 2,
  "paymentCount": 2,
  "paidAmount": 40.00,
  "upcomingEvents": [ ... ],
  "pastEvents": [ ... ]
}
```

---

## 9. Journal d'Audit & Historique (`/api/history`)

* **`GET /api/history`** (Connecté) : Renvoie l'historique filtré automatiquement selon le rôle :
  * `ADMIN` : Tout l'historique de la plateforme
  * `ENSEIGNANT` : Historique lié à ses événements et actions
  * `ETUDIANT` : Historique de ses réservations et paiements

---

## 10. Exemple d'intégration Next.js / Axios

```typescript
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2525',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```
