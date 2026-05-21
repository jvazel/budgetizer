# Documentation Fonctionnelle — Budgetizer 💰

Cette documentation détaille les fonctionnalités, les parcours utilisateurs et les règles de gestion de l'application Budgetizer.

---

## 1. Objectifs de l'application

Budgetizer est conçue pour aider les utilisateurs à reprendre le contrôle de leurs finances personnelles grâce à une interface ergonomique et vivante. Contrairement aux outils traditionnels (tableurs ou applications bancaires austères), Budgetizer met l'accent sur :
- La **saisie fluide et rapide** des transactions (optimisée pour mobile).
- La **visibilité à court et moyen terme** via des courbes de projection de solde.
- La **planification proactive** plutôt que le simple constat des dépenses passées, grâce à des enveloppes budgétaires et à un suivi rigoureux des abonnements.

---

## 2. Gestion des Comptes & Authentification

### 2.1 Inscription & Connexion
L'accès à l'application est sécurisé et nécessite un compte utilisateur.
- **Formulaire d'inscription** : Demande le nom complet, l'adresse e-mail et un mot de passe sécurisé. À la création du compte, des préférences par défaut (thème sombre, devise EUR €, langue française) sont appliquées.
- **Formulaire de connexion** : Permet de s'identifier pour obtenir un jeton de session JWT.

### 2.2 Préférences de l'Utilisateur
Depuis la page **Paramètres**, l'utilisateur peut personnaliser :
- **La Devise** : Devise par défaut de ses comptes (EUR, USD, etc.).
- **Le Thème** : Mode sombre (recommandé pour le style premium), mode clair ou alignement sur le système.
- **Le Format de date** : Format d'affichage dans les listes et rapports.
- **Le Premier jour de la semaine** : Lundi (valeur par défaut) ou Dimanche.

---

## 3. Le Tableau de Bord (Dashboard)

Le tableau de bord est la page d'accueil principale après connexion. Il regroupe les informations de synthèse financière indispensables :

- **Solde Net Global** : Affiche la somme des soldes de tous les comptes actifs inclus dans le total.
- **Carrousel des Comptes** : Présentation visuelle horizontale de chaque compte sous forme de carte bancaire stylisée. Chaque carte affiche :
  - Le nom du compte.
  - Le solde actuel.
  - La couleur personnalisée associée.
  - Un indicateur visuel du type de compte (carte, coffre-fort, etc.).
- **Formulaire d'ajout rapide (Action Sheet)** : Un bouton d'action flottant central permet d'ouvrir instantanément un panneau de saisie rapide (Bottom Sheet) pour ajouter une transaction (Dépense, Revenu ou Virement interne) sans quitter l'écran d'accueil.
- **Aperçu des Transactions Récentes** : Liste chronologique des dernières transactions saisies ou confirmées.
- **Mini-Calendrier** : Vue compacte affichant les transactions et les échéances planifiées à venir pour la semaine en cours.

---

## 4. Gestion des Comptes Bancaires

Budgetizer permet de gérer plusieurs comptes pour refléter fidèlement la réalité financière de l'utilisateur.

### 4.1 Types de Comptes supportés
Chaque compte possède un type spécifique qui influe sur son comportement et son icône :
- **Checking (Compte Courant)** : Utilisé pour les dépenses quotidiennes.
- **Savings (Compte d'Épargne)** : Destiné aux réserves et aux projets d'épargne.
- **Cash (Espèces)** : Suivi du liquide disponible.
- **Credit (Carte de Crédit)** : Compte avec une limite de crédit et un solde négatif potentiel.
- **Investment (Investissement)** : Suivi des portefeuilles boursiers ou placements.

### 4.2 Options de Configuration des Comptes
Lors de la création ou de la modification d'un compte, l'utilisateur définit :
- **Nom du compte** (ex: "Compte Joint", "Livret A").
- **Solde Initial** (le montant présent au moment du démarrage de l'application).
- **Couleur et Icône** pour une identification visuelle rapide.
- **Inclure dans le Total (Oui/Non)** : Permet d'exclure certains comptes (ex: comptes bloqués, investissements long terme) du calcul du solde net affiché sur le Dashboard.
- **Limite de Crédit** (uniquement pour les comptes de type `Credit`).

---

## 5. Gestion des Catégories

Pour analyser finement la répartition des flux d'argent, chaque transaction (hors virement interne) est associée à une catégorie.

- **Types de Catégories** : Une catégorie peut être spécifiquement liée aux **Dépenses** (ex: Alimentation, Loyer), aux **Revenus** (ex: Salaire, Dividendes), ou aux **Deux** (both).
- **Sous-catégories** : Possibilité de créer des hiérarchies (catégories parentes et enfants) pour regrouper des sous-budgets (ex: sous-catégorie "Restaurant" sous la catégorie parente "Alimentation").
- **Personnalisation** : Choix d'une couleur et d'une icône parmi une bibliothèque prédéfinie.

---

## 6. Saisie de Transactions & Pavé Numérique

La saisie est simplifiée au maximum grâce à une interface de type "Bottom Sheet" glissante, dotée d'un **pavé numérique virtuel** optimisé :
- **Sélection du type** : Dépense (Rouge), Revenu (Vert) ou Virement (Bleu).
- **Saisie du Montant** : Saisie à l'aide d'un pavé numérique visuel personnalisé évitant l'ouverture du clavier natif du téléphone, ce qui accélère la saisie d'un montant avec décimales.
- **Sélection des Comptes** :
  - Pour une dépense/revenu : le compte source ou destinataire.
  - Pour un virement : le compte de départ (`From`) et le compte d'arrivée (`To`).
- **Métadonnées** : Date de la transaction, catégorie (automatiquement filtrée selon le type de flux), note textuelle facultative et tags (ex: `#vacances`, `#cadeau`).

---

## 7. Planification Budgétaire (Enveloppes)

La gestion de budget repose sur le système des enveloppes mensuelles ou périodiques.

- **Configuration d'un Budget** :
  - **Catégorie cible** : Le budget s'applique aux dépenses de cette catégorie (et ses sous-catégories).
  - **Montant limite** : Somme maximale allouée pour la période.
  - **Périodicité** : Hebdomadaire, Mensuelle ou Annuelle.
  - **Report de solde (Rollover)** : Si activé, l'argent non dépensé à la fin d'une période est ajouté au budget de la période suivante. Si le solde était négatif (dépassement), il est également reporté pour réduire le budget disponible le mois suivant.
- **Alertes de Dépassement** : Un indicateur visuel (progress bar changeant de couleur du vert vers le rouge) et un avertissement s'activent lorsque les dépenses d'une catégorie atteignent un pourcentage configuré du budget (par défaut 80%).

---

## 8. Transactions Planifiées & Abonnements

Certaines dépenses ou certains revenus se répètent régulièrement. Budgetizer automatise ces saisies pour éviter les oublis et permettre des prévisions fiables.

### 8.1 Planification de Transactions
L'utilisateur configure une transaction récurrente avec les paramètres suivants :
- **Fréquence** : Intervalle personnalisé (ex: tous les 1 `mois`, toutes les 2 `semaines`, tous les 3 `jours`).
- **Date de début** et **Date de fin** (optionnelle).
- **Nombre d'occurrences max** (optionnel, ex: prêt sur 24 mois).
- **Auto-confirmer (Oui/Non)** :
  - **Si Oui** : La transaction est automatiquement ajoutée à l'historique et le solde du compte mis à jour dès que la date d'échéance arrive.
  - **Si Non** : La transaction apparaît en attente de validation (Pending) dans l'interface. L'utilisateur doit cliquer pour valider l'exécution réelle (débit ou crédit effectif sur son compte) ou la rejeter.

### 8.2 Suivi des Abonnements (Subscriptions)
Les abonnements (Netflix, électricité, salle de sport) sont des cas particuliers de transactions planifiées.
- Un écran dédié **Abonnements** liste l'ensemble des services récurrents actifs.
- L'application calcule le **coût cumulé mensuel** et **annuel** de tous les abonnements pour aider l'utilisateur à prendre conscience de sa charge fixe récurrente.

---

## 9. Graphiques et Analyses Prévisionnelles

La page **Statistiques (Charts)** propose des visualisations interactives basées sur les données réelles et planifiées :

- **Répartition Categorielle (Pie Chart)** : Permet de voir en un coup d'œil où part l'argent (ex: 40% Alimentation, 20% Logement).
- **Graphique d'Évolution (Area/Line Chart)** : Historique de l'évolution du solde cumulé des comptes au fil des jours.
- **Prévisions à 30 jours (Forecast)** : Graphique combinant l'historique récent et projetant l'évolution des comptes sur les 30 prochains jours. Ce calcul prend en compte :
  - Les transactions planifiées à venir (abonnements, salaires prévus).
  - La moyenne quotidienne des dépenses courantes non planifiées estimée sur les mois passés.

---

## 10. Import et Export de Données

Pour garantir la réappropriation et la sauvegarde de ses données, l'utilisateur a accès aux outils d'import/export :
- **Export CSV / JSON** : Téléchargement d'un fichier contenant toutes les transactions enregistrées avec leurs métadonnées (date, compte, montant, type, catégorie, tags, note).
- **Import de fichier** : Possibilité de charger un fichier d'historique de transactions pour alimenter rapidement l'application lors du premier démarrage ou après une réinitialisation.
