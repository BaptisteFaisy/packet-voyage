1. Publier le site sur GitHub Pages via une GitHub Action dédiée au déploiement.
2. Limiter chaque job CI à cinq minutes avec `timeout-minutes: 5`.
3. Configurer un cache npm à clé de hash sur `package-lock.json` pour accélérer les installs.
4. Paramétrer `fetch-depth: 1` sur le checkout pour un clone rapide en CI.
5. Découper le pipeline en jobs parallèles (lint, test, build) partagés via `concurrency`.
6. Annuler les runs obsolètes d'une même branche grâce à `concurrency.group`.
7. Exécuter le build et les tests sur une matrice de versions Node (20, 22, 24).
8. Ajouter un job de vérification des types (`tsc --noEmit`) séparé des tests.
9. Ajouter une garde de durée de build qui alerte au-delà d'un seuil proche du budget.
10. Publier un artefact du site statique à chaque push de PR pour un déploiement de prévisualisation.
11. Déployer en production uniquement depuis `main` et uniquement après un build vert.
12. Générer un fichier `CNAME` pour le domaine personnalisé de GitHub Pages.
13. Activer l'option HTTPS forcée de GitHub Pages dans la configuration du dépôt.
14. Ajouter un job de publication npm en `--dry-run` sur chaque PR touchant la bibliothèque.
15. Publier le paquet npm sur un tag Git versionné, jamais sur un simple push.
16. Activer l'attestation de provenance (provenance) sur la publication npm.
17. Vérifier la taille du tarball npm avant publication avec une garde de poids maximale.
18. Inspecter `npm pack --dry-run` pour lister ce qui part réellement dans le paquet.
19. Limiter le paquet publié via le champ `files` du `package.json` au strict nécessaire.
20. Déclarer le bin `packet-voyage` et la version minimale de Node via le champ `engines`.
21. Lancer un smoke test `npx packet-voyage` après publication pour valider l'entrée CLI.
22. Protéger la publication npm par l'authentification à deux facteurs du compte de publication.
23. Dériver le numéro de version via `semantic-release` à partir des commits conventionnels.
24. Générer un CHANGELOG automatique à chaque version, alimenté par les commits.
25. Ajouter une garde empêchant un nouveau numéro de version sans entrée de changelog.
26. Mettre à jour les dépendances automatiquement via Dependabot (ou Renovate) en PR.
27. Bloquer le merge tant qu'un audit de sécurité signale une vulnérabilité critique.
28. Geler les dépendances pour un build reproductible via un lockfile commité.
29. Valider les workflows GitHub avec `actionlint` en hook de pré-commit.
30. Afficher des badges de statut CI et de couverture dans le README.
31. Instrumenter la durée de chaque job CI et exporter les métriques en artefact.
32. Détecter les tests flaky en rejouant les échecs et en journalisant les résultats.
33. Publier un tableau de bord HTML statique des gardes et statuts de build.
34. Fixer un budget de performance sur le bundle JS (seuil d'octets en garde).
35. Visualiser la composition du bundle (taille par module) dans un graphique commité.
36. Configurer Lighthouse CI pour un audit de performance et d'accessibilité à chaque PR.
37. Mesurer les Core Web Vitals du site sur une page de référence publiée.
38. Découper les jeux de données (câbles, terres) en chunks chargés paresseusement.
39. Activer le tree-shaking et la minification de la production pour réduire le poids.
40. Précompresser les assets statiques en brotli/gzip et les servir via en-têtes.
41. Ajouter des en-têtes `Cache-Control` immuables pour les assets hashés en contenu.
42. Utiliser un hash de contenu dans les noms de fichiers pour une invalidation efficace.
43. Servir les données géographiques en fichiers séparés par jeu plutôt qu'en méga-JSON.
44. Ajouter un service worker pour la mise en cache hors ligne des données naviguées.
45. Mettre en cache les calculs de route (grand cercle, compatibilité câble) par mémoïsation.
46. Ajouter un cache LRU borné pour les lookups répétés de câbles et de sauts.
47. Ajouter une garde d'invalidation de cache sur changement de version des données.
48. Générer un manifeste d'empreintes (hashs) des données pour une invalidation fine.
49. Ajouter une garde de cohérence des données : câble sans atterrissage ou géométrie vide.
50. Valider le schéma des datasets (Zod) au prébuild pour refuser un JSON malformé.
51. Ajouter une garde de poids maximale par dataset (octets par fichier de données).
52. Imposer une attribution ODbL vérifiable dans les métadonnées des datasets embarqués.
53. Ajouter un linter de licence empêchant d'embarquer une dépendance incompatible.
54. Faire tourner ESLint et Prettier en pré-commit via `lint-staged`.
55. Bloquer le commit de secrets via `gitleaks` (ou équivalent) en hook.
56. Empêcher l'ajout d'une dépendance runtime sans justificatif de taille (garde).
57. Mesurer la couverture de tests et publier un seuil minimal non négociable.
58. Publier la couverture en artefact HTML consultable depuis la PR.
59. Refuser le merge sous un seuil de couverture sur les parseurs et les calculs.
60. Ajouter des tests de snapshot du rendu CLI lisible (le libellé est un contrat).
61. Ajouter des tests de snapshot des cartes/GeoJSON produits, relus à l'identique.
62. Mettre en place la non-régression visuelle du site par capture et comparaison d'images.
63. Comparer les captures visuelles sur une matrice de navigateurs (Chromium, Firefox, WebKit).
64. Seuiller la non-régression visuelle avec un delta de pixels toléré configuré.
65. Archiver les captures de non-régression en artefacts pour un diff manuel en cas d'échec.
66. Ajouter des tests e2e Playwright du parcours complet (entrée, trace, carte).
67. Ajouter un test e2e de l'export GeoJSON depuis la vue parcours.
68. Ajouter des tests e2e d'accessibilité axe-core sur les vues principales.
69. Ajouter des tests de propriété (fast-check) sur les bornes de distance et de délai.
70. Réintroduire le fuzz des parseurs en CI dans un job séparé au temps borné.
71. Garantir un budget de fuzz dédié (durée) pour ne pas retarder le pipeline.
72. Tester la reprise sur entrées malformées (BOM, CRLF, troncature) en job dédié.
73. Vérifier l'idempotence de la rétention/caviardage comme propriété automatisée.
74. Versionner des golden files de sortie humaine du CLI et les comparer en CI.
75. Isoler les tests du réseau : aucun test ne doit appeler l'extérieur.
76. Injecter les réponses `traceroute` via des fixtures hors-ligne de secours.
77. Rendre les tests déterministes en figeant l'horloge et les données de référence.
78. Ajouter un test de performance du calcul de route (seuil en millisecondes).
79. Surveiller le nombre de requêtes réseau émises par le site (doit rester zéro).
80. Ajouter un test de régression du contrat « le site n'émet aucune requête ».
81. Ajouter un job de vérification des liens internes cassés du site construit.
82. Valider le HTML généré avec un validateur embarqué en CI.
83. Générer un sitemap et un `robots.txt` au build du site statique.
84. Ajouter une page 404 statique dédiée avec retour à l'accueil.
85. Mettre en place un déploiement atomique avec possibilité de rollback d'une version.
86. Publier un environnement de staging séparé pour valider avant la production.
87. Ajouter une garde interdisant le déploiement d'une PR non approuvée.
88. Générer un SBOM du paquet npm publié pour tracer l'ensemble des dépendances.
89. Signer les releases Git avec une clé et vérifier la signature en CI.
90. Rejouer un build en mode `--frozen-lockfile` pour garantir la reproductibilité.
91. Ajouter une garde de taille totale du dépôt (datasets) pour éviter l'emballement.
92. Compresser et pré-réduire les géométries au prébuild pour alléger les données.
93. Ajouter un job de purge des artefacts expirés pour limiter le stockage CI.
94. Mettre en cache le build (turbo/nx) entre jobs pour éviter de recompiler.
95. Paralléliser les tests par shard (jest --shard) pour tenir le budget de cinq minutes.
96. Faire tourner un contrôle rapide de type/lint avant les tests coûteux (échec immédiat).
97. Journaliser de façon structurée (JSON) dans le CLI pour une observabilité scriptable.
98. Ajouter des niveaux de log gérés (`--quiet`, `--verbose`) au CLI.
99. Exposer la version du CLI et des données dans la sortie via `--version`.
100. Publier un rapport de santé de build (durées, tailles, couverture) versionné en HTML.
