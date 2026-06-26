# Guide de Référence des Tests 🧪

Ce document détaille les tests automatisés mis en place sur l'application Budgetizer. Chaque test y est décrit selon ses **entrées (inputs)**, le **traitement exécuté** et les **sorties ou assertions vérifiées**.

---

## 1. Tests Frontend (Client)

Les tests de l'interface utilisateur s'exécutent avec **Vitest** dans un environnement `jsdom` (DOM virtuel) en utilisant **React Testing Library**.

### 1.1 Composant `AmountInput.jsx`
Ce composant gère la saisie de montants, le formatage en temps réel et l'affichage des claviers numériques mobiles décimaux.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu par défaut** | `value=""`, `onChange` (mock) | Rendu initial du composant | Le champ de saisie affiche le placeholder `"0.00"`. Le symbole `"€"` est visible. |
| **Affichage du signe (Dépense)** | `type="expense"`, `value="10"` | Rendu du préfixe de signe | Le signe moins `"-"` est visible à gauche du montant. |
| **Affichage du signe (Revenu)** | `type="income"`, `value="10"` | Rendu du préfixe de signe | Le signe plus `"+"` est visible à gauche du montant. |
| **Affichage du signe (Virement)** | `type="transfer"`, `value="10"` | Rendu du préfixe de signe | Aucun signe `"+"` ou `"-"` n'est visible dans le DOM. |
| **Conversion de la virgule** | Saisie de `"12,5"` dans le champ | Remplacement automatique du caractère `,` par `.` | La fonction `onChange` est appelée avec la valeur nettoyée `"12.5"`. |
| **Préfixage automatique du point** | Saisie de `"."` dans le champ vide | Ajout automatique d'un zéro initial | La fonction `onChange` est appelée avec la valeur `"0."`. |
| **Limitation des décimales** | Valeur actuelle `"12.34"`, tentative de saisie de `"12.345"` | Validation par l'expression régulière `/^\d*\.?\d{0,2}$/` | La fonction `onChange` n'est **pas** appelée (saisie bloquée). |
| **Prévention des zéros initiaux** | Saisie de `"05"` | Remplacement des zéros initiaux multiples (ex: `005` ou `05`) | La fonction `onChange` est appelée avec `"5"`. |
| **Autofocus** | Prop `autoFocus={true}` | Déclenchement d'un timer interne (150ms) pour forcer le focus du champ | Le curseur du document est actif sur le champ de saisie. |

---

### 1.2 Formulaire de Transaction (`TransactionFormSheet.jsx`)
Ce panneau gère la saisie, la validation et l'ajout/modification d'une transaction financière.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu fermé** | `isOpen={false}` | Rendu conditionnel du composant | Le DOM renvoyé est entièrement vide. |
| **Rendu ouvert** | `isOpen={true}` | Rendu des champs et récupération des comptes/catégories mockés | Le titre `"Nouvelle transaction"`, les boutons de type, le champ de montant, les sélections de comptes et de catégories sont affichés. |
| **Filtre dynamique des catégories** | Clic sur le bouton de type `"Revenu"` | Commutation de la variable d'état `type` et mise à jour de la liste des catégories | L'option de catégorie `"Salaire"` (revenu) est présente, tandis que la catégorie `"Alimentation"` (dépense) a disparu. |
| **Saisie et validation (Ajout)** | Saisie du montant `"45.50"`, note `"Courses"`, sélection catégorie `"cat1"`, clic sur `"Ajouter"` | Validation de la présence d'un montant, compte, catégorie, puis appel au hook `addTransaction` | La fonction `addTransaction` est appelée avec les paramètres de la transaction. Les callbacks `onSuccess` et `onClose` sont exécutés. |
| **Peuplement en mode édition** | `transactionToEdit` contenant un objet transaction (prop `transactionToEdit`), `isOpen={true}` | Remplissage des champs du formulaire avec les données existantes dans le cycle de vie `useEffect` | Le titre devient `"Modifier la transaction"`, le montant affiche `"1500"`, la note affiche le texte d'origine, et le bouton d'action devient `"Enregistrer les modifications"`. |
| **Initialisation date locale** | `defaultDate` (objet Date) fourni en paramètre | Remplissage du champ de date sans subir de décalage de fuseau horaire | La valeur du champ de date du formulaire est au format `YYYY-MM-DD` local correspondant exactement à la date sélectionnée. |

---

### 1.3 Formulaire des Transactions Planifiées (`ScheduledFormSheet.jsx`)
Ce panneau gère la planification récurrente de transactions ou d'abonnements, ainsi que la gestion des modèles d'abonnements rapides personnalisés (sauvegardés en `localStorage`).

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu fermé** | `isOpen={false}` | Rendu conditionnel du composant | Le DOM renvoyé est entièrement vide (`toBeEmptyDOMElement`). |
| **Création de planification** | `isOpen={true}`, montant `"29.99"`, description `"Abonnement Netflix"`, catégorie `"cat1"`, clic sur `"Créer"` | Association et validation des champs du formulaire, puis appel du callback `onSave` | La fonction `onSave` est déclenchée avec l'objet de planification complet (type `expense`, montant `29.99`, fréquence mensuelle, `autoConfirm: true`, etc.). |
| **Commutation en virement** | Clic sur l'onglet `"Virement"` | Commutation du type vers `transfer` | Le sélecteur `"Vers le compte"` s'affiche dans le DOM tandis que le bouton de choix de catégorie disparait. |
| **Chargement des modèles par défaut** | `localStorage` vide, rendu du panneau ouvert | Initialisation des modèles populaires codés en dur | Les boutons `"Netflix"` et `"Spotify"` s'affichent dans le carrousel de modèles rapides. |
| **Sauvegarde d'un modèle personnalisé** | Saisie montant `"45.00"`, description `"Abonnement Gym"`, catégorie `"Alimentation"`, clic sur `"Sauver modèle"` | Ajout du nouveau modèle à la liste et écriture dans `localStorage` | Le bouton `"Abonnement Gym"` s'affiche dans le carrousel. La clé `budgetizer_subscription_templates` en `localStorage` contient un objet avec `{ name: "Abonnement Gym", amount: 45 }`. |
| **Auto-remplissage depuis un modèle** | Clic sur le bouton `"Netflix"` du carrousel | Pré-remplissage des champs du formulaire à partir des données du modèle | Le champ description contient `"Netflix"` et le champ montant affiche `"15.99"`. |
| **Suppression d'un modèle par appui long** | Modèle `"My Special Sub"` présent en `localStorage`, `mousedown` maintenu pendant 850 ms sur son bouton | Déclenchement du timer de suppression, ouverture d'une confirmation, clic sur `"Supprimer"` | Le bouton du modèle disparaît du DOM. La clé `budgetizer_subscription_templates` en `localStorage` ne contient plus d'entrée avec `name: "My Special Sub"`. |

---

### 1.4 Page des Virements Instantanés (`TransfersPage.jsx`)
Cette page gère l'exécution immédiate d'un transfert de fonds entre deux comptes de l'utilisateur.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial** | Comptes bancaires mockés de l'utilisateur | Chargement de la page et sélection automatique des deux premiers comptes distincts | Le titre `"Nouveau Virement"` et les champs "Débiter" / "Créditer" sont rendus avec les soldes respectifs. |
| **Validation du solde** | Saisie d'un montant de `"600"` (dépassant le solde disponible de `"500"`) | Clic sur le bouton de confirmation | Le traitement est bloqué et l'alerte toast d'erreur `"Solde insuffisant..."` est déclenchée. |
| **Confirmation et exécution** | Saisie d'un montant valide `"150"`, clic sur `"Confirmer"`, puis clic sur `"Valider"` dans la modale | Ouverture d'une boîte de dialogue de confirmation, validation utilisateur, et appel à `addTransaction` | La transaction de type `transfer` est créée avec succès. La mise à jour des soldes via `fetchAccounts` est appelée. |

---

### 1.5 Bandeau d'installation PWA (`InstallPromptBanner.jsx`)
Ce bandeau gère l'incitation à l'installation de la Progressive Web App (PWA) sur mobile et ordinateur.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Ignoré si installé** | `isStandalone=true` | Initialisation du composant | Le DOM renvoyé est vide (le bandeau ne s'affiche pas). |
| **Installation Chrome/Android** | Clic sur `"Installer maintenant"` avec `isInstallable=true` | Appel à la fonction `installApp()` du contexte PWA | L'événement d'installation natif est intercepté et déclenché. Le toast de confirmation d'installation s'affiche. |
| **Fermeture et persistance** | Clic sur le bouton de fermeture `"Fermer"` | Masquage du bandeau et écriture locale dans `localStorage` | Le bandeau disparaît du DOM. La clé `'pwa_install_banner_dismissed'` est écrite à `'true'` dans le stockage local. |
| **Aide installation iOS** | Clic sur `"Installer sur iPhone"` avec `isIOS=true` | Commutation de l'état local pour ouvrir la modale d'aide iOS | La modale listant explicitement les étapes d'ajout à l'écran d'accueil Safari (bouton de partage, ajouter à l'écran d'accueil) s'affiche. |

---

### 1.6 Page de Connexion (`Login.jsx`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial** | Chargement de la page | Rendu des inputs et boutons | Les champs d'email, mot de passe et le bouton de connexion s'affichent correctement. |
| **Bascule de visibilité** | Clic sur l'icône de visibilité du mot de passe | Commutation du type de champ de mot de passe (`password` <-> `text`) | L'état visuel change correctement. |
| **Soumission valide** | Saisie d'email et mot de passe corrects, clic sur "Se connecter" | Appel de la fonction de connexion du contexte d'authentification | Appel réussi, toast de succès affiché, redirection vers la page d'accueil. |
| **Erreur de connexion** | Saisie d'identifiants incorrects, clic sur "Se connecter" | Appel de connexion renvoyant un rejet API | Toast d'erreur affiché avec le message de retour. |
| **Reset biométrique manuel** | Clic sur le bouton de réinitialisation biométrique | Suppression des clés `webauthn_registered_on_device` et `webauthn_dismissed_device` de `localStorage` | Toast de succès affiché, local storage purgé. |
| **Rendu bouton reset** | Support de WebAuthn actif (`window.PublicKeyCredential` et `navigator.credentials` définis) | Rendu de la page de connexion | Le bouton *"Problème avec la biométrie ?"* est affiché dans le DOM. |
| **Pas de bouton reset si non supporté** | WebAuthn non supporté par le navigateur | Rendu de la page de connexion | Le bouton de réinitialisation et de connexion biométrique ne s'affichent pas dans le DOM. |
| **Flux de connexion biométrique** | Clic sur "Se connecter avec la biométrie" | Demande du défi, appel à `navigator.credentials.get`, puis validation sur le serveur | Connexion réussie, stockage du token JWT et redirection. |
| **Nettoyage automatique si inconnu** | Erreur de périphérique inconnu (code HTTP 400) renvoyée par le serveur | Échec de connexion biométrique | Les clés `webauthn_registered_on_device` et `webauthn_dismissed_device` sont supprimées du `localStorage` pour éviter les blocages. |

---

### 1.7 Page d'Inscription (`Register.jsx`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial** | Chargement de la page | Rendu des inputs et boutons | Les champs nom, email, mot de passe, confirmation et le bouton s'affichent. |
| **Erreur de mot de passe** | Mots de passe non concordants ou moins de 6 caractères | Validation locale avant appel API | Message d'erreur toast affiché, inscription bloquée. |
| **Inscription réussie** | Champs valides, clic sur "Créer mon compte" | Appel de la méthode d'inscription et redirection | Compte créé (HTTP 201), toast de succès et redirection. |

---

### 1.8 Page des Paramètres (`SettingsPage.jsx`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial** | Utilisateur connecté | Rendu des sections de profil, préférences, import/export et zone de danger | Les informations de profil s'affichent dans les inputs correspondants. |
| **Sauvegarde du profil** | Saisie d'un nouveau nom, clic sur "Enregistrer le profil" | Appel de l'API de mise à jour du profil | Profil mis à jour, AuthContext synchronisé et toast de succès affiché. |
| **Changement de thème** | Clic sur le bouton de thème "Clair" | Envoi des modifications de préférences à l'API | Préférences mises à jour et enregistrées en base. |
| **Réinitialisation des données** | Clic sur "Effacer toutes les données", puis confirmation | Appel de l'API d'effacement et rechargement de page | Données effacées, toast de succès et rechargement de la fenêtre. |
| **Suppression de compte** | Clic sur "Supprimer définitivement mon compte", puis confirmation | Appel de l'API de suppression et déconnexion | Compte supprimé avec succès, utilisateur déconnecté. |
| **Rendu de la liste des clés** | Liste des clés existantes renvoyée par `/webauthn/credentials` | Rendu de la section biométrique | Affiche les noms des appareils enregistrés et leurs dates de création. |
| **Enregistrement de clé** | Saisie d'un nom d'appareil et clic sur "Enregistrer" | Appel à `/webauthn/register/options`, appel de `navigator.credentials.create`, puis validation sur le serveur | Enregistrement réussi, clé `webauthn_registered_on_device` stockée à `true`. |
| **Gestion doublon d'appareil** | Exception `InvalidStateError` (ou mention de Credential Manager) lors de `create` | Tentative d'enregistrement d'une clé existante | L'appareil est considéré configuré, le localStorage est mis à jour (`webauthn_registered_on_device` à `true`) et un toast informatif de succès s'affiche. |
| **Suppression d'appareil** | Clic sur l'icône de suppression d'une clé | Appel de l'API DELETE `/webauthn/credentials/:id` | Clé supprimée, flags du `localStorage` réinitialisés. |

---

### 1.9 Graphique de Prévisions (`ForecastChart.jsx`)
Ce composant affiche le graphique prévisionnel du solde de trésorerie avec des calculs statistiques.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial / Chargement** | API mockée en cours de réponse | Rendu du composant | Le spinner de chargement et le texte `"Méthode de calcul"` sont affichés. |
| **Rendu des prévisions réussies** | Données de prévisions mockées avec confidenceInterval | Chargement et mise à jour de l'état | Les prévisions de solde estimé s'affichent correctement dans le DOM, incluant la tendance calculée. |
| **Drill-down sécurisé (Clic)** | Clic sur un point de données prévisionnel avec solde `null` | Ouverture du BottomSheet de détail | Le panneau BottomSheet s'ouvre avec la liste de détail correspondante sans provoquer de crash (`TypeError: selectedMonth is null`). |

---

### 1.10 Graphique Comparatif de Budget (`BudgetActualChart.jsx`)
Ce graphique compare les enveloppes budgétaires définies avec le réel dépensé du mois.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial / Chargement** | API budgets en attente | Rendu initial | Le titre `"Comparatif par Budget"` et le spinner de chargement s'affichent. |
| **Rendu des budgets et structure** | Données de budgets mockées, comptes/catégories définis | Chargement et calculs de totaux | Affiche le cumul budgété/dépensé exact. Valide la présence des enveloppes budgétaires individuelles pour chaque catégorie sous forme de cartes de jauge personnalisées. |
| **Drill-down dépenses** | Clic sur la carte de budget cliquable | Déclenchement de la requête API et récupération des dépenses associées | Le BottomSheet glisse du bas et affiche la liste exhaustive des transactions réelles ayant grevé ce budget. |

---

### 1.11 Page du Rapport Mensuel (`MonthlyReportPage.jsx`)
Cette page affiche le diagnostic financier automatique généré par l'algorithme proactif mensuel.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **État de chargement** | `loading: true` retourné par le hook `useMonthlyReport` | Rendu du composant en attente | Le spinner et le texte `"Analyse en cours..."` s'affichent. |
| **État d'erreur** | `error: "Failed to fetch"` retourné par le hook | Rendu de l'état d'erreur | Le titre `"Erreur de chargement"` et le message d'erreur s'affichent. |
| **Rapport null** | `report: null`, `loading: false` | Rendu de l'état vide | Le message `"Aucune donnée disponible"` s'affiche. |
| **Données insuffisantes** | `financialStats: { income: 0, expenses: 0 }` | Détection de l'absence de transactions | L'écran `"Données insuffisantes"` et le message d'invitation à saisir des transactions s'affichent. |
| **Propriété `financialStats` absente** | Rapport sans le champ `financialStats` | Gérance gracieuse de la propriété manquante | L'écran `"Données insuffisantes"` s'affiche sans crash. |
| **Affichage des dépenses inhabituelles** | Rapport avec `unusualTransactions` contenant un élément | Rendu de la section dédiée | La section `"Dépenses inhabituelles détectées"` est visible. La description, la catégorie, le montant et le badge de ratio (ex: `"4.5x la moyenne"`) de la transaction inhabituelles s'affichent. |

---

### 1.12 Invite Biométrique (`Login.jsx`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Pas d'invite si configuré** | `webauthn_registered_on_device="true"` dans localStorage | Clic sur "Se connecter" avec succès | Redirection directe vers la page d'accueil sans afficher la modale biométrique. |
| **Invite proactive affichée** | Pas de clés WebAuthn enregistrées dans localStorage, navigateur compatible | Clic sur "Se connecter" avec succès | La modale `"Activer la connexion biométrique ? ⚡"` s'affiche à l'écran. |
| **Refus temporaire** | Clic sur `"Plus tard"` dans la modale d'invite | Écriture locale et redirection | La clé `'webauthn_dismissed_device'` est passée à `'true'` dans le localStorage, et l'utilisateur est redirigé vers l'accueil. |
| **Acceptation et succès** | Clic sur `"Activer"`, validation locale réussie | Appel API de génération/validation et redirection | Jeton WebAuthn enregistré sur le serveur, flag `'webauthn_registered_on_device'` à `'true'` dans le localStorage, et redirection à l'accueil avec toast de succès. |

---

### 1.13 Liste des Transactions (`TransactionList.jsx`)
Ce composant affiche les transactions sous forme de liste chronologique groupée par date, et calcule dynamiquement les signes et couleurs des montants.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu par date** | Liste de transactions mockées (Dépense, Revenu, Virement) | Rangement chronologique et regroupement par date locale | La structure affiche les titres de dates localisés, et le nom de chaque transaction est visible dans le document. |
| **Rendu signes Dépense & Revenu** | Une dépense et un revenu réels | Attribution de signe selon le type | La dépense s'affiche précédée de `"-"` et de la classe `text-primary/80` (si en dessous du seuil d'alerte). Le revenu s'affiche précédé de `"+"` et de la classe `text-accent`. |
| **Signe Virement par défaut** | Virement, `currentAccountId` non défini | Traitement par défaut du transfert en tant que sortie de fonds | Le virement s'affiche précédé de `"-"` et coloré en `text-danger` (si au-dessus du seuil). |
| **Virement sur compte source** | Virement, `currentAccountId` égal à l'émetteur (`acc_checking`) | Identification du compte débité | Le montant s'affiche en négatif (`-`) et rouge `text-danger` (si au-dessus du seuil) ou `text-primary/80` (si en dessous) pour symboliser le débit. |
| **Virement sur compte destinataire** | Virement, `currentAccountId` égal au récepteur (`acc_credit`) | Identification du compte crédité | Le montant s'affiche en positif (`+`) et vert `text-accent` pour symboliser l'augmentation de solde (ou remboursement de dette). |
| **Déclenchement du callback `onEdit`** | Prop `onEdit` mockée, clic sur le bouton "Modifier" d'une transaction | Propagation de l'événement `click` vers le handler parent | La fonction `onEdit` est appelée exactement 1 fois avec l'objet de la transaction correspondante en paramètre. |
| **Déclenchement du callback `onDelete`** | Prop `onDelete` mockée, clic sur le bouton "Supprimer" d'une transaction | Propagation de l'événement `click` vers le handler parent | La fonction `onDelete` est appelée exactement 1 fois avec l'objet de la transaction correspondante en paramètre. |

---

### 1.14 Fonctions d'aide à la vélocité (`velocityHelper.js`)
Ces fonctions pures calculent les variables mathématiques de vitesse de dépenses.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Jours restants en début de mois** | Date fixe (1er Avril 2026) | Appel à `getDaysRemaining` | Retourne `30`. |
| **Jours restants en fin de mois** | Date fixe (31 Décembre 2026) | Appel à `getDaysRemaining` | Retourne `1`. |
| **Février (Année non bissextile)** | Date fixe (15 Février 2025) | Appel à `getDaysRemaining` | Retourne `14`. |
| **Février (Année bissextile)** | Date fixe (15 Février 2028) | Appel à `getDaysRemaining` | Retourne `15`. |
| **Calcul vitesse cible** | Budget restant `150`, jours restants `15` | Appel à `getTargetVelocity` | Retourne `10`. |
| **Budget nul/négatif** | Budget `0` ou `-50` | Appel à `getTargetVelocity` | Retourne `0`. |
| **Jours restants nuls/négatifs** | Jours restants `0` ou `-5` | Appel à `getTargetVelocity` | Retourne `0`. |
| **Calcul vitesse réelle** | Dépenses `140`, jours écoulés `7` | Appel à `getActualVelocity` | Retourne `20`. |
| **Jours écoulés nuls/négatifs** | Jours `0` ou `-2` | Appel à `getActualVelocity` | Retourne `0`. |
| **Calcul date de crash** | Budget restant `100`, vitesse réelle `25` | Appel à `getDepletionDate` | Retourne une date correspondant à 4 jours après (ex: 14 Juin pour le 10 Juin). |
| **Date de crash arrondie** | Budget restant `100`, vitesse réelle `30` | Appel à `getDepletionDate` | Arrondit au jour supérieur (100/30 = 3.33 -> 4 jours), retourne 4 jours après. |
| **Crash avec budget nul/négatif** | Budget `0` ou `-10` | Appel à `getDepletionDate` | Retourne `null`. |
| **Crash avec vitesse réelle nulle** | Vitesse réelle `0` ou `-5` | Appel à `getDepletionDate` | Retourne `null`. |

---

### 1.15 Indicateur de Vélocité de Dépense (`VelocityChart.jsx`)
Ce composant affiche le tachymètre et les insights sous forme visuelle réactive.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu en cours de chargement** | Hooks `loading: true` | Rendu initial | Le spinner de chargement (`.animate-spin`) s'affiche. |
| **État sans budgets** | Liste de budgets vide | Rendu initial | Le message `"Aucun budget défini"` et l'explication s'affichent dans le DOM. |
| **Vitesse sous contrôle (Cas 1)** | Budget restant avec vitesse réelle < vitesse cible | Calculs et rendu de la jauge | Le titre, la jauge verte, et le badge `"Vitesse sous contrôle"` sont affichés avec les montants formatés. |
| **Excès de vitesse (Cas 2 & 3)** | Dépenses élevées avec vitesse réelle > vitesse cible | Rendu des alertes et actions | Le badge `"⚠️ Excès de vitesse détecté"` s'affiche avec la date estimée de crash (ex: `"25 juin 2026"`), ainsi que la fiche `"Action corrective proposée"` avec le montant quotidien recalculé. |
| **Interaction sélecteur** | Clic sur le dropdown, clic sur une catégorie (ex: "Loisirs") | Déclenchement de l'événement et mise à jour de l'état `selectedCategoryId` | Le dropdown affiche le nom de la catégorie sélectionnée et ferme la liste d'options. |

---

### 1.16 Composant de Saisie Générique (`Input.jsx`)
Ce composant UI générique gère les champs de saisie standard (texte, date, curseur range) utilisés dans les formulaires de l'application.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu par défaut** | `label="Username"`, `placeholder="Enter username"` | Rendu initial du composant | Le libellé `"Username"` et le placeholder sont visibles dans le document. |
| **Astérisque requis** | `required={true}`, `label="Email"` | Rendu conditionnel de l'indicateur de champ obligatoire | L'astérisque `"*"` est visible dans le DOM à côté du libellé. |
| **Message d'erreur** | `error="Invalid password"` | Rendu du message d'erreur sous le champ | Le texte `"Invalid password"` est affiché sous le champ de saisie. |
| **Déclenchement onChange** | Saisie de `"Query"` dans le champ | Appel du gestionnaire d'événement `onChange` | La fonction `onChange` mockée est appelée au changement de valeur. |
| **Curseur Range** | `rangeMin=0`, `rangeMax=100`, `value=50` | Rendu d'un curseur de type `range` avec libellés min/max | L'élément de rôle `"slider"` est présent, ainsi que les labels `"Min"` et `"Max"`. |
| **Ouverture du sélecteur de date (showPicker)** | `type="date"`, clic puis focus sur le champ | Appel de `HTMLInputElement.prototype.showPicker` | La méthode `showPicker` est appelée une fois lors du clic et une seconde fois lors du focus. |
| **Résilience sans showPicker** | `type="date"`, `showPicker` absent ou levant une exception | Gestion silencieuse de l'absence ou de l'erreur de la méthode native | Ni le clic ni le focus ne provoquent d'exception (`not.toThrow`). |

---

### 1.17 Page de Rapports d'Activité (`ReportsPage.jsx`)
Cette page permet de configurer des filtres, de générer et d'afficher un rapport financier interactif à l'écran ou de l'exporter en PDF.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu du formulaire de paramètres** | Chargement initial de la page | Rendu des champs de configuration | Le titre `"Rapports d'Activité"`, la section `"Paramètres du rapport"`, les champs `"Date de début"` / `"Date de fin"` et le bouton `"Exporter le rapport en PDF"` sont présents. |
| **Génération et appels API** | Clic sur `"Exporter le rapport en PDF"` avec données mockées (revenu 100 €, dépense 20 €) | Appel aux endpoints `/transactions` et `/charts/balance-history`, affichage du toast de chargement | `api.get` est bien appelé pour les deux routes. Le toast `"Analyse des données en cours..."` est déclenché. |
| **Dashboard interactif (sans PDF)** | Clic sur `"Analyser et afficher le rapport"` | Calcul des métriques et affichage du dashboard intégré à l'écran sans déclencher `html2pdf` | La section `"Diagnostic Global"` s'affiche. Le toast de génération PDF `"Génération du rapport PDF..."` n'est **pas** appelé. |
| **Journal des transactions dans le dashboard** | Case `"Journal des transactions"` cochée avant de cliquer sur `"Analyser et afficher le rapport"` | Inclusion de la liste exhaustive des transactions dans le rapport affiché | Le titre `"Journal des transactions"`, le sous-titre `"1 flux enregistrés sur la période"` et la catégorie `"Alimentation"` sont visibles. |
| **Retour aux filtres** | Clic sur le bouton `"Filtres"` depuis le dashboard affiché | Basculement de l'état d'affichage du composant | La section `"Paramètres du rapport"` réapparaît. La section `"Diagnostic Global"` disparaît du DOM. |

---

### 1.18 Page de Réinitialisation de Mot de Passe (`ResetPassword.jsx`)
Cette page permet à l'utilisateur de définir un nouveau mot de passe via un lien de réinitialisation sécurisé (token dans l'URL).

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Rendu initial** | Chargement de la page avec token `my-reset-token` dans les params | Rendu des deux champs de saisie et du bouton de soumission | Les champs `"Nouveau mot de passe"`, `"Confirmer le nouveau mot de passe"` et le bouton `"Enregistrer le nouveau mot de passe"` sont présents. |
| **Bascule de visibilité du mot de passe** | Clic sur l'icône de visibilité à droite du champ | Commutation du type de champ de `password` à `text` puis retour | Le type du champ bascule correctement entre `password` et `text` à chaque clic. |
| **Validation de la longueur** | Mot de passe `"12345"` (5 caractères, trop court) | Vérification locale avant tout appel API | Le toast d'erreur `"Le mot de passe doit contenir au moins 6 caractères"` est affiché. `api.post` n'est **pas** appelé. |
| **Validation de la correspondance** | Mot de passe `"password123"` et confirmation `"different123"` | Comparaison des deux champs | Le toast d'erreur `"Les mots de passe ne correspondent pas"` est affiché. `api.post` n'est **pas** appelé. |
| **Succès et redirection** | Mots de passe valides et correspondants, API renvoyant un succès | Appel à `POST /auth/reset-password/:token`, affichage de l'écran de succès, puis redirection après 3 s | `api.post` est appelé avec le bon token et le nouveau mot de passe. Le toast de succès `"Mot de passe réinitialisé !"` est affiché. L'écran `"Réinitialisation réussie"` s'affiche. Après 3000 ms, `navigate("/login")` est appelé. |
| **Erreur API (token expiré)** | Mots de passe valides, API renvoyant une erreur HTTP avec `"Token de réinitialisation invalide ou expiré"` | Capture de l'exception et affichage du message serveur | Le toast d'erreur avec le message du serveur est affiché. |

---

## 2. Tests Backend (Serveur)

Les tests unitaires du serveur s'exécutent avec **Vitest** sous l'environnement `node` en simulant (mockant) l'API de Mongoose.

### 2.1 Contrôleur des Comptes (`accountController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Récupération des comptes (getAccounts)** | Requête avec ID utilisateur `"user_999"` | Appel à `Account.find({ userId })` trié par ordre et date de création | La réponse renvoie un code HTTP 200 avec la liste triée des comptes de l'utilisateur au format JSON. |
| **Erreur de récupération** | Simulation d'une erreur de base de données dans `Account.find` | Capture de l'exception dans le bloc `try/catch` | La réponse renvoie le code HTTP 500 avec le texte `"Server Error"`. |
| **Création de compte (createAccount)** | Corps de requête `{ name: "Espèces", type: "cash" }` | Comptage des comptes existants pour déterminer l'attribut `order` puis instanciation et sauvegarde du modèle | La réponse renvoie un code HTTP 201 avec le document du compte créé incluant le bon index `order`. |
| **Suppression propre (deleteAccount)** | Paramètre de requête `id="acc_delete_456"`, utilisateur connecté propriétaire | Recherche du compte, suppression de celui-ci et suppression en cascade de toutes les transactions et planifications associées | Le compte et ses liaisons sont supprimés de la DB. La réponse renvoie un code HTTP 200 avec `{ message: 'Account removed' }`. |
| **Sécurité de suppression** | Paramètre de requête `id="acc_delete_456"`, utilisateur connecté NON propriétaire | Comparaison de l'ID utilisateur de la session avec le propriétaire du document de compte | La suppression n'a pas lieu. La réponse renvoie un code HTTP 401 avec `{ message: 'Not authorized' }`. |

---

### 2.2 Contrôleur d'Authentification (`authController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Inscription utilisateur (registerUser)** | Corps de requête `{ name, email, password }` | Vérification de l'existence du mail, hachage du mot de passe avec un grain de sel de 12, création de l'utilisateur, et insertion des catégories par défaut | La réponse renvoie un code HTTP 201 avec les détails de l'utilisateur créé et le token JWT. Les catégories par défaut sont enregistrées. |
| **Doublon d'inscription** | Corps de requête avec un email déjà existant en base | Recherche de l'email via `User.findOne` | La création est avortée. La réponse renvoie un code HTTP 400 avec `{ message: 'User already exists' }`. |
| **Connexion réussie (loginUser)** | Corps de requête `{ email, password }` | Recherche de l'utilisateur et comparaison du mot de passe en clair avec le hash via `bcrypt.compare` | La réponse renvoie un code HTTP 200 avec les données utilisateur et un nouveau token JWT généré. |
| **Connexion erronée (Mot de passe)** | Corps de requête avec mot de passe incorrect | Comparaison de hachage échouée | La réponse renvoie un code HTTP 401 avec `{ message: 'Invalid credentials' }`. |
| **Connexion erronée (Email)** | Corps de requête avec email non inscrit | Recherche `User.findOne` renvoyant `null` | La réponse renvoie un code HTTP 401 avec `{ message: 'Invalid credentials' }`. |

---

### 2.3 Contrôleur des Catégories (`categoryController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Récupération (getCategories)** | Requête avec ID utilisateur `"user_123"` | Interrogation de `Category.find` | Liste des catégories renvoyée triée (HTTP 200). |
| **Création de sous-catégorie** | Corps `{ name: "Resto", parentId: "parent_abc" }` | Recherche du nombre de sous-catégories existantes pour l'indexation de l'ordre, puis sauvegarde | Catégorie créée avec ordre incrémenté (HTTP 201). |
| **Blocage de suppression (Par défaut)** | Paramètre d'ID d'une catégorie par défaut (`isDefault: true`) | Vérification de l'état du drapeau `isDefault` | Suppression rejetée avec code HTTP 403. |
| **Blocage de suppression (Enfants)** | Paramètre d'ID d'une catégorie possédant des sous-catégories | Comptage des documents enfants liés | Suppression rejetée avec code HTTP 400. |
| **Suppression réussie** | Paramètre d'ID d'une catégorie personnalisée vide d'enfants | Suppression en base de données | Catégorie supprimée avec succès (HTTP 200). |

---

### 2.4 Contrôleur des Budgets (`budgetController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Calcul du budget (getBudgets)** | Query `{ month: '2026-06' }` | Récupération des budgets, des dépenses réelles sur la période, et agrégation par catégorie pour sommer les débits | Réponse JSON renvoyant les budgets enrichis des champs `spent` (cumul réel), `remaining` (solde) et `percentage` (HTTP 200). |
| **Suppression autorisée** | ID du budget, utilisateur propriétaire | Vérification de l'appartenance du budget | Le budget est supprimé de la base de données (HTTP 200). |
| **Suppression interdite** | ID du budget, utilisateur non propriétaire | Vérification de l'appartenance | La suppression est rejetée (HTTP 401). |

---

### 2.5 Contrôleur des Graphiques et Prévisions (`chartController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Répartition par catégories (getChartsByCategory)** | Dates de début/fin, type `"expense"` | Agrégation et groupement des dépenses par catégorie parente, calcul du total et des pourcentages | Réponse JSON contenant le montant total consolidé et le tableau de répartition catégoriel avec variations (HTTP 200). |
| **Calcul des prévisions (getForecastCharts)** | Paramètres de query `{ months: '3', method: 'regression' }` | Récupération des soldes de départ, calcul de l'historique des 12 derniers mois, calcul de régression linéaire et projection des soldes à 3 mois | Réponse JSON retournant l'historique mensuel réel et les prévisions de solde avec intervalle de confiance (HTTP 200). |

---

### 2.6 Middleware de Sécurité (`authMiddleware.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Accès autorisé** | En-tête `Authorization: Bearer validtoken` | Décodage et vérification via `jwt.verify` et récupération de l'utilisateur associé en DB | L'utilisateur est rattaché à `req.user` et la fonction `next()` est appelée avec succès. |
| **Token absent** | En-tête `Authorization` vide ou absent | Détection de l'absence du token | Interception HTTP 401 avec message `"Not authorized, no token"`. |
| **Token corrompu / expiré** | En-tête `Authorization: Bearer expired` | Échec de validation déclenchant une exception dans `jwt.verify` | Capture de l'erreur, interception HTTP 401 avec `"Not authorized"`. |
| **Utilisateur inexistant** | En-tête valide, mais utilisateur introuvable en base | Recherche `User.findById` retournant `null` | Interception HTTP 401 avec `"Not authorized, user not found"`. |

---

### 2.7 Moteur de traitement récurrent (`scheduledProcessor.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Exécution automatique (autoConfirm = true)** | Date du jour supérieure à la date planifiée, compte avec solde initial, configuration de récurrence mensuelle | Lancement d'une transaction Mongoose, création de l'historique de transaction, soustraction automatique du montant sur le compte cible | Une transaction finale (`isPending: false`) est insérée. Le solde du compte est débité. La planification avance sa date de début d'un mois. |
| **Validation manuelle (autoConfirm = false)** | Échéance planifiée à confirmer manuellement | Lancement d'une transaction Mongoose, insertion de la transaction sous format temporaire sans débit | Une transaction en attente (`isPending: true`) est insérée. Le solde du compte reste intact. La planification avance sa date. |

---

### 2.8 Contrôleur des Insights (`insightController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Aucune transaction** | Recherche `Transaction.findOne` renvoyant `null` | Traitement initial des insights | Réponse HTTP 200 avec anomalies et suggestions vides et message explicatif. |
| **Historique insuffisant** | Transactions existantes mais sur moins de 2 mois complets | Vérification du nombre de mois valides | Réponse HTTP 200 avec message indiquant que l'historique est insuffisant. |
| **Anomalies et Suggestions** | Données suffisantes (3 mois d'historique) avec dépassement en Alimentation | Calcul de la moyenne mensuelle et comparaison avec le mois courant, calcul de régression et projections | Réponse HTTP 200 contenant 1 anomalie rouge (dépassement de 150%) et les suggestions triées. |
| **Seuil d'anomalie personnalisé** | Paramètre de requête `threshold=50` | Filtrage des anomalies en appliquant le seuil personnalisé | Réponse HTTP 200 avec 0 anomalie (le dépassement de 40% étant inférieur au seuil de 50%). |

---

### 2.9 Contrôleur des Objectifs d'épargne (`savingsGoalController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Récupération (getSavingsGoals)** | ID utilisateur `user_123` | Interrogation de `SavingsGoal.find` triée par date d'échéance | Liste des objectifs renvoyée (HTTP 200). |
| **Création (createSavingsGoal)** | Données du corps de la requête, montant cible | Sauvegarde de l'objectif en base de données | Objectif créé avec succès avec solde courant à 0 (HTTP 201). |
| **Mise à jour autorisée** | ID objectif existant, utilisateur propriétaire | Recherche et mise à jour de l'objectif | Objectif modifié renvoyé (HTTP 200). |
| **Mise à jour interdite** | ID objectif, utilisateur non propriétaire | Comparaison de propriété | Rejet de la modification avec code HTTP 401. |
| **Suppression et désassociation** | ID objectif, utilisateur propriétaire | Suppression de l'objectif et suppression en cascade du lien sur les transactions liées | Objectif supprimé (HTTP 200), `savingsGoalId` des transactions mis à `null`. |

---

### 2.10 Contrôleur des Transactions (`transactionController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Filtrage et pagination** | Paramètres de query (`accountId` et/ou `search`, `page 2`, `limit 10`) | Construction dynamique de la requête vérifiant `accountId` OU `toAccountId` en cas de filtrage de compte, et combinaison propre avec le filtre textuel en `$and` | La réponse (HTTP 200) renvoie la liste filtrée contenant les transactions directes ainsi que les virements entrants/sortants du compte, avec les métadonnées de pagination. |
| **Création de transaction** | Corps avec montant de 50 (dépense) et ID compte | Enregistrement de la transaction et mise à jour du solde du compte (débit) | Transaction créée (HTTP 201), solde du compte débité de 50. |
| **Virement entre comptes** | Source `acc_1`, destination `acc_2`, montant 100 | Enregistrement de la transaction de virement et double mise à jour de solde | Transaction créée (HTTP 201), `acc_1` débité de 100 et `acc_2` crédité de 100. |
| **Virement pour objectif d'épargne** | Source `acc_1`, destination `acc_savings`, montant 150, `savingsGoalId` lié | Enregistrement de la transaction de virement, double mise à jour de solde de compte, et mise à jour de la progression de l'objectif d'épargne | Transaction créée (HTTP 201), `acc_1` débité de 150, `acc_savings` crédité de 150, progression de l'objectif augmentée de 150. |
| **Suppression propre (Rollback)** | ID de transaction existante (dépense de 25) | Rétablissement des soldes de comptes et suppression physique de la transaction | Transaction supprimée (HTTP 200), solde du compte augmenté de 25. |
| **Exportation CSV** | Données de transactions existantes | Formatage en chaînes séparées par des virgules et définition des en-têtes de réponse | Fichier CSV renvoyé avec type MIME `text/csv` (HTTP 200). |
| **Importation CSV** | Fichier CSV en buffer avec colonnes valides | Analyse ligne par ligne, résolution/création d'un compte/catégorie et enregistrement | Réponse HTTP 200 avec le nombre de lignes importées et d'erreurs. |

---

### 2.11 Contrôleur des Utilisateurs (`userController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Mise à jour de profil** | Nouveau nom et adresse email | Vérification de l'unicité de l'email et sauvegarde | Profil utilisateur mis à jour en base de données (HTTP 200). |
| **Mise à jour de mot de passe** | Ancien et nouveau mot de passe | Comparaison de hachage bcrypt, génération du sel et enregistrement du nouveau hash | Mot de passe modifié avec succès (HTTP 200). |
| **Mise à jour des préférences** | Choix de thème, devises et seuils | Enregistrement des préférences | Préférences enregistrées (HTTP 200). |
| **Suppression complète (RGPD)** | ID utilisateur connecté | Suppression en cascade de toutes les transactions, comptes, catégories, budgets et profil | Tout est effacé en cascade, compte utilisateur supprimé (HTTP 200). |
| **Réinitialisation financière** | ID utilisateur connecté | Suppression en cascade de toutes les données financières mais conservation du profil utilisateur | Données effacées, compte et profil intacts (HTTP 200). |

---

### 2.12 Contrôleur des Planifications (`scheduledController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Récupération des planifications** | ID utilisateur | Recherche des planifications actives triées par prochaine date | Liste renvoyée au format JSON (HTTP 200). |
| **Mise à jour et recalcul** | Nouvelle date de début (`startDate`) | Recherche et modification de la planification, recalcul de `nextDate` | Planification mise à jour et renvoyée (HTTP 200). |
| **Suppression en cascade** | ID planification | Suppression de la planification et de toutes ses occurrences en attente (`isPending: true`) | Planification et occurrences temporaires supprimées (HTTP 200). |
| **Confirmation manuelle** | ID transaction en attente, montant optionnel | Suppression du drapeau `isPending` et débit du compte | Transaction validée (HTTP 200), solde de compte débité. |
| **Saut d'occurrence (Skip)** | ID transaction en attente | Suppression simple de la transaction temporaire | Occurrence supprimée avec succès (HTTP 200). |

---

### 2.13 Contrôleur du Tableau de Bord (`dashboardController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Calcul des agrégations** | Comptes et transactions du mois courant et passé | Calcul des soldes totaux, comparaisons mensuelles, groupements journaliers, top catégories | Tableau de bord consolidé renvoyé au format JSON (HTTP 200). |
| **Génération d'alertes** | Seuil de solde bas franchi, budget dépassé | Détection des dépassements et comparaison aux préférences | Liste de notifications enrichie de l'alerte budget et solde bas correspondante (HTTP 200). |
| **Récapitulatifs mensuels** | Paramètre de requête `year=2026` | Groupement des transactions par index de mois et calcul du net annuel | Récapitulatif annuel trié par mois décroissant renvoyé (HTTP 200). |

---

### 2.14 Contrôleur des Filtres Enregistrés (`savedFilterController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Actions de CRUD** | Requêtes de GET, POST, PUT et DELETE | Gestion complète et vérification systématique de l'autorisation d'accès | Création (HTTP 201), lecture (HTTP 200), modification (HTTP 200) et suppression (HTTP 200) exécutées avec succès. |

---

### 2.15 Contrôleur du Rapport Mensuel (`monthlyReportController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Format invalide** | `monthKey: "invalid-date"` | Validation par regex | Réponse HTTP 400 avec message d'erreur de format. |
| **Rapport en cache** | `monthKey: "2026-05"` pour un mois passé avec rapport déjà en base | Récupération directe depuis MongoDB via `MonthlyReport.findOne` | La réponse HTTP 200 retourne le rapport caché avec `isProvisional: false`. |
| **Rapport provisoire** | `monthKey` correspondant au mois en cours | Calcul à la volée sans sauvegarde en base | La réponse HTTP 200 retourne le rapport avec `isProvisional: true` et les bons `financialStats`. `save()` n'est pas appelé. |
| **Détection d'une transaction hors norme** | Transaction de 350 € dans "Transports" avec une moyenne historique de 40 € (ratio 8.8) | Calcul du ratio et inclusion dans `unusualTransactions` | La réponse HTTP 201 contient `unusualTransactions` avec 1 élément. Le `reportText` mentionne la transaction. Le tableau contient les bons champs (`description`, `amount`, `categoryName`, `ratio`). |
| **Tri des outliers multiples** | Deux transactions inhabituelles : 350 € (ratio 8.8) et 160 € (ratio 4.0) dans deux catégories différentes | Collecte et tri de toutes les transactions hors normes | La réponse contient `unusualTransactions` avec 2 éléments triés par ratio décroissant : "Billet de train" (8.8x) en premier, "Dîner gastronomique" (4.0x) en second. |
| **Objectif complet détecté** | Objectif d'épargne avec `currentAmount >= targetAmount` atteint durant le mois | Calcul de la progression sur la période M | Le `reportText` contient le nom de l'objectif et le mot `"victoire"`. |

---

### 2.16 Contrôleur WebAuthn (`webauthnController.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Options d'enregistrement** | ID utilisateur valide | Génère les options WebAuthn et enregistre le défi (challenge) en base de données | Options renvoyées au client (HTTP 200) avec le challenge généré. Défi enregistré dans la collection `WebauthnChallenge`. |
| **Enregistrement valide** | Réponse d'attestation WebAuthn valide et défi en BDD | Validation de l'attestation, suppression du défi temporaire et insertion de la clé publique | Clé publique stockée dans `UserCredential`. Réponse HTTP 201 `{ verified: true }`. |
| **Enregistrement expiré** | Défi expiré ou inexistant en base de données | Tentative de validation | Rejet de la demande avec code HTTP 400. |
| **Options de connexion** | Adresse e-mail (facultative) | Génération du défi d'authentification et enregistrement en base de données | Défi retourné au client. Si l'e-mail est fourni, la liste `allowCredentials` est filtrée avec les clés enregistrées de l'utilisateur. |
| **Connexion biométrique réussie** | Assertion WebAuthn valide et défi en BDD | Validation de la signature de l'assertion, mise à jour du compteur anti-clonage et génération du token JWT | Réponse HTTP 200 contenant les informations de profil et le jeton de session JWT. |
| **Suppression d'appareil** | ID d'appareil valide, utilisateur propriétaire | Suppression physique de l'enregistrement | Clé publique supprimée de `UserCredential`. Réponse HTTP 200. |
| **Recherche par fallback rawId** | ID `body.id` introuvable mais `body.rawId` présent en BDD | Recherche alternative dans la collection `UserCredential` | Authentification validée avec succès via la clé correspondante au `rawId`. |
| **Format du paramètre credential** | Appel à `verifyAuthenticationResponse` | Passage de l'objet contenant id, publicKey, counter et transports | SimpleWebAuthn v13 valide les paramètres sans erreur de type (évite les bugs liés au `counter` indéfini). |

---

### 2.17 Contrôleur des Étiquettes (`tagController.js`)
Ce contrôleur gère la création, la lecture, la mise à jour (incluant l'archivage) et la suppression en cascade des étiquettes (tags) de l'utilisateur.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Récupération des tags (getTags)** | Requête avec ID utilisateur `"user_123"` | Interrogation de `Tag.find` trié par nom | Liste des tags de l'utilisateur renvoyée triée par nom (HTTP 200). |
| **Création de tag (createTag)** | Corps `{ name: "Vacances", color: "#3B82F6" }` | Recherche d'existence (insensible à la casse) et sauvegarde du nouveau modèle | Tag créé avec succès et renvoyé (HTTP 201). |
| **Doublon de création** | Corps `{ name: "Vacances" }` avec tag existant | Recherche via `Tag.findOne` | La création échoue avec le code HTTP 400 (`Un tag avec ce nom existe déjà.`). |
| **Création avec archivage** | Corps `{ name: "Vacances", isArchived: true }` | Instanciation du modèle avec le paramètre `isArchived` | Tag créé avec l'état `isArchived` à `true` (HTTP 201). |
| **Mise à jour (updateTag)** | ID de tag, corps `{ name: "Voyage Pro", color: "#9333EA" }` | Recherche et mise à jour de l'étiquette | Les champs nom et couleur sont modifiés en base de données (HTTP 200). |
| **Mise à jour de l'archivage** | ID de tag, corps `{ isArchived: true }` | Modification du booléen d'archivage | Le tag est marqué archivé en base de données (HTTP 200). |
| **Mise à jour interdite** | ID de tag, utilisateur non propriétaire | Comparaison de propriété | Modification rejetée avec code HTTP 401. |
| **Suppression propre (deleteTag)** | ID de tag, utilisateur propriétaire | Suppression physique de l'étiquette et nettoyage en cascade des transactions | Le tag est supprimé. Les transactions contenant le tag voient sa référence retirée via `$pull` (HTTP 200). |

---

### 2.18 Tests de la Simulation de Monte Carlo & Stress-test (`monteCarloHelper.js` & `ResilienceChart.jsx`)

#### 2.18.1 Tests unitaires mathématiques (`monteCarloHelper.test.js`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Génération Box-Muller** | Nombres aléatoires de `Math.random()` | Transformation Box-Muller en distribution normale standard | Valeurs numériques finies générées. Sur 2000 échantillons, la moyenne est de $0 \pm 0.15$ et l'écart-type est de $1 \pm 0.15$. |
| **Structure des résultats** | Paramètres par défaut de simulation ($10000$ € initiaux, $300$ €/mois, horizon $10$ ans) | Projection sur 10 ans avec 500 simulations | Retourne un objet contenant `yearlyData` (tableau de longueur 11), `resilienceScore` et `avgRuptureYear`. |
| **Tri des percentiles** | Paramètres de simulation stochastique | Tri croissant des capitalisations finales | Pour chaque année, vérifie que les percentiles respectent la relation d'ordre : P10 <= P50 <= P90. |
| **Évaluation de résilience** | Scénarios sécurisé vs à haut risque | Calcul du taux de réussite sur l'horizon | Le scénario sécurisé affiche $100\%$ de résilience. Le scénario risqué (sinistres fréquents et capitaux minimes) affiche un taux $<100\%$ et retourne une valeur d'année moyenne de rupture cohérente. |
| **Indexation de l'épargne** | Épargne avec vs sans indexation sur l'inflation | Calcul des soldes réels finaux sur 10 ans | Le P50 final avec indexation est strictement supérieur au P50 final sans indexation (perte de pouvoir d'achat). |

#### 2.18.2 Tests de composants UI (`ResilienceChart.test.jsx`)

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Initialisation & Banner** | Données mockées du Dashboard ($25000$ € solde, $+1000$ € d'épargne nette) | Rendu initial du composant | Le titre s'affiche. Les inputs de capital et d'épargne sont correctement pré-remplis à $25000$ et $1000$. Le score initial de résilience calculé s'affiche à $100\%$. |
| **Pliage / Dépliage** | Clic sur l'en-tête "Configuration des paramètres" | Bascule de l'état d'affichage local `isConfigOpen` | Les champs de saisie de la simulation sont masqués (première bascule) puis réaffichés (seconde bascule). |
| **Profils de risque** | Clics sur les boutons de presets "Prudent" et "Dynamique" | Mise à jour automatique des curseurs correspondants | Cliquer sur "Prudent" passe le rendement à $2.5\%$ et la volatilité à $2.0\%$. Cliquer sur "Dynamique" passe le rendement à $8.0\%$ et la volatilité à $16.0\%$. |
| **Diagnostic réactif** | Saisie d'un capital faible ($100$ €) et coût de coup dur élevé ($30000$ €) | Recalcul instantané du modèle mathématique stochastique | La vue met à jour le diagnostic pour afficher le message d'alerte rouge `"⚠️ Vulnérabilité financière élevée"`. |

---

### 2.19 Tests des Utilitaires Calendaires (`dateHelper.js`)
Ces tests valident les fonctions mathématiques de calcul d'échéances pour prévenir les dérives de dates.

| Nom du Test | Entrée (Input) | Traitement | Sortie / Assertion |
| :--- | :--- | :--- | :--- |
| **Fréquences journalières** | Date de départ, pas de 3 jours, 5 répétitions | Ajout linéaire de jours | Calcul exact de la date future. |
| **Fréquences hebdomadaires** | Date de départ, pas de 2 semaines | Ajout linéaire de semaines | Calcul exact avec franchissement de mois. |
| **Fins de mois récurrentes (31)** | Date de départ au 31 Janvier, pas de 1 mois | Plafonnement dynamique au dernier jour de Février puis retour au 31 Mars | Le 1er mois renvoie le 28/29 Février. Le 2e mois renvoie le 31 Mars. Le 3e mois renvoie le 30 Avril. |
| **Bissextiles (29 Février)** | Date de départ le 29 Février 2024, pas de 1 an | Plafonnement en année ordinaire puis retour au 29 Février lors de la prochaine année bissextile | Le 1er an renvoie le 28 Février 2025. Le 4e an renvoie le 29 Février 2028. |

---

## 3. Exécution des Tests

### Lancer tous les tests (Racine)
```bash
npm run test
```
Cette commande exécute séquentiellement les tests unitaires du serveur puis les tests unitaires/composants du client.

### Lancer les tests en mode interactif (Watch)
- **Serveur uniquement** :
  ```bash
  npm run test:watch --prefix server
  ```
- **Client uniquement** :
  ```bash
  npm run test:watch --prefix client
  ```
