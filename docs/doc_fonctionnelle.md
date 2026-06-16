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
- **Carrousel des Comptes** : Présentation visuelle horizontale de chaque compte sous forme de carte bancaire stylisée premium avec défilement fluide et recentrage automatique (snap scroll). Chaque carte affiche :
  - Le nom du compte.
  - Le solde actuel mis en valeur avec un contraste maximal (couleur neutre `text-primary` si positif/nul, rouge `text-danger` si négatif) en chiffres tabulaires `font-premium-numbers`.
  - Un fond dégradé premium translucide superposant la couleur thématique du compte à la couleur de fond du thème, s'adaptant parfaitement aux modes clair et sombre.
  - Une icône visuelle moderne et dynamique représentant graphiquement le type de compte (Tirelire 🐷 pour l'Épargne, Carte 💳 pour les Crédits, Pièces 🪙 pour le Cash, Tendance 📈 pour les Investissements, Portefeuille 💼 pour le Courant) enveloppée dans un badge circulaire en verre poli (`backdrop-blur-md`).
  - La date de dernière mise à jour des transactions positionnée sur sa propre ligne sous le solde, accompagnée d'une pastille thématique clignotante (`animate-pulse`).
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
L'utilisateur peut naviguer entre les mois et les années via deux menus déroulants. Les mois futurs sont désactivés. Un badge « Provisoire » s'affiche pour le mois en cours dont le rapport n'est pas encore finalisé.

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

1. **Navigation mensuelle** : Identique au composant `CategoryChart` — flèches `←` / `→` pour changer de mois et sélecteur via `BottomSheet` pour les 18 derniers mois.
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

1. **Navigation mensuelle** : Flèches `←` / `→` et sélecteur via `BottomSheet` pour les 18 derniers mois.
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
2. **Les sections à inclure** dans le PDF via 4 cases à cocher :
   - *Graphique Cascade (Waterfall)* : Visualisation des flux financiers.
   - *Charges Fixes vs Variables* : Analyse des charges incompressibles vs dépenses discrétionnaires.
   - *Prévisions à 30 jours* : Projection stochastique de l'évolution de la trésorerie.
   - *Journal des transactions* : Liste exhaustive de toutes les écritures de la période (à cocher facultativement).

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


