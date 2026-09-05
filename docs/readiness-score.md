# Score « Prêt pour le Japon »

Sauvegarde vérifiée avant modification : `backup-before-readiness-completion-20260905`.

Le calcul est entièrement local dans `calculateReadinessScore`. Il ne suppose pas
qu’un champ absent est terminé. Chaque domaine renvoie 0 quand aucune donnée
observable ne permet de calculer sa progression.

Le domaine Voyage examine uniquement les signaux connus : voyage créé, date de
départ, villes, activités dans des journées présentes et hébergement renseigné.
Un signal absent est inconnu et retiré du dénominateur ; un voyage sans villes ne
gagne donc pas de ville inventée, mais son existence et sa date peuvent être
reconnues.

Japonais est la moyenne de trois repères explicites : kana maîtrisés sur 20,
scénarios terminés sur 4 et vocabulaire marqué appris sur 20. Les objectifs sont
exportés dans `READINESS_TARGETS` et plafonnés à 100 % ; un nouveau vocabulaire
peut être fourni sous forme de tableau ou d’objets `{ learned: true }`.

Codes sociaux et Transports utilisent exclusivement les éléments de checklist
classés ou identifiés par leur texte. Sans élément correspondant, le domaine vaut
0. Avant le départ est le ratio des cases cochées ; les contenus essentiels
consultés peuvent compléter ce domaine quand une progression explicite est fournie
(`contentProgress`). Les éléments liés aux urgences sont comptés dans les preuves
affichées mais ne sont jamais inventés.

Le score global est la moyenne simple des cinq domaines affichés. Chaque domaine
pèse donc 20 %, ce qui empêche un itinéraire complet de masquer une absence de
préparation pratique. Les nombres et les listes de preuves sont retournés pour
expliquer chaque résultat dans l’interface.

Le composant `ReadinessCard` est réutilisable et conserve les états vide, détail,
sélection de voyage et prochaine action. Les anciennes propriétés restent
acceptées ; les nouvelles sont facultatives et ne modifient pas les profils.

Tests : profil vide, données connues, bornes, faux positifs, hébergement,
vocabulaire, contenus et urgences. `npm run check` doit rester la validation de
référence. Le score n’est pas une garantie de voyage réussi ni une recommandation
personnalisée par IA.
