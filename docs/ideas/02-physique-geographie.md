1. Afficher un tableau comparatif de la vitesse de la lumière dans chaque milieu rencontré (vide, fibre, cuivre, onde radio) avec son indice de réfraction.
2. Calculer le plancher de propagation (propagation floor) de chaque segment à partir du milieu supposé et de la distance bornée.
3. Proposer pour chaque milieu un facteur de ralentissement assorti de son niveau de certitude (mesuré/déduit/supposé).
4. Estimer la part du trajet susceptible de passer par le vide spatial (liaison satellite ou géostationnaire) d'après le délai résiduel.
5. Comparer la latence typique d'une liaison géostationnaire (~240 ms aller-retour) au délai total mesuré pour écarter ou évoquer ce milieu.
6. Distinguer les sauts dont le délai n'est explicable que par une liaison radio ou satellite plutôt que par la fibre.
7. Calculer la distance parcourue par la lumière en 1 ms, 10 ms et 100 ms dans chaque milieu comme échelle de référence.
8. Afficher la « marge lumière » : combien de millisecondes restent après soustraction du plancher de propagation au délai mesuré.
9. Expliquer le facteur d'environ 2/3 entre la vitesse de la lumière dans la fibre et celle dans le vide.
10. Ajouter un ralentissement supposé aux tronçons sous-marins pour représenter les répéteurs et amplificateurs optiques.
11. Modéliser le délai minimal théorique entre deux villes comme distance à vol d'oiseau divisée par la vitesse en fibre.
12. Vérifier qu'aucune position retenue ne viole la borne de lumière (aucun point hors du cône de lumière inversé).
13. Cartographier les câbles sous-marins compatibles avec le trajet en les présentant toujours comme « compatibles », jamais empruntés.
14. Calculer la longueur en mer d'un câble compatible et la comparer à la distance géodésique entre ses atterrissements.
15. Afficher les câbles sous-marins dont la géométrie passe à moins d'un rayon donné du trajet (corridor de compatibilité).
16. Fournir un score de compatibilité câble fondé sur la proximité géodésique des atterrissements et le délai mesuré.
17. Déduire les câbles possibles entre deux atterrissements donnés à partir du délai de propagation observé.
18. Lister les systèmes de câbles sous-marins qui traversent un détroit ou une mer rencontrée sur le trajet.
19. Distinguer pour chaque segment sa nature sous-marine ou terrestre à l'aide des géométries de câbles OSM.
20. Nommer les câbles compatibles dont le nom transparaît déjà dans les libellés de routeurs (hints) sans les affirmer.
21. Calculer la dilatation de pose des câbles sous-marins (slack) entre longueur posée mesurée et distance directe des atterrissements.
22. Appliquer un facteur de slack supposé (entre 1,05 et 1,15) aux tronçons sous-marins pour borner leur longueur réelle.
23. Afficher l'année de mise en service et la capacité déclarée des câbles compatibles croisés par le trajet.
24. Signaler les câbles compatibles en fin de vie ou hors service recensés dans les données OSM.
25. Déterminer la masse terrestre (continent ou île) associée à chaque saut localisé via point-in-polygon sur Natural Earth.
26. Attribuer à chaque segment une nature mer/terre en croisant sa géométrie avec les masses terrestres Natural Earth.
27. Détecter les traversées maritimes du trajet (séries de segments classés « mer ») et leurs bornes côtières.
28. Calculer la fraction du trajet parcourue au-dessus de l'eau contre celle au-dessus de la terre.
29. Identifier le continent, l'île ou l'océan que la lumière est supposée traverser à chaque instant du trajet.
30. Détecter les segments plausibles qui couperaient une masse terrestre sans atterrissement connu aux extrémités.
31. Associer un pays ou territoire à chaque point d'atterrissage via point-in-polygon sur les frontières Natural Earth.
32. Compter le nombre de frontières maritimes franchies le long du trajet à partir des terres Natural Earth.
33. Associer chaque segment maritime à son bassin océanique ou sa mer d'appartenance.
34. Signaler les grandes îles-relais (Islande, Madagascar, Hawaï) comme étapes géographiques possibles du trajet.
35. Proposer plusieurs projections pour la carte (Mercator, Equal Earth, orthographique) et laisser l'utilisateur choisir.
36. Recourber les arcs de grand cercle en fonction de la projection sélectionnée plutôt que de tracer des lignes droites.
37. Corriger dans les légendes la déformation des distances induite par Mercator aux hautes latitudes.
38. Tracer les arcs géodésiques réels (plus courts chemins sur la sphère) au lieu de segments rectilignes en projection.
39. Expliquer pourquoi un trajet maritime paraît courbe sur la carte alors qu'il suit un grand cercle rectiligne sur le globe.
40. Offrir une vue « globe » en projection orthographique centrée dynamiquement sur le trajet courant.
41. Comparer côte à côte la longueur apparente d'un même segment dans deux projections différentes.
42. Afficher une graticule de méridiens et parallèles pour rendre lisible la déformation de la projection choisie.
43. Rééchantillonner les arcs en petits segments pour qu'ils épousent correctement la courbure de la projection.
44. Sélectionner automatiquement une projection adaptée à l'étendue du trajet (locale, régionale ou mondiale).
45. Gérer le franchissement de l'antiméridien (180°) sans artefact de trait entre les longitudes −180 et +180.
46. Tracer correctement un arc qui passe par un pôle (chemin le plus court contournant le globe par le nord).
47. Détecter les trajets transocéaniques « par le nord » (Arctique) plutôt que par les latitudes équatoriales.
48. Découper les segments au franchissement de l'antiméridien pour garantir un affichage continu et correct.
49. Calculer les distances réelles en tenant compte du repliement de longitude autour de ±180°.
50. Afficher une carte à défilement horizontal continu pour éviter de couper un arc au méridien de Greenwich.
51. Proposer une vue polaire (azimutale) pour les trajets reliant des points proches des pôles.
52. Vérifier la cohérence des coordonnées aux pôles (latitude ±90°, longitude devenue indifférente).
53. Représenter le passage par un pôle comme étape possible d'un grand cercle reliant deux points opposés.
54. Empêcher les artefacts visuels lorsqu'un arc approche les latitudes extrêmes (±90°).
55. Associer chaque saut à son fuseau horaire et à son décalage UTC à partir de sa longitude localisée.
56. Afficher l'heure locale de départ et d'arrivée estimée du paquet à chaque saut localisé.
57. Calculer le nombre de fuseaux horaires traversés par le trajet entre les sauts localisés.
58. Repérer les sauts où l'heure locale « recule » (progression vers l'ouest) le long du trajet.
59. Convertir uniformément l'horodatage du trace en heure UTC avant tout calcul de délai pour éviter les dérives.
60. Visualiser sur un graphe longitude contre fuseau la progression horaire du paquet le long du trajet.
61. Expliquer la ligne de changement de date au franchissement de l'antiméridien dans le récit du voyage.
62. Marquer les atterrissements situés dans des fuseaux non standard (décalages de 30 ou 45 minutes).
63. Distinguer visuellement le délai de propagation du décalage horaire, deux notions sans rapport direct.
64. Afficher l'heure locale estimée « maintenant » en chaque point du trajet à partir des fuseaux traversés.
65. Associer chaque point d'atterrissage de câble compatible à sa ville, son pays et sa station côtière.
66. Déduire les villes d'atterrissage compatibles avec les sauts localisés proches des côtes.
67. Afficher la distance entre deux atterrissements successifs d'un même câble compatible croisé par le trajet.
68. Lister les stations d'atterrissage côtières proches des sauts classés « mer ».
69. Croiser les sauts localisés avec la table des atterrissements pour suggérer un passage par une station donnée.
70. Dessiner le « trombone d'atterrissage » : le détour imposé par la station côtière avant le retour en mer.
71. Calculer le surcoût de latence induit par un détour via un atterrissement hors du grand cercle.
72. Marquer les points de présence (PoP) terrestres rattachés à chaque station d'atterrissage.
73. Identifier les atterrissements partagés par plusieurs câbles, hubs de convergence du trafic sous-marin.
74. Vérifier la cohérence entre l'atterrissage supposé et la masse terrestre touchée par le segment.
75. Détecter le franchissement de détroits majeurs (Gibraltar, Malacca, Ormuz, Bab-el-Mandeb) sur le trajet.
76. Associer un détroit franchi à un potentiel goulot d'étranglement de latence, sans l'affirmer.
77. Lister les ouvrages fixes (ponts, tunnels sous-marins, liaisons) qui franchissent un détroit donné.
78. Affecter un segment terrestre traversant un détroit à un ouvrage fixe connu via la table fixed-links.
79. Comparer la distance d'un raccourci par ouvrage fixe contre le contournement maritime équivalent.
80. Expliquer pourquoi un détroit concentre les câbles comme point de passage obligé de la topologie mondiale.
81. Cartographier les détroits et canaux (Suez, Panama, Gibraltar) empruntés par les câbles compatibles.
82. Signaler les ouvrages fixes multi-services (câble, énergie, route) croisés par le trajet.
83. Détecter un franchissement terrestre de détroit là où aucun pont ni tunnel n'est répertorié.
84. Proposer une « carte des passages » superposant détroits, canaux et ouvrages fixes aux câbles compatibles.
85. Calculer l'inflation de latence totale : délai mesuré rapporté au plancher optique du grand cercle.
86. Déduire le caractère « trombone » d'un trajet en comparant la distance parcourue à la distance directe.
87. Estimer un pourcentage de détour du trajet par rapport au grand cercle reliant départ et arrivée.
88. Vérifier que la distance parcourue supposée reste toujours au moins égale au plus court chemin en fibre.
89. Borner chaque distance parcourue par « au moins » conformément au contrat d'honnêteté du projet.
90. Afficher pour chaque segment une borne inférieure (à vol d'oiseau) et une borne supérieure (câblage maximal plausible).
91. Tracer le « corridor de plausibilité » entre ces deux bornes sur la carte pour encadrer la position réelle.
92. Croiser les géométries de câbles OSM avec les terres Natural Earth pour ne jamais poser un câble sur la terre ferme.
93. Filtrer les câbles compatibles dont la géométrie traverse des coordonnées incohérentes avant tout affichage.
94. Calculer la vitesse de propagation effective observée (distance divisée par délai) et la comparer aux vitesses par milieu.
95. Rejeter un saut localisé dont la position impliquerait une vitesse supraluminique, en violation de la borne de lumière.
96. Afficher pour chaque saut le milieu le plus plausible (vide, fibre, cuivre, radio) expliquant son délai mesuré.
97. Fournir un diagnostic pédagogique expliquant pourquoi tel délai est trop court pour emprunter tel câble compatible.
98. Exprimer la distance parcourue en tours de Terre et en équivalents Paris–Marseille pour ancrer l'échelle.
99. Tracer le cône de lumière (ensemble des positions que chaque délai autorise encore) comme zone hachurée.
100. Rendre chaque valeur affichée (distance, délai, vitesse) accompagnée de son niveau de certitude (mesuré/déduit/supposé).
