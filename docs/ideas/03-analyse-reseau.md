1. Afficher sous le tracé la séquence des systèmes autonomes (AS) déduite des préfixes de chaque saut, en précisant qu'il ne s'agit pas du chemin BGP réel, inobservable par traceroute.
2. Déduire le nom de l'opérateur (AS name) de chaque système autonome croisé et l'ajouter à la fiche du saut.
3. Nommer sur la carte et dans le tableau les frontières inter-opérateurs, c'est-à-dire les transitions d'un AS à un autre.
4. Marquer une transition d'AS comme point de peering probable et la distinguer visuellement d'un saut interne au même opérateur.
5. Détecter un AS rencontré deux fois de façon non consécutive comme indice de trombone de routage entre opérateurs.
6. Reporter pour chaque AS le nombre de sauts qu'il couvre et la part du trajet qu'il représente.
7. Distinguer un opérateur de transit d'un réseau de bordure d'après la position de ses sauts dans le trajet.
8. Estimer la relation entre deux AS voisins (client, fournisseur, pair) à partir d'une table locale de politiques de routage contribuée.
9. Souligner un changement de pays sans changement d'AS pour révéler un opérateur présent sur plusieurs territoires.
10. Comparer la longueur du chemin d'AS (nombre d'AS traversés) à la distance géodésique pour repérer un routage sous-optimal.
11. Réutiliser l'AS du dernier saut pour confirmer ou infirmer la localisation déduite de la cible.
12. Reporter le nombre d'AS distincts et de transitions dans le résumé, à côté du nombre de pays.
13. Détecter un saut situé dans un préfixe de point d'échange connu et l'afficher comme passage probable par un IXP.
14. Nommer le point d'échange (DE-CIX, LINX, MSK-IX…) à partir de la table locale de préfixes PeeringDB.
15. Afficher la ville d'un point d'échange sur la carte comme un nœud distinct des sauts de transit.
16. Marquer les deux opérateurs qui se rejoignent à un même IXP pour révéler la topologie de l'échange.
17. Compter le nombre de points d'échange croisés sur un trajet et le reporter dans le résumé.
18. Distinguer un saut IXP d'un saut d'opérateur par le motif du nom du routeur (typonymes « ix », « xes », « peering »).
19. Repérer des préfixes d'IXP absents de la table locale en croisant les noms de routeurs suggestifs.
20. Reporter la métropole de peering (Francfort, Amsterdam, Londres…) associée à chaque IXP croisé.
21. Associer un IXP à un saut muet voisin quand une transition d'AS l'encadre sans adresse résolue.
22. Rendre visibles les micro-segments autour d'un IXP, où deux sauts proches affichent une latence quasi nulle.
23. Reporter si un IXP est traversé juste avant ou juste après un changement de pays, comme trace d'un échange frontalier.
24. Calculer l'inflation de chaque segment (délai observé contre plancher de lumière) et l'afficher par saut.
25. Repérer un saut dont le délai est étrangement rond (multiple de 10 ms) comme indice de limitation de débit du répondant.
26. Déceler un saut plus rapide qu'un saut antérieur (rupture de monotonie) et le signaler comme artefact de mesure.
27. Détecter une enveloppe de délai qui stagne sur plusieurs sauts pour révéler un segment sans incrément mesurable.
28. Afficher la distribution des essais (minimum, maximum, écart) par saut pour montrer la gigue locale.
29. Calculer un indice de gigue du trajet (écart entre enveloppe et délai médian) et le reporter dans le résumé.
30. Signaler un saut dont l'écart entre essais est inhabituellement grand comme trace de charge ou de multi-chemin.
31. Estimer la part de file d'attente en soustrayant le plancher de propagation du délai mesuré, par saut.
32. Détecter un doublement brutal du délai entre deux sauts proches comme trace d'un chemin de retour asymétrique probable.
33. Marquer les sauts muets (temps limite dépassé) et estimer leur contribution maximale au délai total.
34. Écarter un saut dont la latence contredit la physique et l'expliquer par l'hypothèse anycast ou le multi-chemin.
35. Convertir chaque délai en « distance maximale permise par la lumière » et l'afficher à côté de la distance géodésique du segment.
36. Détecter un retour en arrière géographique (aller-retour entre deux villes) et le qualifier de trombone de routage.
37. Mesurer le kilométrage supplémentaire d'un détour par rapport au trajet direct entre ses deux extrémités.
38. Afficher le surcoût en millisecondes qu'un détour impose au trajet complet.
39. Tracer le trajet direct à vol d'oiseau en arrière-plan d'un détour observé pour le rendre visible.
40. Repérer un zigzag (alternance de villes non monotone) comme indice de politique de routage ou de peering.
41. Classer les détours par type : retour en arrière, zigzag, rebond entre deux pays.
42. Reporter la ville « épingle » d'un trombone, c'est-à-dire le sommet où le trajet fait demi-tour.
43. Estimer si un détour est plausible par le câble (allongement côtier) ou s'il relève du seul routage.
44. Quantifier le détour en unités du quotidien (laps de Terre, Paris–Marseille) pour le rendre parlant.
45. Proposer un indice de droiture du trajet (distance réelle sur distance directe) comme score de qualité du chemin.
46. Nommer un trombone transatlantique évident (Europe vers Amérique puis retour) sans prétendre au câble emprunté.
47. Comparer côte à côte deux trajets IPv4 et IPv6 vers le même hôte et afficher les différences de sauts.
48. Mesurer l'écart de latence entre les deux familles vers la même cible et le reporter dans le résumé.
49. Repérer un chemin IPv6 plus court (moins de sauts) ou plus long que son équivalent IPv4.
50. Détecter un opérateur présent en IPv4 mais absent en IPv6 sur le même trajet, ou l'inverse.
51. Afficher les adresses des deux familles de façon lisible et les distinguer visuellement sur la carte.
52. Comparer les localisations déduites des sauts IPv6, souvent sans nom de routeur, à celles d'IPv4.
53. Signaler un saut de famille différente au milieu d'un trajet comme trace de traduction ou de tunnel.
54. Aligner deux trajets IPv4 et IPv6 sur une même frise de délai pour visualiser leurs écarts.
55. Détecter une divergence de chemin (détours différents) entre les deux familles comme trace d'ingénierie de trafic.
56. Mesurer la divergence des deux chemins (distance moyenne entre positions homologues) comme indice de dualité.
57. Comparer un trajet IPv6 courant à un trajet IPv4 archivé dans la galerie pour un diff volontaire.
58. Fusionner plusieurs tracés du même hôte fournis par l'utilisateur en un trajet consensus, sans jamais mesurer en continu.
59. Séparer les variations dues à la charge des artefacts stables présents dans tous les tracés.
60. Constituer une galerie locale de tracés du même hôte à différents moments pour un diff volontaire, jamais automatique.
61. Afficher pour chaque saut les différentes positions observées entre les tracés comme un cône d'incertitude.
62. Calculer un indice de stabilité par saut (constant ou variable à travers les tracés) et le reporter.
63. Détecter un saut présent dans certains tracés seulement comme trace de multi-chemin par paquet.
64. Croiser un tracé manuel avec un résultat RIPE Atlas fourni par l'utilisateur pour corroborer une localisation.
65. Marquer un saut isolé présent dans un seul tracé comme artefact potentiel, en le conservant sans le supprimer.
66. Rendre comparables deux tracés d'outils différents (traceroute, mtr, tracert) vers le même hôte.
67. Proposer un mode « plusieurs fichiers » en entrée qui fusionne des tracés sans jamais lancer de sonde lui-même.
68. Reporter un consensus de localisation « n sources sur m tracés concordent » pour chaque saut fusionné.
69. Extraire les codes d'aéroport (IATA) des noms de routeurs pour proposer des villes candidates.
70. Extraire les noms de villes lisibles des noms de routeurs et les convertir en positions candidates.
71. Reconnaître les abréviations d'opérateurs dans les noms (« gtt », « cogent »…) pour nommer l'opérateur du saut.
72. Détecter les codes de pays ou de ville dans les noms (« nyc », « fra »…) et les traduire en zones géographiques.
73. Découper un nom de routeur en jetons sur les tirets et points, puis chercher chaque jeton dans la table d'indices.
74. Exclure les jetons neutres (« core », « edge », « border », « peer ») pour éviter les faux positifs de localisation.
75. Afficher le nom complet du routeur dans la fiche du saut, même quand il ne fournit aucune position.
76. Peser un indice trouvé dans le nom selon sa position (début ou fin du nom) et sa cohérence avec les voisins.
77. Cartographier les conventions de nommage d'un même opérateur le long d'un trajet pour en déduire une logique.
78. Construire une table d'indices éditable par l'utilisateur pour ses opérateurs et régions préférés.
79. Signaler un nom de routeur cohérent avec une ville mais contredit par le délai, et le montrer comme rejet honnête.
80. Identifier un routeur nommé par son rôle (bordure, transit, peering, cœur) pour annoter le saut.
81. Détecter un tracé vers un préfixe anycast connu et l'afficher comme tel plutôt que comme une position unique.
82. Énumérer les instances possibles d'une cible anycast et filtrer celles que le délai mesuré exclut.
83. Marquer le saut où l'anycast change de comportement (bascule vers une instance) dans une trace.
84. Reporter l'hypothèse anycast quand une localisation unique est contredite par une latence irrégulière.
85. Afficher l'ensemble des villes candidates pour une cible anycast plutôt qu'une position unique inventée.
86. Croiser un préfixe anycast connu (serveurs racine DNS, grands CDN) avec la table locale, sans service tiers.
87. Comparer deux tracés du même préfixe anycast à des moments différents pour révéler un basculement d'instance.
88. Expliquer dans le récit pourquoi une cible anycast n'a « pas de position unique », par honnêteté.
89. Trier deux hypothèses concurrentes, anycast contre IXP, quand un saut correspond aux deux.
90. Reporter le préfixe anycast comme cause probable d'un saut non localisé plutôt que d'inventer une ville.
91. Lire les étiquettes MPLS affichées par mtr ou traceroute et les rattacher au saut qui les précède.
92. Afficher la pile d'étiquettes MPLS (label, bit de fond de pile, TTL) dans la fiche du saut.
93. Détecter un tunnel MPLS caché par une longueur sans incrément de délai visible entre deux sauts.
94. Reporter le nombre de labels empilés comme indice de profondeur d'imbrication des LSP.
95. Utiliser le bit « bottom-of-stack » pour délimiter proprement les étiquettes d'un même saut.
96. Distinguer un saut dans le plan de données MPLS d'un saut du plan de contrôle d'après les labels.
97. Afficher la transition « IP vers MPLS » puis « MPLS vers IP » aux deux frontières du tunnel.
98. Corréler un bond de latence important avec une entrée ou une sortie de tunnel MPLS.
99. Signaler un label stable sur plusieurs sauts comme indication d'un même LSP traversé de bout en bout.
100. Reporter les sauts MPLS comme non localisables par le seul nom, le label masquant le routeur réel.