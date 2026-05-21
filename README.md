# Budgetizer 💰

Budgetizer est une application web moderne et intuitive de gestion de budget personnel. Elle permet de suivre ses comptes, ses transactions, ses budgets et de planifier ses dépenses ou abonnements récurrents, le tout soutenu par des analyses visuelles dynamiques et des prévisions de solde en fin de mois.

---

## 🚀 Fonctionnalités Clés

- **Tableau de Bord Dynamique** : Vue globale sur le solde total net, répartition visuelle par compte et accès rapide à la saisie de transactions.
- **Gestion Multi-comptes** : Prise en charge de divers types de comptes (courant, épargne, espèces, investissements) avec personnalisation esthétique (icônes, couleurs).
- **Saisie Intuitive** : Formulaires d'ajout rapide avec pavé numérique sur-mesure pour une expérience fluide (notamment sur mobile).
- **Gestion des Catégories** : Catégorisation personnalisable des revenus et dépenses.
- **Enveloppes Budgétaires** : Définition de budgets par catégorie avec alertes de dépassement (seuil par défaut à 80%) et option de report de solde d'un mois sur l'autre (rollover).
- **Transactions Planifiées & Abonnements** : Planification de transactions régulières ou d'abonnements mensuels/annuels, avec option d'auto-confirmation ou d'approbation manuelle.
- **Visualisations & Graphiques** : Graphiques d'évolution du solde, répartition catégorielle et prévisions intelligentes de solde à 30 jours (via Recharts).
- **Import / Export de Données** : Exportation complète des transactions au format CSV et importation.

---

## 🛠️ Architecture Technique

L'application est construite sur une architecture découplée de type client-serveur :

- **Frontend (Client)** :
  - **Framework** : [React](https://react.dev/) (propulsé par [Vite](https://vite.dev/))
  - **Styles & Animations** : [Tailwind CSS](https://tailwindcss.com/) et [Framer Motion](https://www.framer.com/motion/) pour des transitions fluides et un design sombre premium.
  - **Graphiques** : [Recharts](https://recharts.org/) pour les visualisations interactives.
  - **Routage** : [React Router DOM v7](https://reactrouter.com/) pour la navigation.

- **Backend (Serveur)** :
  - **Runtime & Framework** : [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
  - **Base de Données** : [MongoDB](https://www.mongodb.com/) via l'ORM [Mongoose](https://mongoosejs.com/)
  - **Sécurité** : Authentification par jeton [JWT](https://jwt.io/) stocké dans le `localStorage` et hachage des mots de passe avec `bcryptjs`.
  - **Automatisation** : Script de traitement en arrière-plan (`scheduledProcessor`) s'exécutant au démarrage et toutes les heures pour traiter les transactions planifiées échues.

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
Créez un fichier `.env` dans le dossier `/server` (il est ignoré par Git) et configurez les variables suivantes :

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/budgetizer
JWT_SECRET=votre_secret_jwt_ultra_securise
```

Pour le client (optionnel), si vous devez modifier l'URL de l'API (par défaut `http://localhost:5000/api`), vous pouvez créer un fichier `.env` ou `.env.local` dans le dossier `/client` :
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Lancement en mode Développement
Pour lancer simultanément le serveur de développement Frontend (Vite) et le Backend (Node) :
```bash
npm run dev
```
- Le serveur Frontend sera accessible sur : `http://localhost:5173`
- Le serveur Backend écoutera sur : `http://localhost:5000`

Vous pouvez également démarrer les parties indépendamment :
- Côté Backend uniquement : `npm run dev:backend`
- Côté Frontend uniquement : `npm run dev:frontend`

---

## 📁 Structure du Projet

```text
budgetizer/
├── client/                 # Application Frontend React
│   ├── src/
│   │   ├── assets/         # Images, logos, ressources statiques
│   │   ├── components/     # Composants réutilisables (accounts, budgets, UI, etc.)
│   │   ├── context/        # Contexte React d'authentification (AuthContext)
│   │   ├── hooks/          # Hooks personnalisés (useAccounts, useTransactions, etc.)
│   │   ├── pages/          # Écrans principaux (Home, Budgets, Scheduled, etc.)
│   │   ├── services/       # Service de communication API (Axios)
│   │   ├── App.jsx         # Composant racine et routage
│   │   └── main.jsx        # Point d'entrée React
│   └── package.json
│
├── server/                 # API REST Backend Express
│   ├── controllers/        # Logique métier et gestionnaires de requêtes
│   ├── middleware/         # Middlewares (validation, authMiddleware)
│   ├── models/             # Modèles Mongoose de base de données
│   ├── routes/             # Définition des routes d'API Express
│   ├── utils/              # Fonctions utilitaires & planificateur automatique
│   ├── index.js            # Point d'entrée de l'application Express
│   └── package.json
│
├── docs/                   # Documentations détaillées (fonctionnelle & technique)
├── package.json            # Scripts globaux (concurrently)
└── .gitignore              # Règles d'exclusion Git
```

---

## 📄 Licence
Ce projet est sous licence ISC.
