# Onboarding contextuel

Sauvegarde vérifiée avant modification : `backup-before-onboarding-completion-20260905`
(commit `15689f20f675104e4963e37ef25b1cc07f836ef0`, arbre propre).
Revenir à cet état dans un autre dossier :

```sh
git worktree add --detach /tmp/isekaid-before-onboarding backup-before-onboarding-completion-20260905
```

Quatre étapes conservées : relation au Japon (six choix), intérêts, niveau de
japonais, informations personnelles et séjour facultatif. Le libellé « Je prépare
un voyage » convient aussi aux voyageurs déjà partis ; la réponse « premier
voyage » est indépendante, nullable, et n'est pas déduite artificiellement.
Le retour entre étapes conserve les réponses. Changer de situation réinitialise
les réponses de séjour pour éviter de convertir une date passée en futur départ.

Les séjours préparés, en cours et passés peuvent renseigner une date, une durée
entière entre 1 et 365 jours et leur caractère premier voyage ou non. Champs
facultatifs : une absence reste `null`. Les niveaux parlent explicitement du
japonais ; les valeurs historiques beginner/intermediate/advanced restent les mêmes.

Profil version 3 : `plannedDeparture` reste réservé à la préparation ;
`journeyStartDate` contient la date déclarée du séjour en cours/passé ;
`plannedDurationDays` contient la durée déclarée. Ces indications ne créent pas
un voyage, des activités ou des statistiques de visite. Les dates impossibles et
les durées invalides sont normalisées à null à la lecture et signalées dans le
formulaire. `firstTrip` reste nullable ; prénom et avatar disposent de valeurs par
défaut. Les champs inconnus et le format de stockage historique sont conservés.
Les profils locaux et ceux issus du cloud passent par la normalisation existante.
Aucun utilisateur existant n'est forcé à refaire l'onboarding.

La soumission construit le profil dans un module métier indépendant de React.
Un stockage indisponible affiche une erreur et conserve le formulaire, au lieu
de passer à l'accueil sans sauvegarde. Les cartes de sélection sont des boutons
avec leur état annoncé ; date, durée et prénom sont étiquetés.

Validation : six situations, compatibilité des anciens champs, idempotence,
valeurs facultatives, dates impossibles, durées hors limites. Check global : tests,
validation du projet, audit des contenus et build. Pas de vérification visuelle
sur téléphone ni de déploiement pendant cette étape.
