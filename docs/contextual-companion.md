# Contenus et tuteur contextuels

## Relations entre contenus

`src/entities/content/japanGraph.js` construit un index local depuis les données existantes : conseils, traditions, codes sociaux, vie quotidienne, expressions, situations, lieux et villes. Aucun contenu utilisateur n'est copié dans ce catalogue.

Les nœuds possèdent un identifiant typé, une source, une ville, une région et des thèmes. Les thèmes viennent des métadonnées explicites `themeIds` ou d'un vocabulaire centralisé. La ville et la proximité reposent sur `villeId` et `a_proximite`. La région est préparée dans le modèle mais n'est pas utilisée seule pour recommander un contenu.

Classement déterministe : 4 points par thème partagé, 9 pour une proximité déclarée, 2 pour la même ville ; bonus 8 pour un conseil pratique et 3 pour une expression/situation correspondant au thème. Maximum deux résultats par type et cinq au total. Sans correspondance, aucune suggestion. Ces associations textuelles sont des recommandations, pas un graphe éditorial exhaustivement validé.

Les conseils apparaissent avant la prochaine activité non cochée, dans l'accueil en Mode Japon, dans la journée affichée et dans la fiche du lieu. Une seule fiche est dépliée initialement. Les phrases utilisent le composant audio existant ; la lecture dépend de la disponibilité de la synthèse vocale. Textes et relations sont embarqués et utilisables hors connexion.

## Contexte du tuteur

Le client construit un contexte distinct du scénario et de l'historique : état vis-à-vis du Japon, ville, prochaine activité du catalogue, catégorie et quatre centres d'intérêt au maximum. Sans voyage actif, le prochain voyage daté sert de référence. Les informations de niveau et le pont depuis un scénario restent transmis par leurs champs existants.

Le serveur reconstruit le contexte avec une liste de champs autorisés : ville, activité et catégorie limitées chacune à 80 caractères, états/intérêts limités à leurs énumérations. Les notes, photos, noms personnels, dates exactes, titres de voyages et lieux personnalisés ne sont pas transmis. Les expressions récemment apprises ne sont pas ajoutées faute de suivi fiable identifié pour cette donnée.

Le contexte est transmis à chaque message et n'est pas stocké dans les conversations. Le prompt le traite comme une donnée déclarative non vérifiée, jamais comme une instruction, sans supposer une géolocalisation. Aucun changement du modèle, de la limite de sortie (512 tokens), des quotas ou des protections Premium. Le contexte ajoute néanmoins une petite quantité de tokens d'entrée. Les anciens clients sans ce champ restent compatibles.

## Validation et restauration

Tests : relations par thème/ville/proximité, absence de résultats inventés, exclusion des données privées et bornage serveur. `npm run check` valide l'ensemble.

Point de restauration avant modification : tag Git `backup-before-context-20260905` (commit `e4dbfa9`). Pour une copie indépendante : `git worktree add --detach /tmp/isekaid-before-context backup-before-context-20260905`.

Les sources serveur précédentes sont également extraites dans `/tmp/isekaid-tutor-rollback-20260905/supabase/functions/tutor-chat`. Un rollback du serveur consiste à redéployer `tutor-chat` depuis cette copie avec le CLI authentifié. Aucune migration SQL n'est nécessaire.
