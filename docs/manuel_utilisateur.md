# Manuel d'utilisation — Budgetizer 💰

Bienvenue dans **Budgetizer**, votre compagnon de gestion financière personnelle. Ce manuel a été conçu pour guider les nouveaux utilisateurs à travers toutes les fonctionnalités de l'application et lister l'intégralité des gestes et interactions possibles.

---

## Sommaire
1. [Premiers pas : authentification et biométrie](#1-premiers-pas--authentification-et-biométrie)
2. [Le tableau de bord (Dashboard)](#2-le-tableau-de-bord-dashboard)
3. [Gestion des comptes bancaires](#3-gestion-des-comptes-bancaires)
4. [Saisie et historique des transactions](#4-saisie-et-historique-des-transactions)
5. [Planification de budgets (Enveloppes)](#5-planification-de-budgets-enveloppes)
6. [Transactions planifiées et abonnements](#6-transactions-planifiées-et-abonnements)
7. [Projets et objectifs d'épargne](#7-projets-et-objectifs-dépargne)
8. [Statistiques, prévisions et vélocité (Tachymètre)](#8-statistiques-prévisions-et-vélocité-tachymètre)
9. [IA et conseils (Insights)](#9-ia-et-conseils-insights)
10. [Rapport mensuel proactif](#10-rapport-mensuel-proactif)
11. [Import et export de données](#11-import-et-export-de-données)
12. [Configuration des paramètres](#12-configuration-des-paramètres)

---

## 1. Premiers pas : authentification et biométrie

### 1.1 Inscription et connexion
* **Créer un compte** : Renseignez votre nom complet, votre adresse e-mail et un mot de passe (6 caractères minimum). Lors de la création, vos catégories par défaut et vos préférences initiales sont automatiquement générées.
* **Se connecter** : Saisissez vos identifiants classiques pour ouvrir une session sécurisée.

### 1.2 Activation et connexion par biométrie (Passkeys)
Budgetizer prend en charge l'authentification biométrique (empreinte digitale, reconnaissance faciale ou code PIN système) pour une connexion rapide et sécurisée.
* **Enregistrement de l'appareil (automatique)** : Juste après votre première connexion par mot de passe, une fenêtre s'affiche pour vous proposer d'activer la connexion biométrique. Cliquez sur **Activer** puis validez auprès de votre système d'exploitation.
* **Se connecter d'un clic** : Lors des connexions futures, cliquez simplement sur le bouton **Se connecter avec la biométrie** situé sous le formulaire de connexion.
* **Bouton d'urgence de réinitialisation** : Si vous rencontrez un problème avec la biométrie (appareil non reconnu ou clé supprimée), cliquez sur le lien *"Problème avec la biométrie ? Réinitialiser l'appareil"* pour vider l'état local et réinitialiser la configuration.

---

## 2. Le tableau de bord (Dashboard)

Le tableau de bord centralise votre santé financière en un seul clin d'œil.

* **Menu Burger (tiroir latéral de navigation)** : Cliquez sur l'icône de menu (les trois barres en haut à gauche) pour déployer le tiroir latéral et naviguer vers les sections d'administration (Profil, Catégories, Tags, Déconnexion).
* **Consulter le solde global (Net Worth)** : En haut de l'écran, le total affiche la somme de vos comptes liquides disponibles (moins vos dettes de crédits si incluses).
  * *Geste interactif* : **Tapez sur le montant du solde global** pour afficher une infobulle (Toast) détaillant la composition exacte (ex. : Disponible vs Dettes de crédit).
* **Raccourcis de navigation rapide (Dashboard Hub)** : Ce widget sous forme de grille tactile $2 \times 4$, situé sur le tableau de bord, vous permet d'accéder en un seul clic aux outils et analyses principaux (budgets, abonnements, épargne, analyses graphiques, échéances planifiées, virements, conseils IA et scores financiers).
* **Faire défiler le carrousel des comptes** : Faites glisser horizontalement les cartes bancaires colorées. Chaque carte représente l'un de vos comptes et son solde.
  * *Geste interactif* : **Tapez sur une carte de compte standard** pour ouvrir son formulaire de modification.
  * *Geste interactif* : **Tapez sur une carte de type Crédit (bordeaux)** pour être redirigé vers sa page d'analyse détaillée de prêt.
* **Ajout rapide de transaction** : Cliquez sur le bouton d'action flottant `+` en bas au centre pour ouvrir le tiroir inférieur (Bottom Sheet) de saisie instantanée.
* **Le solde plancher (Vrai Disponible) 📉** : Situé juste sous le solde global, il affiche votre disponible réel après déduction des factures et charges programmées d'ici votre prochaine paie.
  * *Indicateur visuel* : Une pastille verte signale un solde confortable (> 20 % du solde réel), tandis qu'un indicateur orange ou rouge signale un risque de découvert ou de trésorerie tendue.
  * *Graphique de tendance interactif* : Glissez votre doigt sur le mini-graphique (Sparkline) à 30 jours pour inspecter votre solde futur projeté au jour le jour. Une ligne pointillée rouge matérialise le seuil critique de `0 €` (zone rouge) en cas de risque de solde négatif.
  * *Configuration de la paie* : Cliquez sur l'icône d'engrenage pour fixer manuellement le jour récurrent de versement de votre paie (ou conservez la détection automatique via votre échéancier).
  * *Liste d'échéances pliable* : Déroulez l'accordéon en bas de la carte pour inspecter les factures attendues d'ici la paie. Vous pouvez cocher une facture pour l'exclure du calcul si vous l'avez déjà payée par un autre canal, ce qui réajuste instantanément votre Vrai Disponible.

---

## 3. Gestion des comptes bancaires

Allez dans le menu **Comptes** pour configurer vos comptes physiques ou vos prêts.

### 3.1 Création et modification de comptes standards
Vous pouvez créer 4 types de comptes standards : **Courant (Checking)**, **Épargne (Savings)**, **Espèces (Cash)** ou **Investissement (Investment)**.
* **Ajouter un compte** : Cliquez sur l'icône `+` en haut à droite.
* **Remplir les champs** : Nom, solde de départ, couleur et icône représentatives de votre choix.
* **Option d'inclusion** : Cochez ou décochez *"Inclure dans le Total"*. Les comptes exclus (ex. : investissements bloqués) n'affecteront pas le solde net du Dashboard.
* **Ordonner les comptes** : Maintenez le clic ou votre doigt appuyé et réorganisez l'ordre d'affichage des comptes dans le carrousel pour mettre en avant vos comptes favoris.
* **Supprimer un compte** : Cliquez sur le bouton de suppression en bas du formulaire d'édition, puis validez dans la fenêtre de confirmation.
  > [!WARNING]
  > La suppression d'un compte entraîne la suppression définitive de toutes les transactions et planifications qui lui sont associées.

### 3.2 Gestion des comptes de type Crédit / Prêt 🏦
Ces comptes modélisent vos emprunts en cours (immobiliers, auto, etc.).
* **Créer un crédit** : Choisissez le type **Crédit** dans le formulaire.
* **Renseigner les caractéristiques** : Saisissez le capital emprunté (ex. : 150 000 €), le taux d'intérêt annuel (ex. : 3,5 %), la durée du prêt (ex. : 240 mois), la date de première échéance et le compte source de prélèvement (le compte courant sur lequel sera prélevée la mensualité).
* **Consulter l'amortissement** : Appuyez sur la carte du crédit depuis le tableau de bord ou la page des comptes :
  * **Graphique d'amortissement** : Visualisez la courbe de réduction progressive de votre dette (qui tend vers 0 €).
  * **Widgets d'intérêts** : Consultez le cumul des intérêts déjà payés et le reste à payer estimé.
  * **Prochaine échéance** : Visualisez la décomposition exacte de votre prochain prélèvement (part amortissement de capital vs part d'intérêts).
  * **Historique des mensualités** : Parcourez le tableau récapitulatif des versements passés.

---

## 4. Saisie et historique des transactions

### 4.1 Saisie rapide (Bottom Sheet)
* **Sélectionner le type** : Choisissez entre **Dépense** (rouge), **Revenu** (vert) ou **Virement** (bleu).
* **Saisie du montant** : Tapez sur le champ de saisie du montant.
  * *Sur mobile* : Le clavier numérique décimal natif s'affiche automatiquement.
  * *Règles de saisie* : La virgule `,` est automatiquement convertie en point `.`. Le montant est limité à 2 décimales.
* **Associer le compte et la catégorie (sélecteurs tactiles)** : 
  * Appuyez sur le sélecteur de compte ou de catégorie pour ouvrir un tiroir interactif (**Bottom Sheet**) dédié.
  * *Choix du compte* : Le sélecteur affiche le type et le solde en temps réel de chaque compte dans une liste optimisée pour le pouce.
  * *Choix de la catégorie* : L'interface présente la structure complète avec les catégories parentes (Alimentation, Logement, etc.) et une grille de leurs sous-catégories associées.
  * Pour un virement, sélectionnez le compte de départ (`From`) et le compte de destination (`To`).
* **Ajouter des métadonnées** : Saisissez une note facultative (ex. : "Courses Leclerc") ou ajoutez des tags en insérant le symbole `#` (ex. : `#vacances`).
* **Valider** : Cliquez sur **Ajouter la transaction**.

### 4.2 Historique complet
Rendez-vous dans la rubrique **Transactions** pour consulter et filtrer vos écritures.
* **Rechercher** : Appuyez sur la loupe et saisissez un mot-clé ou un tag.
* **Filtrer par compte** : Sélectionnez un compte dans le menu déroulant.
  * *Comportement des signes de virements* :
    * Si vous filtrez sur votre **compte courant**, le virement lié au crédit s'affiche en négatif (`-350,00 €` en gris) pour représenter le prélèvement.
    * Si vous filtrez sur le **compte de crédit**, ce même virement s'affiche en positif (`+350,00 €` en vert) car il représente le remboursement de la dette.
* **Éditer/Modifier** : Cliquez sur une transaction dans la liste pour rouvrir son formulaire.
* **Supprimer** : Survolez la transaction sur ordinateur pour cliquer sur l'icône de corbeille, ou balayez vers la gauche sur mobile pour révéler le bouton de suppression rouge. Confirmez ensuite votre choix.

### 4.3 Gestion des étiquettes (Tags) et archivage
Pour suivre des dépenses liées à des événements ou projets transversaux (ex. : `#vacances 2026`, `#noel`), Budgetizer vous permet de gérer vos étiquettes (tags) de manière flexible.
* **Créer ou modifier un tag** : Rendez-vous dans le menu latéral (tiroir de navigation) et sélectionnez **Tags**. Vous pouvez y créer un tag avec un nom et une couleur personnalisée.
* **Archiver un tag obsolète** : Si un projet est terminé (ex. : après vos vacances), modifiez le tag et activez l'option **Archiver l'étiquette**. 
  * *Effet de l'archivage* : Le tag n'apparaîtra plus dans la liste des suggestions lors de la saisie de nouvelles dépenses pour éviter l'encombrement visuel. Toutefois, l'historique de vos dépenses passées et vos graphiques d'analyses restent entièrement inchangés.
* **Filtrer la liste des tags** : Sur la page de gestion des tags, utilisez la barre d'onglets de filtrage en haut de l'écran pour afficher :
  * **Tous** : L'ensemble de vos tags avec séparation claire entre tags actifs et archivés.
  * **Actifs** : Uniquement vos tags utilisables en saisie.
  * **Archivés** : Uniquement vos tags obsolètes archivés (vous pouvez modifier un tag archivé pour le réactiver à tout moment).

---

## 5. Planification de budgets (Enveloppes)

Suivez la méthode éprouvée des enveloppes budgétaires dans l'onglet **Budgets**.

* **Créer une enveloppe** : Cliquez sur le bouton `+` et choisissez une catégorie (ex. : "Alimentation"), un montant alloué pour la période et la périodicité (hebdomadaire, mensuelle ou annuelle).
* **Option de report (Rollover)** : Activez cette option pour que le solde restant (économies) ou le dépassement (déficit) soit reporté sur le budget du mois suivant.
* **Suivi en temps réel** : La barre de progression colorée indique la part consommée du budget.
  * **Vert** : Moins de 80 % du budget consommé.
  * **Orange** : Entre 80 % et 100 % consommés.
  * **Rouge** : Budget dépassé.
* **Détail des transactions (Drill-down)** : Cliquez sur une barre de budget pour ouvrir instantanément la liste des transactions réelles ayant consommé cette enveloppe durant le mois.

---

## 6. Transactions planifiées et abonnements

Automatisez vos factures, salaires ou abonnements récurrents dans l'onglet **Planifications**.

### 6.1 Configuration des répétitions
* **Créer une planification** : Définissez la fréquence (ex. : toutes les 2 semaines, tous les mois) et la date de début.
* **Gestion intelligente des fins de mois** : Si vous configurez une récurrence mensuelle le 31 d'un mois, Budgetizer s'adapte automatiquement aux mois plus courts (le prélèvement aura lieu le 30 avril ou le 28/29 février) tout en revenant automatiquement au 31 lors des mois suivants, évitant ainsi tout décalage temporel progressif.
* **Mode de validation** :
  * **Auto-confirmer = OUI** : Dès que l'échéance arrive, Budgetizer insère automatiquement la transaction et met à jour les soldes sans intervention de votre part.
  * **Auto-confirmer = NON** : La transaction apparaît dans la section **"À confirmer"**. Vous devez la valider manuellement (avec possibilité d'ajuster le montant), la modifier ou la passer (l'ignorer).

### 6.2 Suivi des abonnements (Subscriptions)
* **Visualiser les coûts fixes** : L'écran affiche la somme mensuelle et annuelle cumulée de tous vos abonnements actifs (Netflix, électricité, loyer, etc.).
* **Abonnements liés à un crédit** : Les remboursements de crédit portent un badge `"🏦 Crédit"`. Ils ne peuvent pas être modifiés ou supprimés depuis cet écran : cliquez sur le lien fourni pour être redirigé vers la gestion du compte de crédit.

---

## 7. Projets et objectifs d'épargne

Définissez et alimentez des projets financiers spécifiques dans l'onglet **Épargne**.

* **Ajouter un projet** : Renseignez le nom (ex. : "Apport immo", "Fonds d'urgence"), le montant cible et la date limite.
* **Liaison bancaire** : Associez (facultativement) un compte d'épargne (ex. : Livret A) à l'objectif.
* **Faire un versement ou un retrait** :
  * **Si un compte réel est lié** : Budgetizer génère un virement réel depuis le compte courant sélectionné vers le compte d'épargne cible. La progression de l'objectif et le solde des comptes réels sont synchronisés en temps réel.
  * **Si aucun compte n'est lié (virtuel)** : Le versement est traité comme une dépense virtuelle pour isoler fictivement la somme de votre solde disponible.

---

## 8. Statistiques, prévisions et vélocité (Tachymètre)

Analysez le passé, anticipez le futur et surveillez votre rythme de dépenses dans l'onglet **Statistiques**.

* **Répartition catégorielle** : Un graphique en secteurs (camembert) présente la répartition de vos dépenses ou revenus.
  * *Interaction* : Cliquez sur un secteur pour faire apparaître le détail chiffré.
* **Évolution de trésorerie** : Suivez l'historique de votre solde cumulé global.
* **Prévisions à 30 jours (Forecast)** : Visualisez la courbe de projection combinant votre solde historique et l'évolution estimée sur le mois à venir.
  * *Méthode* : Elle intègre vos abonnements, vos prélèvements planifiés et une estimation statistique de vos dépenses courantes. Un corridor flouté représente l'intervalle de confiance (variations possibles).
  * *Détail des prévisions* : Cliquez sur un point de la courbe prévisionnelle pour lister les transactions programmées qui impacteront votre solde ce jour-là.
* **Tachymètre : Rythme des dépenses (Spending Velocity)** : Un indicateur interactif sous forme de jauge (compteur de vitesse) vous indique en temps réel si vous consommez vos enveloppes budgétaires trop rapidement.
  * *Geste tactile* : Sélectionnez une catégorie dans le menu déroulant (ou conservez "Toutes dépenses confondues"). Les calculs s'adaptent instantanément.
  * *Lecture de la jauge* :
    * **Zone verte** : Votre vitesse de dépense réelle sur les 7 derniers jours est inférieure ou égale à la limite quotidienne autorisée pour tenir le mois. Le diagnostic indique *"Vitesse sous contrôle"* et l'aiguille se situe à gauche.
    * **Zone rouge** : Vous dépensez trop rapidement. Le diagnostic indique *"⚠️ Excès de vitesse détecté"* et l'aiguille bascule vers la droite, estimant la date précise d'épuisement complet (crash) du budget si vous maintenez ce rythme.
  * *Action corrective* : Une fiche d'aide calcule en temps réel la nouvelle limite quotidienne conseillée à respecter pour le reste du mois afin de compenser les écarts et finir dans le vert. Si le budget est déjà épuisé, la jauge affiche une limite conseillée de 0 €/jour.
* **Stress-test & Résilience (Simulation de Monte-Carlo)** : Projetez la viabilité à long terme de votre patrimoine financier (de 5 à 40 ans) en exécutant localement dans votre navigateur 1 000 trajectoires de simulations aléatoires (processus stochastique) intégrant la volatilité des marchés, l'inflation et d'éventuels sinistres majeurs.
  * *Curseurs de configuration (⚙️)* : Vous pouvez déplier ou replier le panneau des paramètres pour moduler :
    * Le **Capital initial** et l'**Épargne mensuelle** (calculés et préremplis automatiquement à partir de votre valeur nette globale et de votre capacité d'épargne moyenne, mais modifiables à souhait).
    * L'**Horizon temporel** de projection (5 à 40 ans).
    * Le **Profil d'investissement** : Boutons de sélection rapide (*Prudent* : rendement 2,5 % / volatilité 2 %, *Équilibré* : 5 % / 8 %, *Dynamique* : 8 % / 16 %) qui mettent à jour automatiquement les curseurs de rendement annuel attendu et de volatilité.
    * Le taux d'**inflation estimé** pour mesurer l'évolution de votre patrimoine en euros constants (pouvoir d'achat d'aujourd'hui). Vous pouvez choisir d'indexer ou non votre épargne sur celle-ci.
    * Le **Stress-test "coups durs"** : Définissez la probabilité annuelle (fréquence) d'un incident majeur (maladie, sinistre, chômage) et son coût estimé (gravité) pour évaluer la résistance de votre plan financier.
  * *Interprétation du graphique* :
    * La ligne centrale pleine représente la trajectoire médiane (50e percentile : le scénario le plus probable).
    * La zone verte translucide délimite l'entonnoir d'incertitude compris entre le pire scénario (10e percentile : 90 % de chances de faire mieux) et le meilleur scénario (90e percentile : 10 % de chances de faire mieux).
  * *Rapport de diagnostic* : Un score de résilience (pourcentage de simulations réussies où le capital reste positif au terme de la simulation) vous attribue un diagnostic (*Excellent*, *Correct* ou *Vulnérable*) et affiche le délai de rupture moyen (en années) en cas d'épuisement.
* **Fixes vs Variables (Anatomie mensuelle des dépenses)** 🔒🎲 : Visualisez, pour un mois donné, la répartition de vos dépenses entre charges incompressibles planifiées et dépenses spontanées.
  * *Sélection du mois* : Naviguez d'un mois à l'autre via les flèches `←` / `→`, ou cliquez sur le mois affiché pour ouvrir le sélecteur (les 18 derniers mois sont disponibles).
  * *Indicateurs clés (KPI)* : Trois cartes affichent en un coup d'œil le total de dépenses du mois, le montant et le pourcentage de charges fixes (indigo 🔒) et le montant et le pourcentage de dépenses variables (ambre 🎲).
  * *Donut interactif* : Un graphique en anneau à deux arcs colore visuellement la répartition — indigo pour les fixes, ambre pour les variables. Survolez ou appuyez sur un arc pour afficher son montant précis au centre. Une barre de progression linéaire en bas du graphique complète la visualisation du ratio.
  * *Listes par catégorie (pliables)* : Deux sections dépliables (« Charges fixes » et « Dépenses variables ») détaillent chaque catégorie : icône, nom, nombre de transactions, montant total et part en pourcentage.
  * *Classification automatique* : Une dépense est classée **fixe** si elle provient d'une transaction planifiée (loyer, abonnement, remboursement de crédit configuré dans l'onglet Planifications). Toute autre dépense saisie manuellement est considérée **variable**. Pour classer une dépense récurrente comme fixe, créez simplement une planification correspondante.
* **Analyse mensuelle (Graphique en cascade / Waterfall)** 📊 : Visualisez l'allocation de vos revenus perçus vers vos dépenses par catégorie pour le mois sélectionné.
  * *Déroulement de la cascade* : Le graphique commence par la barre verte représentant vos revenus totaux, suivie par des marches descendantes de couleur rose pour chaque catégorie de dépenses (triées de la plus importante à la moins importante), et se termine par le solde restant (violet pour une épargne nette positive, rose/rouge pour un déficit net).
  * *Détail des flux* : Un tableau au bas du graphique récapitule les montants exacts et le pourcentage de chaque catégorie par rapport à l'enveloppe globale de dépenses.


---

## 9. IA et conseils (Insights)

Optimisez vos finances grâce aux analyses automatiques fournies dans l'onglet **Conseils**.

* **Détection d'anomalies de dépenses** : Budgetizer analyse vos dépenses du mois en cours et les compare à votre moyenne historique des 3 derniers mois.
  * **Alerte Orange** : Dépassement de plus de 30 % par rapport à l'habitude.
  * **Alerte Rouge** : Dépassement critique de plus de 60 %.
* **Suggestions d'économies** : L'outil isole votre Top 3 des catégories les plus dépensières.
  * *Chips de simulation* : Cliquez sur les puces **-10 %**, **-20 %** ou **-30 %** pour projeter l'économie annuelle correspondante.

---

## 10. Rapport mensuel proactif

Consultez le bilan financier personnalisé de vos mois passés dans l'onglet **Rapports**.

* **Bilan narratif** : Analyse automatisée de vos revenus, dépenses, taux d'épargne et variations.
* **Victoires et vigilances** : Liste de vos bons comportements (budgets respectés) et des dérives (nouveaux abonnements).
* **Dépenses inhabituelles** : Fiches détaillées des transactions au montant anormal (ex. : une dépense unitaire qui dépasse de 3 fois la moyenne habituelle de la catégorie). Affiche le ratio d'écart (ex. : `"4.5x la moyenne"`).

---

## 11. Import et export de données

Garantissez la portabilité de vos données financières depuis l'onglet **Paramètres**.

* **Exporter** : Sélectionnez le format souhaité (**CSV** ou **JSON**) pour télécharger l'intégralité de vos écritures sur votre appareil.
* **Importer** : Glissez-déposez ou sélectionnez un fichier CSV d'historique de transactions pour l'importer dans l'application.

---

## 12. Configuration des paramètres

Personnalisez l'application dans l'onglet **Paramètres**.

* **Profil et mot de passe** : Modifiez votre nom d'affichage ou mettez à jour votre mot de passe.
* **Préférences visuelles** :
  * **Thème** : Basculez entre le mode Sombre, Clair, ou l'alignement Système.
  * **Devise** : Modifiez la devise par défaut de vos saisies (€, $, £, etc.).
* **Zone de danger (Danger Zone)** :
  * **Effacer les données** : Réinitialise tous vos comptes, transactions et budgets, vous permettant de recommencer à zéro tout en conservant votre compte utilisateur.
  * **Supprimer le compte** : Supprime définitivement et sans recours toutes vos données de la base de données Budgetizer (conformité RGPD).
