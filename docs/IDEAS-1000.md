# Mille idées pour approfondir Packet Voyage

Backlog généré le 2026-11-11 par dix lots parallèles, un domaine par lot, puis
consolidé ici. Aucune de ces idées n'est une promesse : c'est un réservoir,
trié par les critères du projet — impact pour le jury, renforcement du contrat
d'honnêteté, faisabilité sans sonder Internet, testabilité, respect des budgets
(site < 350 Ko gzip, CI < 5 min par job, données < 1,5 Mo).

Les idées déjà livrées sont marquées **[done]** dans `docs/IDEAS.md` (le backlog
court) ; ce fichier-ci est le backlog long, non trié.

| Domaine | Idées |
|---|---|
| 1. Incertitude & honnêteté | 100 |
| 2. Physique & géographie | 100 |
| 3. Analyse réseau | 100 |
| 4. Données, licences & provenance | 100 |
| 5. Interface & accessibilité | 100 |
| 6. Pédagogie & narration | 100 |
| 7. Partage & interopérabilité | 100 |
| 8. Agents, MCP & automatisation | 100 |
| 9. Infra & ops | 100 |
| 10. Récit & concours | 100 |
| **Total** | **1000** |

## 1. Incertitude & honnêteté

_01-incertitude-honnetete.md_

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

## 2. Physique & géographie

_02-physique-geographie.md_

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

## 3. Analyse réseau

_03-analyse-reseau.md_

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

## 4. Données, licences & provenance

_04-donnees.md_

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

## 5. Interface & accessibilité

_05-interface-accessibilite.md_

1. Afficher un curseur de frise segmenté par bond avec la durée mesurée de chaque segment.
2. Rendre la frise pilotable au clavier avec flèches gauche/droite et touches Home/End.
3. Annoncer chaque bond aux lecteurs d'écran via une région aria-live polie.
4. Offrir un mode « texte seul » qui transpose la carte en liste hiérarchique de bonds.
5. Ajouter un lien d'évitement « Aller au tableau de route » en tête de page.
6. Fournir une alternative textuelle complète de la carte décrivant le trajet borné.
7. Appliquer un ratio de contraste AA au panneau de synthèse et à la légende.
8. Proposer un thème AAA à très fort contraste, activable sans rechargement.
9. Doubler la couleur de chaque câble par une texture de points et tirets dans le SVG.
10. Détecter les daltonismes (protanopie, deutéranopie, tritanopie) avec des palettes dédiées.
11. Garantir des cibles tactiles d'au moins 44 px sur mobile.
12. Associer le focus visible et l'ordre de tabulation au déroulé de la frise.
13. Insérer des repères ARIA (banner, main, navigation) sur les vues principales.
14. Étiqueter chaque contrôle de lecture (jouer, pause, pas à pas) avec un aria-label.
15. Permettre la navigation de la carte au clavier : flèches pour déplacer, + et - pour zoomer.
16. Supporter les gestes tactiles pinch-zoom et double-tap avec inertie sur mobile.
17. Rendre la légende interactive pour masquer ou afficher un type de câble.
18. Basculer automatiquement le thème clair/sombre selon prefers-color-scheme.
19. Persister le thème choisi dans le stockage local ou dans l'URL.
20. Proposer un sélecteur de langue détecté au premier chargement (fr, en et une troisième).
21. Composer une mise en page d'impression A4 regroupant carte, frise et synthèse.
22. Découper proprement la frise en pages à l'impression pour ne jamais couper un bond.
23. Proposer une variante d'impression noir et blanc sans perte d'information.
24. Masquer les éléments interactifs (boutons, contrôles) dans le rendu print.
25. Assurer que l'export PDF conserve les bornes de distance et les crédits ODbL.
26. Réduire l'animation au strict minimum quand prefers-reduced-motion est actif.
27. Placer le contenu immédiatement et charger les tuiles en toile de fond (painting).
28. Découper la carte en tuiles locales chargées à la demande via IntersectionObserver.
29. Limiter la densité de points rendus par niveau de zoom par simplification adaptative.
30. Grouper l'animation de la frise sous requestAnimationFrame.
31. Éviter les re-rendus de la carte pendant le défilement de la frise (mémoïsation).
32. Virtualiser le tableau de route pour un trajet de 30 bonds sans à-coup.
33. Basculer le dessin de la carte en canvas WebGL quand le nombre de nœuds explose.
34. Adapter la résolution du rendu au devicePixelRatio sans surcoût inutile.
35. Débouncer les recalculs de géométrie lors du zoom et du pincement.
36. Fournir un aperçu mini-map contextuel dans la carte de franchissement.
37. Afficher une échelle graphique calibrée sur la projection courante.
38. Ajouter un bouton « recentrer » qui ramène le trajet dans le cadre visible.
39. Placer le bouton « jouer » dans la zone du pouce en mode mobile.
40. Gérer les changements d'orientation (portrait/paysage) sans perdre l'état.
41. Sauvegarder l'état de lecture (bond courant) dans l'URL pour le partage.
42. Offrir un raccourci clavier « ? » affichant l'aide des touches disponibles.
43. Respecter la position du focus lors de la navigation clavier sans le piéger.
44. Fermer les modales et popovers avec Échap en restituant le focus.
45. Annoncer un « trajet refusé par la lumière » avec un rôle et un texte explicite.
46. Associer chaque segment de la frise à son bond correspondant sur la carte.
47. Fournir une palette sémantique (mesuré, déduit, supposé) indépendante de la couleur.
48. Marquer les données « supposé » par un motif pointillé distinct des « mesuré ».
49. Placer la légende des motifs juste à côté de la légende des couleurs.
50. Garantir que la légende reste lisible à 200 % de zoom navigateur.
51. Ajouter une commande « sauter au bond suivant refusé » sur la frise.
52. Exposer les statistiques du trajet (bonds, distance minimale, durée) hors de la carte.
53. Permettre de réduire le mouvement du tracé en avançant bond par bond.
54. Fournir une version condensée de la frise pour les petits écrans.
55. Adapter la typographie et l'interligne à une lecture mobile confortable.
56. Utiliser des tailles de police relatives avec un réglage utilisateur.
57. Tester le tableau de route avec un grid ARIA (role="table") et des en-têtes.
58. Associer un anneau de focus visible et contrasté à chaque élément interactif.
59. Ne transmettre aucune information uniquement par la couleur de fond.
60. Fournir un mode d'aperçu simulant les daltonismes pour valider les choix.
61. Afficher un bandeau « animations réduites activées » quand l'utilisateur le demande.
62. Permettre de désactiver totalement les animations via un interrupteur dédié.
63. Précharger la tuile voisine pendant le déplacement pour éviter les blancs.
64. Exposer un état « chargement des terres » accessible (aria-busy) sur la carte.
65. Annoncer la fin de la frise aux lecteurs d'écran (« fin du trajet »).
66. Fournir un équivalent texte de la frise (liste des bonds et durées).
67. Lier l'ordre de lecture du lecteur d'écran à l'ordre visuel de la frise.
68. Rendre le tableau de route triable et filtrable au clavier.
69. Localiser les chaînes de l'appareil (dates, distances) selon la locale.
70. Respecter les zones sûres (encoche) sur mobile via env(safe-area-inset).
71. Proposer un mode « une main » qui rapproche les contrôles vers le bas.
72. Ajouter un bouton « revenir au début » du trajet sur la frise défilée.
73. Fournir un réglage de vitesse de lecture (0,5x, 1x, 2x, 4x).
74. Empêcher le défilement de page accidentel pendant la manipulation tactile de la carte.
75. Marquer visuellement le bond en cours dans la carte et dans le tableau.
76. Utiliser un point de repère (bornes minimale et maximale) pour colorer les câbles.
77. Rendre l'animation du trajet réglable en pas de lecture modulable.
78. Ajouter une barre de progression accessible avec le rôle progressbar.
79. Fournir des descriptions longues (aria-describedby) pour les graphiques.
80. Vérifier l'accessibilité clavier avec un audit automatisé (axe-core).
81. Ajouter un test de non-régression visuelle de la carte et de la frise.
82. Mesurer et afficher le temps de premier rendu de la carte.
83. Charger les données de câbles progressivement sans bloquer l'affichage.
84. Déplacer les calculs de géométrie lourds dans un worker hors du thread UI.
85. Mettre en cache les tuiles et projections déjà calculées pour les re-visites.
86. Réduire la taille du bundle de l'interface via tree-shaking et chunks dédiés.
87. Garantir une cible de 60 images par seconde sur l'animation de la frise.
88. Tester la carte sur viewport étroit (360 px) et très large (3440 px).
89. Proposer une légende repliable pour libérer l'espace écran sur mobile.
90. Afficher des libellés de villes déformables sans chevauchement au zoom.
91. Grouper les libellés trop proches (collision) à faible zoom sur mobile.
92. Fournir un mode « survol » qui distingue clic et survol sur écran tactile.
93. Ajouter des info-bulles accessibles (focus et survol) sur chaque bond.
94. Afficher le temps local à chaque bond dans la frise (fuseau horaire).
95. Offrir une vue « tout le trajet » d'un coup d'œil avec bornes minimales et maximales.
96. Permettre de figer un bond pour l'examiner sans animation (mode enseignant).
97. Assurer que tous les textes passent le test de contraste de 4,5:1 (AA).
98. Structurer un titre principal (h1) et des niveaux de titres cohérents.
99. Proposer une mise en page d'impression en paysage pour les trajets longs.
100. Documenter les raccourcis clavier et les préférences utilisateur sur une page dédiée.

## 6. Pédagogie & narration

_06-pedagogie-narration.md_

1. Créer une page « Internet en 5 minutes » qui résume le voyage d'un paquet avec le vocabulaire essentiel (IP, routeur, câble, IXP, latence) sans jargon superflu.
2. Ajouter un glossaire illustré où chaque terme (TTL, RTT, AS, IXP, anycast) reçoit une définition d'élève et une comparaison du quotidien.
3. Rédiger une entrée « un paquet, qu'est-ce que c'est vraiment ? » distinguant paquet réseau, colis postal et datagramme par un schéma simple.
4. Construire un encart « ce que traceroute voit, ce qu'il ne voit pas » affiché dès le premier écran pour lever les idées reçues.
5. Écrire une FAQ d'élève où chaque réponse est donnée à trois niveaux de certitude (mesuré, déduit, supposé).
6. Produire une analogie filée simple (le paquet = une carte postale qu'on poste) déclinée tout au long du parcours.
7. Créer une page « que se passe-t-il en 91,7 ms ? » qui décompose la latence en événements tangibles d'une fraction de seconde.
8. Ajouter un interrupteur « mots simples » qui remplace le vocabulaire technique par des termes courants à la demande.
9. Rédiger une entrée « pourquoi la lumière ne va pas plus vite » pour expliquer le plancher physique sans aucun calcul.
10. Construire un schéma fixe du cycle requête-réponse (client, résolveur, routeurs, serveur) légendé pour un néophyte.
11. Développer un « mode classe » qui fige un parcours, désactive la navigation hors-sujet et affiche un fil de guidage à l'écran.
12. Laisser l'enseignant générer un code de session court qui charge le même voyage sur tous les postes, sans compte utilisateur.
13. Ajouter un minuteur de séquence pédagogique (découverte, manipulation, synthèse) visible au tableau.
14. Intégrer une vue « tableau » grand format au contraste renforcé, pensée pour la projection en salle de classe.
15. Permettre à l'enseignant de masquer des couches (câbles, noms de villes, délais) pour interroger la classe avant de les révéler.
16. Proposer un « mode défi » où la classe devine la ville du prochain saut avant sa révélation, sans aucune requête réseau.
17. Générer un rapport de séance simple (ce qui a été vu, les réponses données localement) exportable par l'enseignant.
18. Matérialiser un cache de trajets précalculés et embarqués pour une salle de classe sans connexion internet.
19. Ajouter une horloge « combien de temps a duré le voyage » pour ancrer l'échelle temporelle dans la séance.
20. Créer un scénario de séance clé en main (objectif, déroulé, synthèse) téléchargeable en version imprimable.
21. Générer une fiche d'activité imprimable avec le parcours, la carte et des cases de réponse à compléter à la main.
22. Produire automatiquement le corrigé d'une fiche, aligné sur les valeurs mesurées du voyage choisi.
23. Construire une fiche « chasse à la latence » où l'élève relève les délais par saut et calcule les planchers de lumière.
24. Créer une fiche de calcul « la lumière comme limiteur » avec des exercices de proportionnalité distance sur temps.
25. Écrire une fiche « vrai ou faux » sur les câbles sous-marins et la géographie des réseaux, avec justification attendue.
26. Générer une fiche « relie chaque mot à sa définition » déclinée du glossaire, prête à imprimer.
27. Proposer une fiche « complète la carte » où l'élève reporte les villes traversées sur un fond de carte muet.
28. Créer une fiche « quel medium explique ce délai ? » reprenant la décomposition vide, fibre, cuivre et hertzien du projet.
29. Rédiger une fiche de mots croisés générée depuis les termes du glossaire pour fixer le vocabulaire.
30. Générer une fiche d'évaluation formative avec un barème simple et des critères de réussite lisibles par un élève.
31. Implémenter un « carnet de voyage » local qui enregistre chaque voyage exploré et ses étapes marquantes, sans compte.
32. Rendre le carnet exportable en PDF imprimable pour le classeur de l'élève.
33. Créer un « passeport » personnel où chaque continent traversé appose un tampon visuel daté, stocké en local.
34. Faire gagner des tampons de collection pour les étapes remarquables (IXP, traversée océanique, rejet par la lumière).
35. Ajouter une page « mes records » dans le carnet (plus long trajet, plus forte latence, plus de pays traversés).
36. Permettre à l'élève d'annoter une étape par une note personnelle conservée uniquement sur sa machine.
37. Générer une « carte postale » du voyage réunissant le trajet, une illustration et un texte éditable à partager.
38. Construire un « passeport des compétences » listant les notions acquises (latence, AS, câble, IXP) cochées au fil des voyages.
39. Offrir un badge « passé maître de la lumière » lorsqu'un élève repère seul un rejet de géolocalisation.
40. Rendre le carnet reconstituable depuis son propre export (réimporter un fichier de sauvegarde local).
41. Réécrire la narration de chaque saut en une phrase de carnet de bord à la première personne, au ton d'un élève.
42. Ajouter à chaque étape une case « ce que l'on sait, ce que l'on suppose » pour coller au contrat d'honnêteté.
43. Créer un mode « lecture lente » qui dévoile chaque saut un à un avec une pause et une question de relance.
44. Raconter la traversée océanique comme un chapitre à part (entrée en mer, point de non-retour, arrivée).
45. Ajouter un résumé narré de fin de voyage (deux à trois phrases) synthétisant distance, délai et verdict de cohérence.
46. Introduire des transitions scénarisées entre sauts (« le paquet sort de Lyon », « il plonge sous l'Atlantique »).
47. Narrer le moment du rejet par la lumière comme un coup de théâtre explicite et pédagogique.
48. Proposer une version audio de la narration via une synthèse vocale locale pour les élèves qui préfèrent écouter.
49. Ajouter un récit à plusieurs voix où chaque système autonome traversé prend la parole avec son rôle et sa localisation.
50. Produire un journal de bord horodaté fictif qui rythme le voyage à l'échelle des millisecondes, sans heures réelles.
51. Concevoir un jeu « quel est le plancher de lumière ? » où l'élève estime la distance minimale imposée par un délai.
52. Développer un jeu « place la ville » où l'on replace un saut sur la carte à partir de son seul délai.
53. Créer un quiz d'itinéraire où l'élève ordonne les sauts du voyage avant de les comparer à la réalité.
54. Implémenter une démonstration « la lumière la plus rapide » qui trace le disque des positions possibles en temps réel.
55. Construire un simulateur « et si le câble passait par là ? » qui recalcule le plancher de lumière sur un trajet hypothétique.
56. Proposer un jeu d'association où l'on relie chaque câble compatible à ses stations d'atterrissage.
57. Créer un défi « trouve le trombone » où l'élève repère un détour géographique inutile dans un trajet.
58. Ajouter un exercice « vrai délai ou délai louche ? » pour apprendre à repérer les valeurs arrondies suspectes.
59. Construire une démonstration d'« échange internet » montrant comment plusieurs réseaux se rencontrent à un IXP.
60. Développer un jeu de rapidité « nomme la ville en cinq secondes » pour mémoriser la géographie des réseaux.
61. Rédiger une fiche « le trajet en 1987 » comparant le même voyage aujourd'hui et hier, pour l'histoire des réseaux.
62. Créer un encart « d'où vient ce nom de routeur ? » expliquant la lisibilité des noms d'hôtes à l'élève curieux.
63. Ajouter une section « les métiers du réseau » reliant chaque étape à un métier réel (câblier, NOC, opérateur d'IXP).
64. Proposer une carte mentale imprimable du vocabulaire du voyage pour la synthèse en classe.
65. Construire une frise temporelle « la seconde du paquet » milliseconde par milliseconde, replaçant le voyage dans une chronologie.
66. Générer une fiche « je trace un trajet hypothétique » où l'élève imagine un parcours et vérifie sa faisabilité physique.
67. Ajouter un rappel pédagogique « ce que la carte ne dit pas » sur le chemin de retour que traceroute ignore.
68. Créer un « bingo du voyage » avec des cases (pays traversé, IXP atteint, câble compatible) à cocher en direct.
69. Développer un jeu d'évasion léger où l'élève résout une énigme de latence pour débloquer l'étape suivante.
70. Produire un « mémoire de voyage » automatique en images légendées des étapes, feuilletable de bout en bout.
71. Implémenter une « légende guidée » qui surligne sur la carte l'élément dont parle le texte à l'instant donné.
72. Créer une narration alternative « compteur de vitesse » traduisant chaque délai en vitesse effective de la lumière utilisée.
73. Ajouter une vue « coupe sous-marine » en coupe verticale de la traversée océanique (profondeur, câble, navire fictif).
74. Permettre à l'élève de colorier les continents traversés sur une carte à imprimer, assortie des noms de villes.
75. Construire un guide de l'enseignant décrivant trois déroulés types selon la durée disponible de la séance.
76. Générer une fiche d'auto-évaluation « ai-je compris ? » en trois questions à choix multiple avec explication du corrigé.
77. Ajouter un bandeau rotatif « le saviez-vous » diffusant des vérités brèves (un câble peut dépasser 10 000 km).
78. Créer un « dé à démonstration » qui tire une mini-démo aléatoire parmi celles déjà prévues.
79. Rédiger une entrée « la carte est un mensonge prudent » sur la différence entre tracé supposé et trajet réel.
80. Proposer une série « trois voyages à comparer » pour distinguer latence locale, régionale et intercontinentale.
81. Construire un « compteur de sauts » animé qui matérialise la notion de TTL et de saut restant.
82. Ajouter une démo « le dernier kilomètre chez toi » pour expliquer la partie du trajet que traceroute ne voit pas.
83. Créer une fiche « je lis les sources » apprenant à consulter la provenance des données (OpenStreetMap, Natural Earth, RIPE).
84. Implémenter un « mode inspecteur » où l'élève clique chaque valeur pour voir son niveau de certitude (mesuré, déduit, supposé).
85. Générer un quiz final « le grand voyage » mêlant les notions vues, avec un score local et sans compte.
86. Ajouter une section « mon premier traceroute » guidée pas à pas pour accompagner l'élève qui passe au terminal.
87. Produire un « alphabet du réseau » illustré (A comme anycast, B comme bande passante, C comme câble).
88. Construire une démonstration « pourquoi la géolocalisation se trompe » avec un exemple réel de rejet affiché.
89. Créer une frise « de la fibre au serveur » décomposant les équipements physiques traversés du domicile au datacenter.
90. Proposer un « temps de réflexion » chronométré après chaque étape avant de passer à la suivante.
91. Ajouter un mode « deux colonnes » en classe confrontant base de données et plancher de lumière, avec une case pour trancher.
92. Générer une fiche « dessine ton propre réseau » où l'élève trace un schéma de son foyer jusqu'au site distant.
93. Construire un mini-atlas des IXP traversés, avec carte, ville et liste des réseaux qui s'y rencontrent.
94. Créer un « journal des paradoxes » listant les surprises du voyage (détours, incohérences, chemins détournés).
95. Implémenter un narrateur qui pose une question de fin (« sans le retour, que nous manque-t-il ? ») pour la synthèse.
96. Proposer un mode « projection sans animation » au rendu texte seul, compatible avec un matériel de projection ancien.
97. Ajouter une page « l'honnêteté en pratique » montrant aux élèves comment distinguer mesure et supposition.
98. Générer une fiche « compare en 1987 » où l'élève constate quels câbles n'existaient pas encore à cette date.
99. Construire un « badge de série » décerné quand l'élève termine toutes les fiches d'un chapitre, entièrement local.
100. Créer un « mode conteur » final qui assemble carnet, passeport et narration en un récit continu audible de bout en bout.

## 7. Partage & interopérabilité

_07-partage-interop.md_

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

## 8. Agents, MCP & automatisation

_08-agents-mcp-automatisation.md_

1. Ajouter un outil MCP `list_evidence` qui renvoie la liste des artefacts de preuve générés (journaux `docs/evidence/*.log`, rapport de recette) sans jamais toucher le réseau.
2. Ajouter un outil MCP `calibrate_journey` qui exécute `scripts/calibrate.mjs` sur un journey passé hors ligne et renvoie les ratios de localisation par niveau de confiance.
3. Ajouter un outil MCP `redact_share` qui applique la rédaction d'un journey puis renvoie le lien de fragment partageable, entièrement hors ligne.
4. Étendre `explain_journey` avec un filtre `level` (measured/inferred/assumed) pour n'exposer que les faits d'une seule classe de certitude.
5. Ajouter un outil MCP `validate_trace_text` qui détecte BOM, tabulations et lignes illisibles d'un texte collé et renvoie les nettoyages effectués.
6. Ajouter un outil MCP `session_state` qui expose l'état du garde (traces écoulées, cooldown restant en secondes, cap de 20) pour que l'agent planifie ses appels.
7. Ajouter un outil MCP `list_guard_refusals` qui journalise et restitue les refus (approval, cooldown, cap, host invalide) avec leur cause courte.
8. Ajouter un outil MCP `diff_route` qui renvoie le diff structurel minimal de deux journeys (séquence d'ASN, listes de pays, détours présents d'un seul côté).
9. Ajouter un outil MCP `cite_sources` qui rend pour un journey la liste des sources et crédits (ODbL OSM, Natural Earth, table de hints) avec l'URL d'attribution.
10. Ajouter un outil MCP `journey_metadata` qui expose provenance, `traced_at`, version de schéma Zod et licence des données d'un journey.
11. Ajouter un outil MCP `to_geojson` qui sérialise un journey en GeoJSON dans le `structuredContent` de la réponse, sans écriture disque.
12. Ajouter un outil MCP `story_as_markdown` qui restitue le journal de voyage (story) en bloc markdown, chaque entrée portant son niveau de certitude.
13. Ajouter un outil MCP `explain_inflation` qui décompose l'inflation d'un journey par contribution de segment avec chaque borne en km.
14. Ajouter un outil MCP `recommend_next` qui, sur un journey partiel, suggère la preuve suivante (déclarer la ville source, consentir à l'enrichissement, lancer un mtr multi-cycles) avec son coût.
15. Ajouter un outil MCP `trace_rules` qui rappelle à l'agent les limites éthiques VOY-N-02 (un hôte, 5 s, 20/session, approbation) avant tout `trace_host`.
16. Faire renvoyer par `trace_host` un champ `certainty_note` structuré (distance minimale, câbles compatibles, rien d'identifié) plutôt qu'une note texte libre.
17. Documenter et tester le champ `retryAfterSeconds` renvoyé par `trace_host` sur refus de cooldown pour que l'agent réessaie proprement.
18. Exposer dans `tools/list` un champ `dialectVersions` et le numéro de protocole MCP pour verrouiller la compatibilité client/serveur.

19. Créer une skill Kiro `trace-consent` qui guide l'agent pour obtenir une approbation explicite avant tout `trace_host`.
20. Créer une skill Kiro `offline-first` qui impose de toujours préférer `read_trace`/`explain_journey` avant d'envisager un trace.
21. Créer une skill Kiro `v4-v6-detour` dédiée à la comparaison IPv4/IPv6 avec conclusion bornée à deux échantillons, pas une loi.
22. Compléter la skill `latency-investigation` avec un tableau d'exemples de réponse en trois blocs (mesuré/inféré/supposé).
23. Créer une skill Kiro `rejection-explainer` pour expliquer un rejet par la lumière (km autorisés vs nécessaires) sans sur-claimer la géolocalisation.
24. Créer une skill Kiro `gaps-and-tunnels` pour lire sauts silencieux et MPLS en les distinguant d'une anomalie réseau.
25. Créer une skill Kiro `evidence-writer` qui consigne chaque diagnostic dans un fichier d'évidence horodaté rejouable.
26. Créer une skill Kiro `vocab-check` qui fait vérifier le vocabulaire §5.4 par `claims-guard` avant toute réponse à l'utilisateur.
27. Créer une skill Kiro `journey-reader` pour lire et résumer un `journey.json` existant sans aucun trace réseau.
28. Créer une skill Kiro `detour-hunter` qui liste les `country-return`/`zigzag` d'un journey en citant leurs TTL et leur géographie.
29. Créer une skill Kiro `mtr-envelope` pour interpréter une enveloppe mtr multi-cycles et serrer la borne de délai mesurée.
30. Créer une skill Kiro `source-declaration` qui aide l'utilisateur à déclarer sa ville pour passer de bornes relatives à des bornes absolues.
31. Créer une skill Kiro `cable-consensus` qui présente les câbles compatibles sans jamais en désigner un comme emprunté.
32. Créer une skill Kiro `compare-cities` pour comparer deux villes source vers une cible unique et isoler le segment lent.
33. Créer une skill Kiro `agent-selftest` qui vérifie l'instance MCP locale (initialize, tools/list, schemas) avant toute réponse.
34. Créer une skill Kiro `repro-trace` qui impose de citer la commande exacte, la graine et le matériel d'entrée dans tout rapport.
35. Créer une version française de la skill `latency-investigation` pour l'utilisateur non anglophone.

36. Ajouter un hook `PostTaskExecution` qui journalise chaque refus de `trace_host` (cooldown/cap/approval) dans un compteur de preuves.
37. Créer un hook `PreToolUse` sur `shell` qui bloque `voyage trace` vers un hôte absent de `.kiro/probe-allowlist.txt` (miroir CLI du `probe-guard`).
38. Ajouter un hook `PostFileSave` qui refuse une fixture de trace non rédigée sous `gallery/**` ou dans les dossiers de tests.
39. Étendre le `claims-guard` aux sorties MCP (`apps/mcp/**`) pour imposer le vocabulaire §5.4 aux chaînes émises par les outils.
40. Créer un hook `PostFileSave` qui vérifie que chaque outil MCP a un test `vitest` colocalisé non-sondeur.
41. Ajouter un hook `PreToolUse` qui bloque tout appel `trace_host` dont l'argument `approved` n'est pas strictement `true`.
42. Créer un hook `PostFileSave` sur `packages/schema/**` qui revalide les schémas Zod après chaque sauvegarde.
43. Ajouter un hook `PostFileSave` qui refuse un `SKILL.md` sans champ `description` ni `name` valide (lint des skills).
44. Créer un hook `PreToolUse` qui bloque une délégation vers un agent hors du roster autorisé (anti-cascade de sous-agents).
45. Ajouter un hook `PostTaskExecution` qui exige une ligne de journal `KIRO_JOURNAL.md` pour toute tâche de spec clôturée.
46. Créer un hook `PostFileSave` qui refuse une modification de `docs/CONTRACTS.md` sans mention explicite d'intention dans le message.
47. Ajouter un hook `PreToolUse` sur `shell` qui bloque une écriture hors des chemins du lot (respect des frontières d'ownership).
48. Créer un hook `PostFileSave` sur `packages/data/**` qui exige une feuille de provenance à jour (features + sha256) pour chaque dataset.
49. Ajouter un hook `PostFileSave` sur `apps/mcp/src/**` qui revalide les `inputSchema` des outils via Zod.
50. Créer un hook `PreToolUse` qui bloque `trace_host` quand un trace est déjà en vol, en miroir du verrou serveur côté agent.
51. Ajouter un hook `PostFileSave` qui refuse `Math.random` ou `Date.now` dans les chemins de sortie de `packages/core` (déterminisme).
52. Créer un hook `PostFileSave` qui interdit « votre paquet a traversé » dans tout fichier markdown de documentation du dépôt.

53. Créer un agent relecteur `mcp-reviewer` qui relit `apps/mcp/**` contre le contrat §5.13 et les limites VOY-N-02.
54. Créer un agent `skill-reviewer` qui relit les skills contre les steering et la déclaration de power `power/packet-voyage.md`.
55. Étendre `claims-reviewer` avec la relecture des sorties `explain_journey` et `compare_journeys` du serveur MCP.
56. Créer un agent `honesty-auditor` qui audite périodiquement toutes les chaînes utilisateur pour traquer les niveaux de certitude absents.
57. Créer un agent `guard-auditor` qui vérifie que chaque hook a son jumeau CI dans `scripts/guards/**`.
58. Créer un agent `evidence-reviewer` qui valide que chaque point §18 possède son artefact et son log.
59. Créer un agent `privacy-reviewer` qui relit fixtures et traces partagées contre `privacy.md` (RFC 1918/4193, CGNAT, granularité source).
60. Étendre `geo-reviewer` pour couvrir le diff de bornes de `compare_journeys` et la sortie `explain`.
61. Créer un agent `determinism-reviewer` qui chasse tout non-déterminisme dans les nouveaux modules de sortie.
62. Créer un agent `interface-empathy` qui relit les réponses de l'agent face à un utilisateur non technique (clarté, niveau de certitude).
63. Créer un agent `i18n-reviewer` qui vérifie la parité d'honnêteté FR/EN dans les deux fichiers de traduction.
64. Créer un agent `no-probe-reviewer` qui vérifie qu'aucun test ne sonde le réseau et que les fake spawn sont bien en place.
65. Créer un agent `release-gatekeeper` qui lit le journal KIRO et refuse une release sans preuves §18 complètes.
66. Créer un agent `mcp-schema-reviewer` qui vérifie l'invariance entre les `inputSchema` du code et l'annonce `tools/list`.
67. Créer un agent `costs-reviewer` qui évalue le coût en appels réseau (rDNS/RIPEstat) de chaque capacité ajoutée.
68. Créer un agent `nonobjectif-guard` qui signale tout code ou idée flirtant avec un non-objectif (scan, comptes, mesure continue).
69. Étendre `data-curator` avec la mission de préparer les commandes de refresh de cache réseau sous responsabilité humaine, sans exécuter le fetch.

70. Écrire un script `scripts/recipe.mjs` qui exécute les 18 points de `docs/VALIDATION.md` en une commande et produit un rapport JSON.
71. Automatiser la capture des artefacts `docs/evidence/*.log` dans un job CI dédié avec horodatage stable et reproductible.
72. Générer un `docs/evidence/recipe-<date>.json` qui associe chaque point §18 à son statut vert/rouge et à son artefact.
73. Écrire un script `scripts/collect-evidence.mjs` qui rassemble logs de guard, graines et mesures dans un dossier reproductible à volonté.
74. Ajouter un tableau de synthèse (markdown ou HTML) des mesures calibrées (taille, latence, ratios) dans `docs/VALIDATION.md`.
75. Automatiser le remplissage du tableau « Numbers to record » par un script qui lit les sorties des guards et les reporte.
76. Créer un test e2e qui rejoue la recette `voyage trace 127.0.0.1` et verrouille les codes de sortie 2/3/5 attendus.
77. Écrire un script qui vérifie que chaque propriété VOY-P porte sa graine enregistrée dans l'en-tête de son fichier de test.
78. Automatiser la vérification croisée skill ↔ power declaration ↔ liste `tools/list` pour détecter toute dérive de contrat.
79. Ajouter un job CI `recipe` (dans le budget 5 min) qui exécute `pnpm recipe` et échoue si un point n'est pas vert.
80. Générer une page d'évidence (README d'index) renvoyant vers chaque log à partir du rapport de recette.
81. Écrire un script qui diff deux exécutions de recette et liste les régressions de preuves entre deux commits.
82. Automatiser la capture de la CSP et du compteur de requêtes `verify-no-request` dans `docs/evidence/` à chaque build.
83. Ajouter un garde qui refuse une PR sans l'artefact d'évidence associé au changement proposé.
84. Écrire un script de gel (`freeze`) qui fige les nombres mesurés de `docs/VALIDATION.md` avant une release.
85. Automatiser la génération du journal KIRO par tâche à partir des commits, des graines et des durées mesurées.
86. Créer un script `scripts/reproduce.mjs` qui rejoue un contre-exemple de propriété par sa graine et le compare au scar de régression.

87. Écrire un prompt système « agent diagnosticien » qui force une sortie en trois blocs mesuré/inféré/supposé.
88. Créer un gabarit de carte de réponse que l'agent remplit pour chaque diagnostic de latence (mesures, détours, bornes, câbles compatibles).
89. Instrumenter la conversation agent pour tracer chaque appel d'outil MCP et son verdict dans un fichier d'évidence rejouable.
90. Rédiger un exemple de dialogue complet « pourquoi api.example.com est lent » jalonné de niveaux de certitude.
91. Créer un guide de reformulation pour l'agent (jamais « situé à × », toujours « probablement à ×, 2 sources d'accord »).
92. Ajouter une invite d'ouverture qui propose de déclarer la ville source pour passer des bornes relatives aux bornes absolues.
93. Écrire des réponses canoniques pour les quatre refus du garde (`approval_required`, `cooldown_active`, `session_cap_reached`, `invalid_host`).
94. Créer un banc d'échange qui simule un utilisateur non technique et note la clarté et le vocabulaire de l'agent.
95. Définir le contrat de sortie de l'agent (sections obligatoires, champs JSON structurés) pour rendre les réponses fusionnables par la machine.
96. Rédiger un gabarit de question initiale qui explicite le consentement, les limites et l'absence de probe côté hébergé.
97. Créer une matrice de décision exécutable pour l'agent (inflation < 2 → conclure ; > 2 → chercher le détour puis comparer v4/v6).
98. Écrire un scénario « pas de trace possible » où l'agent lit un texte collé et conclut tout de même avec ses bornes.
99. Ajouter une consigne de fin qui propose explicitement le coût de la prochaine preuve (ville source, consentement, cycle mtr).
100. Créer un banc d'évaluation (eval harness) qui note chaque réponse de l'agent contre le vocabulaire §5.4 et les bornes « au moins ».

## 9. Infra & ops

_09-infra-ops.md_

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

## 10. Récit & concours

_10-recit-concours.md_

1. Créer une page « 1987 » qui affiche le même trajet en ne gardant que les câbles déjà en service cette année-là
2. Annoter chaque segment du trajet avec le câble compatible le plus ancien mis en service avant 1987
3. Calculer, pour le trajet de démonstration, la proportion du chemin qui aurait été physiquement impossible en 1987
4. Superposer sur la carte une couche « 1987 » où les câbles postérieurs apparaissent en pointillés
5. Ajouter un curseur temporel animé qui révèle les câbles au fil de leur année de mise en service, de 1987 à aujourd'hui
6. Générer un encart « le voyage en 1987 » comparant le délai théorique de l'époque à celui mesuré aujourd'hui
7. Rédiger un récit narratif court qui suit un paquet imaginaire parti en 1987 et contraint par la vitesse de la lumière
8. Compter les intermédiaires du trajet (stations d'atterrissage, nœuds) qui n'existaient pas encore en 1987
9. Créer une vue « position fantôme » montrant à chaque instant où serait le paquet s'il voyageait à la vitesse d'un réseau de 1987
10. Annoter la notion de chimère dans la légende en expliquant que la carte croise trois couches : année, espace, photons
11. Produire une comparaison côte à côte du même trajet : le grand cercle géographique contre le chemin de câbles possibles
12. Écrire un script qui date le « squelette » du réseau en listant, par pays traversé, les années de mise en service des câbles
13. Ajouter un badge sur chaque câble indiquant son année de mise en service, coloré selon qu'il précède ou suit 1987
14. Créer une infographie réutilisable superposant trois lignes temporelles : photon, câble, saut de routeur
15. Générer un « acte de naissance » de la chimère listant les trois sources croisées avec leurs licences exactes
16. Expliquer dans l'interface la métaphore de la chimère : le trajet n'existe qu'à la rencontre des trois contraintes
17. Ajouter un mode « 1987 » qui grise tout ce qui ne pouvait pas exister à l'époque (IPv6, anycast, certains câbles)
18. Calculer un « indice d'anachronisme » par saut en croisant l'année du standard du protocole et l'année du câble
19. Associer à chaque saut l'année de naissance de sa technologie (ICMP, BGP, MPLS) pour croiser la lumière avec le temps
20. Créer une chronologie verticale du trajet où chaque photon est un point et chaque saut une épaisseur d'années
21. Rédiger pour la page d'accueil une phrase unique et mémorable qui présente la chimère 1987 × géographie × lumière
22. Générer une carte « le monde en 1987 » en retirant les frontières nationales qui n'existaient pas à cette date
23. Comparer la distance à vol d'oiseau avec la longueur cumulée des câbles exprimée en millisecondes de lumière
24. Ajouter un halo lumineux animé qui suit le paquet à la vitesse maximale physiquement autorisée pendant le trajet
25. Produire un récit en trois actes exportable : naissance de la contrainte (1987), traversée (géographie), verdict (lumière)
26. Créer une « carte des refus » superposant le cône de lumière et les câbles rejetés pour montrer ce que la lumière interdit
27. Écrire la légende des symboles de la chimère dans toutes les langues supportées par le site
28. Générer un titre de page et un sous-titre qui marient les trois thèmes sans jargon ni promesse trompeuse
29. Calculer et afficher la distance que la lumière parcourt en exactement une milliseconde comme jauge de référence
30. Créer un comparateur visuel de vitesse (lumière, avion, fibre, câble cuivre) ancré sur le trajet de démonstration
31. Écrire un storyboard de 90 secondes qui suit un trajet, le cône de lumière, puis une infraction détectée
32. Enregistrer le trajet de démonstration dans une taille de fenêtre fixe pour un rendu vidéo homogène
33. Produire d'abord une capture vidéo muette en vérifiant qu'aucune requête ne part pendant l'enregistrement
34. Ajouter un mode « tour automatique » qui anime un trajet complet sans interaction, conçu pour la vidéo
35. Générer des sous-titres chronométrés (SRT) alignés sur les moments clés de la démo
36. Exporter chaque plan de la vidéo comme image indépendante réutilisable dans les slides et le billet
37. Enregistrer une narration hors-ligne qui décrit la chimère en une phrase par plan de la vidéo
38. Ajouter un écran final montrant les trois métriques clés : kilomètres bornés, millisecondes mesurées, rejet par la lumière
39. Créer une introduction de cinq secondes qui nomme le projet et le concours sans logo incohérent
40. Filmer la démo en vitesse réduite puis accélérer le rendu pour maîtriser la durée exacte au dixième
41. Préparer une version muette légendée pour les réseaux qui coupent le son par défaut
42. Choisir un trajet de démonstration dont le rejet par la lumière apparaît dès les premières secondes
43. Vérifier avant l'enregistrement que le trajet de démo ne contient aucune adresse privée ni réseau d'accès
44. Enregistrer la démo deux fois, en thème clair puis sombre, pour illustrer l'accessibilité
45. Afficher une métrique flottante pendant la démo, comme le budget de poids du site ou le temps de calcul
46. Découper une version courte de quinze secondes dans la version longue pour les réseaux sociaux
47. Superposer à la fin de la vidéo le numéro du build et le lien du dépôt comme preuve d'exécution reproductible
48. Enregistrer le flux réseau local pendant le tournage pour prouver que le site n'émet aucune requête
49. Caler un compte à rebours de lumière montrant les millisecondes physiquement restantes pendant le trajet animé
50. Générer une vignette vidéo (poster) à partir de la capture la plus parlante du trajet
51. Rédiger un résumé de deux phrases qui tient dans la limite de caractères du formulaire de soumission
52. Écrire une phrase d'accroche qui commence par le constat honnête plutôt que par une promesse
53. Décrire dans la soumission ce qui est mesuré, ce qui est déduit et ce qui est supposé, en trois listes distinctes
54. Lister le périmètre non couvert (non-objectifs) dans la soumission pour devancer les questions
55. Joindre un lien reproductible du trajet de démonstration avec son fichier source brut
56. Indiquer les licences exactes des données embarquées (ODbL, Natural Earth) et le lien de provenance
57. Mentionner que le site n'émet aucune requête et documenter la commande unique qui le vérifie
58. Inclure la commande CLI unique qui reproduit le trajet, prête à copier-coller dans la soumission
59. Expliquer le choix du nom « Packet Voyage » et la chimère 1987/géographie/lumière en une phrase
60. Ajouter une section « ce que la lumière nous a appris » illustrée par un cas concret de rejet
61. Préciser la durée exacte de la vidéo de démo et sa teneur sans promettre plus qu'elle ne montre
62. Fournir la somme de contrôle et la taille des données embarquées comme preuve de transparence
63. Relire la soumission contre le garde-fou de vocabulaire pour éliminer tout mot interdit
64. Vérifier que la soumission ne mentionne aucune donnée privée ni adresse d'accès
65. Rédiger une version anglaise de la soumission alignée phrase à phrase sur la version française
66. Écrire le billet « la lumière comme test unitaire » à partir d'un test réel qui échoue puis passe grâce à la lumière
67. Publier dans le billet un extrait de code minimal où la distance minimale est déduite du délai mesuré
68. Expliquer la philosophie du « test de non-possibilité » plutôt que la recherche du câble exact
69. Montrer un cas concret où la base de données affirme une chose que la lumière infirme
70. Illustrer l'article avec une capture du cône de lumière qui referme la zone des positions possibles
71. Rédiger une analogie pédagogique qui transforme un délai mesuré en distance révolue de lumière
72. Ajouter au billet un bloc « reproduire chez soi » avec la commande unique qui lance le test
73. Terminer l'article par la limite du test : ce que la lumière ne peut pas trancher
74. Utiliser l'exemple chiffré du §7.14 avec ses nombres exacts comme fil conducteur du billet
75. Citer les sources de données (ODbL, Natural Earth) dans le billet pour la traçabilité complète
76. Rédiger le post principal #KiroweenHackathon26 en moins de 280 caractères, constat honnête en tête
77. Joindre au post une capture du trajet complet avec crédits et cône de lumière visibles
78. Préparer une variante du post par réseau, ajustant longueur, ton et format d'image accepté
79. Programmer la publication au moment où le dépôt est public et le lien effectivement joignable
80. Vérifier que le post ne montre aucune adresse IP privée ni aucune donnée sensible
81. Inclure dans le post le lien du trajet partagé plutôt qu'une capture floue non reproductible
82. Rédiger un fil de suivi qui déroule les trois actes de la chimère sur plusieurs messages successifs
83. Prévoir un message de réponse type à la question récurrente « mais quel câble exactement ? »
84. Ajouter le hashtag officiel du concours et celui du projet sans en inventer d'autres
85. Publier la métrique reine, le rejet par la lumière, comme point d'accroche du post
86. Préparer une image statique carrée 1:1 générée depuis l'export PNG pour l'aperçu social
87. Prévoir la mention des licences de données dans un fil de réponse sous le post principal
88. Publier aussi une version « avant/après » opposant l'affirmation de la base au verdict de la lumière
89. Automatiser la capture des vues principales du site dans une taille d'image identique
90. Générer une planche de captures légendées commune à la soumission et au billet
91. Capturer précisément l'instant où le cône de lumière rejette un câble pourtant compatible
92. Enregistrer en copie d'écran le test unitaire vert avec son numéro de seed visible
93. Produire la capture du budget de poids du site depuis le journal du garde-fou dédié
94. Extraire du journal CI les temps de build et de test pour les citer dans la soumission
95. Réunir les métriques clés (76,7 %, 191,5 kB, 30,6 ms) dans un tableau lisible et sourcé
96. Générer une capture d'écran du tableau de bord des garde-fous tous passés au vert
97. Préparer une capture du trajet de démonstration en mode hors-ligne pour prouver le --offline
98. Capturer la même vue en thème clair puis sombre pour documenter l'accessibilité
99. Annoter chaque capture d'une légende rappelant ce qui est mesuré et ce qui est déduit
100. Produire un export PNG pleine taille du trajet avec crédits, prêt pour la publication

