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