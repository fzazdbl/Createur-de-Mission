# Createur de Mission — contexte agent

> Priorité de lecture pour les modèles : `CONTEXT_IA.md`.
> Ce fichier reste un point d’entrée rapide, mais le contexte détaillé vit dans `CONTEXT_IA.md`.

Ce dépôt contient une application **privée**, **locale** et **offline-first** pour le suivi de recherches bug bounty / sécurité.
Il ne s’agit **pas** d’une application multi-utilisateur ni d’un produit destiné à des clients.

## Objectif du projet

Créer une console personnelle de recherche et de rédaction qui permet de :
- gérer des missions et des notes contextuelles
- détecter automatiquement thèmes, entités et liens entre notes
- générer des dossiers de mission propres
- préparer des reports exploitables
- conserver des preuves et un journal de campagne
- synchroniser les données dans un **coffre privé sur le Bureau**

## État actuel du projet

### Déjà en place
- Frontend Vue 3 + TypeScript + Vite
- Stores missions / notes persistants
- Moteur métier pour :
  - analyse de notes
  - détection de thèmes
  - extraction d’entités
  - liens entre notes
  - score qualité
  - check conformité
- Génération de dossier mission
- Génération de report prêt à envoyer
- Kit de préparation terrain
- Index intelligent des preuves
- Journal de campagne chronologique
- Backend Node local
- Préparation YesWeHack / OAuth scaffolding
- Coffre privé local sur le Bureau

### Coffre privé local
Le stockage privé est branché sur :
- `C:\Users\chahi\Desktop\Createur-de-Mission-Private`
- fichier principal : `vault.json`

Ce coffre contient :
- `missions`
- `notes`
- `updatedAt`

Le backend expose des endpoints privés pour lire / écrire ce coffre.

## Ce qui a déjà été fait

- Dossier de contexte principal préparé
- Moteur de niche ajouté : report, risques, qualité, préparation
- Vue principale enrichie avec :
  - report prêt à envoyer
  - kit de préparation terrain
  - index des preuves
  - journal de campagne
- Synchronisation locale avec le Bureau
- Tests ajoutés et validés

## Ce qu’il reste à faire

Priorités possibles pour la suite :
1. Consolider le coffre privé
   - export complet du dossier
   - snapshots / versions
   - recherche globale
2. Ajouter une vraie recherche dans tout le coffre
3. Améliorer la présentation du journal de campagne
4. Ajouter un bouton d’ouverture directe du dossier Bureau dans l’UI
5. Continuer l’intégration YesWeHack uniquement si les vraies valeurs OAuth arrivent

### Outils / applis utiles à privilégier
- VS Code
- PowerShell / Windows Terminal
- `ripgrep` pour la recherche rapide
- 7-Zip / ZIP pour les exports
- outil de capture local
- diff local (VS Code / WinMerge / Beyond Compare)
- Markdown / preview locale
- scripts locaux de hash / horodatage

### Idées niche à garder en tête
- export complet du coffre
- snapshots / versions
- recherche globale
- index des preuves
- report templates
- mode préparation terrain
- journal chronologique filtré
- détection de risques par surface
- regroupement entités / thèmes

## Règles de travail pour les futurs modèles

### Toujours garder en tête
- L’app est **strictement personnelle**
- Aucun mode client / multi-utilisateur n’est attendu
- Le stockage principal doit rester local et privé
- Le Bureau est la source de vérité pour le coffre privé

### Quand modifier le code
- Lire le contexte avant d’éditer
- Préférer des changements petits et testables
- Vérifier les erreurs après modification
- Lancer les tests après les changements importants

### Quand toucher au backend
- Ne pas prétendre que YesWeHack est connecté tant que les vraies valeurs ne sont pas fournies
- Conserver le comportement de préparation / scaffolding
- Garder la persistance du coffre privé fonctionnelle

### Quand toucher à l’UI
- Rester orienté usage personnel
- Favoriser la lisibilité rapide
- Afficher clairement :
  - mission
  - note
  - preuve
  - dossier
  - score
  - chronologie

## Conventions utiles

- Français dans l’interface et les messages métier
- TypeScript pour les fonctions métier
- Tests Vitest pour les comportements critiques
- Pas d’ajout d’outils cloud par défaut
- Pas de complexité inutile si une solution locale suffit

## Signaux importants pour la suite

Si un futur modèle voit ces points, il doit les considérer comme prioritaires :
- le coffre privé est déjà branché
- les tests sont passés avec succès récemment
- l’application reste privée, pour une seule personne
- l’étape suivante naturelle est l’export / la recherche / la consolidation du dossier personnel

## Résumé rapide pour reprise

Tu reprends une application privée de recherche bug bounty, déjà enrichie avec :
- missions
- notes
- dossiers
- report
- preuves
- timeline
- coffre Bureau

Le prochain travail doit prolonger ce socle sans casser la logique locale/offline-first.
