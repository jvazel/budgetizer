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
- **Branding & Logo** : Pour assurer une identité visuelle homogène, le logo officiel de l'application (`/pwa-192x192.png`) est affiché sur l'écran d'accueil de chargement (Splash Screen) et sur l'ensemble des pages d'authentification (Connexion, Inscription, Récupération et Réinitialisation de mot de passe) à la place des icônes génériques de portefeuille.
- **Formulaire d'inscription** : Demande le nom complet, l'adresse e-mail et un mot de passe sécurisé. À la création du compte, des préférences par défaut (thème sombre, devise EUR €, langue française, seuil d'anomalie à 30%) sont appliquées.
- **Formulaire de connexion** : Permet de s'identifier pour obtenir un jeton de session JWT.

### 2.2 Préférences de l'Utilisateur
Depuis la page **Paramètres**, l'utilisateur peut personnaliser :
- **La Devise** : Devise par défaut de ses comptes (EUR, USD, etc.).
- **Le Thème** : Mode sombre (recommandé pour le style premium), mode clair ou alignement sur le système.
- **Le Format de date** : Format d'affichage dans les listes et rapports.
- **Le Premier jour de la semaine** : Lundi (valeur par défaut) ou Dimanche.
- **Le Seuil d'anomalie** : Seuil de sensibilité (par défaut +30%) pour la détection de dépenses anormales dans l'onglet Conseils. Cette préférence est sauvegardée de manière persistante sur son profil.

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
- **Menu de Navigation Latéral (Tiroir Burger)** : Un menu coulissant moderne et sans bordure (borderless) est accessible depuis le bouton en haut à gauche. Il centralise les raccourcis vers tous les modules (Accueil, Transactions, Catégories, Budgets, Échéances, Abonnements, Statistiques, Conseils, Paramètres) et intègre des effets de halo lumineux (glow flares) et des flous (backdrop-blur) pour un design premium sombre et immersif.
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

## 6. Saisie & Historique des Transactions

Cette section regroupe la création rapide de transactions et la consultation de l'historique complet.

### 6.1 Saisie de Transactions & Clavier Mobile Natif
La saisie est simplifiée au maximum grâce à une interface de type "Bottom Sheet" glissante, dotée d'une zone de saisie de montant optimisée pour mobile :
- **Sélection du type** : Dépense (Rouge), Revenu (Vert) ou Virement (Bleu).
- **Saisie du Montant** : Saisie à l'aide d'un champ texte dédié configuré avec `inputMode="decimal"`. Sur mobile, cela déclenche automatiquement le clavier numérique décimal natif du téléphone. Le champ formate automatiquement l'entrée (conversion de la virgule `,` en point `.`, limitation stricte à deux chiffres après la virgule, suppression des zéros initiaux) pour une saisie rapide et robuste.
- **Sélection des Comptes** :
  - Pour une dépense/revenu : le compte source ou destinataire.
  - Pour un virement : le compte de départ (`From`) et le compte d'arrivée (`To`).
- **Métadonnées** : Date de la transaction, catégorie (automatiquement filtrée selon le type de flux), note textuelle facultative et tags (ex: `#vacances`, `#cadeau`).

### 6.2 Liste Complète des Transactions
Accessible via l'option "Transactions" du menu de navigation :
- **Filtres et Recherche** : Consultation globale avec possibilité de filtrer par compte, catégorie, plage de dates ou recherche de mots-clés dans la description ou les notes.
- **Gestion** : Possibilité de modifier ou supprimer directement chaque transaction.
- **Ergonomie Mobile** : Afin d'éviter la troncature des libellés et d'assurer une lecture fluide sur petits écrans, l'étiquette du compte bancaire (badge coloré) est empilée verticalement sous la catégorie, libérant de l'espace horizontal pour l'intitulé et le montant. Une infobulle (title html) s'affiche au survol/toucher pour lire le libellé complet si besoin.

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

---

## 11. Support de Progressive Web App (PWA) & Mode Hors Ligne

Budgetizer est pleinement compatible PWA, ce qui permet de l'utiliser comme une application native sur tous les types d'appareils.

### 11.1 Installation de l'Application
L'application propose des mécanismes d'installation adaptés à chaque plateforme :
- **Bannière d'installation dynamique** : Sur les navigateurs compatibles (Chrome, Edge sur PC/Android), un bandeau personnalisé s'affiche au bas de l'écran (sur la page d'accueil ou les paramètres) pour installer l'application d'un simple clic.
- **Support iOS (Safari)** : Pour les utilisateurs d'iPhone/iPad, la bannière d'installation fournit des instructions visuelles explicites guidant l'utilisateur pour ajouter l'application à l'écran d'accueil via le bouton d'action de Safari ("Sur votre iPhone/iPad : appuyez sur le bouton de partage, puis sur 'Sur l'écran d'accueil'").
- **Indicateurs dans les Paramètres** : Une section dédiée dans l'onglet **Paramètres** affiche l'état d'installation de l'application et permet de déclencher l'installation si elle n'est pas encore installée.

### 11.2 Détection de Connexion & Notification Hors Ligne
Afin de préserver l'expérience utilisateur lors des coupures de réseau :
- **Toast de Statut Réseau** : Une notification visuelle glisse depuis le haut de l'écran en cas de perte de connexion réseau ("Mode hors ligne").
- **Mode Dégradé** : L'utilisateur est informé que les données affichées sont temporairement limitées à celles mises en cache par le navigateur.
- **Rétablissement de Connexion** : Dès que le réseau est de nouveau disponible, un toast vert s'affiche ("Connexion rétablie - Synchronisation réussie") et le client recharge automatiquement les données fraîches depuis l'API.

---

## 12. IA & Conseils Personnalisés (Insights)

La fonctionnalité **Conseils** (IA & Insights) offre des analyses intelligentes sur le comportement de dépenses pour aider l'utilisateur à économiser.

### 12.1 Détection d'anomalies de dépenses
- **Logique de calcul** : L'application compare les dépenses du mois en cours avec la moyenne mensuelle par catégorie calculée sur les 3 derniers mois complets.
- **Seuil de déclenchement** : Une alerte est générée si les dépenses du mois en cours dépassent la moyenne historique de plus d'un certain seuil (par défaut +30%, configurable par l'utilisateur).
- **Fiabilité des données** : Pour éviter les faux positifs, l'algorithme ignore les catégories qui n'ont pas au moins 2 mois d'activité historique dans la période de calcul. De même, les comptes ayant moins de 2 mois d'activité totale sont informés que l'historique est insuffisant.
- **Niveau de sévérité visuel** :
  - **Dépassement de +30% à +60%** : Alerte de couleur Orange (sensibilité modérée).
  - **Dépassement de +60% et plus** : Alerte de couleur Rouge (dérive critique).

### 12.2 Suggestions de réduction de dépenses
- **Postes majeurs** : L'algorithme isole le Top 3 des catégories où les dépenses ont été les plus importantes au cours des 3 derniers mois complets.
- **Simulations interactives** : Pour chaque catégorie majeure, l'utilisateur peut simuler des baisses de budget de 10%, 20%, et 30% en cliquant sur des chips interactifs. L'interface affiche instantanément l'économie annuelle projetée :
  $$\text{Économie annuelle} = (\text{Dépense moyenne mensuelle} \times \text{Pourcentage de baisse}) \times 12$$
- **Audit d'abonnements** : Si la catégorie analysée contient des transactions issues d'abonnements (actifs ou historiques), une notification d'aide spécifique s'affiche ("Pensez à auditer vos abonnements dans cette catégorie pour économiser facilement").

