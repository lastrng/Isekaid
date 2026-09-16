# QA finale Isekai’d — étapes 5 à 15

Cette matrice est la référence de non-régression des cinq piliers. La commande
`npm run qa:final` exécute tous les tests de modèles, les cinq parcours produit,
la validation structurelle, l’audit éditorial et le build de production.

## Parcours automatisés

| Parcours | Preuves principales |
| --- | --- |
| Sans voyage | onboarding, rituel Aujourd’hui, découverte d’une préfecture sans visite implicite, favori lieu, synthèse Mon Japon |
| Préparation | itinéraire Tokyo/Kyoto, ajout de lieux, recommandation de japonais, checklist, kit offline |
| Au Japon | activation Mode Voyage, journée courante, prochaine activité, fiche lieu, progression, SOS et expressions en cache |
| Après voyage | confirmation explicite, lieux visités, stamps, préfecture visitée, souvenir et carnet |
| Quotidien | découverte, apprentissage, mini-quiz, mission, progression complète, streak protégé par joker |

Le fichier `test/qaJourneys.test.js` porte ces parcours. Les tests spécialisés
complètent la couverture : navigation et deep links, recherche universelle,
stockage local, fusion/reprise Supabase, offline et reconnexion, droits Premium,
nettoyage de compte et sécurité des documents.

La restauration de session conserve séparément la session et l’erreur réseau :
une absence de compte et une vérification impossible hors ligne ne déclenchent
donc pas le même routage. La fonction distante `delete-account` doit rester
active avec vérification JWT ; sa présence peut être contrôlée par la CLI sans
invoquer une suppression réelle.

## Vérifications de release

1. `npm run qa:final`
2. `npm run android:sync`
3. Dans `android/`, compiler `assembleDebug` avec Java 21 et le SDK Android.
4. Sur un appareil Android ou un émulateur : vérifier les zones sûres, le clavier,
   le bouton retour, une coupure/récupération réseau et l’achat/restauration
   RevenueCat en environnement sandbox.
5. Sur le projet Supabase de staging : créer une session, la restaurer après
   relance, provoquer une mutation offline puis une reconnexion, et supprimer le
   compte. Vérifier l’absence du compte Auth, des lignes associées et des photos.

## Responsive et accessibilité

- Largeurs de référence : 320, 360 et 390 px ; portrait puis paysage Android.
- Navigation principale toujours atteignable et libellée.
- Focus visible au clavier, états `aria-current`, `aria-pressed` et `role=status`.
- Animations neutralisées avec `prefers-reduced-motion`.
- Aucun contenu essentiel ne dépend uniquement d’un hover, d’une couleur ou du réseau.

Les achats réels, la suppression distante et les interactions matérielles ne
doivent jamais être validés contre la production pendant une QA locale : ils
font partie du passage manuel en sandbox/staging.

## Dernière exécution — 11 septembre 2026

| Contrôle | Résultat |
| --- | --- |
| `npm run qa:final` | Réussi · 51 fichiers de tests, validation projet, audit éditorial et build Vite |
| Parcours produit | Réussis dans `test/qaJourneys.test.js` · sans voyage, préparation, au Japon, après voyage, quotidien |
| Navigation / deep links | Réussis · cinq destinations principales, alias historiques et sous-routes Apprendre/Aujourd’hui |
| Local / offline / reconnexion | Réussis · stockage, cache critique, file de mutations et fusion de reprise |
| Sessions Supabase | Réussi au niveau client · session restaurée distincte d’une panne réseau ; vérification réelle à refaire avec un compte de staging |
| Suppression de compte | Fonction `delete-account` active en version 4, JWT obligatoire ; révocation globale des sessions, nettoyage Storage, suppression Auth puis purge locale |
| Premium | Modèle d’accès et build RevenueCat réussis ; achat/restauration réels à refaire en sandbox store |
| Responsive | Règles 320–600 px, paysage compact, encoches et barre système vérifiées statiquement ; contrôle visuel sur appareil requis |
| Capacitor Android | `cap sync android` réussi ; `assembleDebug` réussi avec Java 21 |
| Appareil / émulateur | Non exécuté : aucun appareil listé par ADB dans cet environnement |

APK de QA : `android/app/build/outputs/apk/debug/app-debug.apk`.
