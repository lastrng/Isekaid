# Accueil contextuel

Sauvegarde vérifiée avant modification : `backup-before-home-context-20260905`
(commit `8e599450dab7dbd285a5b666f798cfe10b281682`).

`getHomeRecommendations` est un moteur pur et local. Il reçoit l’état calculé du
voyage, une préparation connue et la présence de contenus disponibles. Il trie
des actions par priorité fixe, supprime les doublons et renvoie au maximum cinq
actions. Il ne déclenche aucune requête réseau, ne déduit aucune information
sensible et ne remplace pas les routes existantes.

Les priorités sont contextuelles :

- sur place : journée, SOS, phrases, itinéraire ;
- avant le départ : itinéraire, préparation, apprentissage, documents ;
- après le retour : carnet, contenu relié, japonais, nouveau départ ;
- sans voyage : inspiration, culture, japonais, création d’un voyage.

Les projets sans date restent dans le groupe préparation. L’accueil rêve conserve
sa carte éditoriale principale et utilise ensuite la liste du moteur sans répéter
l’inspiration. L’accueil préparation/retour remplace ses cartes secondaires fixes
par les recommandations. Le Mode Japon utilise le même ordre pour ses actions
SOS, phrases et itinéraire. La progression détaillée et le contenu contextuel
restent accessibles depuis leurs écrans dédiés.

Les tests vérifient les quatre contextes, la limite de cinq, l’unicité des IDs,
les priorités principales et le cas d’un projet sans date. `npm run check` passe :
36 fichiers de tests, validation structurelle, audit de contenu et build Vite.
L’avertissement de bundle volumineux reste inchangé. La vérification visuelle sur
appareil n’a pas été effectuée.
