# Createur de Mission — contexte IA complet

## Rôle attendu des IA

Ce fichier sert de mémoire opératoire pour tous les modèles qui interviendront sur ce dépôt.
Objectif : permettre une reprise fiable, sans dépendre d’un échange humain détaillé.

Les IA doivent :
- comprendre l’architecture actuelle avant de modifier quoi que ce soit
- préserver la logique **privée / locale / offline-first**
- éviter les changements inutiles
- vérifier les erreurs après chaque modification
- lancer les tests après les changements significatifs
- documenter les ajouts de façon courte mais exploitable
- ne jamais introduire de logique cloud par défaut

Les IA ne doivent pas :
- transformer l’app en produit multi-utilisateur
- ajouter des services distants sans demande explicite
- casser le coffre privé du Bureau
- prétendre qu’YesWeHack est vraiment connecté tant que les vraies valeurs OAuth ne sont pas fournies
- réécrire les sections déjà stables sans raison claire

---

## Vision produit

Application personnelle de suivi de recherche bug bounty / sécurité, orientée :
- gestion de missions
- prises de notes contextuelles
- preuves
- dossiers
- report exploitables
- journal de campagne
- préparation de session
- consolidation locale des données

Contrainte fondamentale :
- **usage unique, personnel, privé**
- **aucun client, aucun multi-user**
- **données locales en priorité**
- **Bureau = source de vérité du coffre privé**

---

## État fonctionnel actuel

### Frontend
- Vue 3
- TypeScript
- Vite
- interface principale dans `src/App.vue`
- stores réactifs pour missions et notes
- UI en français

### Moteurs métier présents
- `missionEngine.ts`
  - analyse de notes
  - détection de thèmes
  - extraction d’entités
  - liens entre notes
  - aide contextuelle / smart questions
  - score qualité
  - compliance checks
  - parsing du scope
- `dossierEngine.ts`
  - dossier mission
  - sections structurées
  - markdown export
  - journal de campagne
- `nicheEngine.ts`
  - report prêt à envoyer
  - score détaillé
  - signaux de risque
  - kit de préparation terrain
  - index des preuves

### Backend local
- `backend/server.cjs`
- HTTP Node local
- lit `.env`
- expose l’état de santé
- expose l’état OAuth YesWeHack de préparation
- expose des endpoints privés pour le coffre
- persiste sur disque dans un dossier du Bureau

### Coffre privé
Chemin actif :
- `C:\Users\chahi\Desktop\Createur-de-Mission-Private`

Fichier principal :
- `vault.json`

Structure logique du coffre :
- `missions`
- `notes`
- `updatedAt`

### Synchronisation locale
- `privateVaultSync.ts` gère le snapshot partagé missions/notes
- le backend lit et écrit le coffre privé
- le frontend hydrate l’état au démarrage
- la persistance locale garde aussi le mode offline-first

---

## Ce qui existe déjà côté code

### Fichiers importants
- `src/App.vue`
  - mission creation
  - note assistant
  - dashboard
  - dossier
  - report prêt à envoyer
  - préparation terrain
  - index des preuves
  - journal de campagne
  - section YesWeHack de préparation
  - affichage du chemin du coffre privé
- `src/services/missionEngine.ts`
- `src/services/dossierEngine.ts`
- `src/services/nicheEngine.ts`
- `src/services/backendClient.ts`
- `src/services/privateVaultSync.ts`
- `src/services/storage.ts`
- `src/stores/missions.ts`
- `src/stores/notes.ts`
- `src/types/mission.ts`
- `backend/server.cjs`
- `tests/*.test.ts`
- `AGENTS.md`

### Dépendances connues
- `vue`
- `vite`
- `typescript`
- `vitest`
- `@vue/test-utils`
- `jsdom`

### Scripts connus
- `npm run dev`
- `npm run backend`
- `npm run build`
- `npm test`

---

## Fonctionnalités déjà réalisées

### Bloc métier
- analyse de texte de note
- détection de thèmes :
  - web
  - api
  - access
  - scope
  - investigation
  - asm
  - report
  - cloud
  - osint
- extraction d’entités :
  - url
  - domain
  - ip
  - email
  - technology
  - keyword
- suggestions contextuelles de questions
- score qualité note
- vérification de conformité
- liaison de notes entre elles
- génération d’un dossier mission
- génération d’un report prêt à envoyer
- préparation terrain
- index intelligent des preuves
- journal de campagne

### Bloc privé / coffre
- dossier Bureau créé
- `vault.json` initialisé
- backend prêt à lire/écrire le coffre
- frontend hydraté depuis le coffre au démarrage
- affichage du chemin local du coffre

### Bloc YesWeHack
- préparation OAuth
- endpoints de prévisualisation
- état des champs manquants
- scaffolding de callback et d’échange
- pas de prétention de connexion réelle sans config fournie

### Outils / applications utiles à proposer en priorité

Les IA peuvent recommander ou intégrer en priorité des outils **locaux** et **pratiques** si la tâche le justifie :
- éditeur de code / IDE : VS Code
- terminal local : PowerShell / Windows Terminal
- recherche rapide dans le code : `ripgrep`
- capture / annotation : outil de capture Windows, Greenshot, Flameshot (si dispo)
- archivage / export : ZIP, 7-Zip
- lecture / prise de notes locales : Markdown, Obsidian local, VS Code preview
- synchronisation locale : dossier Bureau, Syncthing si nécessaire et explicitement utile
- hachage / preuve : scripts locaux pour SHA256, horodatage, nommage stable
- OCR / extraction de texte : outil local si besoin de lire des preuves ou captures
- comparaison de fichiers : diff intégré VS Code, WinMerge, Beyond Compare (si dispo)
- organisation personnelle : listes de tâches, dossiers de mission, journaux chronologiques

### Applications / idées niche à considérer

Quand la demande vise une fonctionnalité très spécifique, les IA peuvent suggérer des briques niche comme :
- moteur d’export complet du coffre
- versioning / snapshots du coffre privé
- recherche globale mission / note / preuve / timeline
- index de preuves avec score et horodatage
- report templates par programme
- mode préparation terrain avant session
- vue chronologique filtrée par mission
- détection de risques par type de surface
- regroupement automatique des entités et thèmes
- tableau de bord de priorisation personnelle

Règle : proposer ces outils / briques seulement si elles restent compatibles avec la logique **locale, privée, offline-first**.

### Bloc tests
- tests présents et validés
- suite stable au moment de la dernière vérification

---

## État de vérité à retenir

### Ce qui est vrai maintenant
- l’app est privée et locale
- le coffre Bureau existe
- le backend local est le point d’intégration pour la persistance
- les tests passent au dernier état validé
- la base métier est déjà riche et fonctionnelle

### Ce qui reste partiellement ouvert
- export complet du dossier
- snapshots / versions du coffre
- recherche globale dans tout le coffre
- ouverture directe du dossier Bureau depuis l’UI
- intégration YesWeHack réelle uniquement si les vraies valeurs arrivent

---

## Tâches restantes prioritaires

1. Consolider le coffre privé
   - export complet
   - versioning / snapshots
   - intégrité / sauvegarde
2. Recherche globale dans le coffre
   - missions
   - notes
   - preuves
   - timelines
3. Améliorer le journal de campagne
   - vue filtrée
   - tri
   - regroupement par mission
4. Ajouter un bouton d’ouverture du dossier Bureau
5. Continuer YesWeHack seulement si les vrais paramètres sont fournis

---

## Règles de conduite pour les IA

### Avant de modifier
- lire le contexte du fichier concerné
- identifier les dépendances réelles
- vérifier si le changement touche :
  - stores
  - types
  - backend
  - tests
  - UI
- éviter les modifications multi-fichiers non nécessaires

### Pendant la modification
- privilégier les changements petits et testables
- garder la cohérence des types
- ne pas casser la persistance locale
- ne pas casser la synchronisation du coffre
- conserver le français dans l’UI

### Après la modification
- vérifier les erreurs du ou des fichiers touchés
- exécuter les tests concernés
- si nécessaire, mettre à jour les tests
- ne pas laisser une nouvelle fonctionnalité sans validation

### En cas de doute
- lire d’abord les fichiers déjà présents
- demander le moins possible à l’humain
- si l’information manque vraiment, proposer une alternative locale sûre

---

## Ce qu’une IA doit regarder en priorité dans le code

- `src/App.vue` pour la vue et les interactions
- `src/services/missionEngine.ts` pour les règles métier
- `src/services/dossierEngine.ts` pour le dossier et la timeline
- `src/services/nicheEngine.ts` pour report / risques / qualité / preuves
- `src/services/backendClient.ts` pour la lecture du backend
- `src/services/privateVaultSync.ts` pour le snapshot partagé
- `backend/server.cjs` pour la persistance du coffre et les endpoints
- `src/stores/missions.ts` et `src/stores/notes.ts` pour la logique réactive
- `src/types/mission.ts` pour les structures de données
- `tests/` pour comprendre le comportement attendu

---

## Résumé machine

- application personnelle
- interface française
- Vue 3 + TypeScript + Vite
- backend local Node
- coffre privé sur le Bureau
- missions + notes + preuves + dossiers + report + timeline
- YesWeHack en préparation seulement
- tests à garder verts

---

## Format de reprise conseillé pour une IA

Quand une IA reprend ce dépôt, elle doit commencer par :
1. lire ce fichier
2. lire `AGENTS.md`
3. lire les fichiers ciblés par la tâche
4. vérifier les tests existants
5. modifier le minimum nécessaire
6. valider avec erreurs/tests

Fin du contexte machine.
