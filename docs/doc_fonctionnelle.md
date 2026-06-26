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

### 2.3 Connexion Biométrique (Passkeys / WebAuthn)
Afin de concilier une sécurité maximale et une expérience utilisateur fluide, Budgetizer intègre le support des clés d'accès (Passkeys) basées sur la biométrie (Touch ID, Face ID, Windows Hello, etc.) :
- **Invite proactive** : Immédiatement après une première connexion réussie par mot de passe, si le navigateur de l'utilisateur est compatible et qu'aucune clé n'a encore été créée sur son appareil, une invite (Modal) lui propose d'activer la connexion biométrique. S'il accepte, l'appareil est enregistré sous un nom détecté automatiquement (ex: *"Android (Chrome)"*).
- **Connexion en un clic** : Sur l'écran de connexion, si la biométrie est disponible, un bouton "Se connecter avec la biométrie" permet de s'authentifier instantanément sans saisir d'e-mail ni de mot de passe.
- **Gestion des appareils** : Depuis la page Paramètres, l'utilisateur peut enregistrer manuellement d'autres périphériques de confiance ou révoquer l'accès de clés enregistrées.
- **Résolution des anomalies & PWA** : Pour simplifier l'utilisation sur mobile (où vider les cookies ou modifier le gestionnaire d'identifiants natif est difficile) :
  - **Bouton de Réinitialisation** : Un bouton *"Problème avec la biométrie ? Réinitialiser l'appareil"* est affiché sous l'écran de connexion. Il permet de forcer le nettoyage du statut de l'appareil pour relancer proprement l'inscription.
  - **Gestion de clé existante** : Si l'appareil contient déjà le Passkey requis mais qu'il y a un désalignement, le système le détecte et confirme directement que la biométrie est bien configurée sans perturber le parcours utilisateur.
  - **Autonettoyage automatique** : En cas d'incohérence (ex: appareil supprimé de la base de données), l'état local du périphérique est nettoyé automatiquement au premier échec pour permettre le ré-enregistrement.

---

## 3. Le Tableau de Bord (Dashboard)

Le tableau de bord est la page d'accueil principale après connexion. Il regroupe les informations de synthèse financière indispensables :

- **Solde Net Global** : Affiche la somme des soldes de tous les comptes actifs inclus dans le total.
- **Carrousel des Comptes** : Présentation visuelle horizontale de chaque compte sous forme de carte bancaire stylisée premium avec défilement fluide et recentrage automatique (snap scroll). Chaque carte utilise désormais un style solide à dégradé métallique premium (`var(--bg-surface)` vers `var(--bg-surface-2)`) avec une fine bordure colorée selon le thème du compte, une barre latérale colorée sur le flanc gauche et un halo lumineux d'accentuation en haut à droite. Elle affiche :
  - Le nom du compte.
  - Le solde actuel mis en valeur en chiffres tabulaires `font-premium-numbers`.
  - La date de la dernière transaction sous le solde ("Dernière op. : DD MMM" ou "Aucune opération").
  - Une icône visuelle moderne représentant son type (🐷 pour l'Épargne, 💳 pour les Crédits, 🪙 pour le Cash, 📈 pour les Investissements, 💼 pour le Courant).
  - Un voyant de synchronisation live discret (pulsation verte `.animate-pulse-live` sur l'icône).
- **Carte des Statistiques Temporelles (Timeframe Statistics Card)** : Un composant compact à onglets qui regroupe la synthèse mensuelle (Revenus, Dépenses, Solde net) et le graphique de vélocité hebdomadaire (Sparkline courbe d'aire Recharts des 7 derniers jours) dans un espace visuel unifié et interactif pour mobile.
- **Raccourcis Tactiles Compacts (Hub Raccourcis)** : Une barre de raccourcis sur une seule ligne offrant un accès rapide aux 4 fonctionnalités principales (Budgets, Épargne, Analyses, Conseils IA) complétée par un bouton "Plus" (BottomSheet) pour les autres raccourcis secondaires.
- **Formulaire d'ajout rapide (Action Sheet)** : Un bouton d'action flottant central permet d'ouvrir instantanément un panneau de saisie rapide (Bottom Sheet) pour ajouter une transaction (Dépense, Revenu ou Virement interne) sans quitter l'écran d'accueil.
- **Menu de Navigation Latéral (Tiroir Burger)** : Un menu coulissant moderne et sans bordure (borderless) est accessible depuis le bouton en haut à gauche. Il centralise les raccourcis vers tous les modules, réorganisés de manière ergonomique par fréquence d'usage :
  1. **Mon Quotidien** (Haute fréquence) : Tableau de bord, Comptes, Transactions, Virements instantanés.
  2. **Mon Budget & Projets** (Moyenne fréquence) : Budgets, Objectifs d'épargne, Planifications.
  3. **Analyses & IA** (Analyses & conseils) : Graphiques, Rapport Mensuel, Conseils IA, Scores financiers.
  4. **Outils & Options** (Occasionnel) : Simulateur de prêt, Exporter un rapport, Mon Profil & Paramètres.
  Le menu intègre des effets de halo lumineux (glow flares) et des flous (backdrop-blur) pour un design premium sombre et immersif.
- **Barre d'en-tête collante (Sticky Header)** : Sur toutes les pages, une barre d'en-tête reste collée en haut lors du défilement. Elle affiche le bouton de menu burger (ou un bouton de retour arrière selon le contexte de navigation) ainsi que le titre de la page courante, assurant une navigation fluide sans devoir remonter en haut de l'écran.
- **Aperçu des Transactions Récentes** : Liste chronologique des dernières transactions saisies ou confirmées.

---

## 4. Gestion des Comptes Bancaires

Budgetizer permet de gérer plusieurs comptes pour refléter fidèlement la réalité financière de l'utilisateur.

### 4.1 Types de Comptes supportés
Chaque compte possède un type spécifique qui influe sur son comportement et son icône :
- **Checking (Compte Courant)** : Utilisé pour les dépenses quotidiennes.
- **Savings (Compte d'Épargne)** : Destiné aux réserves et aux projets d'épargne.
- **Cash (Espèces)** : Suivi du liquide disponible.
- **Credit (Compte Crédit / Prêt)** : Représente un crédit ou prêt (immobilier, auto, consommation). Il est initialisé avec un solde négatif correspondant au capital emprunté (`-initialAmount`), modélisant la dette de l'utilisateur.
- **Investment (Investissement)** : Suivi des portefeuilles boursiers ou placements.

### 4.2 Options de Configuration des Comptes
Lors de la création ou de la modification d'un compte, l'utilisateur définit des options dépendant du type de compte :
- **Pour tous les comptes** :
  - **Nom du compte** (ex: "Compte Courant Principal", "Livret A").
  - **Couleur et Icône** pour une identification visuelle rapide.
  - **Inclure dans le Total (Oui/Non)** : Indique si le solde du compte doit entrer dans le calcul du Net Worth global du tableau de bord.
- **Pour les comptes courants, épargne, espèces et investissement** :
  - **Solde Initial** (le montant présent au démarrage).
- **Pour les comptes de type Crédit / Prêt** :
  - **Capital emprunté** (capital initial du prêt).
  - **Taux d'intérêt annuel (%)** (utilisé pour décomposer le capital et les intérêts).
  - **Durée (mois)** (durée totale du prêt).
  - **Date de première échéance** (date de début des prélèvements).
  - **Compte source de prélèvement** (le compte courant ou d'épargne débité chaque mois).

### 4.3 Fonctionnement des Crédits & Amortissement
Lorsqu'un compte de type Crédit est créé, Budgetizer configure automatiquement les éléments suivants :
1. **Mensualité fixe** : La mensualité $M$ est calculée automatiquement par la formule d'amortissement standard :
   $$M = C \times \frac{r/12}{1 - (1 + r/12)^{-n}}$$
   *(où $C$ est le capital emprunté, $r$ le taux annuel et $n$ la durée en mois)*. Si le taux est de 0%, le calcul linéaire simple $C/n$ est appliqué.
2. **Transaction Planifiée (Virement automatique)** : Une `ScheduledTransaction` de type `"transfer"` est créée automatiquement entre le compte source (ex: compte courant) et le compte crédit avec confirmation automatique active.
3. **Double impact des flux (Débit vs Crédit)** :
   - Sur le **Calendrier** et le **Compte Courant**, la mensualité s'affiche en **négatif** (`-`) et en couleur de débit (`text-primary`), car elle représente un prélèvement de trésorerie.
   - Sur la fiche de **Détail du Crédit**, le virement apparaît en **positif** (`+`) et vert, car il s'agit d'un remboursement qui réduit la dette du crédit en rapprochant le solde vers zéro.
4. **Fiche de Détail du Crédit** :
   - **Graphique d'Amortissement** : Un graphique dynamique en aires (`AreaChart`) présente la baisse historique et projetée de la dette restante jusqu'à son extinction (0 €).
   - **Widgets Métriques** : Affiche le cumul des intérêts payés à date, les intérêts restants estimés, le taux annuel et la durée restante en mois.
   - **Prochaine Échéance** : Affiche la date du prochain prélèvement et la répartition exacte entre le **Capital amorti** et les **Intérêts payés** pour cette mensualité précise.
   - **Tableau d'Historique des Paiements** : Liste exhaustive des mensualités payées avec détail capital/intérêts et solde restant dû après chaque versement.

---

## 5. Gestion des Catégories

Pour analyser finement la répartition des flux d'argent, chaque transaction (hors virement interne) est associée à une catégorie.

- **Types de Catégories** : Une catégorie peut être spécifiquement liée aux **Dépenses** (ex: Alimentation, Loyer), aux **Revenus** (ex: Salaire, Dividendes), ou aux **Deux** (both).
- **Sous-catégories** : Possibilité de créer des hiérarchies (catégories parentes et enfants) pour regrouper des sous-budgets (ex: sous-catégorie "Restaurant" sous la catégorie parente "Alimentation").
- **Personnalisation** : Choix d'une couleur et d'une icône parmi une bibliothèque prédéfinie.

---

## 6. Saisie & Historique des Transactions

Cette section regroupe la création rapide de transactions et la consultation de l'historique complet.

### 6.1 Saisie de Transactions — Optimisation Vitesse (< 5 secondes)
La saisie est simplifiée au maximum grâce à une interface de type "Bottom Sheet" glissante, conçue pour passer sous le seuil critique des 5 secondes de saisie :

- **Flux de saisie optimisé** : L'ordre des champs suit le flux cognitif naturel de l'utilisateur :
  1. Type (Dépense / Revenu)
  2. Montant
  3. Note (déclenche l'autocomplete)
  4. Catégorie (pré-remplie par l'autocomplete)
  5. Compte (pré-rempli par défaut)
  6. Date (masquée par défaut)
  7. Tags (optionnels)

- **Chip "🔁 Répéter la dernière transaction"** : Après chaque ajout, la transaction est mémorisée dans le `localStorage`. Un chip en haut du formulaire permet de pré-remplir entièrement le formulaire (type, montant, note, compte, catégorie, tags) en un seul tap.

- **Saisie du Montant & Solde à la Volée** : Le champ montant déclenche l'affichage du clavier numérique natif. Un badge dynamique s'affiche en dessous :
  - Vert si la transaction laisse le compte positif.
  - Rouge si le solde après transaction passerait en négatif.

- **Champ Note repositionné (Autocomplete avancé)** : Le champ Note est placé avant les sélecteurs. Dès 2 caractères saisis, les suggestions s'affichent immédiatement sous le champ et pré-remplissent le compte, la catégorie et les tags.

- **Pré-catégorisation automatique intelligente** : Lors de la saisie d'une note (marchand/description), l'algorithme parcourt en temps réel l'historique des transactions passées de l'utilisateur pour identifier la catégorie correspondante la plus fréquente et la pré-sélectionne automatiquement. Un badge d'IA premium orné de la mention `Suggéré` s'affiche alors de façon fluide au-dessus du sélecteur de catégorie. Si l'utilisateur choisit manuellement une autre catégorie ou applique un template, la suggestion automatique est désactivée et le badge s'efface.

- **Date masquée (accordéon)** : Un badge "📅 Aujourd'hui" remplace le champ date. L'utilisateur ne déroule le champ que si la date diffère d'aujourd'hui. Règle : 90 % des transactions sont saisies le jour même.

- **Sélection des Comptes et Catégories** :
  - Chaque sélecteur ouvre un panel dédié avec liste complète.
  - **Navigation directe Compte ↔ Catégorie** : Des onglets `[Compte] [Catégorie]` en haut de chaque panel permettent de basculer directement sans repasser par le formulaire principal.

- **Indicateur de Budget Inline** : Quand la catégorie sélectionnée possède un budget configuré, une mini-barre de progression s'affiche avec la dépense actuelle, le montant saisi projeté, et le plafond. La barre est verte < 80 %, orange 80–99 %, rouge si dépassement. Une alerte ⚠️ est affichée si la saisie ferait déborder l'enveloppe. En mode **édition**, la dépense de la transaction d'origine est soustraite du total consommé avant le calcul projeté, évitant un double comptage.

- **Favoris rapides (Templates)** : Chips de raccourcis pré-remplis. Les zones tactiles ont été agrandies (≥ 44 px de hauteur) avec icône emoji agrandie, nom et montant sur deux lignes.

- **Métadonnées** : Date, note (texte libre), tags.

- **Bouton Valider Sticky** : Le bouton d'ajout est fixe en bas du Bottom Sheet (CSS `position: sticky`). Il reste visible même quand le clavier virtuel est ouvert. Les boutons d'action ("Ajouter la transaction", "Enregistrer", "Supprimer", "Saisir les détails") utilisent un style premium cuivré/orange (`bg-copper`) avec un effet de scale au survol et une ombre colorée douce, assurant une cohérence visuelle avec le reste de l'application (thème Bankyboard « Encre & Cuivre »).

- **Toast Enrichi Post-Validation** : Après ajout, un toast affiche le montant débité/crédité ET le nouveau solde projeté du compte débouré, pendant 3 secondes.

- **Patterns Haptiques Distinctifs** (via `navigator.vibrate`) :
  - Dépense validée (`'expense'`) : 1 impulsion de 25 ms.
  - Revenu validé (`'income'`) : 2 impulsions légères [15, 60, 15] ms.
  - Erreur (`'error'`) : 3 impulsions [50, 40, 50, 40, 50] ms.

### 6.2 Liste Complète des Transactions
Accessible via l'option "Transactions" du menu de navigation :
- **Regroupement par Date Intelligent** : Les transactions sont groupées par jour avec des séparateurs collants (sticky) intitulés « Aujourd'hui » (accent), « Hier » (primary) ou la date complète (secondary).
- **Icônes de Catégorie & Bordure Colorée (Left-Border)** : Chaque transaction affiche l'icône de sa catégorie sur un disque dégradé translucide et dispose d'une fine bordure gauche de 4px reprenant le code couleur du compte ou de sa catégorie de dépense.
- **Montants & Typographie** : Alignement en chiffres tabulaires `.font-premium-numbers` en taille `text-sm sm:text-base` et graisse `font-extrabold`. Les revenus s'affichent en vert émeraude et les débits importants (supérieurs au seuil d'alerte) s'affichent en rouge danger, tandis que les dépenses standard s'affichent sobrement en blanc/bleuté.
- **Filtres et Recherche** : Consultation globale avec possibilité de filtrer par compte, catégorie, plage de dates, étiquettes ou recherche de mots-clés dans la description ou les notes.
- **Gestion par Swipe** : Sur mobile, le glissement gauche (Swipe Left) révèle désormais **deux boutons** :
  - ✏️ **Modifier** (fond accent, bleu-violet) : déclenche le callback `onEdit(transaction)` qui ouvre directement le formulaire pré-rempli dans `Transactions.jsx`. La prop s'appelle `onEdit` (et non `onEditClick`).
  - 🗑️ **Supprimer** (fond rouge) : déclenche le callback `onDelete(transaction)` qui ouvre la boite de confirmation de suppression. La prop s'appelle `onDelete` (et non `onDeleteClick`). Le `dragConstraints` est passé à `-160px` pour exposer les deux boutons (2 × 80 px).
- **Chargement Infini** : Un `IntersectionObserver` charge 30 transactions supplémentaires au bas de la liste lors du scroll.

### 6.3 Le Calendrier Interactif
Le module **Calendrier** propose une vue mensuelle globale et intuitive pour suivre et planifier ses flux de trésorerie au jour le jour :
- **Navigation par Mois** : Une barre de navigation épurée dotée d'un flou d'arrière-plan (`backdrop-blur-md`) permet de basculer facilement d'un mois à l'autre grâce aux boutons fléchés directionnels.
- **Distinction des week-ends** : Les samedis et dimanches (en-têtes de colonnes "Sa" et "Di", ainsi que les dates elles-mêmes) s'affichent en rouge (`text-danger`) pour séparer visuellement la semaine et le week-end. Les jours de week-end des mois adjacents sont estompés en rouge semi-transparent.
- **Indicateurs Visuels (Dots)** : Chaque jour ayant des mouvements financiers affiche des points de couleur sous son chiffre (vert pour les revenus, rouge pour les dépenses ou virements). La taille des points s'adapte en fonction du volume financier de la journée (petit point < 100 €, point moyen ≥ 100 €).
- **Planification future** : Les jours futurs du mois en cours sans transaction planifiée s'affichent dans une déclinaison subtile (fond vert translucide pour la semaine, rouge pour le week-end) pour encourager l'épargne.
- **Liste journalière détaillée & Actions directes** :
  - Cliquer sur une date met la cellule en valeur en cuivre (`bg-copper`) et affiche au bas du calendrier la liste chronologique des transactions associées.
  - **Ajout Direct** : Un bouton « Ajouter » à droite du titre de la section et un bouton « + » portalisé en haut à droite du header permettent d'ouvrir directement le formulaire d'ajout pour le jour sélectionné, peu importe si la journée possède déjà des écritures.
  - **Suppression rapide** : Le survol (ou swipe) d'une transaction réelle révèle l'icône de corbeille rouge pour la supprimer instantanément.

---

## 7. Planification Budgétaire (Enveloppes)

La gestion de budget repose sur le système des enveloppes mensuelles ou périodiques.

- **Sélecteur de Période (Segmented Control)** : Un contrôle segmenté supérieur permet de basculer instantanément entre les enveloppes hebdomadaires, mensuelles et annuelles, avec un navigateur de période ← Période active → unifié.
- **Titre de page collapsible** : Le titre se rétracte dans la barre supérieure lors du défilement vertical.
- **EmptyState illustré** : Si aucun budget n'est défini pour la période sélectionnée, une carte de statut vide structurée avec icône invite l'utilisateur à en créer un.
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

### 8.3 Modèles d'Abonnements Rapides (Templates)
Lors de la création d'une nouvelle planification, un carrousel de **modèles rapides** s'affiche en haut du formulaire pour pré-remplir automatiquement les champs courants :
- **Modèles populaires par défaut** : Un jeu de modèles préconfigurés (Netflix, Spotify, Amazon Prime, etc.) est disponible immédiatement sans configuration.
- **Création de modèles personnalisés** : L'utilisateur peut sauvegarder ses propres modèles en renseignant le nom, le montant et la catégorie de la planification, puis en cliquant sur **"Sauver modèle"**. Le modèle s'ajoute instantanément au carrousel et est persisté dans le `localStorage` sous la clé `budgetizer_subscription_templates`.
- **Application d'un modèle** : Un simple clic sur un bouton du carrousel pré-remplit les champs du formulaire (description, montant, catégorie) pour accélérer la saisie.
- **Suppression d'un modèle** : Un **appui long (> 800 ms)** sur un bouton de modèle personnalisé déclenche une boîte de dialogue de confirmation. Après validation, le modèle est retiré du carrousel et supprimé du `localStorage`.

---

## 9. Graphiques et Analyses Prévisionnelles

La page **Statistiques (Charts)** propose des visualisations interactives basées sur les données réelles et planifiées :

- **Sélecteur de Mois / Période Centralisé Unique** : Pour garantir une expérience épurée, la page d'Analyses intègre un unique sélecteur de mois collant en haut. Ce sélecteur synchronise la période active sur tous les graphiques affichés. Les boutons ou curseurs de navigation locale propres aux graphiques individuels (par exemple, dans *Catégories*, *Fixes vs Variables*, *Cascade*) sont automatiquement masqués pour éviter les doublons et assurer la cohérence des calculs de filtres.
- **Barre d'onglets horizontaux (Top 5)** : Permet de basculer instantanément d'un simple geste entre les 5 analyses de base les plus importantes : *Catégories*, *Cash Flow*, *Richesse Nette*, *Budget vs Réel*, et *Prévisions*. Un bouton de menu en pointillés *"Autres"* déploie un panel BottomSheet avec tous les autres types de graphiques.
- **Conseils IA dynamiques** : Un bandeau de recommandation de Coach financier s'adapte en temps réel selon le graphique d'analyse sélectionné pour guider l'utilisateur.
- **Titre de page collapsible** : Le titre se rétracte et fusionne proprement dans la barre d'en-tête collante lors du défilement vertical.
- **Infobulles Interactives Premium** : Lors du survol ou du clic sur les graphiques, des infobulles sur mesure affichent les montants, les pourcentages et les dates avec une typographie soignée et un style visuel translucide (glassmorphism) qui s'adapte parfaitement au thème de l'application (mode sombre et mode clair), assurant une lisibilité maximale sans rupture de style.
- **Fluidité & Réactivité Tactile** : Les graphiques sont optimisés pour une manipulation tactile fluide sur mobile, sans sauts intempestifs de l'écran lors du basculement d'une catégorie à une autre ou d'une période à une autre (hauteur des contrôleurs verrouillée pour supprimer tout Layout Shift).
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

---

## 13. Objectifs d'Épargne 💰

Budgetizer permet à l'utilisateur de définir des projets d'épargne à court, moyen ou long terme (ex : Fonds de secours, Apport immobilier, Achat voiture).

### 13.1 Configuration de l'Objectif
Lors de la création ou modification d'un objectif, l'utilisateur indique :
- **Nom du projet** (ex: "Fonds de secours").
- **Montant cible** (€).
- **Date d'échéance** (l'application calcule le montant mensuel restant à économiser).
- **Couleur et Icône** d'identification.
- **Compte de destination associé (optionnel)** : L'utilisateur peut lier l'objectif d'épargne à un compte physique (ex : Livret A). Si aucun compte n'est lié, l'objectif fonctionne de manière virtuelle (des transactions d'épargne virtuelles sont comptabilisées sans déplacer réellement l'argent entre les comptes).

### 13.2 Versements et Retraits d'Épargne
Depuis la page **Objectifs d'épargne**, l'utilisateur peut ajouter ou retirer des fonds :
- **Si l'objectif possède un compte lié** : Le versement d'épargne est traité comme un **virement (transfert)** réel du compte débité (ex: Compte Courant) vers le compte d'épargne de l'objectif (ex: Livret A). Les soldes des comptes physiques et la progression de l'objectif sont mis à jour simultanément de manière cohérente. Le retrait d'épargne effectue le transfert inverse.
- **Si aucun compte n'est lié** : Le versement est enregistré comme une dépense virtuelle (pour bloquer le montant sur le compte courant débité) et le retrait comme un revenu virtuel.


## 14. Rapport Mensuel Proactif 📊

La page **Rapport Mensuel** génère automatiquement un diagnostic financier personnalisé pour chaque mois. Le rapport est entièrement déterministe et ne nécessite aucun service d'IA externe.

### 14.1 Sélection de la Période
L'utilisateur navigue entre les mois à l'aide d'un sélecteur de période premium unifié sous forme de contrôleur à glissière. Ce sélecteur comprend des flèches directionnelles `←` et `→` pour défiler de mois en mois et un bouton central tactile affichant la période active. Cliquer sur ce bouton ouvre un panneau coulissant (`BottomSheet`) qui propose un calendrier/grille de sélection rapide pour les 18 derniers mois, triés et regroupés par année. Les mois futurs ne peuvent pas être sélectionnés (ils sont désactivés). Un badge « Provisoire » s'affiche pour le mois en cours dont le rapport n'est pas encore finalisé.

### 14.2 Contenu du Rapport
Le rapport est structuré en 3 sections narratives :
- **Bilan Financier Global** : Revenus totaux, dépenses totales, solde net d'épargne, taux d'épargne et comparaison des dépenses globales avec le mois précédent.
- **Les Victoires & Réussites** : Objectif d'épargne complété, budget maîtrisé, dépense catégorielle en baisse ou abonnement résilié/diminué.
- **Points de Vigilance** : Dépenses hors normes, dépassement de budget, hausse catégorielle suspecte ou nouvel abonnement/augmentation.

### 14.3 Dépenses Inhabituelles Détectées
En complément du texte de diagnostic, une section dédiée **« Dépenses inhabituelles détectées »** liste de manière visuelle et structurée toutes les transactions identifiées comme anormales pour le mois :
- **Critères de détection** : Montant unitaire ≥ 3 fois la moyenne historique de la catégorie sur les 3 mois précédents, et montant ≥ 50 €.
- **Affichage** : Pour chaque transaction inhabituelles, la carte affiche la description, la catégorie, la date de la transaction, le montant, et un badge de ratio indiquant combien de fois le montant dépasse la moyenne habituelle (ex : « 8.8x la moyenne »).
- **Tri** : Les transactions sont triées par ratio décroissant (la plus déviante en premier).
- **Cette section est masquée** si aucune dépense inhabituelle n'est détectée pour le mois sélectionné.


## 15. Indicateur de Vélocité de Dépense (Tachymètre) 🏎️

L'**Indicateur de Vélocité de Dépense** (ou Tachymètre) aide l'utilisateur à comprendre en temps réel s'il consomme ses budgets mensuels trop rapidement.

### 15.1 Sélection de la Catégorie
Un sélecteur moderne permet de choisir la catégorie à analyser :
- **Toutes dépenses confondues** : Agrège l'ensemble des budgets et dépenses mensuels.
- **Catégories individuelles** : Affiche les données associées à une enveloppe budgétaire mensuelle active spécifique (ex: "Alimentation", "Loisirs").

### 15.2 Fonctionnement Mathématique & Logique
1. **Jours restants (`daysRemaining`)** : Calcule le nombre total de jours restants dans le mois, en incluant la date d'aujourd'hui.
2. **Vitesse cible (`targetVelocity`)** : Le rythme de dépense conseillé en €/jour pour respecter le budget restant jusqu'à la fin du mois ($remainingBudget / daysRemaining$).
3. **Vitesse réelle (`actualVelocity`)** : La moyenne des dépenses réelles par jour calculée sur les 7 derniers jours (ou depuis le 1er du mois si nous sommes dans les 7 premiers jours).
4. **Date de crash estimée (`depletionDate`)** : En cas d'excès de vitesse ($actualVelocity > targetVelocity$ et $remainingBudget > 0$), calcule le nombre de jours avant épuisement du budget ($remainingBudget / actualVelocity$) et l'ajoute à la date du jour pour estimer la date de crash.

### 15.3 Visualisation Graphique & Diagnostic
- **La Jauge de Vélocité** : Un cadran semi-circulaire (speedomètre) affiche la vitesse réelle actuelle.
  - **Zone verte** (à gauche) : Vitesse réelle inférieure ou égale à la vitesse cible.
  - **Zone rouge** (à droite) : Vitesse réelle supérieure à la vitesse cible.
  - **Ligne pointillée verticale** : Indique la "limite de vitesse" (vitesse cible).
  - **Aiguille animée** : Indique de manière fluide le rythme réel.
- **Fiches d'Insights dynamiques** :
  - *Cas 1 (Sous contrôle)* : Message de félicitations confirmant que le rythme est correct.
  - *Cas 2 (Excès de vitesse)* : Alerte visuelle estimant la date d'épuisement théorique du budget si le rythme est maintenu.
  - *Cas 3 (Action corrective)* : Suggestion chiffrée recommandant une nouvelle limite quotidienne conseillée ($remainingBudget / daysRemaining$) à tenir pour le reste du mois pour respecter le budget initial. Si le budget est déjà épuisé, la limite corrective conseillée est fixée à $0$ €/jour.

### 15.4 Alertes de Vélocité Proactives 🚨
Pour aider proactivement l’utilisateur à anticiper les fins de mois difficiles, le système effectue une analyse de vélocité en temps réel (lors de l'ajout/modification d'une dépense et lors de la consultation du dashboard). Si la projection d'épuisement complète du budget d'une catégorie (`depletionDate`) tombe **avant le 20 du mois en cours** (et que la date du jour est elle-même antérieure au 20), une double alerte est émise :
1. **Alerte dans l’application** : Une notification ornée d'une icône de flamme (`Flame`) rouge est poussée dans la cloche de notifications du tableau de bord.
2. **Notification Push PWA native** : Une notification Push native en arrière-plan est immédiatement envoyée sur l'appareil de l'utilisateur (si les notifications PWA ont été autorisées) afin d’offrir un avertissement instantané et engageant.

---

## 16. Graphique Fixes vs Variables 🔒🎲

Le graphique **Fixes vs Variables** (accessible dans l'onglet Analyses sous le nom *«\u202fFixes vs Variables\u202f»*) permet à l'utilisateur de visualiser, mois par mois, la répartition de ses dépenses entre charges incompressibles planifiées et dépenses spontanées ou discrétionnaires.

### 16.1 Règle de Classification

La distinction repose sur le champ `isScheduled` de chaque transaction :

| Critère | Type |
|---|---|
| `isScheduled === true` | **Charge fixe** — issue d'une transaction planifiée (loyer, abonnement, remboursement crédit) |
| `isScheduled === false` (ou absent) | **Dépense variable** — saisie manuellement, dépense ponctuelle |

Cette classification est automatique et transparente pour l'utilisateur. Pour qu'une charge récurrente apparaisse dans les fixes, il suffit de la configurer dans l'onglet **Planifications**.

### 16.2 Endpoint API

`GET /charts/fixed-vs-variable?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Réponse :**
```json
{
  "totalExpenses": 1720.00,
  "totalFixed": 1240.00,
  "totalVariable": 480.00,
  "fixedRatio": 72.1,
  "variableRatio": 27.9,
  "fixedCategories": [
    { "categoryId": "...", "name": "Logement", "icon": "🏠", "color": "#6366f1", "amount": 850.00, "count": 1, "percentage": 68.5 }
  ],
  "variableCategories": [
    { "categoryId": "...", "name": "Alimentation", "icon": "🛒", "color": "#f59e0b", "amount": 240.00, "count": 12, "percentage": 50.0 }
  ]
}
```

Les catégories de chaque groupe sont regroupées par catégorie parente (résolution identique au graphique par catégories) et triées par montant décroissant.

### 16.3 Interface Utilisateur

Le composant `FixedVarChart` est structuré en 5 blocs :

1. **Navigation mensuelle** : Le composant est synchronisé réactivement avec le sélecteur global parent de la page d'Analyses. Son propre sélecteur local (flèches et BottomSheet) est masqué automatiquement lorsqu'il est instancié avec une période externe, empêchant toute redondance visuelle.
2. **Cartes KPI (3)** :
   - *Total dépenses* — montant brut toutes catégories.
   - *Charges fixes* (fond indigo/violet) — montant et ratio en %.
   - *Dépenses variables* (fond ambre) — montant et ratio en %.
3. **Donut animé à 2 arcs** (`Recharts PieChart`) :
   - Arc indigo (`#818cf8`) = fixes.
   - Arc ambre (`#f59e0b`) = variables.
   - Au survol d'un arc, son montant s'affiche au centre (via `activeShape` et `activeIndex`).
   - Barre de progression linéaire en bas du donut pour une lecture immédiate du ratio.
4. **Listes collapsables** : Deux accordéons dépliés par défaut — *Charges fixes* (icône `Lock`, indigo) et *Dépenses variables* (icône `Shuffle`, ambre) — affichant pour chaque catégorie : icône, nom, nombre de transactions, montant et %.
5. **Carte explicative** : Bloc informatif rappelant la définition des deux catégories et le lien vers les Planifications pour classer manuellement une charge.


## 17. Graphique d'Analyse Mensuelle (Waterfall / Cascade) 📊

Le graphique **Analyse mensuelle** (accessible dans l'onglet Analyses sous le nom *« Analyse mensuelle »*) permet de visualiser l'allocation des revenus perçus sur le mois vers les dépenses par catégorie, aboutissant à l'épargne ou au déficit net du mois.

### 17.1 Règle de calcul et d'allocation

La cascade représente le flux financier du mois de la manière suivante :
- **Point de départ (Ascendant) :** Somme de tous les revenus enregistrés sur le mois (`type === 'income'`).
- **Flux intermédiaires (Descendants) :** Sommation des dépenses par catégories parentes triées par montant décroissant. Chaque bloc commence à la hauteur résiduelle après déduction de la catégorie précédente.
- **Point d'arrivée (Final) :** Épargne Nette (si revenus > dépenses) ou Déficit Net (si dépenses > revenus).

### 17.2 Endpoint API

`GET /charts/waterfall?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Réponse :**
```json
{
  "totalIncome": 3000.00,
  "totalExpenses": 1200.00,
  "netSavings": 1800.00,
  "categories": [
    { "categoryId": "...", "name": "Logement", "icon": "🏠", "color": "#6366f1", "amount": 800.00 },
    { "categoryId": "...", "name": "Alimentation", "icon": "🛒", "color": "#f59e0b", "amount": 400.00 }
  ]
}
```

### 17.3 Interface Utilisateur

Le composant `WaterfallChart` est structuré en 5 blocs :

1. **Navigation mensuelle** : Le composant utilise le filtre de période global fourni par le composant parent `ChartsPage`. Le sélecteur local est alors masqué pour éviter d'encombrer l'interface avec des doubles contrôles.
2. **Cartes KPI (3)** :
   - *Revenus* — montant brut global (fond émeraude).
   - *Dépenses* — montant brut global (fond rose).
   - *Épargne / Déficit Net* — résultat net du mois (fond violet si excédentaire, rouge si déficitaire).
3. **Graphique de type Cascade (`Recharts BarChart`)** :
   - Colonne verte à gauche (`#10b981`) pour les revenus.
   - Colonnes suspendues (floating bars) descendantes pour chaque catégorie de dépenses, reprenant la couleur de la catégorie ou rouge/rose par défaut.
   - Colonne finale à droite pour le solde restant (violette `#a855f7` si épargne, rose `#f43f5e` si déficit).
   - Ligne horizontale pointillée à $0\text{ €}$ pour indiquer le seuil d'équilibre.
4. **Liste détaillée des flux** : Liste affichant pour chaque catégorie de dépenses : l'icône, le nom, le pourcentage qu'elle représente par rapport aux dépenses totales et le montant négatif.
5. **Carte d'interprétation** : Bloc d'aide expliquant le fonctionnement de la cascade et le code couleur.

## 18. Rapports d'Activité et Export PDF Premium 📊📄

La page **Rapports d'Activité** permet à l'utilisateur de configurer, de générer et de télécharger un rapport de synthèse financière sous format PDF premium, prêt pour l'impression (format A4).

### 18.1 Configuration de l'Exportation
L'utilisateur peut définir :
1. **La période d'analyse** : Saisie d'une date de début et d'une date de fin personnalisées.
2. **Les sections à inclure** dans le rapport via 4 cases à cocher :
   - *Graphique Cascade (Waterfall)* : Visualisation des flux financiers.
   - *Charges Fixes vs Variables* : Analyse des charges incompressibles vs dépenses discrétionnaires.
   - *Prévisions à 30 jours* : Projection stochastique de l'évolution de la trésorerie.
   - *Journal des transactions* : Liste exhaustive de toutes les écritures de la période (à cocher facultativement).

### 18.1bis Affichage Interactif du Rapport (Dashboard In-App)
En plus de l'exportation PDF, l'utilisateur peut afficher le rapport **directement dans l'application** sans générer de fichier :
- **Bouton "Analyser et afficher le rapport"** : Lance le calcul des métriques financières (revenus, dépenses, épargne, catégories, anomalies) et affiche le **Diagnostic Global** sous forme de dashboard interactif à l'écran.
- **Navigation retour** : Un bouton **"Filtres"** dans l'en-tête du rapport affiché permet de revenir à l'écran de paramétrage pour modifier la période ou les filtres sans recharger la page.
- **Journal des transactions** : Si la case *Journal des transactions* a été cochée dans les paramètres, la liste complète des flux de la période (avec catégorie et compte) est affichée dans le dashboard interactif.
- **Aucun PDF généré** : L'affichage interactif et l'export PDF sont deux actions distinctes. L'affichage du rapport en mode dashboard ne déclenche pas la bibliothèque `html2pdf`.

### 18.2 Contenu et Structure du Rapport Premium (Format A4)
Le rapport PDF est découpé en pages A4 bien distinctes, reprenant le code visuel de l'application :

* **Page 1 : Page de garde**
  - Barre de dégradé supérieure de couleur verte et bleue.
  - Logo officiel de l'application (affiché via encodage Base64 dynamique pour éviter tout carré vert ou erreur de rendu lié aux DOMs invisibles).
  - Titre majeur "BUDGETIZER" et sous-titre de la catégorie.
  - Dates précises de début et de fin de la période d'analyse.
  - Encadré contenant le nom du propriétaire, la date de génération du rapport et le nombre de transactions comptabilisées.
  - Mention de confidentialité en pied de page.

* **Page 2 : Bilan Financier & Cascade**
  - En-tête courante de page reprenant le logo et le titre du chapitre.
  - Score de santé financière affiché dans une jauge circulaire avec son libellé associé (Excellent, Bon, Satisfaisant, Vigilance, Critique).
  - Récapitulatif global des Revenus (+), Dépenses (-) et Épargne Nette cumulée avec le taux d'épargne.
  - Graphique en cascade (Waterfall Chart) montrant la répartition des revenus.
  - Tableau des 4 postes de dépenses majeurs avec barres de progression.

* **Page 3 : Analyses & Tendances**
  - En-tête de page.
  - Graphique en anneau (Donut Chart) détaillant la proportion de charges fixes (🔒) vs variables (🎲).
  - Diagnostic conseil répertoriant jusqu'à 3 alertes ou succès financiers automatisés.
  - Graphique d'évolution journalière du solde cumulé de tous les comptes bancaires.
  - Graphique de projection de solde à 30 jours (courbe en pointillés verts).

* **Page 4 : Annexes & Dépenses Inhabituelles**
  - En-tête de page.
  - Tableau listant les anomalies détectées (dépenses supérieures à 3 fois la moyenne habituelle ou supérieures à 200 €) contenant la date, la note/description, la catégorie, le compte émetteur et le montant exact.

* **Page 5 : Journal détaillé des flux (Optionnel)**
  - En-tête de page.
  - Liste exhaustive de toutes les transactions de la période avec pour chacune d'elles : la date, la description (affiche la **note en priorité** pour les dépenses/revenus classiques et la **description** pour les virements), la catégorie, le compte et le montant formaté selon le code couleur de son type.

### 18.3 Gestion des Sauts de Page
Le document utilise le sélecteur CSS `.pdf-page:not(:last-child)` pour appliquer dynamiquement `page-break-after: always`. Ceci élimine toute génération de pages blanches intermédiaires ou de pages vides à la fin du document.

---

## 19. Système Visuel Premium Bankyboard 🎨

Pour offrir une expérience proche de la fintech **Bankyboard**, Budgetizer a fait l'objet d'une refonte ergonomique majeure visant à simplifier les interactions et à magnifier l'aspect visuel de l'application (en particulier sur mobile).

### 19.1 Une Identité Visuelle Immersive "Encre & Cuivre"
*   L'application baigne dans un thème sombre aux contrastes soignés : un fond noir d'encre marine profond agrémenté de halos lumineux cuivrés/pourpres en arrière-plan, conférant une sensation de relief et de modernité.
*   Chaque bouton et composant interactif réagit au toucher par une légère micro-animation d'échelle (`active:scale`), mimant un retour de clic physique.

### 19.2 Balayage Intuitif (Swipe-to-Dismiss)
*   Les fenêtres coulissantes au bas de l'écran (Bottom Sheets) peuvent désormais être fermées d'un simple glissement du doigt vers le bas. Plus besoin de viser le bouton "Fermer" ou la croix en haut de l'écran, le geste de balayage naturel suffit pour les congédier de manière intuitive.

### 19.3 Solde Hero Compact
*   La carte de solde global sur l'accueil est stylisée comme une carte physique premium.
*   **Aide à la Décision** : La bordure de la carte change de couleur pour refléter instantanément la santé financière de l'utilisateur (Vert = Solde sain, Orange = Vigilance, Rouge = Danger).
*   **Graphique Intégré** : La courbe de tendance sur 30 jours est directement fondue en arrière-plan de cette carte. Cela permet à l'utilisateur de surveiller sa trajectoire de fin de mois d'un simple coup d'œil, tout en libérant un précieux espace vertical sur son écran de téléphone.

### 19.4 Saisie Progressive en Deux Étapes
*   Pour éviter la gêne ergonomique d'un grand formulaire écrasé par l'ouverture du clavier mobile, la création de transaction se fait maintenant de manière guidée :
    *   **Étape 1 (Montant)** : L'utilisateur se concentre uniquement sur la somme à saisir, avec un accès direct à ses favoris rapides et à un bouton pour répéter sa dernière transaction en un seul clic.
    *   **Étape 2 (Détails)** : Une fois le montant saisi, l'utilisateur accède aux détails avancés. Le champ note propose des suggestions basées sur son historique de dépenses. Les sélecteurs de comptes et catégories s'ouvrent dans des panneaux glissants complets, dotés d'onglets pour naviguer directement de l'un à l'autre sans perdre sa saisie.

### 19.5 Graphiques d'Analyses & Fluidité Mobile
*   **Zéro Saut de Contenu (Layout Shifts)** : Les contrôleurs et filtres des graphiques d'analyses sont logés dans des conteneurs à hauteur verrouillée. Ainsi, le passage entre différents filtres ou options n'entraîne aucun saut vertical de l'affichage sur mobile, offrant une expérience stable et haut de gamme.
*   **Aiguille Elastique pour Jauge de Vélocité** : L'aiguille du tachymètre réagit instantanément aux sélections avec une animation fluide amortie en ressort (type physique réaliste), apportant une micro-interaction plaisante et interactive.
*   **Infobulles Uniformisées** : Finis les encadrés par défaut Recharts gris ou sombres illisibles. Les infobulles partagent désormais le même style d'infobulle premium, adapté dynamiquement au thème sombre/clair pour garantir une continuité esthétique sur toutes les pages d'analyses.

### 19.6 Sélecteur de Mois Premium Centralisé & Harmonisation
*   **Harmonisation Complète** : Les contrôles de navigation dans le temps (boutons mois précédent/suivant et bouton central d'ouverture du sélecteur calendrier en BottomSheet) sont uniformisés sur l'intégralité du site (Analyses, Calendrier, Budgets, et Rapport Mensuel).
*   **Contrôle Unique Coordonné** : Dans les pages comportant de multiples graphiques (Analyses) ou des composants dépendants d'une date (Budgets, Calendrier, Rapport Mensuel), l'utilisateur dispose d'un unique bandeau de sélection mensuelle. Le changement de mois applique instantanément la nouvelle période de manière réactive à tous les sous-composants, éliminant les comportements inconsistants et les conflits de filtres.
*   **Masquage Intuitif des Doublons** : Afin d'éviter les surcharges d'interface et les conflits visuels sur mobile, les sous-composants qui embarquaient historiquement leurs propres sélecteurs locaux masquent ces derniers dès qu'ils reçoivent les informations de date depuis leur composant parent (ex: CategoryChart, FixedVarChart, WaterfallChart, etc.).



