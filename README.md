# Budgetizer 💰

Budgetizer est une application web moderne et intuitive de gestion de budget personnel. Elle permet de suivre ses comptes, ses transactions, ses budgets et de planifier ses dépenses ou abonnements récurrents, le tout soutenu par des analyses visuelles dynamiques et des prévisions de solde en fin de mois.

---

## 🚀 Fonctionnalités Clés

- **Tableau de Bord & Cartes KPI XXL** : Restructuration synthétique avec 4 cartes grand format exposant les métriques clés (Revenus, Dépenses, Solde Net et Taux d'Épargne %) accompagnées de mini-graphiques Sparklines vectoriels retraçant la tendance sur 6 mois ($M-5$ à $M$).
- **Widget "Restant à Dépenser" (Safe-to-Spend)** : Calcul et affichage en temps réel du budget disponible sans risque pour le reste du mois, déduction faite des charges récurrentes échelonnées et des cotisations d'épargne planifiées.
- **Visualisations Complexes & Diagramme de Sankey** : Modélisation vectorielle interactive sous forme de flux Sankey (parcours de l'argent depuis les sources d'entrées, en passant par le nœud central de trésorerie, jusqu'aux catégories de dépenses et à l'épargne résiduelle) disponible dans la section dédiée aux Analyses.
- **Gestion Multi-comptes** : Prise en charge de divers types de comptes (courant, épargne, espèces, investissements) avec personnalisation esthétique (icônes, couleurs).
- **Saisie Progressive en Deux Étapes** : Formulaire de transaction mobile fluide structuré en deux étapes (Étape 1 : montant focalisé, puces de favoris éditables et raccourci "répéter" en 1 clic ; Étape 2 : note prédictive, compte/catégorie sous forme de panneaux glissants tactiles, et tags). Prévient la surcharge ergonomique liée à l'affichage du clavier système.
- **Gestion des Catégories** : Catégorisation personnalisable des revenus et dépenses.
- **Enveloppes Budgétaires** : Définition de budgets par catégorie avec alertes de dépassement (seuil par défaut à 80%) et option de report de solde d'un mois sur l'autre (rollover).
- **Transactions Planifiées & Abonnements** : Planification de transactions régulières ou d'abonnements mensuels/annuels, avec option d'auto-confirmation ou d'approbation manuelle.
- **Partage & Collaboration** : Partage de comptes et de budgets entre utilisateurs (couple, famille) avec permissions `read` (lecture seule) ou `write` (lecture + écriture). Géré depuis **Paramètres › Partage & Collaboration**. L'interface s'adapte automatiquement aux restrictions : masquage des boutons de gestion, désactivation des swipe-actions et filtrage des comptes non-accessibles dans les formulaires.
- **Visualisations & Graphiques** : Graphiques d'évolution du solde, répartition catégorielle, prévisions intelligentes de solde à 30 jours (via Recharts), **Indicateur de Vélocité de Dépense (Tachymètre)** pour surveiller le rythme de consommation budgétaire en temps réel, et intégration du graphique de tendance en arrière-plan translucide de la **Carte Solde Hero** physique pour un gain de hauteur optimal.
- **Notifications Push Prédictives** : Réception de notifications push Web en temps réel en cas de baisse de solde, dépassement de budget ou alerte prédictive de dérive basée sur le rythme quotidien des dépenses (run rate).
- **Conseils & IA (Insights)** : Détection automatique des anomalies de dépenses par catégorie (alertes orange/rouges) comparées à la moyenne des 3 derniers mois avec seuil de sensibilité configurable et persistant. Suggestions de réductions budgétaires interactives et audit d'abonnements.
- **Import / Export de Données** : Exportation complète des transactions au format CSV et importation.
- **Design System Harmonisé & Mode Sombre Premium** : Direction artistique moderne inspirée de Bankyboard (bleu encre profond, typographies Manrope/DM Mono, effet translucide *glass-card*) couplée à un code couleur sémantique strict (🟢 `#10B981` pour les entrées, 🔴 `#EF4444` pour les sorties, 🟣 `#6366F1` pour les analyses & KPIs).
- **Support PWA (Progressive Web App)** : Installable sur mobile (iOS & Android) et desktop. Inclut une bannière d'installation personnalisée, la détection automatique du statut en ligne/hors ligne avec notification visuelle, et une mise à jour automatique en arrière-plan.
- **Haute Résilience & Observabilité** : Tracing de requêtes via Correlation ID (`X-Request-ID` & AsyncLocalStorage), logs JSON structurés en production (`logger.ts`), validation d'environnement Zod (`env.ts`), composant React `ErrorBoundary` pour la gestion des plantages d'affichage et sérialisation propre des stack traces.
- **Contrat de Données Unifié & Swagger API** : Mutualisation des types et interfaces métiers partagées (`/shared/types/index.ts`) entre backend et frontend, et documentation Swagger/OpenAPI interactive (`/api-docs`).
- **Suite de Tests Automatisés (487 tests)** : Couverture complète des fonctionnalités client (39 suites / 283 tests avec Vitest & React Testing Library) et des contrôleurs/contrats d'API serveur (30 suites / 204 tests avec Vitest & Supertest).



---

## 🛠️ Architecture Technique

L'application est construite sur une architecture découplée de type client-serveur :

- **Frontend (Client)** :
  - **Framework & Langage** : [React](https://react.dev/) & **TypeScript** (propulsé par [Vite](https://vite.dev/))
  - **Architecture Modulaire** : Composants optimisés et découpés (`TransactionHeader`, `TransactionFiltersSheet`, composants de graphiques découplés du rendu).
  - **PWA & Offline Sync** : Configuration Progressive Web App via `@vite-pwa/plugin` avec Service Worker, file d'attente IndexedDB (`idb`), stratégie de retentative avec *exponential backoff*, résolution de conflits HTTP 409 (server-wins avec notifications toast) et détection automatique de l'état en ligne/hors ligne.
  - **Styles & Animations** : [Tailwind CSS](https://tailwindcss.com/) et [Framer Motion](https://www.framer.com/motion/) pour un design sombre premium "Encre & Cuivre" inspiré de Bankyboard (lueurs orbes translucides en arrière-plan, transitions élastiques tactiles, et support du balayage *swipe-to-dismiss* sur les tiroirs de dialogue).
  - **Graphiques** : [Recharts](https://recharts.org/) pour les visualisations interactives (Tooltips extraits hors du rendu pour la stabilité du state).
  - **Routage** : [React Router DOM v7](https://reactrouter.com/) pour la navigation.

- **Backend (Serveur)** :
  - **Runtime & Langage** : [Node.js](https://nodejs.org/), [Express](https://expressjs.com/) & **TypeScript** (`strict: true`, `noImplicitAny: true`)
  - **Base de Données** : [MongoDB](https://www.mongodb.com/) via l'ORM [Mongoose](https://mongoosejs.com/) avec gestion de pool de connexions optimisée et typage strict.
  - **Sécurité & Protection** : 
    - En-têtes HTTP de sécurité via `helmet`.
    - Protection contre les injections NoSQL avec `express-mongo-sanitize`.
    - Limitation du débit de requêtes (rate limiting) par adresse IP via `express-rate-limit`.
    - Gestion dynamique des origines autorisées (CORS whitelist).
    - Validation stricte des variables d'environnement critiques et arrêt propre en cas d'erreurs globales (`SIGTERM`, `SIGINT`).
  - **Automatisation** : Script de traitement en arrière-plan (`scheduledProcessor`) pour traiter les transactions planifiées échues, configurable par instance pour éviter les exécutions en double en production.
  - **Gestion de Processus** : Configuré pour s'exécuter sous **PM2** en mode cluster/fork séparé pour la scalabilité et la haute disponibilité.

---

## ⚙️ Guide d'Installation et Lancement

### Prérequis
- [Node.js](https://nodejs.org/) (version 18+ recommandée)
- [MongoDB](https://www.mongodb.com/) (instance locale en cours d'exécution ou URI MongoDB Atlas)

### 1. Clonage du projet
```bash
git clone https://github.com/jvazel/budgetizer.git
cd budgetizer
```

### 2. Installation des dépendances
Vous pouvez installer l'ensemble des dépendances du monorepo (racine, shared, server, client) grâce à **npm Workspaces** natifs :
```bash
npm install
```
*(Cette commande installe les dépendances et lie automatiquement le package local `@budgetizer/shared` pour le client et le serveur)*.

### 3. Configuration de l'environnement (`.env`)
Créez un fichier `.env` dans le dossier `/server` (il est ignoré par Git) et configurez les variables suivantes. Voici les options disponibles pour le développement et la production :

```env
# Paramètres de base
PORT=5000
MONGODB_URI=mongodb://localhost:27017/budgetizer
JWT_SECRET=votre_secret_jwt_ultra_securise

# Paramètres de production et sécurité (Optionnels)
NODE_ENV=production
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com # Origines CORS autorisées
RATE_LIMIT_MAX_REQUESTS=100 # Nombre max de requêtes par IP/15min
MONGODB_MAX_POOL_SIZE=10 # Taille max du pool de connexion MongoDB
RUN_SCHEDULED_JOBS=true # true pour exécuter les tâches planifiées sur cette instance, false sinon
SCHEDULED_JOB_INTERVAL_MS=3600000 # Fréquence du planificateur de tâches (1 heure par défaut)
```

Pour le client (optionnel), si vous devez modifier l'URL de l'API (par défaut `http://localhost:5000/api`), vous pouvez créer un fichier `.env` ou `.env.local` dans le dossier `/client` :
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Lancement en mode Développement
Pour lancer simultanément le serveur de développement Frontend (Vite + TS) et le Backend (Node + TS) avec rechargement automatique :
```bash
npm run dev
```
- Le serveur Frontend sera accessible sur : `http://localhost:5173` (ou l'adresse locale fournie par Vite)
- Le serveur Backend écoutera sur : `http://localhost:5000`

Vous pouvez également démarrer les parties indépendamment :
- Côté Backend uniquement : `npm run dev:backend`
- Côté Frontend uniquement : `npm run dev:frontend`

### 5. Vérification du Typage et Tests
Pour vérifier l'intégrité du code et exécuter les tests unitaires :
```bash
# Vérification du typage TypeScript
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Exécution des tests unitaires Vitest
npm test
```

### 6. Lancement en Production avec PM2
Pour le déploiement en production, nous utilisons **PM2** pour gérer l'exécution du backend et séparer le trafic de l'API REST de l'exécution des tâches planifiées d'arrière-plan. Cela évite d'exécuter plusieurs planificateurs concurrents lorsque le serveur d'API est mis en cluster.

Le fichier `server/ecosystem.config.json` définit deux applications :
1. **budgetizer-api** : L'API d'Express démarrée en mode `cluster` sur toutes les instances CPU disponibles (avec `RUN_SCHEDULED_JOBS=false`).
2. **budgetizer-worker** : Une instance unique (`instances: 1`) démarrée en mode `fork` dédiée exclusivement au traitement en arrière-plan des transactions planifiées (`RUN_SCHEDULED_JOBS=true`).

Pour lancer l'application avec PM2 :
```bash
cd server
npm run build # Compilation TypeScript
pm2 start ecosystem.config.json
```

Commandes PM2 utiles :
- Voir les logs consolidés : `pm2 logs`
- Surveiller les ressources : `pm2 monit`
- Arrêter les processus : `pm2 stop ecosystem.config.json`
- Redémarrer proprement : `pm2 reload ecosystem.config.json`

---

## 📁 Structure du Projet

```text
budgetizer/
├── client/                 # Application Frontend React + TypeScript
│   ├── public/             # Fichiers statiques et icônes PWA
│   ├── src/
│   │   ├── assets/         # Images, logos, ressources statiques
│   │   ├── components/     # Composants (accounts, budgets, UI dont bannières d'installation PWA)
│   │   ├── context/        # Contextes React (AuthContext, PwaContext pour l'installation)
│   │   ├── hooks/          # Hooks personnalisés (useAccounts, useTransactions, etc.)
│   │   ├── pages/          # Écrans principaux (Home, Budgets, Settings avec bascule PWA, etc.)
│   │   ├── services/       # Service de communication API (Axios)
│   │   ├── App.tsx         # Composant racine, routage et toast hors ligne
│   │   └── main.tsx        # Point d'entrée React et enregistrement PWA
│   ├── vite.config.ts      # Configuration de Vite avec le plugin VitePWA
│   ├── tsconfig.json       # Configuration TypeScript du Client
│   └── package.json
│
├── server/                 # API REST Backend Express + TypeScript
│   ├── controllers/        # Logique métier et gestionnaires de requêtes
│   ├── middleware/         # Middlewares (validation, authMiddleware)
│   ├── models/             # Modèles Mongoose de base de données typés
│   ├── routes/             # Définition des routes d'API Express
│   ├── utils/              # Fonctions utilitaires & planificateur automatique
│   ├── ecosystem.config.json # Configuration PM2 (cluster API + worker unique)
│   ├── index.ts            # Point d'entrée de l'application Express (sécurisé avec Helmet, Rate Limiter)
│   ├── tsconfig.json       # Configuration TypeScript du Serveur
│   └── package.json
│
├── docs/                   # Documentations détaillées (fonctionnelle & technique)
├── package.json            # Scripts globaux (concurrently)
└── .gitignore              # Règles d'exclusion Git
```

---

## 📄 Licence
Ce projet est sous licence ISC.
