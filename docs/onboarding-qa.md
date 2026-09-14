# Vérification de l’onboarding v2 — 14 septembre 2026

## Résultats

| Contrôle | Résultat |
|---|---|
| Backup complet avant édition, comparaison intégrale | PASS, aucune différence au moment de la copie |
| `npm run lint` | PASS sur le périmètre de la refonte et son intégration App / Profil |
| `npm test` | PASS : 58 fichiers de tests, validation projet et audit éditorial |
| Tests onboarding/persistance exécutés directement | PASS : 12 cas (dont 7 nouveaux) |
| Build Vite et synchronisation Capacitor | PASS |
| `lintDebug assembleDebug`, APK final | PASS, BUILD SUCCESSFUL |
| Test navigateur du build de production | PASS : cinq guides dès le premier montage, replay complet, aucun debug ni erreur JavaScript |
| Matrice navigateur complète | PASS, aucun JavaScript non intercepté |
| Nouveau compte Google, cinq écrans, reprise après reload | PASS |
| Stockage plein au dernier CTA, reprise après rétablissement | PASS, message visible et écran conservé |
| Passer, replay, retour matériel simulé et focus | PASS |
| Aujourd’hui avec session du catalogue local | PASS |
| Aides des cinq onglets, navigation sans valider, Escape | PASS |
| Voyage absent, futur, actif, terminé | PASS |
| Préférences séparées, conservation du profil et des flags | PASS |
| Logout A puis connexion B neuf | PASS dans un navigateur avec Auth simulé |
| Ancien compte, trois nouveautés, skip et non-répétition | PASS |
| Compte terminé repris sur un second contexte navigateur | PASS avec sauvegarde cloud simulée |
| Invité, reload, réseau coupé, accès à une session prête | PASS |
| 360×640, 390×844, 412×915, 430×932, paysage 844×390 | PASS, footer et absence de débordement horizontal vérifiés |
| Commandes debug dans le bundle de production | Absentes |
| Lecture de configuration Supabase | PASS : JSONB existant et RLS propriétaire vérifiés |

Le test additionnel du build de production couvre les cinq guides dès leur premier montage, le replay complet et l’absence d’API debug. Il a détecté puis permis de corriger le crash de Mon Japon sans compte (`meta.syncedAt` quand les métadonnées sont absentes).

Le lint Android rapporte **0 erreur et 16 avertissements**, comme dans le backup initial : dépendances/versions, ressources et configuration Android préexistantes. Vite signale les bundles existants dépassant 500 kB. Ces avertissements ne bloquent pas la construction.

## Corrections révélées par les contrôles

- Nouveau compte Google auparavant classé comme ancien via un profil fabriqué avant le chargement cloud.
- Routage trop tôt lorsque la session précède le chargement du catalogue.
- Lecture du catalogue null lors de la préparation de la session pour la synchronisation.
- Flags locaux/cloud remplacés au lieu d’être fusionnés après une validation.
- Profil et préférences globaux partagés entre comptes.
- Bouton de réinitialisation relançant implicitement la présentation.
- Absence de reprise des étapes après reload et échec de persistance silencieux.
- État `skipped` des nouveautés ignoré.
- Anciennes bulles fixes, guides encore actifs sur les onglets masqués et popup de premier badge.
- Initialisation des aides avant que les refs des éléments voisins soient disponibles.
- Crash Mon Japon invité quand aucune métadonnée cloud n’existe.

## Captures conservées

- [Présentation, 390 px](./qa/onboarding/presentation.png)
- [Aujourd’hui, 360 px](./qa/onboarding/today-360.png)
- [Voyage, 430 px](./qa/onboarding/travel-430.png)
- [Mon Japon, 390 px](./qa/onboarding/my-japan-390.png)

La matrice complète et ses captures sont générées par `scripts/qa-onboarding.mjs`, dans `/tmp/isekaid-onboarding-qa/` par défaut. Les captures utilisent des comptes fictifs du test et n’exposent pas de données réelles.

## Limites

Aucun appareil ADB ni émulateur Android n’est disponible dans cet environnement. Les contrôles de largeur, orientation, focus, navigation, zones de défilement et faible hauteur sont effectués dans Chromium mobile. TalkBack, VoiceOver, clavier natif et barres système sur téléphone physique restent à vérifier manuellement. Le retour matériel est simulé par l’événement de présentation utilisé par le handler Capacitor.

Les tests de connexion, migration et multi-appareil utilisent des réponses Supabase simulées. Le serveur réel a seulement été interrogé en lecture pour vérifier son schéma et ses règles d’accès ; aucun compte réel ni voyage utilisateur n’a été modifié.

Le test hors ligne porte sur les ressources déjà chargées, et l’application Android embarque les ressources construites. Un site web jamais chargé sur un appareil sans réseau ne peut pas s’installer hors ligne.

## Livrables

- Audit : [onboarding-audit.md](./onboarding-audit.md).
- Flow, textes, architecture, version, migration, inventaire des fichiers : [onboarding-v2.md](./onboarding-v2.md).
- APK : `android/app/build/outputs/apk/debug/app-debug.apk`.
- Rapport Android : `android/app/build/reports/lint-results-debug.html`.
- Aucun déploiement de production ni commit automatique.
