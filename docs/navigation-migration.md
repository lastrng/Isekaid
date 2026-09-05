# Navigation et migration des espaces

La barre principale expose quatre destinations stables :

| Espace produit | Destination interne | Contenu |
| --- | --- | --- |
| Aujourd’hui | `home` | accueil contextuel |
| Voyager | `voyage` | voyages, journées, carte, outils sur place |
| Découvrir | `explore` | culture, contenus, apprentissage et scénarios |
| Mon Japon | `profile` | profil, favoris, souvenirs et récapitulatifs |

Les anciennes destinations `learn`, `scenarios`, `tutor` et `daily` restent
des écrans internes rattachés à `explore`. Les liens d'action continuent donc
d'ouvrir leur écran précis, tandis que la barre indique le parent Découvrir.
Les sous-vues de Voyager (`trip`, `day`, `sos`) restent transportées par
`pendingTravelView` et ne sont pas remplacées par une nouvelle URL.

`resolveDestination` constitue la frontière de migration : elle accepte les
identifiants historiques et les alias lisibles (`voyager`, `decouvrir`,
`mon_japon`), normalise la casse et les espaces, puis retombe sur Aujourd’hui
pour une destination inconnue. `setTab` l'utilise avant chaque changement
d'écran. Les deep-links existants conservent ainsi leur cible et bénéficient
de la nouvelle hiérarchie sans réécriture du routeur.

La navigation Android conserve également son retour imbriqué : un écran
interne recule d'abord dans son propre état, puis revient à Aujourd'hui avant
de quitter l'application.
