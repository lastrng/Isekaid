# Analytics produit

Isekai'd utilise une abstraction locale et neutre vis-à-vis du fournisseur dans
[`src/services/analytics/analytics.js`](../src/services/analytics/analytics.js).
Le projet ne configure aucun service externe par défaut : l'application reste
fonctionnelle sans réseau et sans compte analytics.

## Contrat

Un adaptateur optionnel expose une seule méthode :

```js
configureAnalytics({ track(eventName, properties) { /* ... */ } })
```

`trackProductEvent` n'accepte que les événements connus et filtre les propriétés
avant de les transmettre. Les objets, tableaux et clés potentiellement
personnelles (nom, e-mail, message, note, contenu, token ou identifiant utilisateur)
sont écartés. Les événements sont donc conçus pour mesurer des usages agrégés,
pas pour reconstituer le profil d'une personne.

## Événements actuellement pris en charge

`onboarding_completed`, `trip_created`, `trip_started`, `trip_completed`,
`place_added`, `place_completed`, `scenario_completed`,
`kana_session_completed`, `sos_opened`, `tutor_started`, `favorite_added` et
`readiness_score_changed`.

Les propriétés utilisées sont limitées à des catégories, modes, sources et
valeurs numériques utiles à la compréhension du parcours. Aucun fournisseur ne
doit recevoir de clé secrète ou de données sensibles : son intégration éventuelle
se fera derrière cet adaptateur.
