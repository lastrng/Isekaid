# ISEKAID — Audit et plan de migration produit

Date de l'audit : 10 septembre 2026  
Périmètre : étape 0 — sauvegarde, inventaire et trajectoire de migration  
État fonctionnel : aucune fonctionnalité utilisateur n'est modifiée par cette étape.

## 1. Sauvegarde et méthode

Une copie complète et horodatée du projet a été créée avant toute modification de cette étape :

`/home/ubuntu/isekaid-backup-20260910-120649`

La sauvegarde contient le dépôt Git, les changements suivis et non suivis présents au moment de la copie, les dépendances, les sorties de build et le projet Android. Elle occupe environ 744 Mo. La comparaison récursive, hors fichiers d'index volatils, ne montre aucune différence avec la source au moment de la copie ; les deux arbres contenaient 22 173 fichiers.

Le dépôt contenait déjà des changements non validés avant l'étape 0. Ils sont conservés tels quels et inclus dans la sauvegarde. L'audit décrit donc l'état réel courant du produit, notamment la navigation à cinq espaces déjà présente dans cet état de travail.

L'audit couvre :

- le code React/Vite et l'intégration Capacitor Android ;
- le catalogue local et les médias embarqués ;
- les persistances `localStorage` et IndexedDB ;
- le projet Supabase lié, ses tables, politiques RLS, buckets, fonctions et migrations ;
- les tests, scripts de validation et documentation existante.

## 2. Synthèse

Isekaid possède déjà la majorité des briques de la boucle cible :

`DÉCOUVRIR → APPRENDRE → PRÉPARER → VIVRE → COLLECTIONNER → REVENIR`

Le principal enjeu n'est pas de reconstruire le produit, mais de rendre cette boucle lisible et maintenable. Aujourd'hui, les capacités existent, mais une part importante de l'orchestration, des écrans et de la persistance reste concentrée dans `src/App.jsx` (8 556 lignes). La navigation est pilotée par état plutôt que par un routeur, plusieurs modèles sont versionnés localement de manière indépendante, et la base Supabase distante n'est pas entièrement reproductible depuis les migrations du dépôt.

La stratégie recommandée est une migration verticale et progressive : stabiliser les contrats de navigation et de données, déplacer ensuite chaque domaine sans changer son comportement, puis faire évoluer l'expérience espace par espace.

## 3. Architecture actuelle

### 3.1 Socle technique

| Couche | État actuel |
| --- | --- |
| Interface | React 18, JavaScript/JSX, Framer Motion, Lucide |
| Build web | Vite 5 |
| Mobile | Capacitor 8, projet Android natif |
| Backend | Supabase JS 2.108, Auth, Postgres, Storage, Edge Functions |
| Paiement | RevenueCat Capacitor |
| Contenu | Gros catalogue JSON local, cartes éditoriales et médias embarqués |
| Persistance locale | `localStorage`, IndexedDB pour les documents, fichiers embarqués |
| Tests | `node --test`, validation de projet, audit de contenu, build Vite |

L'entrée applicative conduit à `IsekaidApp`, qui porte l'essentiel de l'état global, de la navigation, de la synchronisation et des superpositions d'écran.

### 3.2 Navigation et routes actuelles

Il n'existe pas de React Router ni de routes URL pour les écrans métier. La navigation est un automate d'états local.

Cycle de démarrage :

`splash → loading → auth → onboarding → intro → app`

Navigation principale actuelle :

| Identifiant interne | Libellé visible | Écran rendu | Rôle produit |
| --- | --- | --- | --- |
| `home` | Aujourd'hui | `HomeScreen` | contexte du jour et point d'entrée |
| `voyage` | Voyage | `VoyageScreen` | préparation et voyage en cours |
| `learn` | Apprendre | `LearnScreen` | apprentissage guidé et révision |
| `explore` | Découvrir | `ExploreScreen` | exploration du catalogue culturel |
| `profile` | Mon Japon | `ProfileScreen` | identité, progression et collection |

Destinations internes supplémentaires :

- `daily` pour le fil des rituels ;
- `scenarios` pour les scénarios interactifs ;
- `tutor` pour le tuteur IA.

Alias acceptés par le résolveur de destination :

- `today` et `aujourd_hui` vers `home` ;
- `travel` et `voyager` vers `voyage` ;
- `discover` et `decouvrir` vers `explore` ;
- `my_japan` et `mon_japon` vers `profile`.

`scenarios` et `tutor` gardent l'onglet Apprendre actif ; `daily` garde Aujourd'hui actif. Les transitions principales utilisent l'API View Transitions lorsqu'elle est disponible.

Les routes secondaires sont des états et panneaux superposés : recherche, fiche wiki, lieu, tradition, situation, résultat de recherche, premium, succès, récapitulatif hebdomadaire et accueil. Le retour Android dépile manuellement ces états, délègue parfois à un écran interne, revient ensuite à Aujourd'hui, puis quitte l'application.

Le deep link `app.isekaid://login-callback` est réservé au retour OAuth. Il n'existe pas encore de contrat de deep link pour ouvrir un contenu, un voyage ou une activité précise.

### 3.3 Composants et domaines principaux

#### Coquille et orchestration

- `src/App.jsx` : cycle de vie, navigation, chargement des données, état global et nombreux écrans métier ;
- `src/app/navigation/BottomNav.jsx` et `destinations.js` : onglets, alias et sélection du parent ;
- `src/FeatureIntro.jsx` et `src/features/onboarding/*` : présentation et introductions de sections ;
- composants de recherche, panneau wiki, premium, authentification et écrans de chargement.

#### Aujourd'hui et contexte personnel

- `features/home/DreamHome` et `JourneyHome` ;
- modèles de contexte, recommandations et résumé du parcours ;
- `features/daily/DailyRitual`, `DailyFeedScreen` et `dailyModel` ;
- salutations, météo/contexte saisonnier, missions, actualités Japon et raccourcis ;
- `features/japan-mode` pour l'expérience contextuelle pendant le séjour.

#### Voyage

- `features/travel/tripModel` et `entities/trip/tripLifecycle` ;
- création et édition de voyage, itinéraire par jour, lieux, checklist et carte ;
- `TravelDocuments`, stockage de pièces jointes et gestion des fichiers locaux ;
- contexte d'activité, notes, statut réalisé et photo souvenir ;
- génération d'itinéraire via Edge Function.

Une partie significative des vues Voyage reste définie dans `App.jsx` : `VoyageScreen`, assistant de création, fiche voyage, fiche jour et carte.

#### Apprendre

- `features/learn/kanaModel` pour la répétition espacée ;
- parcours guidé, alphabets, flashcards, tracé de kana et quiz ;
- situations et phrases utiles ;
- compréhension écrite et orale ;
- révision consolidée ;
- scénarios scriptés et tuteur IA, avec synthèse vocale ou audio embarqué.

Les modèles sont partiellement extraits, mais la plupart des vues d'apprentissage restent dans `App.jsx` : `LearnScreen`, `FlashcardMode`, `DrawKanaMode`, `QuizMode`, `SituationDetail`, `CheckpointQuiz`, `ComprehensionRead`, `ComprehensionListen`, `ReviewMode` et le lecteur de scénarios.

#### Découvrir et contenu culturel

- `ExploreScreen` et ses sélections éditoriales ;
- vues Vie quotidienne, Régions, Codes sociaux, Traditions et Histoire ;
- fiches lieux, wiki, repas, expressions et contenus associés ;
- `entities/content/japanGraph` et `relatedContent` pour les liens entre contenus et données personnelles ;
- `features/search` pour l'index et les fiches de résultat.

Une grande partie des listes et fiches Découvrir reste également dans `App.jsx`.

#### Mon Japon

- `features/profile/ProfileScreen` et favoris ;
- `features/my-japan/MyJapanSection`, résumé, journal, photos, conflits et synchronisation ;
- statistiques, badges, souvenirs, voyages terminés et collections ;
- paramètres, apparence, rappels, premium, compte et sauvegarde cloud.

#### Services transverses

- client Supabase et synchronisation de `progress` ;
- synchronisation des voyages et gestion des conflits ;
- file de mutations hors ligne ;
- sauvegarde et restauration cloud ;
- notifications locales et rappels ;
- analytics ;
- RevenueCat et droits premium ;
- SOS et contenus essentiels hors ligne.

### 3.4 Modèles de données actuels

#### Profil et relation au Japon

Le profil local est au modèle version 3. Il conserve les champs inconnus lors de la normalisation afin de permettre une migration douce. Les états de relation au Japon sont :

- `dreaming` ;
- `planning` ;
- `soon` ;
- `in_japan` ;
- `returned` ;
- `japan_lover`.

Ils pilotent la contextualisation de l'accueil et certaines recommandations.

#### Voyage

Le modèle de voyage est en version 2 et migre en lecture les anciennes structures. Un voyage contient notamment : identifiant, titre, mode de dates, dates, lieux personnalisés, checklist, étapes/jours et documents. Les jours portent des activités, des références de lieu, des notes, un statut réalisé et éventuellement une photo souvenir.

Le cycle de vie distingue : planifié, actif, en attente de confirmation, terminé et annulé. `japanJourneyState` dérive le timing du voyage, le jour courant et la prochaine activité.

Les suppressions synchronisables sont conservées sous forme de tombstones séparés.

#### Progression

La progression est répartie entre plusieurs modèles :

- rituel quotidien : trois activités déterministes de découverte, apprentissage et pratique ;
- série de jours, calendrier, jalons et gels ;
- mission du jour, mission hebdomadaire et récapitulatif ;
- déblocages calculés à partir de la série, avec compatibilité d'un ancien format ;
- répétition espacée des kana avec niveau/boîte et prochaines échéances ;
- scénarios terminés ;
- étapes terminées du parcours guidé ;
- score de préparation calculé sur voyage, japonais, codes sociaux, transports et préparation ;
- succès calculés, avec mémorisation locale des succès déjà vus.

Le champ historique `xp` n'est plus un compteur autonome cohérent : certains écrans assimilent désormais la progression à des jours de série, tandis que la progression scénario conserve un champ `xp` nul. Ce contrat doit être clarifié avant toute nouvelle mécanique de récompense.

#### Favoris

Les favoris sont conservés sous la forme `{ id, type, item, savedAt }`. Leur identifiant dérive actuellement de valeurs éditoriales telles que l'expression ou le titre. Ils sont intégrés au JSON de progression et aux sauvegardes cloud.

Ce fonctionnement est réutilisable à court terme, mais fragile si un titre, une expression ou une translittération change. Une identité de contenu stable sera nécessaire avant d'élargir les collections.

#### Mon Japon et souvenirs

Le résumé Mon Japon est dérivé des voyages et activités réellement validés : voyages terminés, jours, villes, lieux, régions, préfectures, apprentissages, collections, tampons, badges, anniversaires et souvenirs. Les notes et photos sont rattachées aux activités d'un voyage. Une photo peut être une donnée locale hors ligne ou un chemin dans le bucket privé Supabase.

#### Contenu culturel et pédagogique

Le fichier principal `src/japan-data.json` contient :

| Collection | Nombre d'entrées audité |
| --- | ---: |
| Expressions | 42 |
| Culture | 35 |
| Repas | 26 |
| Chansons | 15 |
| Traditions | 100 |
| Codes sociaux | 100 |
| Régions | 8 |
| Wiki | 86 |
| Vie quotidienne | 99 |
| Situations | 11 |
| Scénarios | 20 |
| Proverbes | 14 |
| Villes | 10 |
| Lieux | 204 |
| Voyages préconçus | 4 |
| Histoire | 8 |
| Compréhension écrite | 42 |
| Compréhension orale | 43 |
| Défis du jour | 12 |

Des fichiers complémentaires portent les enrichissements de lieux, images, cartes éditoriales, manifestes audio et vidéos. Le répertoire `public` représente environ 67 Mo, principalement des audios embarqués.

Le catalogue principal est chargé dynamiquement, comme plusieurs cartes de médias. Certains écrans lourds sont chargés en différé : profil, premium, onboarding, rituel, documents, détail de recherche, SOS et tuteur.

L'index de recherche couvre wiki, expressions, repas, traditions, codes sociaux, vie quotidienne, régions et lieux. Il ne couvre pas encore explicitement culture, chansons, situations, scénarios, histoire et compréhensions.

### 3.5 Stockage local

#### `localStorage`

| Domaine | Clés principales |
| --- | --- |
| Profil | `isekaid_profile_v1` |
| Voyages | `isekaid_trips_v1`, `isekaid_deleted_trips_v1` |
| Synchronisation voyages | `isekaid_trip_sync_base_<userId>`, `isekaid_trip_conflicts_<userId>` |
| Synchronisation progression | `isekaid_progress_sync_base_<userId>`, `isekaid_progress_conflicts_<userId>` |
| Hors ligne et sauvegarde | `isekaid_pending_mutations_v1`, `isekaid_cloud_backup_meta_v1`, `isekaid_offline_content_v1` |
| Favoris | `isekaid_favs_v1` |
| Apprentissage | `isekaid_kana_v1`, `isekaid_scenarios_v1`, `isekaid_path_v1` |
| Progression | `isekaid_streak_v1`, `isekaid_mission_v1`, `isekaid_weekly_v1`, `isekaid_weekly_recap_v1`, `isekaid_unlocks_v1`, `isekaid_daily_ritual_v1`, `isekaid_seen_v1`, `isekaid_ach_v1` |
| Découvrir | `isekaid_explore_editorial_seen_v1`, `isekaid_japan_news_v2` |
| Préférences | `isekaid_theme_v1`, `isekaid_accent_v1`, `isekaid_script_v1`, `isekaid_sound_v1` |
| Produit | `isekaid_premium_v1`, `isekaid_reminders_v1`, `isekaid_daily_reminder_v1` |
| Onboarding/UI | `isekaid_intro_seen_v1`, `isekaid_home_intro_seen_v1`, `isekaid_section_intro_<id>_v1`, `isekaid_scenarios_learn_tip_dismissed_v1`, `isekaid_trip_sheet_hint_v1`, `isekaid_last_greeting_date` |

`src/lib/storage.js` fournit des enveloppes de lecture/écriture, mais une partie du code utilise encore directement `localStorage`. Supabase Auth persiste également sa session via son propre espace de stockage.

La sauvegarde cloud sérialise la plupart des clés `isekaid_`, avec une limite d'environ 2 Mo. Elle exclut notamment la file de mutations, le cache d'actualités, l'état premium local, ses propres métadonnées et les bases techniques de synchronisation. Les conflits et suppressions sont fusionnés lors d'une restauration.

#### IndexedDB

La base `isekaid_document_files_v1`, store `files`, conserve les documents par triplet propriétaire/voyage/document. Les formats PDF, JPEG et PNG sont acceptés jusqu'à 10 Mo. Ces fichiers restent locaux et ne font pas partie du mécanisme général de synchronisation.

### 3.6 Supabase — état réellement déployé

Projet lié : `rocttuyhzkhjdkxvtvon` (`Isekaid`). Aucun changement distant n'a été effectué pendant cet audit.

#### Tables et vue publiques

Toutes les tables listées ci-dessous ont RLS activée :

- `progress` : profil, voyages, suppressions et objets de progression en JSONB ;
- `app_feed` : flux éditorial/actualité ;
- `explore_discoveries` : contenus de découverte ;
- `tutor_conversations` et `tutor_messages` : historique du tuteur ;
- `premium_grants` : droits premium accordés ;
- `ai_usage` : quotas d'usage IA ;
- `user_backups` : sauvegardes utilisateur ;
- `social_posts` et `content_themes` : objets de pipeline social non utilisés par le client audité.

La vue `social_dashboard` agrège des données sociales. Elle n'est pas consommée par l'application actuelle et doit faire l'objet d'une revue dédiée de ses droits et de son mode d'exécution avant toute exposition au client.

Les politiques principales limitent les données privées au propriétaire authentifié. `app_feed` et `explore_discoveries` sont lisibles publiquement. Les droits de tables restent assez larges au niveau des grants par défaut ; la RLS constitue donc la barrière effective et doit rester couverte par des tests.

#### Storage

| Bucket | Visibilité | Limite observée | Usage |
| --- | --- | ---: | --- |
| `social-assets` | public | — | pipeline social |
| `explore-assets` | public | — | visuels de découverte |
| `memory-photos` | privé | 2 Mo | souvenirs utilisateur |

Le bucket `memory-photos` dispose de politiques de lecture, insertion et suppression par dossier propriétaire. L'application n'utilise pas de remplacement en place, donc l'absence de politique `UPDATE` est compatible avec le comportement courant.

#### Edge Functions actives

- `tutor-chat` ;
- `itinerary-generate` ;
- `carnet-render` ;
- `redeem-premium-code` ;
- `delete-account`.

Elles sont actives avec vérification JWT.

#### Écart migrations/distant à traiter avant une évolution backend

Les migrations locales décrivent le tuteur, les découvertes, le contexte passerelle, le premium, les quotas IA, les photos souvenirs, les sauvegardes et les suppressions de voyages. La migration locale `20260905200000_lock_ai_quota_limits.sql` n'est pas appliquée sur le projet distant.

Conséquence importante : la base distante expose encore l'ancienne signature `reserve_ai_usage(feature, daily_limit, monthly_limit)`, en `SECURITY DEFINER`, exécutable par des rôles clients, alors que le code local attend la nouvelle signature `reserve_ai_usage(feature)`. Cet écart est à considérer comme un blocage P0 avant le prochain déploiement lié aux quotas ou à la génération d'itinéraire. Il n'est pas corrigé durant l'étape 0.

Autre dette de reproductibilité : la création initiale de plusieurs objets historiques (`progress`, objets sociaux, feed et fonction `handle_new_user`) n'apparaît pas dans les migrations présentes. Une nouvelle instance ne pourrait donc pas être reconstruite intégralement depuis le dépôt seul.

### 3.7 Fonctionnement hors ligne

Capacités déjà disponibles hors ligne :

- catalogue culturel et contenus statiques embarqués ;
- voyages, jours, activités, checklist et notes locales ;
- progression et préférences ;
- SOS, phrases essentielles et une sélection de contenus contextuels ;
- rituel du jour calculé localement ;
- photos locales et documents IndexedDB ;
- reprise différée de la synchronisation des voyages et de la progression.

`offlineStrategy` prépare un instantané critique comprenant rituel, voyage actif, jour courant, lieux, checklist, progression, SOS et phrases de contexte. La file `pendingMutations` compacte les instantanés à synchroniser par type et utilisateur, puis réessaie au retour en ligne, au focus ou lors de changements pertinents. Les voyages et la progression disposent de mécanismes de fusion et de conflits.

Limites actuelles :

- aucun service worker/PWA n'a été trouvé ; le shell est hors ligne sur Capacitor grâce aux assets embarqués, mais pas garanti pour un déploiement web ;
- cartes, images externes, tuteur IA et certains flux nécessitent le réseau ;
- la disponibilité audio dépend des fichiers embarqués ou des voix du système ;
- les documents IndexedDB ne sont ni synchronisés ni restaurés ;
- la file différée couvre principalement voyages et progression, pas toutes les actions distantes ;
- les favoris sont synchronisés indirectement dans la progression et non comme une collection dédiée.

## 4. Architecture cible

La navigation cible est déjà représentée par cinq destinations stables : Aujourd'hui, Voyage, Apprendre, Découvrir et Mon Japon. La prochaine évolution doit clarifier la responsabilité de chacune sans dupliquer les modèles.

### 4.1 Répartition cible par espace

| Espace | Mission | Étapes de la boucle |
| --- | --- | --- |
| Aujourd'hui | Une sélection personnelle et actionnable selon le contexte | Revenir, découvrir, pratiquer |
| Voyage | Concevoir le séjour, l'utiliser sur place et confirmer les souvenirs | Préparer, vivre |
| Apprendre | Construire et entretenir des compétences utiles | Apprendre, pratiquer |
| Découvrir | Explorer librement le Japon et nourrir ses envies | Découvrir |
| Mon Japon | Voir ce que l'on aime, sait et a vécu | Collectionner, revenir |

### 4.2 Couches cibles

```text
AppShell
├── router de destinations + historique interne + deep links
├── Today
├── Travel
├── Learn
├── Discover
└── My Japan
    ↓
Cas d'usage partagés
├── recommendation / daily plan
├── progress / collection
├── trip / memory
├── content / search / relations
└── sync / offline / entitlements
    ↓
Repositories et adaptateurs
├── stockage local versionné
├── IndexedDB
├── Supabase
├── médias embarqués
└── services natifs Capacitor
```

Organisation de code visée, à atteindre progressivement :

```text
src/
├── app/                 # AppShell, navigation, providers, cycle de vie
├── screens/             # assemblage des cinq destinations
├── features/            # cas d'usage et parcours autonomes
├── entities/            # modèles et règles métier stables
├── repositories/        # contrats local/cloud et migrations
├── services/            # Supabase, native, analytics, paiement
├── content/             # registre, identités et relations de contenu
└── shared/              # UI, hooks et utilitaires sans règle métier
```

Cette cible ne demande pas une réécriture. Les modules existants seront déplacés lorsqu'un domaine est travaillé, avec façades de compatibilité tant que `App.jsx` reste l'orchestrateur.

## 5. Réutilisation et changements nécessaires

### 5.1 Composants et modèles à réutiliser tels quels ou presque

- `BottomNav` et le registre de destinations à cinq espaces ;
- `profileModel` et la relation au Japon versionnée ;
- `tripLifecycle`, `tripModel` et `japanJourneyState` ;
- les écrans et modèles de documents de voyage ;
- le modèle de rituel quotidien déterministe ;
- les recommandations contextuelles de l'accueil ;
- `kanaModel` et les algorithmes de répétition espacée ;
- le score de préparation ;
- `japanGraph` et `relatedContent` comme base de relations ;
- `MyJapanSection`, le journal, les photos et le résumé dérivé ;
- la file de mutations, les stratégies de fusion et les tombstones ;
- SOS, rappels, premium et services Capacitor ;
- le catalogue local et les médias déjà enrichis.

### 5.2 Composants à déplacer

Le déplacement doit d'abord être mécanique, sans changement visuel ni logique :

| Depuis `App.jsx` | Destination proposée |
| --- | --- |
| `HomeScreen` et assemblage contextuel | `screens/today/TodayScreen.jsx` |
| listes/fiches culturelles et `ExploreScreen` | `screens/discover/*` et `features/content-detail/*` |
| `LearnScreen` et modes d'exercice | `screens/learn/*` et `features/learning-session/*` |
| `ScenariosScreen` et lecteur | `features/scenarios/*` |
| `VoyageScreen`, assistant, voyage, jour et carte | `screens/travel/*` et `features/trip-editor/*` |
| recherche globale et résultats | `features/search/*` |
| overlays succès/récapitulatif/bienvenue | domaines progression et onboarding correspondants |
| cycle de vie/auth/navigation | `app/AppShell.jsx` et providers ciblés |

### 5.3 Composants à refactorer

- `App.jsx` : réduire progressivement son rôle à la composition et aux providers ;
- navigation : séparer destination principale, route secondaire et état de modal ;
- retour Android : baser le dépilage sur un historique explicite plutôt que sur une suite de conditions ;
- stockage : remplacer les accès directs par des repositories versionnés ;
- progression : définir un contrat unique et trancher le statut de `xp` ;
- favoris : référencer des identifiants de contenu stables, sans embarquer systématiquement une copie complète ;
- recherche : indexer toutes les familles culturelles et pédagogiques ;
- catalogue : introduire un registre commun de types, identifiants, titres, images et relations ;
- synchronisation : mutualiser les enveloppes, versions, conflits et observabilité ;
- sauvegarde cloud : expliciter le schéma et les limites au lieu de capturer implicitement les clés ;
- Mon Japon : distinguer données dérivées, données validées par l'utilisateur et préférences ;
- imports médias : conserver le chargement différé mais centraliser la résolution et les fallbacks.

### 5.4 Nouveaux composants nécessaires

- `AppShell` et `NavigationHistory` avec un contrat testable ;
- `ContentRegistry` attribuant une identité stable à chaque contenu ;
- repositories `Profile`, `Progress`, `Trips`, `Favorites`, `Memories` et `Settings` ;
- `StorageMigrationRunner` idempotent avec journal de versions ;
- `SyncCoordinator` commun aux domaines, compatible hors ligne ;
- `TodayPlan` qui compose découverte, apprentissage, préparation et mémoire sans posséder leurs données ;
- `LearningSession` commun aux différents formats d'exercice ;
- `CollectionHub` pour favoris, contenus appris, lieux vécus et souvenirs ;
- `TripTimeline` partagé entre préparation, mode Japon et journal après voyage ;
- `DeepLinkResolver` pour ouvrir de manière stable un contenu, un voyage ou une activité ;
- tests de contrat RLS et migrations pour Supabase ;
- diagnostics de synchronisation accessibles sans exposer de données sensibles.

## 6. Migrations de données éventuelles

Aucune migration de données n'est exécutée à l'étape 0.

### 6.1 Identité de contenu

Créer un identifiant stable et un registre pour toutes les entrées culturelles et pédagogiques. Conserver une table d'alias depuis les identifiants actuels dérivés des titres/expressions. Migrer ensuite les favoris, contenus vus, relations et apprentissages en lecture-écriture double pendant une version, sans supprimer les anciennes clés avant validation.

### 6.2 Stockage local

Introduire un manifeste de stockage avec version par domaine, puis migrer de façon idempotente :

- profil v3 : conserver tel quel au départ ;
- voyages v2 : conserver la migration douce en lecture et matérialiser la version uniquement à l'écriture sûre ;
- favoris v1 vers v2 : identifiants stables et références minimales ;
- progression dispersée vers une enveloppe v2, sans perdre les clés v1 pendant la période de retour arrière ;
- cache hors ligne v1 vers v2 : ajouter version de catalogue, fraîcheur et empreinte ;
- sauvegarde cloud : ajouter version de schéma, date, taille et domaines inclus.

Chaque migration doit être pure, testée sur des fixtures anciennes, réexécutable et précédée d'une copie de la valeur d'origine jusqu'à confirmation de succès.

### 6.3 Supabase

Avant toute nouvelle table ou colonne :

1. capturer dans une migration de baseline les objets distants historiques manquants ;
2. résoudre et tester l'écart `reserve_ai_usage`, puis appliquer la migration de verrouillage séparément ;
3. ajouter des tests de RLS pour propriétaire, autre utilisateur, anonyme et service role ;
4. revoir `social_dashboard`, ses grants et son mode d'exécution ;
5. rendre explicites les rôles des politiques au lieu de dépendre de grants larges ;
6. valider une restauration sur une base vierge avant de considérer les migrations comme source de vérité.

Dans un premier temps, le schéma JSONB de `progress` peut rester en place afin de ne pas coupler refactor applicatif et migration distante. Des tables dédiées ne deviennent justifiées que pour les données requêtées entre utilisateurs ou nécessitant une intégrité relationnelle forte.

### 6.4 Documents et photos

Ne pas migrer automatiquement les documents IndexedDB : leur taille, leur confidentialité et leur caractère local nécessitent un choix produit explicite. Pour les photos souvenirs, conserver le bucket privé et ajouter un état de synchronisation clair avant d'autoriser des opérations de masse.

## 7. Plan de migration progressive

### Phase 0 — audit et garde-fous

- sauvegarde complète ;
- présent document ;
- aucune modification fonctionnelle ;
- tests, validation et build de référence.

### Phase 1 — fondations sans changement d'expérience

- extraire `AppShell`, le contrat de navigation et l'historique interne ;
- introduire les repositories comme façades sur le stockage existant ;
- ajouter les tests de migration et de retour arrière ;
- établir la baseline Supabase et corriger le P0 quota dans une livraison backend isolée.

### Phase 2 — Aujourd'hui

- faire de l'espace un orchestrateur de la journée ;
- relier chaque carte à une destination ou une fiche stable ;
- conserver le rituel, les recommandations et le mode Japon existants ;
- mesurer ouverture, action terminée et retour, sans dupliquer la progression.

### Phase 3 — Apprendre

- déplacer les modes existants hors de `App.jsx` ;
- unifier la session d'apprentissage et l'enregistrement de progression ;
- intégrer scénarios et tuteur comme formats complémentaires ;
- préserver kana, compréhension, phrases et révision.

### Phase 4 — Découvrir

- créer le registre de contenu et les identifiants stables ;
- étendre la recherche à toutes les collections ;
- normaliser les fiches et les relations ;
- migrer favoris et contenus vus avec compatibilité v1.

### Phase 5 — Voyage et mode Japon

- extraire les écrans de voyage ;
- partager une timeline unique entre préparation, journée active et journal ;
- renforcer l'état hors ligne et la reprise de synchronisation ;
- préserver documents, checklist, carte, génération et photos.

### Phase 6 — Mon Japon

- réunir favoris, apprentissages, lieux vécus et souvenirs ;
- distinguer collection volontaire et statistiques dérivées ;
- proposer le retour vers Découvrir, Apprendre ou un nouveau voyage ;
- garder profil, paramètres, premium et compte disponibles pendant la transition.

### Phase 7 — consolidation

- supprimer uniquement les façades devenues inutiles après une période de compatibilité ;
- mesurer taille du bundle, démarrage, stabilité hors ligne et conflits ;
- documenter les contrats définitifs ;
- valider restauration locale/cloud et reconstruction Supabase à blanc.

## 8. Garde-fous pour chaque phase

Chaque étape suivante doit respecter les contrôles suivants :

- créer un backup ou un point de restauration identifiable avant mutation ;
- conserver les anciennes données jusqu'à validation de la migration ;
- ne supprimer aucune capacité utile sans équivalent disponible ;
- effectuer les déplacements mécaniques séparément des changements UX ;
- tester les modèles et migrations avec des données vides, courantes, anciennes et partiellement corrompues ;
- exécuter `npm test` puis `npm run build` ;
- constater explicitement l'absence de script lint tant qu'il n'est pas ajouté ;
- vérifier Aujourd'hui, Voyage, Apprendre, Découvrir, Mon Japon, recherche, retour Android, auth, mode hors ligne et reprise réseau ;
- pour toute migration Supabase : tester localement, contrôler RLS, appliquer une migration unique puis vérifier le projet lié.

## 9. Priorités et risques

| Niveau | Sujet | Risque | Action avant évolution concernée |
| --- | --- | --- | --- |
| P0 | Migration quota IA non déployée | appel RPC incompatible et limites fournies par le client | isoler, tester et déployer la migration de verrouillage |
| P0 | Baseline Supabase incomplète | environnement non reproductible | capturer le schéma historique sans modifier le comportement |
| P1 | `App.jsx` monolithique | régressions croisées et tests difficiles | extractions mécaniques par domaine |
| P1 | Identifiants de favoris éditoriaux | perte de liens après modification du contenu | registre stable et alias de migration |
| P1 | Navigation sans historique formel | retour/deep links fragiles | contrat de route interne testable |
| P1 | Progression fragmentée et `xp` ambigu | incohérences entre écrans et cloud | schéma canonique versionné |
| P1 | Documents locaux uniquement | attentes de restauration non satisfaites | rendre la portée locale explicite, puis décider du produit |
| P2 | Recherche partielle | contenu existant invisible | compléter l'index après registre de contenu |
| P2 | Pas de service worker web | hors ligne web non garanti | décider si la cible inclut une PWA |
| P2 | Grants/view sociaux à revoir | surface backend inutile au client | audit et restriction dédiés |

## 10. Décision d'architecture

La base existante est réutilisable. La cible ne nécessite ni changement de framework, ni remplacement de Supabase, ni refonte complète. Le meilleur chemin est de conserver React, Vite, Capacitor et Supabase, d'extraire progressivement les cinq espaces, puis de consolider les contrats de contenu, progression, voyage, collection et synchronisation.

L'étape 0 se termine avec un état documenté et sauvegardé. Aucune fonctionnalité, route, donnée utilisateur ou configuration distante n'est modifiée par cette étape.

## 11. Validation de l'étape 0

Résultats obtenus après création du document :

- `npm test` : réussi, 42 fichiers de tests sur 42 ;
- validation du projet : réussie ;
- audit éditorial : réussi, structure et couverture des 204 récits de lieux validées ;
- `npm run build` : réussi, 2 126 modules transformés ;
- `git diff --check` : aucune erreur d'espacement ;
- lint : non exécutable, aucun script `lint` n'est défini dans `package.json` ;
- avertissement non bloquant du build : les chunks principal et catalogue dépassent 500 Ko après minification ; ce point est déjà intégré aux priorités d'extraction et de chargement différé.

Le contrôle différentiel final avec la sauvegarde exclut les artefacts régénérés par le build et confirme que le seul ajout source de l'étape 0 est ce document.

## 12. Journal de migration — étapes 1 et 2

### Étape 1 — shell principal

- navigation principale ramenée à cinq promesses : Aujourd'hui, Voyage, Apprendre, Découvrir et Mon Japon ;
- routes historiques conservées comme destinations secondaires ;
- écrans gardés montés dans `PrimaryNavigationShell` afin de préserver leur état lors d'un changement d'onglet ;
- présentations d'entrée adaptées aux cinq espaces, sans suppression des anciennes capacités.

### Étape 2 — Aujourd'hui

- en-tête quotidien : salutation, date, streak et progression de la session ;
- session locale persistée composée de Découvrir, Apprendre, Comprendre et Mission ;
- chaque contenu éditorial du rituel ouvre une fiche réelle, y compris les articles et les rituels du jour ;
- nouveau `ContinueCard` piloté par `continueModel.js`, avec une référence locale minimale pour reprendre une leçon, un scénario, un territoire, un article, un voyage, une journée ou une révision ;
- la journée du voyage actif prime sur une ancienne reprise ; les replis ne sont proposés que lorsqu'une progression ou un voyage existe réellement ;
- contexte voyage décliné sans nouvelle source de données : invitation à créer un voyage, compte à rebours et préparation, programme sur place, puis carnet/stamps/souvenirs après le retour ;
- les contenus de reprise et le contexte sur place sont résolus depuis les catalogues et voyages déjà mis en cache, sans dépendance réseau supplémentaire.

Points de restauration de l'étape 2 :

- `/home/ubuntu/isekaid-backup-20260910-161305` avant la session quotidienne ;
- `/home/ubuntu/isekaid-backup-20260910-163435` avant les blocs Continuer et Contexte voyage.

Validation après les blocs Continuer et Contexte voyage : 43 tests, validation structurelle, audit éditorial, `git diff --check` et build Vite réussis. Aucun script `lint` n'est encore défini dans `package.json`.

### Étape 4 — Découvrir

- remplacement de la liste d'entrée par une homepage visuelle : Aujourd'hui au Japon, Explorer le Japon, puis six univers éditoriaux ;
- taxonomie extensible pour Culture, Société, Gastronomie, Histoire, Pop culture et Japon pratique ; les sous-thèmes sans corpus sont visibles comme « bientôt » et ne fabriquent aucun article ;
- annuaire des 47 préfectures regroupées dans les 8 régions, avec recherche locale et réutilisation des villes/lieux déjà documentés ;
- catalogues visuels filtrables pour Gastronomie, Pop culture, Japon pratique et lieux historiques ;
- conservation des écrans riches existants pour traditions, codes sociaux, vie quotidienne, régions et chronologie historique ;
- conservation des paliers de déblocage existants avant l'ouverture des domaines concernés ;
- ajout d'une progression de lecture locale versionnée (`isekaid_content_reading_v1`), sans migration distante ;
- filtres Tous, À lire et Favoris sur la homepage et les catalogues ;
- contenus liés proposés depuis les fiches génériques, calculés localement à partir du contenu réel ;
- extension de la recherche globale aux corpus Culture et Histoire.

Point de restauration : `/home/ubuntu/isekaid-backup-20260910-170259`.

### Étape 5 — Les 47 préfectures

- remplacement de l’annuaire provisoire par une carte schématique interactive et accessible des 47 préfectures, complétée par une recherche et des filtres Région / État ;
- création d’un registre stable `JAPAN_PREFECTURES` avec les champs d’identité factuels et tous les emplacements requis par le futur corpus éditorial ; les champs éditoriaux restent vides tant qu’ils ne sont pas fournis par `db.prefectures` ;
- fiche générique composée des sections En quelques mots, Histoire, singularités, lieux, gastronomie, culture, nature, saisons, faits, contenus et lieux associés ;
- progression locale versionnée `isekaid_prefecture_progress_v1` : l’ouverture d’une fiche marque uniquement `discovered` ;
- réutilisation des favoris existants avec le type stable `prefecture` pour l’état `favorite` ;
- calcul de `visited` exclusivement depuis une journée de voyage contenant au moins une activité explicitement marquée comme faite ; `stampUnlocked` est dérivé de la même preuve et jamais d’une lecture ;
- ajout dans Mon Japon des compteurs séparés « Préfectures découvertes » et « Préfectures visitées », tous deux sur 47 ;
- le bouton « Ajouter à un voyage » ouvre un sélecteur, puis stocke une intention `plannedPrefectures` dans le voyage JSON existant ; cette intention est visible dans le résumé du voyage mais ne constitue pas une preuve de visite ;
- compatibilité cloud sans migration SQL : la nouvelle progression est incluse automatiquement dans le backup local/cloud existant et `plannedPrefectures` voyage dans le JSON déjà synchronisé. Une table Supabase dédiée n’est pas nécessaire à ce stade.

Point de restauration : `/home/ubuntu/isekaid-backup-20260910-173116`.

### Étape 6 — Voyage contextuel

- l’accueil Voyage se compose désormais selon le cycle de vie réel : préparation, voyage actif ou retour ;
- avant le départ, un tableau synthétique rassemble compte à rebours, itinéraire, journées, lieux sauvegardés, checklist, japonais utile, informations pratiques, recommandations, création et modèles préconçus ;
- pendant les dates effectives du séjour, l’espace bascule sur un Mode Voyage volontairement court : journée actuelle, prochaine activité, progression, carte/programme, phrases utiles, contexte et état hors ligne ;
- un bouton SOS persistant reste accessible au-dessus de la navigation pendant tout voyage actif ;
- le cache critique hors ligne est régénéré après chaque modification de voyage, et pas seulement au chargement initial du catalogue ;
- après le voyage, six raccourcis légers permettent de compléter les journées et visites, retrouver notes, souvenirs et stamps, ouvrir le carnet ou conserver l’itinéraire ;
- une date échue sans activité réalisée reste à confirmer et ne fabrique ni visite, ni stamp, ni souvenir ;
- les outils d’édition existants sont conservés : ajout de villes et lieux, glisser-déposer, déplacement entre journées, checklist, documents, sauvegarde locale automatique et synchronisation cloud du JSON voyage.

### Étape 7 — Mon Japon

- remplacement de la page de statistiques et de ses blocs en doublon par un Passeport Isekai'd placé en tête de page ; il rassemble rang, streak, préfectures découvertes et visitées, lieux sauvegardés et visités, stamps et badges ;
- collections de favoris réparties en cinq groupes stables : lieux, contenus, plats, préfectures et expressions, avec un contrat versionné déjà compatible avec de futures collections personnalisées ;
- intégration de la carte interactive des 47 préfectures dans « Mon Japon exploré », en conservant la distinction stricte entre lecture/découverte et visite physique prouvée ;
- regroupement des voyages selon leur cycle de vie réel : à venir, en cours et terminés, avec accès direct à l’itinéraire ;
- création d’une liste de carnets liée uniquement aux voyages terminés ; notes et photos restent attachées aux activités réalisées pour garder un journal léger ;
- moteur de stamps extensible pour les types préfecture, ville, culture, apprentissage, voyage et événement spécial ; seuls les stamps appuyés par une preuve sont créés ;
- cinq badges de progression significatifs remplacent la longue liste redondante affichée auparavant ; les badges verrouillés indiquent leur véritable condition.

### Étape 8 — Relier les cinq piliers

- extension du graphe Japon commun : lieux, villes, régions, spécialités régionales, gastronomie, expressions, situations, scénarios, contenus culturels, voyages et souvenirs partagent désormais des nœuds et destinations normalisés ;
- registre central `CONTEXT_BRIDGE_RULES` pour les passerelles restaurant, onsen et train : les seuils et cibles ne sont pas réécrits dans les écrans ;
- composant réutilisable `ContextualConnections` pour afficher les passages vers Découvrir, Apprendre, Voyage ou Mon Japon ;
- une fiche préfecture propose ses lieux réels, une spécialité issue du catalogue régional et du japonais pertinent, tout en conservant l’ajout au voyage et la découverte séparée de la visite ;
- les lieux consultés depuis Découvrir, un itinéraire en préparation et la prochaine activité du Mode Voyage proposent les mêmes actions contextuelles ;
- restaurant et onsen déclenchent respectivement un scénario de commande et les règles du bain ; le japonais du train n’est proposé qu’à partir de deux trajets explicitement enregistrés ;
- les métadonnées `arrivee` des voyages préconçus sont désormais conservées dans le modèle voyage afin que les recommandations puissent s’appuyer sur les transports réels ;
- terminer le scénario restaurant utilise le déclencheur `scenario` existant et peut donc valider la mission quotidienne correspondante ;
- visites, fin de voyage, carnets, stamps et progression des préfectures restent dérivés des mêmes activités `fait: true`, sans copie d’état ni visite implicite.
