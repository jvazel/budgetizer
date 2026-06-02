# Documentation Technique : Algorithme de Diagnostic Proactif Mensuel (Sans IA)

Ce document décrit en détail l'algorithme déterministe, basé sur des règles métiers, conçu pour générer automatiquement le rapport mensuel d'analyse financière dans **Budgetizer** de manière 100% gratuite, prédictible et fonctionnant hors ligne.

---

## 1. Variables d'Entrée Requises

Pour exécuter le diagnostic du mois $M$ (sélectionné), l'algorithme a besoin des données de l'utilisateur :
1. **Transactions du mois $M$** ($T_M$) : types (`income`, `expense`), montants, dates, liaisons de catégories et liaisons d'abonnements.
2. **Transactions du mois précédent $M-1$** ($T_{Prev}$).
3. **Transactions d'historique** sur la période glissante $M-3$ à $M-1$ ($T_{Hist}$).
4. **Budgets mensuels** définis par l'utilisateur pour le mois $M$.
5. **Objectifs d'Épargne** (`SavingsGoal`) de l'utilisateur.
6. **Abonnements planifiés** (`ScheduledTransaction` avec `isSubscription: true`).

---

## 2. Règles Logiques de Détection

### A. Synthèse Globale (Bilan Général)
* **Calculs** :
  * $Revenus_M = \sum T_{M, \text{income}}$
  * $Dépenses_M = \sum T_{M, \text{expense}}$
  * $Net_M = Revenus_M - Dépenses_M$
  * $TauxEpargne_M = \frac{Net_M}{Revenus_M} \times 100$ (si $Revenus_M > 0$)
* **Comparaison** :
  * Calcul de la variation des dépenses globales avec le mois $M-1$ :
    $$Var = \frac{Dépenses_M - Dépenses_{M-1}}{Dépenses_{M-1}} \times 100$$

---

### B. Les Victoires (Dépenses maîtrisées & Objectifs)

L'algorithme tente de sélectionner jusqu'à **3 victoires** par ordre de priorité décroissant :

1.  **Objectif d'Épargne Complété** :
    Un objectif est considéré comme complété au cours du mois $M$ si le solde cumulé de ses virements a franchi la cible durant ce mois.
    * *Condition* : 
      * Le solde final en $M$ est $\ge$ Cible.
      * Le solde au début du mois $M$ (c'est-à-dire à la fin de $M-1$) était $<$ Cible.
      * Calculé en retranchant du solde actuel du but l'historique des transferts récents.
2.  **Budget Maîtrisé** :
    * *Condition* : Une catégorie budgétée où les dépenses réelles du mois $M$ représentent moins de **85%** de la limite définie, avec un minimum de dépenses supérieur à 0 (pour éviter les enveloppes non utilisées).
3.  **Dépense catégorielle en baisse** :
    * *Condition* : Dépense totale de la catégorie en $M$ inférieure de plus de **15%** à sa moyenne historique glissante (sur les mois actifs de l'historique $M-3$ à $M-1$).

---

### C. Points de Vigilance (Dépassements & Anomalies)

L'algorithme tente de sélectionner jusqu'à **3 points de vigilance** par ordre de priorité :

1.  **Transaction Hors Normes (Outlier)** :
    Recherche d'une transaction de dépense unitaire inhabituelle dans le mois $M$.
    * *Condition* :
      * Pour chaque transaction $T$ de dépense dans la catégorie $C$, on compare son montant au montant unitaire moyen historique de cette même catégorie :
        $$MoyUnit_C = \text{Moyenne}(T_{Hist, \text{expense, } C})$$
      * Si $Montant_T \ge 3 \times MoyUnit_C$ et $Montant_T \ge 50\text{ €}$, la transaction est classée comme outlier. La plus déviante (ratio max) est sélectionnée.
2.  **Dépassement de Budget** :
    * *Condition* : Une catégorie budgétée où les dépenses réelles du mois $M$ dépassent **100%** de la limite autorisée.
3.  **Hausse catégorielle suspecte** :
    * *Condition* : Dépense totale d'une catégorie en $M$ supérieure de plus de **30%** par rapport à sa moyenne historique glissante (seuil minimal de dépenses moyennes de 10 € pour éliminer le bruit).

---

### D. Analyse des Abonnements
Compare les transactions d'abonnements entre le mois $M$ et le mois $M-1$ :
* **Augmentation** : Si le montant unitaire prélevé a augmenté d'au moins 0,05 €.
* **Diminution** : Si le montant unitaire prélevé a diminué d'au moins 0,05 €.
* **Nouvelle souscription** : Si une transaction est présente en $M$ mais absente en $M-1$ pour un abonnement actif.
* **Résiliation** : Si aucune transaction n'est présente en $M$ alors qu'elle l'était en $M-1$ et que la planification a été marquée inactive.

---

## 3. Structure des Gabarits de Texte (Templates)

L'algorithme injecte les valeurs chiffrées calculées dans les modèles de phrases suivants :

### Paragraphe 1 : Bilan Financier Global
> En **[Nom du Mois] [Année]**, tu as perçu un revenu total de **[Revenus] €** et réalisé **[Dépenses] €** de dépenses, dégageant un solde net d'épargne de **[Net] €** (soit un taux d'épargne de **[Taux]%**). [Phrase de variation globale].

### Paragraphe 2 : Les Victoires 🎉
> [Introduction Victoire]. [Détail Objectif Complété si trouvé]. [Détail budget maîtrisé OU catégorie en baisse]. [Optionnel: Détail abonnement résilié ou diminué].

### Paragraphe 3 : Points de vigilance ⚠️
> [Introduction Vigilance]. [Détail de la transaction hors normes si trouvée]. [Détail dépassement de budget OU hausse catégorielle]. [Optionnel: Détail abonnement souscrit ou augmenté].

---

## 4. Caching et Cycle de Vie des Rapports

* **Mois passés (finalisés)** : Les rapports des mois entièrement clos sont générés une seule fois et enregistrés en base dans le modèle `MonthlyReport`. Les lectures suivantes sont immédiates.
* **Mois en cours (provisoires)** : Le rapport du mois en cours est calculé à la volée à chaque appel et renvoyé avec l'indicateur `isProvisional: true` sans écriture en base de données. Cela permet de refléter les nouvelles transactions de l'utilisateur en temps réel.

---

## 5. Gestion de l'absence de données (État Vide)

Si le mois sélectionné ne comporte aucune transaction enregistrée (c'est-à-dire si les revenus et les dépenses cumulés sont tous deux égaux à 0 €), l'application n'affiche pas de rapport vide ou d'erreurs de rendu. Le frontend bascule automatiquement sur un écran d'état vide professionnel (« Données insuffisantes ») qui indique la situation de manière claire et invite l'utilisateur à saisir ses premières transactions pour débloquer le diagnostic.
