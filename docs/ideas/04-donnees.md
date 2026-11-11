1. Ajouter un jeu de données des stations d'atterrissage issues d'OpenStreetMap et le vendre comme cinquième source.
2. Constituer un jeu des câbles sous-marins en construction ou projetés, séparé des câbles en service.
3. Ajouter un jeu Natural Earth des frontières administratives de niveau 0 pour attribuer un pays à chaque saut.
4. Ajouter un jeu Natural Earth des lieux peuplés pour apparier les indices de noms à des coordonnées.
5. Ajouter un jeu Natural Earth des lacs et grands cours d'eau pour distinguer les traversées d'eaux intérieures.
6. Ajouter un jeu optionnel des littoraux Natural Earth à 50 mètres pour un rendu précis des côtes.
7. Publier un jeu dérivé des reliefs bathymétriques simplifiés pour colorer les segments sous-marins selon la profondeur.
8. Ajouter un jeu de données des zones économiques exclusives maritimes pour rattacher un câble à une juridiction.
9. Constituer un jeu de correspondance entre codes d'aéroport IATA/ICAO et villes pour alimenter les indices de noms.
10. Ajouter un jeu des fuseaux horaires Natural Earth pour calculer l'heure locale de chaque saut.
11. Constituer un jeu des câbles retirés ou abandonnés d'OpenStreetMap pour l'horloge « en 1987 ».
12. Ajouter un jeu des points de peering IXP déclarés publiquement, sans redistribuer les données PeeringDB.
13. Publier un jeu des frontières maritimes pour mesurer la longueur de chaque traversée océanique.
14. Constituer un jeu des capitales et métropoles de peering pour nommer les nœuds de transit sur la carte.
15. Générer automatiquement une fiche de provenance (sha256, features, retrieved_at) pour tout nouveau jeu embarqué.
16. Ajouter à la garde CI un contrôle que chaque jeu embarqué possède sa fiche de provenance avec empreinte.
17. Écrire un fichier LICENCE-DATA.md par jeu décrivant la licence exacte et l'attribution requise.
18. Refuser en garde un jeu dont la licence est absente ou inconnue plutôt que de le vendre par défaut.
19. Enregistrer dans la fiche de provenance la requête Overpass exacte qui a produit le jeu de câbles.
20. Verrouiller la version et le commit de la source externe dans la fiche pour garantir la reproductibilité.
21. Distinguer sans ambiguïté les jeux CC0, ODbL et domaine public dans le sélecteur de sources de l'interface.
22. Produire un rapport d'attribution cumulatif auto-généré qui concatène les crédits de tous les jeux actifs.
23. Exporter les crédits au format texte brut pour tout export d'image ou de JSON.
24. Historiser les fiches de provenance afin de retracer qui a fourni quelle version et quand.
25. Vérifier que l'attribution affichée correspond exactement à la licence déclarée de chaque jeu.
26. Signaler en garde tout jeu ODbL dont l'attribution « © OpenStreetMap contributors » est absente du build.
27. Tenir une table de correspondance licence vers obligations (attribution, partage à l'identique) pour chaque source.
28. Auditer le paquet de données pour lister toute donnée vendue dont l'origine n'est pas documentée.
29. Horodater chaque jeu embarqué et afficher sa date de récupération dans l'interface.
30. Tagger chaque câble OpenStreetMap avec son statut et sa date pour savoir quand il était en service.
31. Exclure d'un tracé daté les câbles dont la date de mise en service est postérieure à la date du tracé.
32. Afficher l'âge de chaque jeu sur la page des sources, par exemple « OpenStreetMap, extrait il y a 42 jours ».
33. Déclencher un avertissement visuel quand un jeu embarqué dépasse un seuil d'ancienneté configurable.
34. Calculer un score de fraîcheur par jeu à partir de sa date de récupération et l'afficher en badge.
35. Conserver la version précédente de chaque jeu pour générer un diff entre deux extractions.
36. Publier la date du dernier rafraîchissement des données dans le pied de page du site.
37. Bloquer l'enrichissement en ligne quand le cache local dépasse un seuil d'âge, sans consentement explicite.
38. Afficher une frise des dates de mise en service des câbles compatibles avec un trajet donné.
39. Comparer deux versions d'un même jeu pour signaler les câbles ajoutés, retirés ou déplacés.
40. Marquarder comme « obsolète » un jeu dont la source ne répond plus, sans bloquer le build existant.
41. Fournir une commande de réimport manuel des caches DB-IP et IPinfo avec la date du jour.
42. Enregistrer la date de chaque enrichissement Wikidata ou OpenStreetMap pour borner la validité des attributs.
43. Estimer la fraîcheur minimale acceptable par type de jeu, frontières stables contre câbles mouvants, et la documenter.
44. Enrichir les câbles OpenStreetMap avec les attributs Wikidata, longueur, année RFS et propriétaires, au build.
45. Croiser les câbles OSM et les stations d'atterrissage pour nommer les « Unnamed landing » des extraits.
46. Enrichir les indices de noms avec les libellés multilingues de Wikidata pour reconnaître les routeurs en plusieurs langues.
47. Attribuer un pays à chaque station d'atterrissage en superposant le jeu admin-0 Natural Earth.
48. Compléter les coordonnées manquantes d'un câble à partir de ses stations d'atterrissage connues.
49. Déduire la longueur de fibre estimée d'un câble en ajoutant un coefficient de détour à la distance géodésique.
50. Reconstituer les relations câble vers stations depuis les tags OSM de début et de fin de ligne.
51. Enrichir chaque station avec son opérateur et ses câbles entrants pour recomposer la topologie locale.
52. Croiser les indices de noms avec les lieux peuplés Natural Earth pour lever les ambiguïtés de villes homonymes.
53. Enrichir les câbles avec le nombre de points d'atterrissage déduit des relations OpenStreetMap.
54. Associer les codes IATA des indices aux coordonnées géodésiques quand le nom du routeur y fait référence.
55. Enrichir les câbles avec le pays traversé dominant pour alimenter l'horloge « 1987 ».
56. Ignorer proprement un élément Wikidata sans attribut exploitable au lieu d'échouer tout l'enrichissement.
57. Produire un journal des enrichissements appliqués, source, attribut et valeur, pour l'audit.
58. Distinguer clairement les attributs sourcés des attributs déduits pour respecter le contrat d'honnêteté.
59. Étendre la table des indices de noms à plus de 500 villes et codes d'aéroport.
60. Ajouter à la table les abréviations d'opérateurs, les typonymes, et la ville qu'elles désignent.
61. Normaliser la casse et la ponctuation des indices avant comparaison avec les noms de routeurs.
62. Détecter et dédoublonner les indices qui pointent vers la même ville sous des codes différents.
63. Associer une priorité à chaque indice pour trancher entre deux villes homonymes portant le même code.
64. Élargir la recherche d'indices aux sous-chaînes de noms de routeurs, comme le code dans un mot composé.
65. Enregistrer pour chaque indice ses sources, codes IATA, codes ferroviaires et abréviations locales, pour les réconcilier.
66. Ajouter les codes des gares et aéroports régionaux peu connus des opérateurs de télécom.
67. Déduire automatiquement de nouveaux indices depuis les noms de routeurs d'un tracé, puis les proposer à la curation.
68. Classer les indices par confiance, IATA certain contre abréviation locale supposée, pour éviter les faux positifs.
69. Séparer les indices de ville des indices de pays pour lever les collisions entre code ISO et code IATA.
70. Générer un diff entre deux versions de la table d'indices pour suivre les ajouts et retraits.
71. Verrouiller chaque indice sur une licence CC0 et documenter par qui il a été ajouté.
72. Détecter un indice obsolète dont le code a été réaffecté à une autre ville et le corriger.
73. Permettre la mise à jour des indices via un simple fichier contribué, validé par une garde de format.
74. Constituer un jeu de stations d'atterrissage OpenStreetMap avec leurs coordonnées et leur pays.
75. Nommer automatiquement les stations d'un câble en croisant la géométrie du câble et celles des stations.
76. Distinguer une station d'atterrissage d'un simple point de passage côtier par le tag OpenStreetMap correspondant.
77. Rassembler les stations proches géographiquement en une seule « baie d'atterrissage » nommée.
78. Associer chaque station aux câbles qui s'y raccordent et au nombre de câbles entrants.
79. Détecter un câble sans station d'atterrissage connue et le signaler comme incomplet.
80. Vérifier qu'au moins deux stations distinctes encadrent un câble sous-marin, sinon le marquer suspect.
81. Afficher les stations d'un câble sur la carte comme des nœuds cliquables avec leur opérateur.
82. Enrichir les stations avec leur ville et leur pays via les admin-0 et lieux peuplés Natural Earth.
83. Reconstruire la chaîne de stations d'un trajet probable à partir des câbles compatibles.
84. Classer les stations par fiabilité de l'emplacement, exact, arrondi ou déduit, pour borner les assertions.
85. Détecter une station positionnée en pleine mer, sans terre à proximité, comme erreur de données.
86. Importer les stations en projet d'OpenStreetMap pour montrer les futurs points d'atterrissage.
87. Rattacher une station à l'opérateur du câble pour révéler les hubs d'un même opérateur.
88. Produire une fiche de provenance dédiée aux stations avec la requête Overpass et le sha256.
89. Surveiller chaque jeu embarqué par une garde de cohérence qui alerte en cas de géométrie vide.
90. Alerter quand un câble n'a aucune station d'atterrissage rattachée après croisement.
91. Détecter un câble dont la géométrie croise la terre ailleurs qu'à ses extrémités déclarées.
92. Signaler un câble dont la longueur déclarée diverge fortement de la longueur géodésique calculée.
93. Surveiller les câbles dont le statut OpenStreetMap change entre deux extractions pour tracer leur cycle de vie.
94. Vérifier qu'aucun jeu embarqué ne contient de données hors licence, comme TeleGeography, par signature.
95. Construire un tableau de bord des gardes listant chaque anomalie de données et sa gravité.
96. Alerter quand une source externe cesse de répondre ou change le format de son export.
97. Détecter les doublons de câbles issus de mises à jour OSM et les fusionner avant publication.
98. Surveiller l'écart entre la date du jeu embarqué et la date du jour pour signaler un retard de rafraîchissement.
99. Maintenir une liste des câbles suspects, trop courts ou sans date RFS, à confirmer manuellement.
100. Publier une garde de non-régression qui compare le nombre d'entités de chaque jeu à la version précédente.
