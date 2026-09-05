# Mode Japon

Sauvegarde vérifiée avant modification : `backup-before-japan-mode-completion-20260905`
(commit `db79753bfa4d85222043dec0f41e5b9a47318b96`).

`isJapanModeActive(trips, currentDate)` active le mode lorsqu’un voyage non
annulé/non terminé possède une fenêtre de dates contenant la journée courante.
La fin explicite `dateFin` est respectée ; sinon la durée est déduite du nombre
de jours du voyage. Le moteur utilise les dates calendaires d’Asia/Tokyo via la
logique de voyage partagée. Un départ la veille au soir en France est donc déjà
le premier jour au Japon si la journée japonaise a commencé.

`buildJapanMode` renvoie le voyage, le jour courant, la progression, la prochaine
activité, le lieu du catalogue ou un lieu personnel, et les actions rapides. Les
cases à cocher passent par `toggleTodayActivity`, qui refuse les activités d’un
autre jour et les voyages annulés. La modification garde la structure immuable,
met à jour `updatedAt`, puis utilise la persistance et la file de synchronisation
existantes.

L’interface donne la priorité à la journée et à la prochaine activité, puis à la
carte/programme, SOS Japon, phrases utiles et contenus contextuels. Un message
indique que les dates suffisent et que la localisation n’est pas requise. Les
outils disponibles hors connexion sont le programme, les lieux et textes chargés,
les cases à cocher, les phrases et SOS ; la carte distante, certains médias et le
tuteur signalent leurs besoins réseau. Aucun accès GPS n’est ajouté.

Les tests couvrent le lieu personnel sans localisation, progression et annulation,
fenêtres date de début/fin aux frontières du fuseau japonais et absence de
permission de localisation. `npm run check` passe : 36 suites, validation du
projet, audit éditorial et build Vite. Le warning de bundle volumineux reste
présent ; aucune validation visuelle Android n’a été effectuée.
