1. Exporter le trajet en GeoJSON conforme RFC 7946 avec une FeatureCollection regroupant sauts et tronçons.
2. Ajouter aux propriétés GeoJSON les champs du contrat d'honnêteté (délai mesuré, borne "au moins", medium supposé).
3. Générer un GeoJSON horodaté (timestamp ISO 8601 par saut) pour un rejeu chronologique dans un SIG.
4. Produire un GeoJSON distinct des câbles compatibles OSM avec leur attribution ODbL complète.
5. Exporter la "light cone" (disque des positions encore possibles) en polygone GeoJSON téléchargeable.
6. Inclure les stations d'atterrissage OSM en tant que points GeoJSON nommés.
7. Exporter le chemin AS sous forme d'un LineString multi-segments GeoJSON analysable dans QGIS.
8. Annoter l'export GeoJSON d'un CRS WGS84 explicite et avertir si un SIG le reprojette.
9. Valider le GeoJSON exporté en le relisant (schéma + RFC 7946) avant le téléchargement.
10. Regrouper trajet, câbles, cônes et terres Natural Earth dans un unique GeoJSON "tout-en-un".
11. Proposer un export GeoJSON minimal (sauts uniquement, sans géométrie de câbles) pour clients légers.
12. Donner un `id` stable à chaque saut dans le GeoJSON pour relier export et vue web.
13. Embarquer les bordures des pays traversés (Natural Earth, PD) dans le GeoJSON.
14. Marquer chaque borne d'une clé `source` ("mesuré"/"déduit"/"supposé") dans les propriétés GeoJSON.
15. Produire un GeoJSON "segment dominant" fléché (flèche au milieu de chaque LineString).
16. Exporter la carte entière en SVG vectoriel (tracés, câbles et légende embarqués).
17. Générer un SVG "trajet seul" sans fond de carte pour l'incruster dans un rapport.
18. Exporter un SVG par calque (`<g id=...>`) : trajet, câbles compatibles, cônes de lumière.
19. Intégrer le contrat d'honnêteté en texte éditable dans le SVG (pas en courbes vectorisées).
20. Produire un SVG responsive (`viewBox` + unités relatives) pour une mise à l'échelle sans perte.
21. Ajouter une variante SVG "niveaux de gris" accessible pour l'impression papier.
22. Exporter un SVG animé (SMIL) du tracé du voyage pour insertion dans une page statique.
23. Générer un SVG minimisé (sans namespaces inutiles) lisible et éditable à la main.
24. Marquer les nœuds du SVG de classes CSS pour permettre au destinataire de le restyler.
25. Fournir une légende SVG séparée pour composer librement une mise en page.
26. Exporter le parcours en CSV avec une colonne par champ (saut, IP, RTT, distance, AS, pays).
27. Proposer un CSV "machine" en virgule flottante et un CSV "humain" aux valeurs arrondies.
28. Exporter un CSV des bornes de distance (basse et haute) par segment.
29. Générer un CSV des câbles compatibles (nom, RFS, propriétaire, longueur) pour croisement externe.
30. Normaliser l'en-tête CSV (noms de colonnes stables, sémantique versionnée).
31. Proposer l'export TSV de la table de route pour un collage direct dans un tableur.
32. Exporter un CSV "attribution" listant chaque source et sa licence (ODbL, CC0, PD).
33. Générer un CSV des rejets (câble éliminé + raison en millisecondes) pour audit.
34. Produire un CSV des résidus (part non-propagée du délai par saut).
35. Exporter le journal du voyage en Markdown avec tableau des sauts et note de méthode.
36. Ajouter au Markdown un pied de page citant les licences des données utilisées.
37. Générer un Markdown avec des blocs de code GeoJSON intégrés pour un README.
38. Produire un Markdown "carte mentale" (arborescence texte) des AS traversés.
39. Exporter un Markdown "diff" comparant deux trajets côte à côte.
40. Proposer un export Markdown au format CommonMark strict pour portabilité vers Pandoc.
41. Inclure le contrat d'honnêteté en citation encadrée dans le Markdown.
42. Générer un Markdown avec frontmatter Jekyll/Hugo pour publication directe en article.
43. Exporter une affiche PNG haute résolution (300 dpi) avec titre, légende et crédits.
44. Proposer un PNG "carte seule" sans légende pour un compositing libre.
45. Générer un PNG carré prêt pour réseaux sociaux avec le trajet centré.
46. Exporter une vignette PNG 512×512 du trajet pour avatar ou icône.
47. Produire un PNG "bandeau" 1200×630 pour en-tête d'article (Open Graph local).
48. Ajouter au PNG une bande de crédits ODbL/CC0 non rognable.
49. Exporter un PNG en palette réduite (8 couleurs) pour une impression économique.
50. Générer un PNG tramé haute-contraste pour projection en classe.
51. Générer un lien de partage encodant tout le trajet (données inline, zéro requête serveur).
52. Compresser le lien de partage via `CompressionStream` pour qu'il tienne dans un message.
53. Produire un QR code du lien de partage généré localement, sans appeler de service tiers.
54. Générer un QR code à correction d'erreur élevée pour les trajets longs.
55. Ajouter au QR un coin "logo" pour reconnaître l'origine du partage.
56. Proposer un lien court par fragment (`#`) uniquement, sans raccourcisseur externe.
57. Encoder une sélection de saut dans le lien de partage (`#hop=N`).
58. Encoder les préférences d'affichage (projection, langue, thème) dans le lien de partage.
59. Produire un lien "lecture seule" (sans boutons d'édition) via un paramètre dédié.
60. Générer un QR distinct pour chaque vue (carte, tableau, rapport).
61. Offrir un bouton "copier le lien" qui purge le presse-papier après un délai.
62. Générer une URL de partage minimale (références seulement, rejeu local) sans données de câbles.
63. Fournir un fichier de style QML pour recolorer les câbles compatibles dans QGIS.
64. Proposer un fichier de style SLD (OGC) standard applicable dans n'importe quel SIG.
65. Rédiger un guide d'import QGIS pas-à-pas (couche, reprojection, symbologie).
66. Générer un GeoPackage (.gpkg) à la place du GeoJSON pour QGIS (tables + géométries).
67. Proposer l'export KML/KMZ pour Google Earth, avec l'accord de l'utilisateur.
68. Fournir un script d3 (module ES) de référence qui lit et dessine l'export GeoJSON.
69. Publier un composant d3 réutilisable "packet-voyage-map" consommant le GeoJSON.
70. Rédiger un exemple Leaflet/MapLibre minimal chargeant l'export GeoJSON hors ligne.
71. Proposer un export TopoJSON pour réduire la taille des géométries partagées.
72. Générer un style GeoStyler/Mapbox (JSON) reproduisant les couleurs du site.
73. Exporter les terres Natural Earth en GeoJSON "basemap" léger compressé pour SIG.
74. Embarquer le style dans le GeoJSON via la propriété `style` reconnue par QGIS.
75. Fournir une métadonnée ISO 19115 minimale avec l'export pour archivage SIG.
76. Exposer la conversion "trace brute → voyage" comme fonction TypeScript pure réutilisable.
77. Publier le schéma Zod/JSON Schema du voyage pour que des tiers valident leurs exports.
78. Proposer une sortie JSON-LD (schema.org) du voyage pour le référencement structuré.
79. Fournir une sortie NDJSON (un saut par ligne) pour ingestion en streaming.
80. Générer un manifeste `datapackage.json` (Frictionless) décrivant les fichiers exportés.
81. Publier une provenance PROV-O (W3C) reliant mesure, câble et verdict.
82. Exposer un format d'échange en ligne de commande (JSON sur stdin/stdout) sans sudo.
83. Documenter la stabilité des formats avec numéros de version et CHANGELOG de schéma.
84. Produire un export Parquet/Arrow (bibliothèque locale) pour l'analyse tabulaire.
85. Offrir une sortie WKT des géométries pour collage direct dans PostGIS.
86. Mapper les champs du voyage vers les vocabulaires existants (IPFIX/flow) lorsque pertinent.
87. Accepter en entrée la sortie brute de `traceroute`/`tracert` depuis stdin, sans fichier.
88. Importer un fichier `mtr --raw` en une seule commande.
89. Importer une sortie `traceroute -T` (TCP) en explicitant le protocole dans le contrat.
90. Permettre le collage direct du texte `tracert` Windows dans la page, sans envoi réseau.
91. Émettre un équivalent au format `mtr` exploitable par d'autres outils d'analyse.
92. Exporter en `dot` (Graphviz) le graphe du trajet pour visualisation dans des outils réseau.
93. Produire une sortie AS-path lisible pour croisement avec des bases ASN locales.
94. Rédiger une intégration documentée avec `paris-traceroute` en bornant les chemins par la lumière.
95. Distribuer le CLI en binaire statique unique installable sans sudo ni runtime.
96. Proposer l'import d'une sortie `paris-traceroute` multi-chemin en respectant le contrat d'honnêteté.
97. Offrir un champ "coller ma trace" détectant automatiquement le format (Windows/Unix/mtr).
98. Fournir un exemple d'interfaçage Python `networkx` depuis l'export GeoJSON/JSON.
99. Packager un "journey bundle" zip regroupant trace brute, GeoJSON et Markdown.
100. Rendre le CLI composable via des pipes Unix (entrée/sortie texte) pour scripts d'intégration.