1. Afficher pour chaque distance parcourue une borne basse « au moins » et une borne haute « au plus ».
2. Calculer et afficher un rayon d'incertitude (en km) autour de chaque position déduite.
3. Afficher pour chaque saut la plage de délais [min, max, médiane] au lieu d'un seul RTT.
4. Afficher le taux de perte (réponses reçues sur attendues) à côté de chaque délai mesuré.
5. Afficher l'écart-type des RTT mesurés pour signaler un délai instable.
6. Dessiner sur la carte un cercle d'incertitude dont le rayon vaut l'incertitude de position en km.
7. Rendre le niveau de confiance par un motif de trait ET une étiquette texte, jamais par la couleur seule.
8. Afficher le nombre de sources concordantes sous chaque ville localisée (« 2 sources agree »).
9. Lister les sources d'une position avec leur poids de départ dans une infobulle.
10. Afficher un indicateur du ratio mesuré/déduit/supposé pour chaque segment.
11. Cumuler les bornes basses et hautes pour donner l'incertitude de la distance totale.
12. Afficher la valeur de tolérance (slackKm) utilisée dans la règle de lumière.
13. Afficher le rayon du disque de lumière (positions permises) en km à chaque étape.
14. Tracer un histogramme des RTT par hop pour rendre visible la dispersion.
15. Afficher chaque délai simultanément en ms et en « distance lumière équivalente » en km.
16. Afficher la compatibilité câble en bandes (fort/moyen/faible), jamais en probabilité.
17. Marquer visuellement les segments dont la nature (terre/mer) reste indéterminée.
18. Afficher explicitement le nombre de sauts muets et non localisés (gaps) dans le résumé.
19. Afficher une étiquette « non localisé » à l'endroit exact d'un hop sans position.
20. Afficher la précision déclarée (ville/pays) de chaque source de géolocalisation.
21. Étendre le garde de vocabulaire pour refuser tout « {n} km » nu dans les exports aussi.
22. Ajouter la borne haute « au plus » aux libellés des distances réelles partout.
23. Rédiger un libellé conditionnel qui nomme l'hypothèse du tracé supposé à l'écran.
24. Ajouter la phrase « rien dans la mesure ne désigne le câble » sur chaque carte de traversée.
25. Ajouter un garde qui vérifie qu'aucune valeur affichée n'est privée de niveau de certitude.
26. Interdire de citer un câble nommé au singulier comme trajet emprunté dans le vocabulaire.
27. Générer les libellés « pays où un saut a été localisé » en lieu des « pays traversés ».
28. Ajouter un garde qui refuse tout repli sur un centre de pays ou un siège d'opérateur.
29. Remplacer le mot « certain » par « fort » pour la bande de compatibilité supérieure.
30. Afficher la raison de rejet (km autorisés vs km nécessaires) sur chaque rejet par la lumière.
31. Ajouter une infobulle « ce qui empêche d'en savoir plus » sur chaque valeur supposée.
32. Afficher une bannière « bornes relatives uniquement » quand aucune position source n'existe.
33. Lister les enrichissements manquants quand le tracé est calculé en mode hors-ligne.
34. Ajouter un lexique interactif (TTL, RTT, anycast, MPLS, IXP) aligné sur le vocabulaire imposé.
35. Verrouiller le wording des sorties CLI humaines par des tests de snapshot.
36. Vérifier le vocabulaire des réponses MCP avec le même garde que l'interface.
37. Compléter les libellés fr/en du contrat d'honnêteté dans les deux fichiers i18n.
38. Publier une page « méthodes » citant l'état de l'art et les limites du traceroute.
39. Bloquer par garde toute chaîne contenant une tournure type « traversé par votre paquet ».
40. Appliquer le contrôle de vocabulaire aux exports GeoJSON, PNG, SVG et Markdown.
41. Afficher un disque de lumière (positions permises) à chaque étape mesurée.
42. Dérouler l'arithmétique d'un rejet : délai → distance maximale → distance nécessaire.
43. Proposer un jeu sérieux « quelle ville est possible ? » à partir d'un délai donné.
44. Afficher côte à côte « ce que la base affirme » et « ce que la lumière autorise ».
45. Lister les supports physiques (vide, fibre, cuivre, micro-ondes, géostationnaire) compatibles avec un délai.
46. Afficher la distance franchissable par chaque support pour le délai observé.
47. Calculer le plancher de lumière (2d/c) et l'afficher face au RTT mesuré.
48. Afficher l'inflation (RTT/plancher) comme indice de détour visible.
49. Marquer un segment incompatible avec la lumière comme contre-exemple pédagogique.
50. Générer un rejet de démonstration avec l'arithmétique dépliée étape par étape.
51. Confronter une position rejetée par la lumière à la position sauvegardée pour l'exemple.
52. Comparer la distance géodésique à la distance minimale autorisée par la fibre sur un segment.
53. Afficher le budget de temps restant après chaque étape pour le reste du chemin.
54. Illustrer la règle du triangle (périmètre ≤ c×délai) sur un exemple chiffré.
55. Cartographier les rejets pour révéler où les bases se trompent le plus souvent.
56. Expliquer sur la fiche qu'un long segment MPLS sans pas de délai n'est pas une anomalie.
57. Afficher l'enveloppe des délais (monotone) au lieu des différences brutes entre hops.
58. Comparer le délai mesuré d'un segment au délai minimal qu'implique la lumière.
59. Calculer la distance maximale autorisée par le délai et l'afficher face à la distance nécessaire.
60. Proposer un mode « professeur » qui fige un hop et génère une fiche avec corrigé.
61. Afficher une fiche de provenance par valeur (source, licence, date, empreinte sha256).
62. Relier chaque distance affichée à sa formule (haversine) et aux positions qui la fondent.
63. Afficher l'origine de chaque position (identifiant de source) et son poids de départ.
64. Ajouter la date de récupération de chaque jeu de données à la page sources.
65. Afficher l'empreinte sha256 du jeu de données utilisé pour un tracé donné.
66. Générer automatiquement une fiche de provenance pour chaque dataset (garde data-licence).
67. Afficher la chaîne d'attribution en bas de chaque export généré.
68. Relier un câble compatible à son objet OSM (identifiant) et à la licence ODbL.
69. Afficher le niveau de précision (ville ou pays) de chaque source de géolocalisation.
70. Enregistrer la requête Overpass à l'origine du jeu de câbles dans la fiche de provenance.
71. Documenter la simplification de géométrie appliquée comme transformation de provenance.
72. Construire une page « sources » listant chaque dataset avec sa licence.
73. Afficher la date de traçage (traced_at) à côté de chaque valeur mesurée.
74. Afficher l'outil et le protocole de mesure comme provenance du délai.
75. Relier un ASN/IXP déduit à sa source (PeeringDB, RIPEstat) après accord utilisateur.
76. Afficher le nombre d'entités (features) du dataset dans sa fiche de provenance.
77. Ajouter un garde de péremption (90 jours) signalant les datasets trop anciens.
78. Afficher la licence d'un dataset (ODbL, domaine public) dans sa fiche.
79. Vérifier par test que chaque nombre du journal provient bien du journey.
80. Afficher la version du jeu de données nécessaire pour reproduire un tracé.
81. Tester par propriété qu'aucune position retenue ne dépasse la borne de lumière (VOY-P-06).
82. Tester par propriété qu'un candidat violant la lumière n'altère jamais le chemin retenu (VOY-P-09).
83. Tester par propriété qu'ajouter une source concordante ne baisse jamais la confiance (VOY-P-10).
84. Tester par propriété qu'un hop sans candidat reste strictement non localisé (VOY-P-11).
85. Tester par propriété que toute distance parcourue porte le préfixe « au moins » (VOY-P-20).
86. Tester par propriété que la rédaction (redact) est idempotente.
87. Tester par propriété qu'aucun libellé ne contient une tournure du vocabulaire interdit.
88. Tester par propriété que l'enveloppe des délais est monotone (VOY-P-05).
89. Tester par propriété que la distance totale égale la somme des segments (VOY-P-15).
90. Tester par propriété qu'un export GeoJSON relu redonne les mêmes hops et segments.
91. Tester par propriété que la fusion de candidats proches n'augmente jamais leur nombre au-delà d'un seuil.
92. Tester par propriété qu'un score de compatibilité reste dans [0, 1] et n'est pas une probabilité.
93. Tester par propriété que le filtrage lumière ne retient qu'un candidat dans la borne allouée.
94. Tester par propriété qu'un hop muet ne reçoit jamais d'enveloppe héritée (valeur nulle conservée).
95. Tester par propriété que la borne haute « au plus » reste cohérente avec la lumière.
96. Tester par propriété qu'aucun libellé ne contient une distance nue dépourvue de borne.
97. Tester par propriété que le choix de chemin (DP) est déterministe.
98. Tester par propriété que l'ordre des niveaux solid > probable > uncertain > unlocated est respecté.
99. Tester par propriété que les segments couvrent tous les hops situés sans trou ni doublon.
100. Tester par propriété que chaque rejet conserve allowed_km inférieur à needed_km.