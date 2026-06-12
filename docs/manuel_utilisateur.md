# Manuel d'Utilisation — Budgetizer 💰

Bienvenue dans **Budgetizer**, votre compagnon de gestion financière personnelle. Ce manuel a été conçu pour guider les nouveaux utilisateurs à travers toutes les fonctionnalités de l'application et lister l'intégralité des gestes et interactions possibles.

---

## Sommaire
1. [Premiers pas : Authentification & Biométrie](#1-premiers-pas--authentification--biométrie)
2. [Le Tableau de Bord (Dashboard)](#2-le-tableau-de-bord-dashboard)
3. [Gestion des Comptes Bancaires](#3-gestion-des-comptes-bancaires)
4. [Saisie et Historique des Transactions](#4-saisie-et-historique-des-transactions)
5. [Planification de Budgets (Enveloppes)](#5-planification-de-budgets-enveloppes)
6. [Transactions Planifiées & Abonnements](#6-transactions-planifiées--abonnements)
7. [Projets et Objectifs d'Épargne](#7-projets-et-objectifs-dépargne)
8. [Statistiques, Prévisions & Vélocité (Tachymètre)](#8-statistiques-prévisions--vélocité-tachymètre)
9. [IA & Conseils (Insights)](#9-ia--conseils-insights)
10. [Rapport Mensuel Proactif](#10-rapport-mensuel-proactif)
11. [Import & Export de Données](#11-import--export-de-données)
12. [Configuration des Paramètres](#12-configuration-des-paramètres)

---

## 1. Premiers pas : Authentification & Biométrie

### 1.1 Inscription & Connexion
* **Créer un compte** : Renseignez votre nom complet, adresse e-mail et un mot de passe (6 caractères minimum). Lors de la création, vos catégories par défaut et préférences initiales sont automatiquement créées.
* **Se connecter** : Saisissez vos identifiants classiques pour ouvrir une session sécurisée.

### 1.2 Activation et Connexion par Biométrie (Passkeys)
Budgetizer prend en charge l'authentification biométrique (empreinte digitale, reconnaissance faciale ou code PIN système) pour une connexion rapide et sécurisée.
* **Enregistrement de l'appareil (Automatique)** : Juste après votre première connexion par mot de passe, une fenêtre s'affiche pour vous proposer d'activer la connexion biométrique. Cliquez sur **Activer** puis validez auprès de votre système d'exploitation.
* **Se connecter d'un clic** : Lors des connexions futures, cliquez simplement sur le bouton **Se connecter avec la biométrie** situé sous le formulaire de connexion.
* **Bouton d'urgence de réinitialisation** : Si vous rencontrez un problème avec la biométrie (appareil non reconnu ou clé supprimée), cliquez sur le lien *"Problème avec la biométrie ? Réinitialiser l'appareil"* pour vider l'état local et réinitialiser la configuration.

---

## 2. Le Tableau de Bord (Dashboard)

Le tableau de bord centralise votre santé financière en un seul coup d'œil.

* **Menu Burger (Tiroir de navigation latéral)** : Cliquez sur l'icône de menu (les trois barres en haut à gauche) pour déployer le tiroir latéral et naviguer vers les autres sections de l'application.
* **Consulter le Solde Global (Net Worth)** : En haut de l'écran, le total affiche la somme de vos comptes liquides disponibles (moins vos dettes de crédits si incluses).
  * *Geste interactif* : **Tapez sur le montant du Solde Global** pour afficher une infobulle (Toast) détaillant la composition exacte (ex : Disponible vs Dettes crédit).
* **Faire défiler le Carrousel des Comptes** : Faites glisser horizontalement les cartes bancaires colorées. Chaque carte représente un de vos comptes et son solde.
  * *Geste interactif* : **Tapez sur une carte de compte standard** pour ouvrir son formulaire de modification.
  * *Geste interactif* : **Tapez sur une carte de type Crédit (bordeaux)** pour être redirigé vers sa page d'analyse détaillée de prêt.
* **Ajout rapide de transaction** : Cliquez sur le bouton d'action flottant `+` en bas au centre. Cela ouvre la bottom sheet de saisie instantanée.
* **Le Solde Plancher (Vrai Disponible) 📉** : Situé juste sous le Solde Global, il affiche votre disponible réel après déduction des factures et charges programmées d'ici votre prochaine paye.
  * *Indicateur visuel* : Une pastille verte signale un solde confortable (> 20% du solde réel), tandis qu'un indicateur orange ou rouge signale un risque de découvert ou de trésorerie tendue.
  * *Graphique de tendance interactif* : Glissez le doigt sur le mini-graphique (Sparkline) à 30 jours pour inspecter votre solde futur projeté au jour le jour. Une ligne pointillée rouge matérialise le seuil critique de `0 €` (Zone Rouge) en cas de risque de solde négatif.
  * *Configuration de la paye* : Cliquez sur l'icône d'engrenage pour fixer manuellement le jour récurrent de versement de votre paye (ou conservez la détection automatique via votre échéancier).
  * *Liste d'échéances pliable* : Déroulez l'accordéon en bas de la carte pour inspecter les factures attendues d'ici la paye. Vous pouvez cocher une facture pour l'exclure du calcul si vous l'avez déjà payée par un autre canal, ce qui réajuste instantanément votre Vrai Disponible.

---

## 3. Gestion des Comptes Bancaires

Allez dans le menu **Comptes** pour configurer vos comptes physiques ou vos prêts.

### 3.1 Création et Modification de Comptes Standard
Vous pouvez créer 4 types de comptes standards : **Courant (Checking)**, **Épargne (Savings)**, **Espèces (Cash)** ou **Investissement (Investment)**.
* **Ajouter un compte** : Cliquez sur l'icône `+` en haut à droite.
* **Remplir les champs** : Nom, Solde de départ, Couleur et Icône représentatives.
* **Option d'inclusion** : Cochez/décochez *"Inclure dans le Total"*. Les comptes exclus (ex : investissements bloqués) n'affecteront pas le solde net du Dashboard.
* **Ordonner les comptes** : Maintenez le clic ou le doigt et réorganisez l'ordre d'affichage des comptes dans le carrousel pour mettre en avant vos comptes favoris.
* **Supprimer un compte** : Cliquez sur le bouton de suppression en bas du formulaire d'édition, puis validez dans la modale de confirmation.
  > [!WARNING]
  > La suppression d'un compte entraîne la suppression définitive de toutes les transactions et planifications qui lui sont associées.

### 3.2 Gestion des Comptes de type Crédit / Prêt 🏦
Ces comptes modélisent vos emprunts en cours (immobiliers, auto, etc.).
* **Créer un crédit** : Choisissez le type **Crédit** dans le formulaire.
* **Renseigner les caractéristiques** : Capital emprunté (ex: 150000 €), Taux d'intérêt annuel (ex: 3.5%), Durée du prêt (ex: 240 mois), Date de 1ère échéance, et le **Compte source de prélèvement** (le compte courant d'où sera prélevée l'échéance).
* **Consulter le Amortissement** : Tapez sur la carte du crédit sur le Dashboard ou la page des comptes :
  * **Graphique d'Amortissement** : Visualisez la courbe de réduction progressive de votre dette (qui tend vers 0 €).
  * **Widgets d'intérêt** : Lisez le cumul des intérêts déjà payés et le reste à payer estimé.
  * **Prochaine échéance** : Visualisez la décomposition exacte de votre prochain prélèvement (Part amortissement de capital vs Part intérêts).
  * **Historique des mensualités** : Parcourez le tableau récapitulant les versements passés.

---

## 4. Saisie et Historique des Transactions

### 4.1 Saisie Rapide (Bottom Sheet)
* **Sélectionner le type** : Choisissez entre **Dépense** (rouge), **Revenu** (vert) ou **Virement** (bleu).
* **Saisie du Montant** : Tapez sur le champ de saisie du montant.
  * *Sur mobile* : Le clavier numérique décimal natif s'affiche automatiquement.
  * *Règles de saisie* : La virgule `,` est automatiquement convertie en point `.`. Vous êtes limité à 2 décimales après la virgule.
* **Associer le compte et la catégorie** :
  * Pour un virement, sélectionnez le compte de départ (`From`) et le compte de destination (`To`).
* **Ajouter des métadonnées** : Saisissez une note facultative (ex : "Courses Leclerc") ou ajoutez des tags en tapant `#` (ex : `#vacances`).
* **Valider** : Cliquez sur **Ajouter la transaction**.

### 4.2 Historique Complet
Rendez-vous dans la rubrique **Transactions** pour consulter et filtrer vos écritures.
* **Rechercher** : Cliquez sur la loupe et saisissez un mot-clé ou un tag.
* **Filtrer par compte** : Sélectionnez un compte dans le menu déroulant.
  * *Comportement des signes de virements* :
    * Si vous filtrez sur votre **compte courant**, le virement de crédit s'affiche en négatif (`- 350,00 €` en noir/gris) représentant le prélèvement.
    * Si vous filtrez sur le **compte de crédit**, ce même virement s'affiche en positif (`+ 350,00 €` en vert) car il représente le remboursement de la dette.
* **Éditer/Modifier** : Cliquez sur une transaction dans la liste pour rouvrir son formulaire.
* **Supprimer** : Survolez la ligne de la transaction sur ordinateur (ou glissez/maintenez sur mobile) pour faire apparaître la corbeille. Cliquez sur la corbeille et confirmez dans la popin.

---

## 5. Planification de Budgets (Enveloppes)

Suivez la méthode éprouvée des enveloppes budgétaires dans l'onglet **Budgets**.

* **Créer une enveloppe** : Cliquez sur `+` et choisissez une catégorie (ex : "Alimentation"), un montant alloué pour la période, et la périodicité (mensuelle, hebdomadaire, annuelle).
* **Option de report (Rollover)** : Activez cette option si vous souhaitez que le solde restant (économies) ou le dépassement (déficit) soit reporté sur le budget du mois suivant.
* **Suivi en temps réel** : La barre de progression colorée indique la part consommée du budget.
  * **Vert** : Moins de 80% du budget consommé.
  * **Orange** : Entre 80% et 100% consommés.
  * **Rouge** : Budget dépassé.
* **Drill-down (Analyse de détail)** : Cliquez sur une barre de budget pour ouvrir instantanément la liste des transactions réelles qui ont consommé cette enveloppe durant le mois.

---

## 6. Transactions Planifiées & Abonnements

Automatisez vos factures, salaires ou abonnements récurrents dans l'onglet **Planifications**.

### 6.1 Configuration des répétitions
* **Créer une planification** : Définissez la fréquence (ex : toutes les 2 semaines, tous les mois) et la date de départ.
* **Mode de validation** :
  * **Auto-confirmer = OUI** : Dès que l'échéance arrive, Budgetizer insère la transaction et met à jour les soldes sans votre intervention.
  * **Auto-confirmer = NON** : La transaction apparaît dans la section **"À confirmer"**. Vous devez manuellement la **Confirmer** (possibilité de réajuster le montant à la baisse ou à la hausse), la **Modifier** ou la **Passer** (l'ignorer).

### 6.2 Suivi des Abonnements (Subscriptions)
* **Visualiser les coûts fixes** : L'écran affiche la somme mensuelle et annuelle cumulée de tous vos abonnements actifs (Netflix, électricité, loyer, etc.).
* **Repérer les abonnements de crédit** : Les planifications de remboursement de crédit portent un badge `"🏦 Crédit"`. Elles ne peuvent pas être supprimées ou modifiées d'ici : cliquez sur le lien fourni pour être redirigé vers la gestion du compte de crédit.

---

## 7. Projets et Objectifs d'Épargne

Définissez et alimentez des projets financiers spécifiques dans l'onglet **Épargne**.

* **Ajouter un projet** : Renseignez le nom (ex : "Apport immo", "Fonds d'urgence"), le montant cible et la date limite.
* **Liaison bancaire** : Associez (facultativement) un compte d'épargne (ex : Livret A) à l'objectif.
* **Faire un versement ou un retrait** :
  * **Si un compte réel est lié** : Budgetizer génère un virement réel depuis le compte courant sélectionné vers le compte d'épargne cible. La progression de l'objectif et le solde des comptes réels sont synchronisés.
  * **Si aucun compte n'est lié (virtuel)** : Le versement est traité comme une dépense virtuelle pour isoler fictivement la somme de votre solde disponible.

---

## 8. Statistiques, Prévisions & Vélocité (Tachymètre)

Analysez le passé, anticipez le futur et surveillez votre rythme de dépenses dans l'onglet **Statistiques**.

* **Répartition catégorielle** : Un graphique en secteurs (camembert) présente la répartition de vos dépenses ou revenus.
  * *Interaction* : Cliquez sur un secteur pour faire apparaître le détail chiffré.
* **Évolution de Trésorerie** : Suivez l'historique de votre solde cumulé global.
* **Prévisions à 30 jours (Forecast)** : Visualisez la courbe de projection combinant votre solde historique et l'évolution estimée sur le mois à venir.
  * *Méthode* : Intègre vos abonnements et prélèvements planifiés ainsi qu'une estimation statistique de vos dépenses courantes. Un corridor flouté représente l'intervalle de confiance (variations possibles).
  * *Drill-down* : Cliquez sur un point de la courbe prévisionnelle pour lister les transactions programmées qui impacteront votre solde ce jour-là.
* **Tachymètre : Rythme de vos dépenses (Spending Velocity)** : Un widget interactif en forme de speedomètre vous indique en temps réel si vous consommez vos enveloppes budgétaires trop rapidement.
  * *Geste interactif* : **Sélectionnez une catégorie** dans le menu déroulant (ou laissez "Toutes dépenses confondues"). Les calculs s'adaptent instantanément.
  * *Lecture de la jauge* :
    * **Aiguille à gauche (Zone verte)** : Votre vitesse de dépense réelle sur les 7 derniers jours est inférieure ou égale à la limite autorisée par jour pour tenir le mois. Le diagnostic affiche *"Vitesse sous contrôle"*.
    * **Aiguille à droite (Zone rouge)** : Vous dépensez trop rapidement. Le diagnostic affiche *"⚠️ Excès de vitesse détecté"* et estime précisément la **date d'épuisement complète (crash)** de votre budget si vous maintenez ce rythme.
  * *Action corrective* : Une fiche d'aide recalcule pour vous en direct la **nouvelle limite quotidienne conseillée** à respecter sur les jours restants pour compenser le retard et terminer le mois dans le vert. Si le budget est déjà épuisé, la jauge s'affiche en rouge et vous conseille une limite de 0 €/jour.

---

## 9. IA & Conseils (Insights)

Optimisez vos finances grâce aux analyses automatiques fournies dans l'onglet **Conseils**.

* **Détection d'anomalies de dépenses** : Budgetizer analyse vos dépenses du mois en cours et les compare à votre moyenne historique (3 derniers mois).
  * **Alerte Orange** : Dépassement de plus de 30% par rapport à l'habitude.
  * **Alerte Rouge** : Dépassement critique de plus de 60%.
* **Suggestions d'économies** : L'outil isole votre Top 3 des catégories les plus dépensières.
  * *Chips de simulation* : Cliquez sur les puces **-10%**, **-20%** ou **-30%** pour projeter l'économie annuelle correspondante.

---

## 10. Rapport Mensuel Proactif

Consultez le bilan financier personnalisé de vos mois passés dans l'onglet **Rapports**.

* **Bilan narratives** : Analyse automatisée de vos revenus, dépenses, taux d'épargne et variations.
* **Victoires & Vigilances** : Liste de vos bons comportements (budgets respectés) et des dérives (nouveaux abonnements).
* **Dépenses inhabituelles** : Fiches détaillées des transactions de montants anormaux (ex: une dépense unitaire qui dépasse 3 fois la moyenne habituelle de la catégorie). Affiche le ratio d'écart (ex: `"4.5x la moyenne"`).

---

## 11. Import & Export de Données

Garantissez la portabilité de vos données financières depuis l'onglet **Paramètres**.

* **Exporter** : Cliquez sur le format souhaité (**CSV** ou **JSON**) pour télécharger l'intégralité de vos écritures sur votre appareil.
* **Importer** : Glissez-déposez ou sélectionnez un fichier CSV d'historique de transactions pour alimenter rapidement l'application.

---

## 12. Configuration des Paramètres

Personnalisez l'application dans l'onglet **Paramètres**.

* **Profil & Mot de passe** : Modifiez votre nom d'affichage ou mettez à jour votre mot de passe.
* **Préférences visuelles** :
  * **Thème** : Basculez entre le mode Sombre, Clair, ou l'alignement Système.
  * **Devise** : Modifiez la devise par défaut de vos saisies (€, $, £, etc.).
* **Zone de danger (Danger Zone)** :
  * **Effacer les données** : Réinitialise tous vos comptes, transactions et budgets, vous permettant de recommencer à zéro tout en conservant votre compte utilisateur.
  * **Supprimer le compte** : Supprime définitivement et sans recours toutes vos données de la base de données Budgetizer (conformité RGPD).
