# 🧠 Prompt Vibe Coding — Budgetizer
> Application mobile-first de gestion des finances personnelles · Stack : React + Node.js + MongoDB

---

## 🎯 Vision du projet

Tu vas créer **Budgetizer**, une application web full-stack de gestion des finances personnelles, inspirée de Fast Budget. L'expérience est conçue **mobile-first** : l'interface principale ressemble à une application native iOS/Android, avec une bottom navigation bar, des cartes swipables, des modals qui montent du bas de l'écran (bottom sheets), et des gestures naturelles.

**Stack technique imposée :**
- **Frontend** : React (Vite) + Tailwind CSS
- **Backend** : Node.js + Express
- **Base de données** : MongoDB (avec Mongoose)
- **Auth** : JWT (JSON Web Tokens)
- **Graphiques** : Recharts
- **Icônes** : Lucide React
- **Animations** : Framer Motion (pour les transitions mobiles)

---

## 📱 Philosophie de design — Mobile First

L'application est pensée comme une **PWA (Progressive Web App)** utilisable principalement sur smartphone.

### Layout général
- **Breakpoints :**
  - Mobile : 0–639px → layout principal (tout est conçu ici en premier)
  - Tablet : 640–1023px → sidebar apparaît
  - Desktop : 1024px+ → sidebar fixe complète

- **Navigation mobile — Bottom Tab Bar** (5 onglets fixes en bas) :
  - 🏠 Accueil · 💸 Transactions · ➕ (FAB central surélevé) · 📊 Budgets · 👤 Profil
  - Le bouton ➕ central : cercle 56px, fond `--accent`, icône Plus blanche, `margin-top: -20px`, shadow verte — ouvre le bottom sheet de nouvelle transaction
  - `padding-bottom: env(safe-area-inset-bottom)` pour iOS
  - Icône active : couleur `--accent` + scale 1.1 · Icône inactive : `--text-muted`

- **Navigation tablette/desktop — Sidebar fixe 240px** :
  ```
  [Logo Budgetizer]
  ─────────────────
  🏠  Accueil
  💸  Transactions
  📊  Budgets
  📁  Catégories
  📅  Calendrier
  📈  Graphiques        ← NOUVEAU
       ├ Par catégorie
       ├ Futur
       └ Prévisions
  🔁  Transactions planifiées   ← NOUVEAU
       ├ Planifiées
       └ Abonnements
  📉  Rapports
  ─────────────────
  ⚙️  Paramètres
  🚪  Déconnexion
  ```

### Composants mobiles spécifiques
- **Bottom Sheets** : panels slide-up, drag handle (pill grise), fond flouté derrière (Framer Motion)
- **Pull-to-refresh** sur les listes de transactions
- **Swipe to delete** (swipe gauche → bouton rouge supprimer)
- **Carousel horizontal** avec scroll-snap pour les comptes
- **Input numérique façon calculatrice** pour la saisie des montants
- **Skeleton loaders** à la place des spinners

### Palette de couleurs (Dark mode par défaut)
```css
/* === DARK MODE === */
--bg-base: #0d0d0d;
--bg-surface: #1a1a1a;
--bg-surface-2: #242424;
--bg-elevated: #2e2e2e;
--border: #333333;
--text-primary: #f5f5f5;
--text-secondary: #888888;
--text-muted: #555555;
--accent: #4ade80;
--accent-dim: #166534;
--danger: #f87171;
--danger-dim: #7f1d1d;
--warning: #fbbf24;
--info: #60a5fa;
--purple: #a78bfa;

/* === LIGHT MODE === */
--bg-base: #f5f5f5;
--bg-surface: #ffffff;
--bg-surface-2: #f0f0f0;
--border: #e0e0e0;
--text-primary: #111111;
--text-secondary: #666666;
--accent: #16a34a;
```

### Typographie
- **Montants / chiffres** : `DM Mono` (Google Fonts)
- **UI générale** : `DM Sans` (Google Fonts)
- Montants dépenses → rouge `--danger` · Montants revenus → vert `--accent`

---

## 📋 Plan de développement en 10 étapes

Termine et valide chaque étape avant de passer à la suivante.

---

## ÉTAPE 1 — Setup du projet & Authentification

### Objectif
Structure complète du projet + système d'inscription/connexion avec UI mobile soignée.

### Structure du projet
```
budgetizer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/         # Button, Card, Input, Badge, BottomSheet…
│   │   │   ├── layout/     # BottomTabBar, Sidebar, AppShell
│   │   │   └── charts/     # composants graphiques réutilisables
│   │   ├── pages/
│   │   ├── context/        # AuthContext, ThemeContext
│   │   ├── hooks/          # useAuth, useApi, useSwipe…
│   │   ├── services/       # api.js (instance axios)
│   │   └── App.jsx
│   └── package.json
├── server/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   └── index.js
└── .env.example
```

### Backend — Modèle User
```js
{
  email: String (unique, required),
  password: String (hashé bcrypt, required),
  name: String (required),
  currency: { code: String (default: "EUR"), symbol: String (default: "€") },
  preferences: {
    theme: String (enum: ["dark", "light", "system"], default: "dark"),
    dateFormat: String (default: "DD/MM/YYYY"),
    language: String (default: "fr"),
    firstDayOfWeek: Number (default: 1)
  },
  createdAt: Date
}
```

### Backend — Routes Auth
- `POST /api/auth/register` → créer compte, seed catégories par défaut, retourner JWT + user
- `POST /api/auth/login` → connexion, retourner JWT + user
- `GET /api/auth/me` → route protégée, retourner user connecté

### Frontend — Écrans d'authentification

**Splash screen (1 seconde) :**
- Fond `#0d0d0d`, logo Budgetizer centré (icône portefeuille + texte DM Mono)
- Sous-titre "Vos finances, simplement." en gris
- Animation fade-in → fade-out

**Écran Login (mobile 375px) :**
- Header logo Budgetizer
- Titre "Bon retour 👋" + sous-titre gris
- Input email (icône Mail) + Input password (icône Lock + toggle visibilité)
- Bouton "Se connecter" pleine largeur, vert accent, 52px hauteur, radius 14px
- Lien "Pas de compte ? S'inscrire"

**Écran Register :**
- Même style, titre "Créer un compte 🚀"
- Champs : Prénom, Email, MDP, Confirmer MDP
- Indicateur de force du mot de passe (barre colorée)

### Critères de validation ✅
- [ ] Splash screen 1s au démarrage
- [ ] Inscription et connexion fonctionnelles
- [ ] JWT persisté localStorage, restauré au refresh
- [ ] Redirection automatique selon état de connexion
- [ ] Design mobile pixel-perfect 375px

---

## ÉTAPE 2 — Layout principal & Comptes

### Objectif
Shell de l'application (navigation) + gestion des comptes.

### AppShell — Layout mobile
```
┌─────────────────────────┐
│ Header contextuel (56px)│ ← titre + actions contextuelles
├─────────────────────────┤
│ Contenu scrollable      │
├─────────────────────────┤
│ Bottom Tab Bar (64px)   │ ← fixe, safe area
│ 🏠  💸  ➕  📊  👤      │
└─────────────────────────┘
```

### Modèle MongoDB — Account
```js
{
  userId: ObjectId (ref: User, required),
  name: String (required),
  type: String (enum: ["checking", "savings", "cash", "credit", "investment"]),
  balance: Number (default: 0),
  currency: String (default: "EUR"),
  color: String (default: "#4ade80"),
  icon: String (default: "wallet"),
  includeInTotal: Boolean (default: true),
  creditLimit: Number (default: null),
  order: Number (default: 0),
  createdAt: Date
}
```

### Routes API — `/api/accounts`
- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id` (et ses transactions)
- `PATCH /api/accounts/reorder`

### Frontend — Section Comptes
- Carousel horizontal (scroll-snap) de cartes style carte bancaire : 300×180px, dégradé couleur, solde centré en DM Mono 32px
- Solde total au-dessus du carousel
- Dots de pagination sous le carousel
- Bottom sheet création/édition compte : nom, type, solde initial, couleur, toggle "inclure dans le total"

### Critères de validation ✅
- [ ] Bottom tab bar + sidebar fonctionnelles
- [ ] Carousel comptes avec scroll-snap
- [ ] CRUD comptes via bottom sheet
- [ ] Solde total calculé correctement

---

## ÉTAPE 3 — Catégories

### Modèle MongoDB — Category
```js
{
  userId: ObjectId (ref: User, required),
  name: String (required),
  type: String (enum: ["expense", "income", "both"]),
  icon: String (required),   // emoji
  color: String (required),
  parentId: ObjectId (ref: Category, default: null),
  isDefault: Boolean (default: false),
  order: Number (default: 0),
  createdAt: Date
}
```

### Seed — Catégories par défaut à créer à l'inscription
```
DÉPENSES :
🍔 Alimentation (#f97316) → 🛒 Courses, 🍽️ Restaurant
🏠 Logement (#6366f1) → 🔑 Loyer, ⚡ Électricité
🚗 Transport (#14b8a6) → ⛽ Essence, 🚇 Transports en commun
🏥 Santé (#ec4899)
🎭 Loisirs (#8b5cf6) → 📺 Streaming, 🏋️ Sport
👕 Shopping (#f59e0b)
📱 Abonnements (#06b6d4)
🎓 Éducation (#84cc16)
✈️ Voyages (#3b82f6)
📦 Autre (#6b7280)

REVENUS :
💼 Salaire (#4ade80)
💻 Freelance (#4ade80)
📈 Investissements (#4ade80)
🔄 Remboursements (#4ade80)
🎁 Cadeaux (#4ade80)
💰 Autre revenu (#4ade80)
```

### Routes API — `/api/categories`
- `GET /api/categories` → liste hiérarchique imbriquée
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id` (bloqué si utilisé dans des transactions)

### Frontend — Page Catégories
- Tabs "Dépenses" / "Revenus"
- Liste avec accordion pour révéler sous-catégories
- Swipe gauche → supprimer
- Bottom sheet création : nom, type, emoji picker, couleur, parent optionnel

### Critères de validation ✅
- [ ] Seed créé automatiquement à l'inscription
- [ ] Affichage hiérarchique avec accordion
- [ ] CRUD catégories et sous-catégories
- [ ] Swipe-to-delete fonctionnel

---

## ÉTAPE 4 — Transactions

### Objectif
Le cœur de l'application : saisie rapide + liste filtrée + transactions récurrentes.

### Modèle MongoDB — Transaction
```js
{
  userId: ObjectId (ref: User, required),
  accountId: ObjectId (ref: Account, required),
  categoryId: ObjectId (ref: Category),
  type: String (enum: ["expense", "income", "transfer"], required),
  amount: Number (required, > 0),
  description: String (default: ""),
  date: Date (required, default: now),
  note: String (default: ""),
  tags: [String],

  // Transactions planifiées
  isScheduled: Boolean (default: false),
  scheduledTransactionId: ObjectId (ref: ScheduledTransaction, default: null),

  // Virement
  toAccountId: ObjectId (ref: Account, default: null),

  createdAt: Date
}
```

**Règle :** À chaque create/update/delete, recalculer et mettre à jour `account.balance`.

### Routes API — `/api/transactions`
- `GET /api/transactions?accountId=&categoryId=&type=&startDate=&endDate=&search=&page=&limit=20`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/summary?startDate=&endDate=`
- `GET /api/transactions/calendar?month=YYYY-MM` → groupé par jour
- `POST /api/transactions/import` → import CSV
- `GET /api/transactions/export?startDate=&endDate=&accountId=`

### Frontend — Page Transactions (onglet 💸)

**Header fixe :** titre + icône filtre (bottom sheet) + icône recherche (expand inline)

**Bottom sheet Filtres :**
- Chips période : "7j", "Ce mois", "3 mois", "Cette année", "Personnalisé"
- Type : chips "Tous / Dépenses / Revenus / Virements"
- Compte : checkboxes
- Catégorie : checkboxes avec emoji
- "Appliquer" + "Réinitialiser"

**Liste groupée par date** (sticky headers + mini-résumé revenus/dépenses du jour)
Chaque item : emoji catégorie dans cercle coloré · description · catégorie · compte · montant coloré
Tap → bottom sheet détail/édition · Swipe gauche → supprimer

**Infinite scroll** (20 transactions par page)

### Frontend — Bottom Sheet "Nouvelle Transaction" (bouton ➕)
```
┌─────────────────────────┐
│ ─── (drag handle)       │
│ [Dépense][Revenu][Vir.] │
│                         │
│     - 0,00 €            │  ← DM Mono 48px centré
│                         │
│ 📦 Catégorie  🏦 Compte │
│ 📅 Date       📝 Note   │
│                         │
│ [7][8][9]    [⌫]        │
│ [4][5][6]    [+/-]      │  ← clavier numérique custom
│ [1][2][3]    [,]        │
│ [000][0]     [✓]        │  ← ✓ vert, valide
└─────────────────────────┘
```
Sélection catégorie : grille 4 colonnes d'emojis dans un sub-sheet

### Critères de validation ✅
- [ ] CRUD transactions complet
- [ ] Solde du compte mis à jour automatiquement
- [ ] Filtres fonctionnels
- [ ] Bottom sheet avec clavier numérique custom
- [ ] Swipe-to-delete + infinite scroll

---

## ÉTAPE 5 — Budgets

### Modèle MongoDB — Budget
```js
{
  userId: ObjectId (ref: User, required),
  name: String (required),
  categoryId: ObjectId (ref: Category, required),
  amount: Number (required),
  period: String (enum: ["weekly", "monthly", "yearly"], default: "monthly"),
  startDate: Date,
  rollover: Boolean (default: false),
  alertAt: Number (default: 80),
  color: String,
  createdAt: Date
}
```

### Routes API — `/api/budgets`
- `GET /api/budgets?month=YYYY-MM` → avec `spent`, `remaining`, `percentage` calculés
- `POST /api/budgets`
- `PUT /api/budgets/:id`
- `DELETE /api/budgets/:id`

### Frontend — Page Budgets (onglet 📊)

**Header :** titre + sélecteur de mois (← Mai 2025 →) + icône "+"

**Card récapitulative :** total dépensé / total budgeté · barre globale · badges vert/orange/rouge

**Cartes budget :**
```
┌─────────────────────────────┐
│ 🍔 Alimentation   120€/300€ │
│ ████████████░░░░░  40%      │
│ 180€ restants · 18 jours    │
└─────────────────────────────┘
```
Barre : vert (0–69%) → orange (70–89%) → rouge (90–99%) → rouge pulse (≥100%)
Tap → détail avec liste des transactions associées

**Bottom sheet nouveau budget :** catégorie, nom, montant, période, seuil alerte (slider), toggle rollover

### Critères de validation ✅
- [ ] `spent` calculé depuis les vraies transactions
- [ ] Couleurs de barre dynamiques + animation pulse si dépassé
- [ ] CRUD budgets fonctionnel
- [ ] Navigation entre mois actualise les données

---

## ÉTAPE 6 — Dashboard (Accueil)

### Route API — `GET /api/dashboard/summary?month=YYYY-MM`
```json
{
  "totalBalance": 4250.00,
  "accounts": [...],
  "month": {
    "income": 3200.00, "expenses": 1840.00, "net": 1360.00,
    "incomeVsLastMonth": 5.2, "expensesVsLastMonth": -3.1
  },
  "dailyExpenses": [{ "date": "2025-05-01", "amount": 45.00 }],
  "expensesByCategory": [
    { "name": "Alimentation", "icon": "🍔", "color": "#f97316", "amount": 420, "percentage": 22.8 }
  ],
  "recentTransactions": [...],
  "budgetAlerts": [{ "budgetId": "...", "name": "Alimentation", "percentage": 92 }],
  "upcomingScheduled": [...]
}
```

### Frontend — Page Accueil (onglet 🏠)

**1 — Header solde total**
```
Bonjour, Prénom 👋          [🔔] [⚙️]
       Solde total
      € 4 250,00
  ▲ +1 360 € ce mois
```

**2 — Carousel de comptes** (cf. Étape 2)

**3 — Résumé du mois** (2 cartes côte à côte)
```
┌──────────────┐  ┌──────────────┐
│ ▲ Revenus    │  │ ▼ Dépenses   │
│  3 200 €     │  │  1 840 €     │
│  +5% vs N-1  │  │  -3% vs N-1  │
└──────────────┘  └──────────────┘
```

**4 — Graphique AreaChart** (Recharts, lissé, vert semi-transparent) — toggle 7j/30j

**5 — Top dépenses par catégorie** — barres de progression horizontales avec emoji + %

**6 — Transactions récentes** — 5 dernières + lien "Tout voir"

**7 — Alertes budgets** — carte ⚠️ si budgets > alertAt%

**8 — Prochaines transactions planifiées** — carte avec les 3 prochaines échéances (date + montant + description)

### Critères de validation ✅
- [ ] Tout chargé en 1 appel API
- [ ] Skeleton loaders pendant le chargement
- [ ] Graphique AreaChart interactif
- [ ] Alertes budget cliquables
- [ ] Prochaines transactions planifiées affichées

---

## ÉTAPE 7 — Calendrier

### Frontend — Page Calendrier

**Layout mobile :**
```
┌─────────────────────────┐
│ ← Mai 2025 →            │
├─────────────────────────┤
│ Lu Ma Me Je Ve Sa Di    │
│  1  2  3  4  5  6  7   │
│ •       ●          •   │  ← points colorés
│  8  9 10 11 12 13 14   │
│ [15] 16 17 18 ...      │  ← [15] = sélectionné
└─────────────────────────┤
│ Transactions du 15 mai  │
│ 🍔 Restaurant  -24,00€  │
│ 💼 Salaire  +3200,00€   │  ← panel slide-up
│ [+ Ajouter]             │
└─────────────────────────┘
```

Points colorés sous les dates :
- Point vert : revenus ce jour
- Point rouge : dépenses ce jour
- Deux points : les deux
- Taille du point proportionnelle au montant (3 tailles)

Les transactions planifiées futures apparaissent aussi dans le calendrier avec une **icône de récurrence** (🔁) et une couleur légèrement différente (teinte violette) pour les distinguer des transactions réelles.

**Route API :** `GET /api/transactions/calendar?month=YYYY-MM` → inclure les occurrences planifiées à venir

### Critères de validation ✅
- [ ] Points colorés corrects + taille proportionnelle
- [ ] Transactions planifiées futures visibles dans le calendrier (style distinct)
- [ ] Tap sur un jour → panel transactions
- [ ] Ajout transaction depuis calendrier (date pré-remplie)

---

## ÉTAPE 8 — Transactions planifiées & Abonnements

### Objectif
Permettre de planifier des transactions récurrentes (loyer, salaire, factures…) et suivre les abonnements actifs dans un dashboard dédié.

---

### 8a — Transactions planifiées

#### Concept
Une transaction planifiée est une transaction **qui se répète automatiquement** selon une fréquence définie. Elle sert à :
- **Automatiser la saisie** (le loyer mensuel, le salaire, l'abonnement Netflix sont créés automatiquement)
- **Projeter les soldes futurs** (voir combien il restera sur son compte dans 3 mois)
- **Anticiper les dépenses** avant qu'elles arrivent

#### Modèle MongoDB — ScheduledTransaction
```js
{
  userId: ObjectId (ref: User, required),
  accountId: ObjectId (ref: Account, required),
  categoryId: ObjectId (ref: Category),
  type: String (enum: ["expense", "income", "transfer"], required),
  amount: Number (required),
  description: String (required),
  note: String (default: ""),

  // Récurrence
  frequency: {
    every: Number (required, default: 1),       // ex: 2
    unit: String (enum: ["day", "week", "month", "year"], required)  // ex: "month" → tous les 2 mois
  },
  startDate: Date (required),
  numberOfTimes: Number (default: 0),           // 0 = indéfini
  timesExecuted: Number (default: 0),
  nextDate: Date (required),                    // prochaine occurrence calculée
  endDate: Date (default: null),

  // Confirmation
  autoConfirm: Boolean (default: true),
  // true → transaction créée automatiquement à la date
  // false → l'utilisateur doit confirmer manuellement (utile pour montants variables)

  // Abonnement
  isSubscription: Boolean (default: false),

  // Virement
  toAccountId: ObjectId (ref: Account, default: null),

  isActive: Boolean (default: true),
  createdAt: Date
}
```

#### Logique de génération des transactions
Créer un **job de traitement** (fonction appelée au démarrage du serveur + toutes les heures via `setInterval` ou `node-cron`) :
```
Pour chaque ScheduledTransaction active :
  Si nextDate <= aujourd'hui ET (numberOfTimes === 0 OU timesExecuted < numberOfTimes) :
    Si autoConfirm === true :
      → Créer la Transaction correspondante
      → Mettre à jour le solde du compte
      → Incrémenter timesExecuted
      → Calculer et mettre à jour nextDate
      → Si numberOfTimes > 0 ET timesExecuted >= numberOfTimes : isActive = false
    Si autoConfirm === false :
      → Créer une "transaction en attente" (isPending: true)
      → Notifier l'utilisateur (badge sur l'onglet Transactions planifiées)
```

#### Routes API — `/api/scheduled`
- `GET /api/scheduled` → liste des transactions planifiées actives
- `GET /api/scheduled/pending` → transactions en attente de confirmation
- `POST /api/scheduled` → créer une transaction planifiée
- `PUT /api/scheduled/:id` → modifier (si on modifie le montant/fréquence, recalculer nextDate)
- `DELETE /api/scheduled/:id` → supprimer (et les occurrences futures non encore confirmées)
- `POST /api/scheduled/:id/confirm` → confirmer une transaction en attente (peut modifier le montant avant confirmation)
- `POST /api/scheduled/:id/skip` → ignorer l'occurrence en attente, passer à la suivante
- `GET /api/scheduled/upcoming?days=30` → prochaines occurrences sur N jours

#### Frontend — Page "Transactions planifiées"

**Header :** "Transactions planifiées" + icône "+" (créer nouvelle)

**Badge de notification** sur l'icône de navigation si des transactions sont en attente de confirmation.

**Section "En attente de confirmation"** (si autoConfirm = false) :
```
┌─────────────────────────────────────┐
│ ⏳ 2 transactions à confirmer        │
│                                     │
│ 🏠 Loyer · 1 mai               -800€│
│ [Confirmer] [Modifier montant] [↩︎]  │
│                                     │
│ 💡 EDF · 3 mai                 -95€ │
│ [Confirmer] [Modifier montant] [↩︎]  │
└─────────────────────────────────────┘
```
- Bouton "Confirmer" → crée la transaction immédiatement
- Bouton "Modifier montant" → bottom sheet avec input montant pré-rempli, puis confirmer
- Bouton ↩︎ (skip) → ignore cette occurrence, recalcule la prochaine

**Section "Transactions planifiées actives"** :
Liste de toutes les transactions planifiées, groupées par fréquence ("Mensuel", "Annuel", etc.)

Chaque item :
```
┌─────────────────────────────────────┐
│ 🏠 Loyer           -800,00 €       │
│ 📅 Tous les mois · Prochain: 1 juin │
│ 🔄 Indéfini  ⚡ Auto-confirmé       │
└─────────────────────────────────────┘
```
- Tap → bottom sheet de détail/édition
- Swipe gauche → supprimer (avec confirmation "Supprimer uniquement cette occurrence ou toutes les suivantes ?")

**Bottom sheet — Nouvelle transaction planifiée :**
```
Tabs : [Dépense] [Revenu] [Virement]

Montant (clavier numérique custom)
Description
Catégorie
Compte
Date de départ (date picker)

── Récurrence ──────────────────
"Se répète tous les" [1] [Mois ▾]
"Nombre de fois" [0 = indéfini]
"Date de fin" (optionnel)

── Options ─────────────────────
Toggle "Confirmation automatique"
  ↳ Si OFF : texte explicatif
    "Vous serez notifié pour confirmer
     chaque occurrence (utile pour les
     montants qui varient)"
Toggle "C'est un abonnement"
  ↳ Si ON : apparaît dans le dashboard Abonnements
```

---

### 8b — Abonnements

#### Concept
Le dashboard Abonnements est une **vue filtrée des transactions planifiées** où `isSubscription: true`. Il offre une vision claire de tous les services payants récurrents (Netflix, Spotify, gym…) avec leur coût cumulé et leur prochain prélèvement.

Il n'y a **pas de modèle séparé** : les abonnements s'appuient entièrement sur `ScheduledTransaction` avec `isSubscription: true`. Le nom affiché est pris depuis le champ `note` (sinon `description`).

#### Frontend — Page "Abonnements"

**Header :** "Abonnements" + icône "+" (crée une nouvelle transaction planifiée avec `isSubscription: true` pré-coché)

**Card récapitulative en haut :**
```
┌───────────────────────────────────────┐
│ 💳 Total abonnements                  │
│ 47,97 € / mois                        │
│ 575,64 € / an                         │
│ [N actifs]                            │
└───────────────────────────────────────┘
```

**Liste des abonnements :**
Chaque carte d'abonnement :
```
┌─────────────────────────────────────────┐
│ 📺 Netflix                  15,99 €/mois│
│ Prochain: 15 juin 2025                  │
│ ████████████████░░░░  Cycle: 78%        │
│ Total payé cette année: 95,94 €         │
└─────────────────────────────────────────┘
```
- **Barre de progression du cycle de facturation** : représente le temps écoulé dans le cycle en cours (0% = lendemain du dernier paiement, 100% = veille du prochain paiement)
- Quand la barre atteint 100%, elle pulse en orange pour indiquer que le prélèvement est imminent
- Tap → bottom sheet avec : historique des paiements + bouton "Modifier" + bouton "Résilier" (supprime la planification)
- Swipe gauche → "Résilier" avec confirmation

**Tri disponible :** par montant (↓), par prochain paiement (↑), par nom (A→Z)

**Détail d'un abonnement (bottom sheet) :**
```
📺 Netflix
Mensuel · 15,99 €

Prochain paiement : 15 juin 2025
Barre de cycle : ████████████████░░░

Depuis : octobre 2023
Total payé : 303,81 €

Historique :
  15 mai 2025   -15,99 €  ✓
  15 avr. 2025  -15,99 €  ✓
  15 mar. 2025  -15,99 €  ✓
  ...

[Modifier] [Résilier]
```

#### Critères de validation ✅ (Étape 8)
- [ ] Le job de génération tourne correctement (toutes les heures)
- [ ] Les transactions autoConfirm sont créées automatiquement
- [ ] Les transactions manuelles apparaissent en attente avec boutons Confirmer/Skip
- [ ] La modification du montant avant confirmation fonctionne
- [ ] Les transactions planifiées apparaissent dans le calendrier (style distinct 🔁)
- [ ] Le dashboard Abonnements affiche le coût mensuel/annuel total
- [ ] La barre de cycle est correcte pour chaque abonnement
- [ ] Swipe-to-delete avec confirmation "occurrence seule ou toutes les suivantes"

---

## ÉTAPE 9 — Graphiques

### Objectif
Trois vues analytiques avancées accessibles depuis la section "Graphiques" de la navigation.

---

### 9a — Graphique Par catégorie

#### Concept
Visualisation de la répartition des dépenses (ou revenus) par catégorie principale, avec drill-down possible vers les sous-catégories et les transactions sous-jacentes.

#### Route API — `GET /api/charts/by-category?startDate=&endDate=&type=expense`
```json
{
  "total": 1840.00,
  "categories": [
    {
      "categoryId": "...",
      "name": "Alimentation",
      "icon": "🍔",
      "color": "#f97316",
      "amount": 420.00,
      "percentage": 22.8,
      "subcategories": [
        { "name": "Restaurant", "icon": "🍽️", "amount": 280.00, "percentage": 15.2 },
        { "name": "Courses", "icon": "🛒", "amount": 140.00, "percentage": 7.6 }
      ],
      "changeVsPreviousPeriod": +5.2
    }
  ]
}
```

#### Frontend — Page "Par catégorie"

**Sélecteurs en haut :**
- Période : chips "Ce mois / 3 mois / 6 mois / Cette année / Personnalisé"
- Type : toggle "Dépenses / Revenus"
- Comparaison : toggle "Vs période précédente"

**Graphique principal : Recharts PieChart (donut)**
- Innerradius 60, outerRadius 100
- Chaque slice colorée selon `category.color`
- Tap sur une slice → **drill-down** : le graphique se re-render avec les sous-catégories de la catégorie sélectionnée, + bouton retour "← Toutes les catégories"
- Tooltip custom : nom + montant + %
- Animation d'entrée des slices (stagger)

**Liste sous le graphique :**
```
🍔 Alimentation    420€   22,8%  ▲+5%
🏠 Logement        800€   43,5%  ━
🚗 Transport       180€    9,8%  ▼-2%
...
```
- Tap sur une ligne → drill-down dans les sous-catégories
- En mode drill-down : tap sur une sous-catégorie → **bottom sheet avec la liste des transactions** de cette sous-catégorie sur la période

**Résumé comparaison (si toggle activé) :**
- Card "Période actuelle vs précédente" : +X€ / -Y%

---

### 9b — Graphique Futur (Time Future)

#### Concept
Visualisation des finances **à venir** basée sur les transactions planifiées existantes. Permet de voir l'impact des prochaines factures sur le solde avant qu'elles arrivent. Inclut 4 types de données :
1. Transactions futures (date future, saisies manuellement)
2. Occurrences planifiées (générées depuis les ScheduledTransactions)
3. Transactions en attente de confirmation
4. Solde projeté (cumulatif)

#### Route API — `GET /api/charts/future?startDate=&endDate=&accountId=`
```json
{
  "periods": [
    {
      "label": "Juin 2025",
      "date": "2025-06-01",
      "income": 3200.00,
      "expenses": 1250.00,
      "net": 1950.00
    }
  ],
  "projectedBalance": [
    { "date": "2025-06-01", "balance": 6200.00 },
    { "date": "2025-06-15", "balance": 5400.00 },
    ...
  ],
  "futureTransactions": [
    {
      "date": "2025-06-01",
      "description": "Salaire",
      "amount": 3200.00,
      "type": "income",
      "source": "scheduled"  // "manual" | "scheduled" | "pending"
    }
  ]
}
```

#### Frontend — Page "Futur"

**Sélecteurs en haut :**
- Horizon : chips "1 mois / 3 mois / 6 mois / 12 mois"
- Compte : select (un compte ou tous)

**Section 1 — BarChart revenus/dépenses futurs :**
- Recharts BarChart groupé : barres vertes (revenus) + rouges (dépenses) par mois
- Légende "Prévu" avec une texture légèrement striée pour indiquer que ce sont des prévisions

**Section 2 — Courbe de solde projeté :**
- Recharts AreaChart (ligne pointillée pour indiquer le caractère prévisionnel)
- La partie "passé" (aujourd'hui et avant) est pleine et solide
- La partie "futur" est en pointillés avec une aire semi-transparente
- Ligne verticale "Aujourd'hui" qui sépare passé et futur
- Tooltip : date + solde projeté + liste des transactions de ce jour

**Section 3 — Liste des transactions futures :**
- Liste chronologique de toutes les occurrences futures
- Badge de source : "🔁 Planifié" en violet / "⏳ En attente" en orange / "📅 Futur" en bleu
- Organisée par mois avec séparateurs
- Tap sur un item → bottom sheet de détail (avec bouton pour modifier la transaction planifiée source)

---

### 9c — Graphique Prévisions (Forecast)

#### Concept
Estimation du flux de trésorerie futur basée sur les **données passées** (algorithmes statistiques). Différent du graphique "Futur" qui se base sur les transactions planifiées : ici, c'est une **projection statistique** à partir de l'historique.

4 méthodes de prévision disponibles :
- **Régression linéaire** *(recommandé)* : idéal pour revenus stables. Calcule la tendance de fond.
- **Moyenne simple** : pour les revenus financiers importants et irréguliers.
- **Moyenne pondérée** : comme la moyenne, mais donne plus de poids aux données récentes.
- **Moyenne mobile** : lissage sur une fenêtre glissante. Pour revenus irréguliers.

#### Route API — `GET /api/charts/forecast?months=6&method=regression&accountId=`
```json
{
  "method": "regression",
  "historicalData": [
    { "month": "2024-12", "income": 3100, "expenses": 1750, "balance": 1350 }
  ],
  "forecast": [
    {
      "month": "2025-06",
      "projectedIncome": 3280,
      "projectedExpenses": 1820,
      "projectedNet": 1460,
      "confidenceInterval": { "low": 1200, "high": 1720 }
    }
  ],
  "trend": "positive"  // "positive" | "negative" | "stable"
}
```

**Calcul côté serveur (pas de librairie externe, algorithmes simples) :**

*Régression linéaire :*
```js
// Sur les N derniers mois de données :
// x = index du mois (0, 1, 2...), y = montant
// slope = (N*Σxy - Σx*Σy) / (N*Σx² - (Σx)²)
// intercept = (Σy - slope*Σx) / N
// Projeter : y_futur = slope * x_futur + intercept
```

*Moyenne simple :* moyenne arithmétique des N derniers mois

*Moyenne pondérée :* poids[i] = i+1 (les plus récents ont plus de poids)

*Moyenne mobile :* moyenne des K dernières valeurs (fenêtre glissante, K=3 par défaut)

#### Frontend — Page "Prévisions"

**Sélecteurs en haut :**
- Méthode : 4 boutons radio stylisés avec description courte
  ```
  ● Régression   ○ Moyenne   ○ Moy. pondérée   ○ Moy. mobile
  Recommandée     Revenus      Récents+         Irréguliers
  ```
- Horizon : chips "3 mois / 6 mois / 12 mois"
- Compte : select

**Card d'explication** (contextuelle selon la méthode) :
```
ℹ️ Régression linéaire
Idéale si vos revenus sont stables.
Calcule la tendance de fond de vos finances.
```

**Graphique principal — Recharts ComposedChart :**
- **Barres grises transparentes** : données historiques (revenus et dépenses réels)
- **Ligne verte pleine** : solde réel (historique)
- **Ligne verte pointillée** : solde projeté (futur)
- **Zone de confiance** : aire semi-transparente entre `confidenceInterval.low` et `confidenceInterval.high`
- Ligne verticale "Aujourd'hui"
- La transition passé/futur est visuellement distincte (couleurs légèrement différentes)

**Card récapitulative sous le graphique :**
```
📈 Tendance : Positive
Dans 6 mois, votre solde estimé sera :
€ 12 560,00
(±750 € selon la méthode choisie)
```

**Avertissement de bas de page :**
```
⚠️ Ces prévisions sont des estimations basées sur
vos données passées. Elles peuvent différer
significativement de la réalité.
```

#### Critères de validation ✅ (Étape 9)
- [ ] **Par catégorie** : PieChart avec drill-down vers sous-catégories + liste transactions
- [ ] **Par catégorie** : variation vs période précédente affichée
- [ ] **Futur** : BarChart + AreaChart avec données planifiées
- [ ] **Futur** : distinction visuelle passé/futur (pointillé)
- [ ] **Futur** : badges de source sur la liste (Planifié/En attente/Futur)
- [ ] **Prévisions** : les 4 méthodes de calcul sont implémentées côté serveur
- [ ] **Prévisions** : zone de confiance affichée sur le graphique
- [ ] **Prévisions** : card récapitulative avec tendance
- [ ] **Prévisions** : avertissement visible

---

## ÉTAPE 10 — Rapports, Import/Export CSV & Paramètres

### 10a — Rapports

**Page `/reports` — accessible depuis la sidebar :**

Sélecteur période (chips) + sélecteur compte

**Section 1 — Revenus vs Dépenses** : BarChart groupé par mois (12 derniers)
**Section 2 — Solde cumulé** : AreaChart évolution du solde net
**Section 3 — Top dépenses par catégorie** : PieChart + tableau emoji/nom/montant/barre/%
**Section 4 — Top 10 transactions** : plus grosses dépenses de la période

Routes API :
- `GET /api/reports/overview?startDate=&endDate=`
- `GET /api/reports/by-category?startDate=&endDate=`
- `GET /api/reports/balance-history?startDate=&endDate=`

---

### 10b — Import/Export CSV

**Import** (menu Transactions → "Importer") :
- Dropzone + format attendu : `date,description,amount,type,category,account`
- Preview 5 premières lignes
- Rapport : "✓ X importées, Y erreurs"
- `POST /api/transactions/import`

**Export** (Paramètres) :
- Filtre optionnel compte + période
- `GET /api/transactions/export?startDate=&endDate=&accountId=`

---

### 10c — Paramètres (onglet 👤)

**Style liste iOS/Android :**
```
[Avatar initiales]
Prénom NOM · email
[Modifier le profil]

PRÉFÉRENCES
  Devise             EUR €  >
  Format de date     JJ/MM/AAAA  >
  Thème              Sombre  >
  Langue             Français  >
  1er jour semaine   Lundi  >

COMPTE
  Changer le MDP  >

DONNÉES
  Importer CSV  >
  Exporter CSV  >

DANGER
  [Effacer toutes les données]
  [Supprimer mon compte]
```

Routes API :
- `PUT /api/users/profile`
- `PUT /api/users/password`
- `PUT /api/users/preferences`
- `DELETE /api/users/me` (cascade : accounts + transactions + scheduled + categories + budgets)

### Critères de validation ✅ (Étape 10)
- [ ] Rapports dynamiques selon les filtres
- [ ] Import CSV avec rapport d'erreurs
- [ ] Export CSV téléchargeable
- [ ] Changement de thème immédiat + persisté
- [ ] Suppression compte en cascade complète

---

## 🔧 Configuration technique globale

### Variables d'environnement (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/budgetizer
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
VITE_API_URL=http://localhost:5000/api
SCHEDULED_JOB_INTERVAL_MS=3600000   # 1 heure
```

### Dépendances Backend
```json
{
  "dependencies": {
    "express": "^4.18",
    "mongoose": "^8.0",
    "bcryptjs": "^2.4",
    "jsonwebtoken": "^9.0",
    "cors": "^2.8",
    "dotenv": "^16.0",
    "multer": "^1.4",
    "csv-parse": "^5.0",
    "express-validator": "^7.0",
    "morgan": "^1.10",
    "node-cron": "^3.0"
  }
}
```

### Dépendances Frontend
```json
{
  "dependencies": {
    "react": "^18",
    "react-router-dom": "^6",
    "axios": "^1.6",
    "recharts": "^2.10",
    "lucide-react": "^0.400",
    "framer-motion": "^11",
    "date-fns": "^3.0",
    "react-hot-toast": "^2.4"
  }
}
```

### Sécurité
- Toutes routes `/api/**` sauf `/api/auth/*` protégées par middleware JWT
- Toutes les queries MongoDB filtrent par `userId`
- Passwords hashés bcrypt (saltRounds: 12)
- Validation côté serveur (express-validator)

---

## 📱 Composants UI réutilisables (créer dès Étape 1)

```
components/ui/
├── Button.jsx           → primary, secondary, danger, ghost, icon
├── Card.jsx             → fond surface + radius 16px + padding
├── Input.jsx            → label flottant + icône optionnelle
├── BottomSheet.jsx      → slide-up + drag handle + overlay flouté (Framer Motion)
├── Badge.jsx            → tag coloré (catégorie, type, source)
├── ProgressBar.jsx      → épaisse, colorée, animation pulse si > 100%
├── AmountDisplay.jsx    → montant DM Mono, rouge/vert selon signe
├── SkeletonLoader.jsx   → placeholder animé
├── EmptyState.jsx       → illustration + message + CTA
├── SwipeableItem.jsx    → wrapper swipe-to-delete
├── NumericKeypad.jsx    → clavier numérique custom (réutilisé partout)
├── PeriodSelector.jsx   → chips de sélection de période
├── CategoryPicker.jsx   → grille d'emojis catégories dans sub-sheet
└── ChartCard.jsx        → card wrapper pour les graphiques Recharts
```

---

## 📝 Instructions générales pour le vibe coding

1. **Mobile d'abord** : code toujours le layout 375px en premier, puis adapte 640px et 1024px.

2. **Étape par étape** : backend (model → routes → controller) puis frontend. Valide les critères avant de passer à la suivante.

3. **Bottom sheets partout** sur mobile. Framer Motion : `y: "100%"` → `y: 0`.

4. **Feedback immédiat** : toast (react-hot-toast) pour chaque action. Skeleton loaders sur chaque appel API.

5. **DM Mono pour tous les montants** sans exception.

6. **Gestion d'erreurs** : try/catch sur toutes les routes. Messages clairs côté client.

7. **Job planifié** : lancer le job de génération des transactions au démarrage du serveur avec `node-cron` (toutes les heures). Logger chaque exécution avec le nombre de transactions générées.

8. **Pas de `console.log`** en production. Code propre et commenté.

9. **Atomic commits** : commit après chaque fonctionnalité complète et testée.

---

*Prompt généré pour **Budgetizer** — Clone mobile-first de Fast Budget*
*Stack : React + Node.js + MongoDB · 10 étapes · Dark design*
*Modules : Auth · Comptes · Catégories · Transactions · Budgets · Dashboard · Calendrier · Transactions planifiées · Abonnements · Graphiques (Par catégorie + Futur + Prévisions) · Rapports*
