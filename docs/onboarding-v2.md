# Onboarding Isekaid v2 — refonte finalisée le 14 septembre 2026

## Sauvegarde et périmètre

Backup complet avant édition : `/home/ubuntu/backups/isekaid-before-onboarding-refresh-2026-09-14-101703/`.
Il contient le projet entier (y compris Git, fichiers cachés, configuration locale, dépendances, Android et anciens backups). La comparaison initiale `diff -qr` ne remontait aucune différence.

Branche `main`, HEAD initial `4affeaf`, arbre déjà modifié. Seuls les fichiers nécessaires à la refonte ont été changés ; aucun commit, déploiement web ou changement de schéma Supabase. Voir [l’audit préalable](./onboarding-audit.md).

## Ancien flow et problèmes

Le flow historique comptait jusqu’à **22 temps** : quatre écrans de profil, trois chapitres Voyage, treize coach marks et deux aides Scénarios. Une première refonte partielle était déjà présente au début de cette intervention : six écrans mêlant présentation et profil, trois nouveautés et cinq guides.

La reprise corrige le mélange des questions et des promesses, les bulles fixes avec voile, les effets des guides sur les onglets masqués, la confusion nouveau compte Google / profil existant, les reprises après reload et la persistance entre comptes.

L’étape « Avant · Prépare ton départ » et son instruction « Ouvre ton itinéraire… » ne figurent plus dans le code actif. Les anciennes explications de modèles, SOS, recherche, entraînement libre et révisions ne sont pas réintroduites. Le conseil Scénarios existant reste une aide métier secondaire.

## Présentation initiale : cinq écrans, sans formulaire

| # | Titre | Description | Complément statique | CTA |
|---|---|---|---|---|
| 1 | Ton Japon commence ici | Découvre, apprends, prépare ton voyage et garde tout ce que tu vivras au Japon. | Carnet illustré en CSS et icône | Commencer |
| 2 | Un peu de Japon chaque jour | Découvre un lieu, apprends une expression, teste-toi et accomplis une petite mission. | Découvrir → Apprendre → Comprendre → Mission | Continuer |
| 3 | Le japonais utile, au bon moment | Kana, situations, scénarios et expressions pensés pour ton niveau et ton voyage. | Restaurant, Train, Hôtel, Konbini | Continuer |
| 4 | Avant, pendant et après ton voyage | Prépare ton itinéraire, retrouve ce dont tu as besoin sur place et garde ton voyage en souvenir. | Avant · préparer / Pendant · mode Japon / Après · souvenirs | Continuer |
| 5 | Explore, puis garde ce qui compte | Explore le Japon à ton rythme et construis ton propre carnet au fil des découvertes. | Découvrir : 47 préfectures, lieux, culture, gastronomie et vie quotidienne. Mon Japon : favoris, voyages terminés, souvenirs et accomplissements. | Commencer mon Japon |

Un seul composant `Presentation` sert aux nouveaux comptes, aux nouveautés et au replay. Aucun voyage, favori, souvenir ou résultat fictif n’est créé. Le contenu initial n’utilise ni données de compte ni appel réseau.

Le dernier CTA et « Passer » ouvrent Aujourd’hui avec la session réelle issue du catalogue embarqué. Les badges de premier lancement sont conservés dans les accomplissements, sans popup qui interrompt l’entrée.

## Personnalisation séparée

Profil & réglages → **Personnaliser mon expérience** conserve les questions réellement consommées :

- prénom ;
- intérêts : `voyage`, `culture`, `gastro`, `anime`, `lifestyle`, `langue` ;
- niveaux internes historiques : `beginner`, `intermediate`, `advanced` ;
- relation au Japon : `dreaming`, `planning`, `soon`, `in_japan`, `returned`, `japan_lover`.

Les libellés des niveaux restent « Débutant complet », « Quelques bases », « Intermédiaire » conformément à la correspondance déjà consommée par le tuteur. Les choix alimentent le contexte utilisateur existant, ses recommandations et son niveau de japonais. Aucun objectif ou taxonomie parallèle n’a été ajouté.

Un nouvel utilisateur commence sans intérêts imposés, au niveau débutant ; son nom/photo Google sont repris si disponibles. Les dates, l’avatar, les informations de séjour et les champs inconnus d’un profil existant sont préservés pendant l’édition. La session du jour déjà générée reste stable ; les prochains contenus utilisent les nouvelles préférences.

Le bouton qui effaçait le profil pour refaire l’onboarding a été remplacé par cette édition. Modifier les préférences ou restaurer une progression ne réinitialise pas la présentation.

## Aides au premier usage

Une aide par onglet, uniquement sur la page d’accueil réelle de l’onglet actif. Les détails et les overlays métier suspendent l’aide. Changer d’onglet sans cliquer sur le CTA ne marque pas l’aide vue.

| Identifiant | Cible DOM réelle | Titre / texte | CTA |
|---|---|---|---|
| `today` | En-tête de la session, `#daily-session-title` | Ton rendez-vous quotidien. Commence par Découvrir. La suite se débloque étape par étape. | Compris |
| `travel`, aucun voyage | En-tête Voyage | Prépare ton premier voyage. Crée ton voyage ou pars d’un itinéraire pour commencer à organiser ton Japon. | Compris |
| `travel`, voyage futur | Même cible | Ton voyage prend forme. Ici, retrouve ta prochaine action, ton itinéraire et tes préparatifs essentiels. | Compris |
| `travel`, voyage actif | Même cible | Bienvenue en Mode Japon. Ta journée, ton itinéraire, le SOS et ton japonais utile restent accessibles rapidement. | Compris |
| `travel`, voyage terminé | Même cible | Ton voyage reste avec toi. Retrouve tes souvenirs et crée ton carnet de voyage. | Compris |
| `learn` | Carte Mon parcours | Apprends ce qui te sera utile. Suis ton parcours ou choisis une situation liée à ton prochain voyage. | Compris |
| `discover` | En-tête Découvrir | Explore le Japon à ton rythme. Découvre ses 47 préfectures, ses lieux, sa culture et ses habitudes. | Explorer |
| `myJapan` | Passeport | Voici ton Japon. Tout ce que tu sauvegardes, visites et accomplis se retrouve ici. | Compris |

La carte est insérée dans le flux à proximité de sa cible via un portail DOM, avec relation accessible `aria-details`. Aucun voile, coordonnée pixel, pulse infini ou piège de focus. Le défilement intervient seulement si la carte n’est pas visible après rendu. La navigation reste visible et utilisable. Le CTA ou Échap ferme l’aide ; le nettoyage retire les écouteurs et le portail.

Le guide Voyage est vu une fois par version de guides, dans le contexte rencontré à cette visite ; il ne réapparaît pas à chaque changement de date.

## Version, migration et stockage

`CURRENT_ONBOARDING_VERSION = 2`. La version 2 déjà terminée dans la refonte partielle n’est pas invalidée.

```js
{
  version: 2,
  completed: true,
  completedAt: "2026-09-14T…Z",
  migration: null, // ou "legacy-v1"
  skipped: false,
  presentation: null, // pendant la lecture : { mode: "new" | "update" | "replay", index: 0 }
  guidesResetAt: null,
  seenGuides: { today: true, travel: false, learn: false, discover: false, myJapan: false }
}
```

- Sans profil : cinq écrans.
- Profil ancien sans v2 terminée : trois nouveautés maximum — Aujourd’hui, Voyage, Mon Japon ; CTA « Découvrir les nouveautés ».
- V2 terminée : accès direct à Aujourd’hui.
- Replay : cinq écrans sans modification du profil, de la date de fin initiale ni des guides vus.
- Une version supérieure reçue du cloud n’est pas rétrogradée.
- Un profil Google n’est plus artificiellement créé avant la vérification cloud.
- Le routage attend la vérification cloud, même si un profil local existe.
- Une validation partiellement enregistrée conserve le mode initial et ne transforme pas le nouvel utilisateur en utilisateur ancien.

Stockage principal authentifié : `progress.settings.onboarding` dans Supabase, avec cache `isekaid_onboarding_state_v2_<user-id>`.
Invité : `isekaid_onboarding_state_v2_local`. « Découvrir sans compte » conserve aussi `isekaid_guest_mode_v1` pour reprendre après reload.

La synchronisation réutilise la file de mutations, les nouvelles tentatives au retour du réseau et le contrôle de concurrence existants. Les validations et guides vus sont fusionnés sans régression dans une même version. Un acquittement tardif ne retire pas un guide vu pendant l’envoi. `guidesResetAt` donne priorité à une réinitialisation explicite de développement.

La table `progress` possède déjà `settings jsonb`, `profile jsonb`, `user_id uuid`. Lecture distante vérifiée le 14/09 : RLS activé, politique ALL avec `USING (auth.uid() = user_id)` et même `WITH CHECK`. Aucune écriture dans les comptes réels, aucune migration SQL nécessaire.

### Changement de compte

Le propriétaire des clés historiques est enregistré dans `isekaid_device_owner_v1`. Avant de changer d’identité, leurs valeurs sont archivées dans `isekaid_account_cache_v1_<owner>`, puis les valeurs du compte suivant sont restaurées. L’application se remonte pour ne pas conserver les états React du compte précédent.

Les anciennes sauvegardes locales qui identifient leur propriétaire permettent une reprise directe. Les données non attribuables restent dans l’archive locale, sans être affectées arbitrairement à un nouveau compte. Le profil authentifié vient de sa ligne `progress`. Les clés onboarding, archives de comptes, propriétaire et profil sont exclues du backup générique qui pourrait autrement contredire ce chargement.

Les écritures de sauvegarde précèdent le retrait des anciennes clés ; un quota plein conserve les données et présente une erreur. La file de mutations reste rattachée aux identifiants des comptes. Logout ne supprime pas les archives ni les flags du compte quitté.

## Replay, développement et analytics

Profil & réglages → **Rejouer l’onboarding**. Retour et Quitter sont disponibles. Retour matériel Android / Échap revient à l’étape précédente ; à la première étape, il permet de quitter.

En développement uniquement :

```js
window.__isekaidOnboarding.state()
window.__isekaidOnboarding.resetGuides()
window.__isekaidOnboarding.reset()
```

Le reset permet de revoir la présentation complète en conservant le profil. Pour tester un compte entièrement neuf, utiliser les contextes isolés du script QA. Aucun bouton debug en production.

La couche analytics existante est réutilisée : `onboarding_started`, `onboarding_step_viewed`, `onboarding_skipped`, `onboarding_completed`, `guide_<id>_completed`. Les doublons d’effets StrictMode sont évités pour la présentation. Aucun fournisseur analytics ajouté.

## Accessibilité, visuels et responsive

Crème, rouge doux, touches or, titres serif, texte lisible, carnet statique en CSS et icônes Lucide. Pas d’images distantes nécessaires. Chaque étape a un titre focusable, une progression accessible et des boutons d’au moins 44 px. Les préférences utilisent labels et sélecteurs natifs ; erreurs annoncées. Le footer reste accessible et le corps défile indépendamment, avec safe areas. Illustration masquée en faible hauteur pour laisser place au texte.

Animations courtes uniquement ; `prefers-reduced-motion` est respecté. Les aides sont des régions complémentaires non modales : aucun blocage de navigation ni piège au clavier.

## Validation reproductible

```sh
npm ci
npm run lint
npm test
npm run build
npm run dev -- --host 127.0.0.1
# Dans un autre terminal, après installation de Chromium pour Playwright :
npm run qa:onboarding
npm run preview -- --host 127.0.0.1 --port 4173
# Dans un autre terminal : vérifier aussi le build de production
npm run qa:onboarding:production
npm run android:sync
cd android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ANDROID_HOME=/home/ubuntu/android-sdk ./gradlew lintDebug assembleDebug
```

Le script navigateur utilise les dépendances de développement déclarées. Si Chromium est déjà installé ailleurs, passer `QA_CHROMIUM_EXECUTABLE=/chemin/vers/chrome`. `QA_ORIGIN` et `QA_OUTPUT` sont configurables. Tous les appels Supabase sont simulés dans le navigateur et les autres domaines externes bloqués : aucun compte réel n’est créé/modifié et aucun faux voyage ne sort du contexte de test.

Scénarios : compte Google neuf, cinq écrans, retour matériel simulé, focus, reload en cours, stockage plein au dernier CTA, skip, session prête, cinq onglets, changement d’onglet avant validation, Escape, quatre états Voyage, replay/reload, préférences avec hauteur de clavier simulée, logout A → connexion B neuf, ancien compte → trois nouveautés, second appareil, invité → reload → réseau coupé.

Formats : 360×640, 390×844, 412×915, 430×932, paysage 844×390. Captures dans `/tmp/isekaid-onboarding-qa/`.

Les tests unitaires couvrent aussi les snapshots A → B → A, quotas, backups historiques, booléens corrompus, versions futures, fusion multi-appareil, acquittements tardifs et reset des guides.

Voir [onboarding-qa.md](./onboarding-qa.md) pour les résultats finaux et les limites de vérification sur appareil physique.

## Fichiers de cette intervention

- Intégration et navigation : `src/App.jsx`, `src/FeatureIntro.jsx`.
- Présentation : `src/features/onboarding/Onboarding.jsx`, `components/Presentation.jsx`, `content/onboardingContent.js`, `onboarding.css`.
- Personnalisation : `components/Personalization.jsx`, `components/personalization.css`, `src/features/profile/ProfileScreen.jsx`, `ProfileSettings.jsx`.
- Compte invité : garde de synchronisation dans `src/features/my-japan/useMyJapanProfile.js` (absence de métadonnées cloud).
- Guides : `src/features/onboarding/SectionIntro.jsx`, `contextGuide.css`, nettoyage de `src/product-ui.css` et suppression de l’ancien `src/FeatureIntro.css`.
- Persistance : `src/features/onboarding/state/onboardingState.js`, `src/services/auth/accountStorage.js`, `src/services/sync/cloudBackup.js`, `progressMerge.js`.
- Vérification : `test/onboardingState.test.js`, `test/onboardingPersistence.test.js`, `scripts/qa-onboarding.mjs`, `scripts/qa-onboarding-production.mjs`, `eslint.config.js`, `package.json`, `package-lock.json`.
- Documentation : les fichiers `docs/onboarding-*.md`. Assets Android et APK régénérés par la construction.

Le skill Supabase a guidé la vérification du stockage existant et des règles d’accès ; l’architecture existante suffit, sans nouvelle table.
