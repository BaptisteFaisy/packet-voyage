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