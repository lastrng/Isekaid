# Isekai'd — itération Daily du 6 septembre 2026

## Backup avant modification

- Tag Git : `isekaid-backup-2026-09-06-001025`
- Copie restaurable : `/home/ubuntu/isekaid-backup-2026-09-06-001025/repository`
- Archive complète : `/home/ubuntu/isekaid-backup-2026-09-06-001025.tar.gz`

Restauration Git : `git checkout isekaid-backup-2026-09-06-001025`.
La copie et l'archive excluent uniquement les dépendances et artefacts générés
(`node_modules`, `dist`, caches Gradle et build Android) ; le code source, les
données et la configuration sont inclus.

## Modifications

L'écran Aujourd'hui affiche maintenant une section `Ton Japon aujourd'hui` avant
les blocs liés au voyage, y compris pour un utilisateur qui prépare un séjour.
Elle présente une carte éditoriale et un rituel court en trois étapes :

1. découvrir une culture, une saveur ou un lieu éditorial ;
2. apprendre une expression ;
3. s'entraîner sur une situation, avec fallback vers le catalogue existant.

Le moteur de Daily est local, déterministe pour une date donnée et générique par
type de contenu. Sa progression est enregistrée dans
`isekaid_daily_ritual_v1`, reste disponible après fermeture de l'application et
ne dépend pas d'une requête supplémentaire. Le premier rendu avant le chargement
du catalogue ne peut pas figer un rituel vide.

La première activité complétée valide la streak quotidienne ; les trois activités
affichent une progression et un état de fin élégant. Les activités d'apprentissage
ouvrent les écrans japonais/scénarios existants, tandis que la découverte ouvre
Découvrir. Le voyage conserve ses écrans et sa hiérarchie dans Voyager.

## Fichiers principaux

- `src/features/daily/dailyModel.js`
- `src/features/daily/DailyRitual.jsx`
- `src/App.jsx`
- `test/dailyModel.test.js`

## Validation

- 41 tests réussis ;
- validation structurelle réussie ;
- audit éditorial réussi : 204 lieux avec récit ;
- build Vite de production réussi ;
- synchronisation Capacitor Android réussie ;
- `./gradlew assembleDebug` réussi.

Les seuls avertissements sont les chunks Vite volumineux et les avertissements
Gradle existants ; aucune erreur de compilation n'est présente.

## APK debug

`/home/ubuntu/isekaid/android/app/build/outputs/apk/debug/app-debug.apk`

- Taille : 73 Mo
- SHA-256 : `d3d399aeb189c71f09641d6fe85cb5e3a2bf35379b44ef976867d9e39f0e8f07`

## Suite recommandée

Tester visuellement les trois contextes (sans voyage, voyage à venir, voyage
terminé) sur un appareil Android réel, puis enrichir Découvrir avec les façades
éditoriales Gastronomie et Japon contemporain en réutilisant ce même moteur de
contenu déterministe.
