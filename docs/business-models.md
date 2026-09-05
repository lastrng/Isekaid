# Modèles métier

Les calculs de domaine sont progressivement sortis de `App.jsx` et des
composants d’écran :

- `src/entities/user/japanJourneyState.js` : état vis-à-vis du Japon, voyage
  actif, jour courant, prochaine activité et progression quotidienne ;
- `src/features/home/homeContext.js` et `homeRecommendations.js` : contexte
  d’accueil et recommandations déterministes ;
- `src/features/readiness/readinessScore.js` : score de préparation ;
- `src/features/japan-mode/japanModeModel.js` : modèle du Mode Japon ;
- `src/entities/content/japanGraph.js` et `relatedContent.js` : relations et
  contenus liés ;
- `src/features/travel/tripDayModel.js` : métriques d’une journée (durée,
  distance, surcharge), sans dépendance à React.

Cette étape extrait les calculs de journée de voyage historiques de `App.jsx`.
La carte, le récapitulatif et les contrôles utilisent désormais la même
fonction `tripDayMetrics`. Les composants conservent le rendu, les
interactions et leur état d’interface local.

Chaque nouveau modèle doit rester pur, recevoir ses données en argument et
être couvert par un test indépendant avant d’être branché à l’UI.
