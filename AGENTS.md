# AGENTS.md - Guide du Projet Budgetizer

Ce document est conçu pour servir de récapitulatif complet et de contexte de référence pour toute intelligence artificielle ou développeur travaillant sur le projet **Budgetizer**.

---

## 1. Vue d'Ensemble du Projet

**Budgetizer** est une application web full-stack de gestion financière personnelle et de suivi budgétaire. Elle permet aux utilisateurs de :
- Suivre plusieurs comptes bancaires (courants, épargne, crédits, investissements).
- Automatiser la catégorisation et le pointage grâce au **Moteur de Règles Intelligentes (Smart Rules)** 100% déterministe (sans dépendance IA), filtrable, priorisable et avec suggestions basées sur l'historique de la base.
- Valider et pointer en un clic les transactions réelles via l'action de pointage rapide (`isReviewed`) intégrée à la liste des transactions.
- Consulter un Dashboard restructuré et entièrement personnalisable (réorganisation des widgets sur mobile & desktop via `DashboardCustomizerSheet`, masquage/affichage et sauvegarde des préférences).
- Naviguer facilement via le **Menu Burger Latéral** (`MenuSheet`) incluant un accès direct à l'ensemble des modules (Comptes, Transactions, Budgets, Épargne, Abonnements, Règles, Analyses, Profil).
- Accéder directement aux modules clés via le **ShortcutsWidget** adaptatif (mode clair & sombre).
- Profiter d'**États Vides Contextuels (EmptyState)** avec auras lumineuses glassmorphic et actions guidées.
- Consulter 4 **Cartes KPI XXL** (Revenus, Dépenses, Solde Net, Taux d'épargne %) et leurs Sparklines/Gradient Area Charts vectoriels.
- Suivre en temps réel leur **Restant à Dépenser (Safe-to-Spend)** déduisant les charges fixes et cotisations d'épargne récurrentes.
- Visualiser le parcours complet de leur argent via un **Diagramme de Flux Sankey Vectoriel** filtrable par mois dans le module d'Analyses (avec Drill-Down interactif et intégration universelle du composant `<AmountDisplay />` sur l'intégralité des 11 graphiques d'analyse, des rapports et des abonnements).
- Saisir des transactions en moins de 2 secondes grâce à la **Saisie Ultra-Rapide** (pavé numérique tactile universel `CustomNumpad` sans clavier système et puces d'ajustement/favoris `QuickChips`).
- Profiter de **Composants de Saisie Custom (`<Select />`)** remplaçant les menus déroulants natifs du système dans les règles d'automatisation, formulaires et filtres.
- Valider des virements internes via la **Popin de Confirmation de Virement Instantané (`TransferConfirmModal.tsx`)** avec aperçu des soldes avant/après et visuels de flux.
- Gérer leurs transactions (dépenses, revenus, virements internes).
- Planifier des transactions récurrentes et gérer des abonnements (page d'échéances et d'abonnements uniformisée avec `<AmountDisplay />`).
- Définir des budgets par catégorie avec suivi en temps réel et alertes.
- Fixer et suivre des objectifs d'épargne.
- Visualiser des graphiques et rapports financiers automatisés (générateur de rapport mensuel optimisé et type-safe).
- Partager des comptes ou budgets avec d'autres utilisateurs.
- Se connecter via authentification classique (JWT) ou WebAuthn / Passkeys.
- Recevoir des notifications push PWA (Service Worker) et fonctionner en mode hors-ligne partiellement.


---

## 2. Architecture Globale

Le projet repose sur une architecture **Monorepo basée sur npm workspaces**, structurée en 3 packages principaux :

```
budgetizer/
├── client/     --> Frontend Single Page Application (Vite + React + TypeScript + Tailwind CSS)
├── server/     --> Backend REST API (Node.js + Express + TypeScript + MongoDB / Mongoose)
└── shared/     --> Types TypeScript et validateurs Zod partagés entre frontend et backend
```

### Stack Technique

- **Frontend (`/client`)**:
  - React 18 / TypeScript
  - Build Tool: Vite
  - Styling: Tailwind CSS + Lucide React (icônes)
  - Navigation: React Router (v6)
  - Formulaires & Validation: React Hook Form + Zod
  - Graphiques: Chart.js / React-Chartjs-2
  - PWA: Vite PWA Plugin + Custom Service Worker (`sw.ts`)

- **Backend (`/server`)**:
  - Runtime: Node.js + Express (TypeScript via `tsx` en dev, `tsc` en prod)
  - Base de données: MongoDB avec ODM Mongoose
  - Authentification: JWT (cookies HTTP-only / headers) + WebAuthn (`@simplewebauthn`)
  - Tâches d'arrière-plan: Cron jobs (`node-cron`) avec verrous distribués (`JobLock`)
  - Sécurité & Robustesse: Helmet, Rate Limiting, Idempotency middleware (`IdempotentRequest`)
  - Tests: Vitest

- **Partagé (`/shared`)**:
  - Définitions de types et schémas Zod partagés.

---

## 3. Structure des Répertoires et Dossiers

```
budgetizer/
├── AGENTS.md                  # Ce fichier de référence
├── README.md                  # Documentation utilisateur / installation
├── package.json               # Config root workspace npm
├── render.yaml                # Configuration de déploiement Render
│
├── shared/                    # Package Partagé
│   ├── package.json
│   ├── types/                 # Types TypeScript partagés
│   └── validators/            # Schémas de validation Zod partagés
│
├── client/                    # Application Frontend
│   ├── index.html             # Entrée HTML principale
│   ├── vite.config.ts         # Configuration Vite
│   ├── tailwind.config.ts     # Configuration Tailwind CSS
│   ├── src/
│   │   ├── main.tsx           # Point d'entrée React
│   │   ├── App.tsx            # Composant racine & routes
│   │   ├── components/        # Composants UI réutilisables (charts, modals, layout, etc.)
│   │   ├── pages/             # Pages de l'application (Dashboard, Transactions, Budgets, etc.)
│   │   ├── context/           # Contextes React (Auth, Theme, Toast, Socket/State)
│   │   ├── hooks/             # Custom Hooks React
│   │   ├── services/          # Services d'appel API HTTP (Axios / Fetch)
│   │   ├── sw.ts              # Service Worker PWA
│   │   ├── types/             # Types frontend spécifiques
│   │   ├── utils/             # Fonctions utilitaires (formatters, dates, calculs)
│   │   └── validators/        # Validations formulaire
│   └── public/                # Assets statiques (manifest, icônes)
│
└── server/                    # API Backend
    ├── index.ts               # Point d'entrée de l'application Express & serveur HTTP
    ├── config/                # Configurations (connexion MongoDB, variables d'env)
    ├── controllers/           # Logique métier des endpoints API
    ├── routes/                # Définition des routes Express
    ├── models/                # Modèles Mongoose & Schémas MongoDB
    ├── middleware/            # Middlewares Express (Auth, Idempotency, Validation, Error Handling)
    ├── services/              # Services serveur (Rapports, Notifications, Cron, AI)
    ├── listeners/             # Événements et écouteurs d'arrière-plan
    ├── utils/                 # Utilities backend (Crypto, Idempotency helpers)
    ├── types/                 # Types backend
    └── __tests__/             # Tests automatisés (Vitest)
```

---

## 4. Structure Détaillée de la Base de Données (MongoDB / Mongoose)

La base de données repose sur MongoDB. Voici les différentes collections, leurs champs principaux et les relations inter-collections :

### 1. `users` (`User.ts`)
Stocke les comptes utilisateurs.
- `_id`: ObjectId (PK)
- `email`: String (Unique, requis)
- `password`: String (Haché avec bcrypt)
- `name`: String
- `currency`: `{ code: String, symbol: String }` (Défaut: EUR / €)
- `preferences`:
  - `theme`: 'dark' | 'light' | 'system'
  - `dateFormat`: String
  - `language`: String
  - `firstDayOfWeek`: Number
  - `anomalyThreshold`: Number
  - `lowBalanceThreshold`: Number
  - `enableBudgetAlerts`, `enableScheduledAlerts`, `enableSavingsAlerts`, `enableLowBalanceAlerts`, `enableAiInsightsAlerts`: Boolean
- `pushSubscriptions`: Array de `{ endpoint: String, keys: { p256dh: String, auth: String }, createdAt: Date }`
- `resetPasswordToken` / `resetPasswordExpire`: String / Date (Optionnel)

### 2. `accounts` (`Account.ts`)
Stocke les comptes financiers (courant, épargne, crédit, etc.).
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name`: String
- `type`: 'checking' | 'savings' | 'cash' | 'credit' | 'investment'
- `balance`: Number (Solde actuel)
- `currency`: String
- `color` / `icon`: String
- `includeInTotal`: Boolean (Inclus dans la valeur nette)
- `creditLimit`: Number (Optionnel)
- `creditDetails`: `{ initialAmount, interestRate, durationMonths, startDate, monthlyPayment, scheduledTransactionId }` (Pour comptes de prêt)
- `order`: Number

### 3. `categories` (`Category.ts`)
Catégories de classement des transactions.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name`: String
- `type`: 'expense' | 'income' | 'both'
- `icon` / `color`: String
- `parentId`: ObjectId (Ref `Category`, Optionnel - Hiérarchie)
- `isDefault`: Boolean
- `order`: Number

### 4. `transactions` (`Transaction.ts`)
Dépenses, revenus et transferts.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `accountId`: ObjectId (Ref `Account`, requis)
- `categoryId`: ObjectId (Ref `Category`, Optionnel)
- `type`: 'expense' | 'income' | 'transfer'
- `amount`: Number
- `description`: String
- `date`: Date
- `note`: String
- `tags`: Array of ObjectId (Ref `Tag`)
- `isScheduled`: Boolean
- `scheduledTransactionId`: ObjectId (Ref `ScheduledTransaction`, Optionnel)
- `isPending`: Boolean
- `toAccountId`: ObjectId (Ref `Account`, requis si `type === 'transfer'`)
- `savingsGoalId`: ObjectId (Ref `SavingsGoal`, Optionnel)

### 5. `scheduledtransactions` (`ScheduledTransaction.ts`)
Transactions récurrentes et abonnements.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `accountId`: ObjectId (Ref `Account`, requis)
- `categoryId`: ObjectId (Ref `Category`, Optionnel)
- `type`: 'expense' | 'income' | 'transfer'
- `amount`: Number
- `description` / `note`: String
- `frequency`: `{ every: Number, unit: 'day' | 'week' | 'month' | 'year' }`
- `startDate` / `nextDate` / `endDate`: Date
- `numberOfTimes` / `timesExecuted`: Number
- `autoConfirm`: Boolean (Exécution auto sans validation manuelle)
- `isSubscription`: Boolean
- `toAccountId`: ObjectId (Ref `Account`, Optionnel)
- `isActive`: Boolean

### 6. `budgets` (`Budget.ts`)
Plafonds budgétaires configurés.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name`: String
- `categoryId`: ObjectId (Ref `Category`, requis)
- `amount`: Number (Montant alloué)
- `period`: 'weekly' | 'monthly' | 'yearly'
- `startDate`: Date
- `rollover`: Boolean (Report des reliquats)
- `alertAt`: Number (Pourcentage d'alerte, ex: 80%)
- `color`: String

### 7. `savingsgoals` (`SavingsGoal.ts`)
Objectifs d'épargne.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name`: String
- `targetAmount` / `currentAmount`: Number
- `startDate` / `targetDate`: Date
- `icon` / `color`: String
- `accountId`: ObjectId (Ref `Account`, Optionnel)

### 8. `tags` (`Tag.ts`)
Étiquettes personnalisées.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name` / `color`: String
- `isArchived`: Boolean

### 9. `shares` (`Share.ts`)
Gestion du partage de comptes/budgets.
- `_id`: ObjectId (PK)
- `resourceType`: 'account' | 'budget'
- `resourceId`: ObjectId (Ref dynamique `Account` | `Budget`)
- `ownerId`: ObjectId (Ref `User`)
- `sharedWithId`: ObjectId (Ref `User`)
- `permission`: 'read' | 'write'

### 10. `monthlyreports` (`MonthlyReport.ts`)
Rapports financiers mensuels générés.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `monthKey`: String (ex: "2026-07")
- `reportText`: String
- `financialStats`: `{ income: Number, expenses: Number, net: Number, savingsRate: Number }`
### 11. `categorizationrules` (`CategorizationRule.ts`)
Moteur de règles intelligentes pour la catégorisation et le pointage automatique.
- `_id`: ObjectId (PK)
- `userId`: ObjectId (Ref `User`, requis)
- `name`: String
- `priority`: Number (Ordre de priorité d'exécution)
- `isActive`: Boolean
- `matchLogic`: 'AND' | 'OR'
- `conditions`: Array de `{ field: 'description' | 'amount' | 'type', operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'regex', value: String }`
- `actions`: `{ categoryId: ObjectId (Ref Category), autoReview: Boolean, renameDescription: String }`
- `matchCount`: Number

### 12. Support / Métadonnées Systèmes
- **`usercredentials`** & **`webauthnchallenges`**: Gestion de l'authentification FIDO2/Passkey.
- **`idempotentrequests`**: Prévention des re-soumissions accidentelles de requêtes HTTP mutatives.
- **`joblocks`**: Verrous distribués pour les cron jobs en environnement multi-instances.
- **`savedfilters`**: Filtres de recherche sauvegardés par l'utilisateur.

---

## 5. Scripts Principaux & Commandes

- `npm run dev` : Lance simultanément le client Vite et le serveur Express en mode développement.
- `npm run dev:backend` : Lance uniquement le backend.
- `npm run dev:frontend` : Lance uniquement le frontend.
- `npm run build` : Compile le projet pour la production.
- `npm test` : Lance la suite globale de tests Vitest (frontend et backend).

---

## 6. Stratégie de Test & Prévention des Régressions

Afin de garantir l'absence de régression lors du développement d'une nouvelle fonctionnalité ou du refactoring d'un composant, **toute IA ou développeur doit suivre la procédure de vérification suivante** :

### 1. Exécution des Tests

- **Tests Globaux** (Monorepo) :
  ```bash
  npm test
  ```
- **Tests Backend** (`/server`) :
  ```bash
  npm test --workspace=server
  # Ou en mode watch durant le développement :
  npm run test:watch --workspace=server
  ```
- **Tests Frontend** (`/client`) :
  ```bash
  npm test --workspace=client
  ```

### 2. Périmètre des Tests Existant

- **Tests de contrats d'API & Régressions Backend** (`server/__tests__/apiContract.test.ts`) :
  - Vérifie les routes d'authentification, la gestion des sessions JWT, la validation des payloads Zod/Express-validator.
  - Teste l'isolation des données utilisateur (un utilisateur ne peut pas accéder aux comptes/budgets d'un autre).
  - Contrôle l'idempotence des requêtes mutatives (middleware `IdempotentRequest`).
- **Tests Unitaires / Helpers** (`server/__tests__/dateHelper.test.ts`, etc.) :
  - Valide la logique métier de manipulation des dates, de calculs de récurrence et de clôture de périodes budgétaires.

### 3. Bonnes Pratiques pour l'IA lors de l'Ajout d'une Feature

1. **Exécuter `npm test` avant toute modification** pour s'assurer que le projet est dans un état stable.
2. **Si une nouvelle route API ou un nouveau modèle Mongoose est créé** :
   - Mettre à jour les types TypeScript partagés dans `/shared/types/` et schémas Zod dans `/shared/validators/`.
   - Ajouter des tests d'intégration correspondant dans `server/__tests__/`.
3. **Validation de non-régression avant clôture de la tâche** :
   - L'IA ne doit **jamais** déclarer une fonctionnalité terminée sans avoir exécuté `npm test` (ou la suite ciblée) avec un résultat vert.

---

## 7. Conventions de Code & Patterns d'Architecture

- **Partage Types & Validation Zod (`/shared`)** : Toujours définir les interfaces TypeScript et schémas Zod dans le package partagé `/shared` afin que le frontend et le backend partagent le même contrat de données type-safe.
- **Chaîne de Middlewares Standard** : Toute route API d'écriture (POST, PUT, DELETE) doit utiliser la chaîne standard :
  ```typescript
  router.post('/path', authMiddleware, idempotencyMiddleware, validateRequest(schema), controller);
  ```
- **Strict Isolation des Données Utilisateur** : Chaque requête MongoDB en lecture ou écriture doit impérativement inclure le filtre `userId: req.user.id` (extrait du JWT) pour éviter toute fuite de données inter-utilisateurs.
- **Gestion des Formulaires Frontend** : Utiliser `react-hook-form` couplé avec le resolver Zod (`@hookform/resolvers/zod`).

---

## 8. Configuration & Variables d'Environnement

Le projet utilise des fichiers `.env` séparés pour le serveur et le client.

### Backend (`/server/.env`)
- `PORT` : Port du serveur Express (défaut : 5001).
- `MONGODB_URI` : URI de connexion MongoDB.
- `JWT_SECRET` : Clé secrète de signature des tokens JWT.
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` : Clés VAPID pour l'envoi de Web Push Notifications PWA.
- `VAPID_MAILTO` : Email de contact VAPID.
- `WEBAUTHN_ORIGIN` & `RP_ID` : Origine et ID du Relying Party WebAuthn / Passkeys (ex: `http://localhost:5173`).
- `GEMINI_API_KEY` : Clé API optionnelle pour la génération automatique de rapports financiers IA.

### Frontend (`/client/.env.local`)
- `VITE_API_URL` : URL racine de l'API backend (ex: `http://localhost:5001/api`).

---

## 9. Tâches d'Arrière-Plan & Mécanismes Spécifiques

- **Idempotence des Requêtes HTTP (`IdempotentRequest`)** : Le middleware d'idempotence intercepte l'en-tête `X-Idempotency-Key` sur les routes mutatives. Si une clé est réutilisée, la réponse précédente stockée en base est retournée directement.
- **Tâches Cron et Distributed Locks (`JobLock`)** : Les cron jobs (`node-cron`) gèrent la validation automatique des transactions récurrentes et les alertes budgétaires. Le système de verrouillage distribué `JobLock` empêche l'exécution simultanée d'une même tâche lorsque plusieurs instances du serveur tournent en parallèle.
- **Support Service Worker & WebAuthn** :
  - Le Service Worker (`client/src/sw.ts`) gère la mise en cache PWA et la réception des push notifications background.
  - La gestion Passkey/FIDO2 utilise `@simplewebauthn/server` côté backend et `@simplewebauthn/browser` côté client.

---

## 10. Directives de Contribution & Workspaces

- **Installation des Dépendances** : Toujours exécuter `npm install` depuis la racine du Monorepo pour préserver l'arbre des workspaces.
- **Structure des Commits** : Suivre le format conventionnel (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- **Compilation Production** : S'assurer que `npm run build` s'exécute sans erreur TypeScript avant tout push ou déploiement.


