# QCM quotidien et aide romaji

## Correction

Le QCM de la Session du jour passait immédiatement à l'étape suivante. Son
explication existait dans les données mais n'était pas rendue.

La réponse choisie est maintenant enregistrée une seule fois. Le quiz indique
la bonne réponse, distingue le choix incorrect et affiche l'explication.
La correction reçoit le focus et reste visible jusqu'à « Continuer ».
Le carrousel ne défile pas pendant le QCM ni après une navigation manuelle.
La correction reste consultable après rechargement et même après la fin de
la session (« Revoir la réponse du quiz »).

## Romaji

« Profil & réglages → Afficher le romaji » est activé par défaut, y compris
pour les comptes existants et les niveaux intermédiaire/avancé.
Le japonais reste affiché, avec sa lecture latine lorsque le contenu la fournit.
Les choix de graphie kana/kanji/transcription sont conservés séparément.
Masquer le romaji en mode transcription revient visuellement aux kana, sans
perdre la préférence de graphie. Choisir explicitement la transcription réactive
le romaji.

Le contexte React `JapaneseDisplayContext` couvre le QCM, les expressions,
les situations, les scénarios, la compréhension, les fiches de découverte,
le vocabulaire, le tuteur, les phrases SOS/voyage et les images de partage.
Les noms usuels français (Tokyo, sushi…) ne sont pas supprimés. Les réponses
des exercices de reconnaissance de kana restent révélables : le réglage ne
donne pas la solution du test avant la réponse. La transcription d'un exercice
audio reste sous « Afficher le texte » ; une fois ouverte, son romaji suit le
réglage global. Aucune lecture manquante n'est inventée automatiquement.

## Persistance

- Local : `isekaid_show_romaji_v1`, `false` explicite pour masquer.
- Authentifié : champ `progress.settings.showRomaji` dans le JSON existant,
  via la file de synchronisation et la fusion de préférences déjà utilisées.
- Absence de valeur : `true` ; aucune migration SQL et aucun changement RLS.
- Changement de compte : la clé fait partie de l'archive locale du propriétaire,
  comme les autres préférences. Un compte neuf ne récupère pas celle du précédent.

## Vérification

`npm run lint`, `npm test`, `npm run build`.

`npm run qa:daily-reading` utilise uniquement un compte invité local et bloque
les appels externes. Vérifie 360/390/412/430 px, bonne/mauvaise réponse, pause,
correction après retour/reload, lecture romaji par défaut, masquage persistant,
dernier quiz avant le bilan et consultation de la correction après le bilan.
`QA_ORIGIN` choisit le serveur ; `QA_WIDTHS` permet un sous-ensemble pour un smoke
test de production. `QA_CHROMIUM_EXECUTABLE` désigne le navigateur local si besoin.

Résultats : lint OK, 59 fichiers de tests OK, build OK (avertissement existant
sur les gros bundles). Parcours navigateur validés aux quatre largeurs ;
smoke test du build final validé à 360/390 px, avec correction dans le viewport
et romaji de compréhension écrite visible. Aucune erreur JavaScript relevée.
Tests sur navigateur mobile simulé, sans appareil Android physique.
