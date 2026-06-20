# Budgetizer 💰

Budgetizer est une application web moderne et intuitive de gestion de budget personnel. Elle permet de suivre ses comptes, ses transactions, ses budgets et de planifier ses dépenses ou abonnements récurrents, le tout soutenu par des analyses visuelles dynamiques et des prévisions de solde en fin de mois.

---

## 🚀 Fonctionnalités Clés

- **Tableau de Bord Dynamique** : Vue globale sur le solde total net, répartition visuelle par compte et accès rapide à la saisie de transactions.
- **Gestion Multi-comptes** : Prise en charge de divers types de comptes (courant, épargne, espèces, investissements) avec personnalisation esthétique (icônes, couleurs).
- **Saisie Progressive en Deux Étapes** : Formulaire de transaction mobile fluide structuré en deux étapes (Étape 1 : montant focalisé, puces de favoris éditables et raccourci "répéter" en 1 clic ; Étape 2 : note prédictive, compte/catégorie sous forme de panneaux glissants tactiles, et tags). Prévient la surcharge ergonomique liée à l'affichage du clavier système.
- **Gestion des Catégories** : Catégorisation personnalisable des revenus et dépenses.
- **Enveloppes Budgétaires** : Définition de budgets par catégorie avec alertes de dépassement (seuil par défaut à 80%) et option de report de solde d'un mois sur l'autre (rollover).
- **Transactions Planifiées & Abonnements** : Planification de transactions régulières ou d'abonnements mensuels/annuels, avec option d'auto-confirmation ou d'approbation manuelle.
- **Visualisations & Graphiques** : Graphiques d'évolution du solde, répartition catégorielle, prévisions intelligentes de solde à 30 jours (via Recharts), **Indicateur de Vélocité de Dépense (Tachymètre)** pour surveiller le rythme de consommation budgétaire en temps réel, et intégration du graphique de tendance en arrière-plan translucide de la **Carte Solde Hero** physique pour un gain de hauteur optimal.
- **Conseils & IA (Insights)** : Détection automatique des anomalies de dépenses par catégorie (alertes orange/rouges) comparées à la moyenne des 3 derniers mois avec seuil de sensibilité configurable et persistant. Suggestions de réductions budgétaires interactives et audit d'abonnements.
- **Import / Export de Données** : Exportation complète des transactions au format CSV et importation.
- **Support PWA (Progressive Web App)** : Installable sur mobile (iOS & Android) et desktop. Inclut une bannière d'installation personnalisée, la détection automatique du statut en ligne/hors ligne avec notification visuelle, et une mise à jour automatique en arrière-plan.

---

## 🛠️ Architecture Technique

L'application est construite sur une architecture découplée de type client-serveur :

- **Frontend (Client)** :
  - **Framework** : [React](https://react.dev/) (propulsé par [Vite](https://vite.dev/))
  - **PWA** : Configuration Progressive Web App via `@vite-pwa/plugin` avec Service Worker, gestion du cache et détection du mode hors ligne.
  - **Styles & Animations** : [Tailwind CSS](https://tailwindcss.com/) et [Framer Motion](https://www.framer.com/motion/) pour un design sombre premium "Encre & Cuivre" inspiré de Bankyboard (lueurs orbes translucides en arrière-plan, transitions élastiques tactiles, et support du balayage *swipe-to-dismiss* sur les tiroirs de dialogue).
  - **Graphiques** : [Recharts](https://recharts.org/) pour les visualisations interactives.
  - **Routage** : [React Router DOM v7](https://reactrouter.com/) pour la navigation.

- **Backend (Serveur)** :
  - **Runtime & Framework** : [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
  - **Base de Données** : [MongoDB](https://www.mongodb.com/) via l'ORM [Mongoose](https://mongoosejs.com/) avec gestion de pool de connexions optimisée.
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
Vous pouvez installer les dépendances du client et du serveur en une seule commande depuis la racine du projet :
```bash
npm run install-all
```
*(Cette commande lance séquentiellement `npm install` dans les sous-dossiers `server` et `client`)*.

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
Pour lancer simultanément le serveur de développement Frontend (Vite) et le Backend (Node) avec rechargement automatique :
```bash
npm run dev
```
- Le serveur Frontend sera accessible sur : `http://localhost:5173` (ou l'adresse locale fournie par Vite)
- Le serveur Backend écoutera sur : `http://localhost:5000`

Vous pouvez également démarrer les parties indépendamment :
- Côté Backend uniquement : `npm run dev:backend`
- Côté Frontend uniquement : `npm run dev:frontend`

### 5. Lancement en Production avec PM2
Pour le déploiement en production, nous utilisons **PM2** pour gérer l'exécution du backend et séparer le trafic de l'API REST de l'exécution des tâches planifiées d'arrière-plan. Cela évite d'exécuter plusieurs planificateurs concurrents lorsque le serveur d'API est mis en cluster.

Le fichier `server/ecosystem.config.json` définit deux applications :
1. **budgetizer-api** : L'API d'Express démarrée en mode `cluster` sur toutes les instances CPU disponibles (avec `RUN_SCHEDULED_JOBS=false`).
2. **budgetizer-worker** : Une instance unique (`instances: 1`) démarrée en mode `fork` dédiée exclusivement au traitement en arrière-plan des transactions planifiées (`RUN_SCHEDULED_JOBS=true`).

Pour lancer l'application avec PM2 :
```bash
cd server
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
├── client/                 # Application Frontend React
│   ├── public/             # Fichiers statiques et icônes PWA
│   ├── src/
│   │   ├── assets/         # Images, logos, ressources statiques
│   │   ├── components/     # Composants (accounts, budgets, UI dont bannières d'installation PWA)
│   │   ├── context/        # Contextes React (AuthContext, PwaContext pour l'installation)
│   │   ├── hooks/          # Hooks personnalisés (useAccounts, useTransactions, etc.)
│   │   ├── pages/          # Écrans principaux (Home, Budgets, Settings avec bascule PWA, etc.)
│   │   ├── services/       # Service de communication API (Axios)
│   │   ├── App.jsx         # Composant racine, routage et toast hors ligne
│   │   └── main.jsx        # Point d'entrée React et enregistrement PWA
│   ├── vite.config.js      # Configuration de Vite avec le plugin VitePWA
│   └── package.json
│
├── server/                 # API REST Backend Express
│   ├── controllers/        # Logique métier et gestionnaires de requêtes
│   ├── middleware/         # Middlewares (validation, authMiddleware)
│   ├── models/             # Modèles Mongoose de base de données
│   ├── routes/             # Définition des routes d'API Express
│   ├── utils/              # Fonctions utilitaires & planificateur automatique
│   ├── ecosystem.config.json # Configuration PM2 (cluster API + worker unique)
│   ├── index.js            # Point d'entrée de l'application Express (sécurisé avec Helmet, Rate Limiter)
│   └── package.json
│
├── docs/                   # Documentations détaillées (fonctionnelle & technique)
├── package.json            # Scripts globaux (concurrently)
└── .gitignore              # Règles d'exclusion Git
```

---

## 📄 Licence
Ce projet est sous licence ISC.
