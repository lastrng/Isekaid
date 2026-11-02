# Révisions des phrases utiles

Le carnet « Mes phrases utiles » est accessible depuis Apprendre. Aujourd’hui
propose un accès dès qu’une première carte a été ajoutée, ou permet de reprendre
le carnet depuis la dernière activité.

L’utilisateur ajoute explicitement une expression du jour, une expression ouverte
depuis la recherche, une phrase d’une situation ou une correction du tuteur. Il
peut aussi saisir sa propre phrase et sa traduction. Les suggestions « Pour mon
voyage » utilisent les lieux du catalogue et les lieux personnalisés du voyage
actif, sinon du prochain séjour. Elles indiquent le lieu et le jour concernés ;
elles n’ajoutent aucune carte automatiquement.

Une séance contient au maximum dix cartes dues. La traduction française est
présentée avant la réponse japonaise. Après révélation, « Je connais » espace les
révisions de 1, 3, 7, 14 puis 30 jours ; une carte bien retenue continue à revenir
tous les 30 jours. « À revoir » réduit le niveau et programme un rappel dix
minutes plus tard. Le carnet actualise ses échéances chaque minute et au retour
dans l’application. Les préférences de script et de romaji sont respectées et
la synthèse vocale reste disponible pour les phrases du catalogue.

Une correction conserve exactement la phrase de l’apprenant et l’explication
du tuteur. La réponse conversationnelle du tuteur n’est jamais présentée comme
la version corrigée de cette phrase. La carte demande de retrouver l’erreur,
puis révèle l’explication ; elle ne lit pas à voix haute la phrase erronée.
Les corrections existantes dans l’historique peuvent également être ajoutées.

Le stockage local `isekaid_phrase_reviews_v1` permet une utilisation hors ligne.
Les cartes sont synchronisées dans `progress.settings.phraseReviews` et dans
les sauvegardes existantes, sans nouvelle table ni appel IA supplémentaire.
Les changements de compte bénéficient de l’archivage local existant. Les textes
du carnet ne sont pas ajoutés aux événements analytiques.

La fusion choisit une observation complète par carte selon sa date de mise à
jour, avec une résolution déterministe en cas d’égalité. Elle réunit les ajouts
faits sur plusieurs appareils. Un retrait conserve un marqueur sans le texte
de la carte ; les anciennes copies et sauvegardes respectent ce retrait. Les
marqueurs restent conservés pour les appareils longtemps hors ligne. Annuler un
retrait conserve l’échéance précédente, tandis qu’ajouter de nouveau une carte
retirée recommence son apprentissage. Le plafond de 500 cartes concerne les
nouveaux ajouts ; une fusion concurrente ne supprime pas de cartes pour imposer
ce plafond. Un doublon ne réinitialise jamais la progression.

L’évaluation est enregistrée avant d’avancer dans la séance. En cas de quota
local dépassé, une erreur est affichée et la réponse reste à valider. Seule la
fin effective d’une séance déclenche une mission de révision ; ouvrir le carnet
ou révéler une réponse ne suffit pas. Quitter une séance conserve les réponses
déjà validées. Les intervalles reposent sur l’autoévaluation de l’utilisateur.

Validation : `npm run lint`, `TZ=UTC npm run check` et
`npm run qa:phrase-reviews` contre un serveur local. Le test navigateur couvre
les écrans de 360 et 390 px, les échéances, les doublons, le retrait et son
annulation, le rechargement et l’échec de stockage. Le tuteur, l’authentification
et les écritures de progression sont simulés pour tester la capture puis la
sauvegarde et la restauration des corrections sans écrire en production.
