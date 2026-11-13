# Notice de licence des données — `packages/data`

> Ce fichier est la notice propre au paquet de données de Packet Voyage,
> exigée par le cahier des charges (§6.2 point 1, exigence VOY-N-05) et par la
> licence ODbL pour toute distribution dérivée de données OpenStreetMap.

## 1. Séparation code et données

- **Le code source** du paquet `@packet-voyage/data` (`src/`, `scripts/data/`,
  tests) est sous licence **MIT**, identique à la licence générale du dépôt
  Packet Voyage (voir `../../LICENSE`).
- **Les données embarquées** (`datasets/`) et leurs fiches (`provenance/`) sont
  soumises aux licences de leurs sources respectives, détaillées ci-dessous.
  Chaque voyage conserve et restitue la liste des attributions correspondantes
  (exigence VOY-F-48).

## 2. Données redistribuées et licences

| Jeu de données | Fichier | Source | Licence | Attribution obligatoire |
|---|---|---|---|---|
| **Câbles sous-marins** | `datasets/submarine-cables.json` | Contributeurs OpenStreetMap | **ODbL-1.0** (*Open Database License*) | `© OpenStreetMap contributors` |
| **Masses terrestres** | `datasets/landmasses.json` | Natural Earth 110m (miroir nvkelso) | **Domaine public** | `Made with Natural Earth` |
| **Ouvrages fixes** | `datasets/fixed-links.json` | Contributeurs Packet Voyage (faits notoires) | **CC0-1.0** (*Public Domain Dedication*) | `Fixed links: hand-curated by Packet Voyage contributors (CC0); facts not copyrightable, coordinates approximate` |
| **Table d'indices** | `datasets/hints.json` | Contributeurs Packet Voyage (codes IATA + grandes villes) | **CC0-1.0** (*Public Domain Dedication*) | `Hints table: hand-curated by Packet Voyage contributors (CC0); facts not copyrightable, coordinates rounded to 0.01°` |

### 2.1 Câbles sous-marins (ODbL 1.0)

Les géométries et attributs de `datasets/submarine-cables.json` sont dérivés des
données ouvertes d'OpenStreetMap (requête `communication=line` et
`submarine=yes`, conservée dans `scripts/data/cables.overpassql`).

Conformément à la licence ODbL 1.0 :
- Toute base de données dérivée produite à partir de ce fichier doit être mise à
  disposition selon les termes de la licence ODbL 1.0.
- La mention de crédit `© OpenStreetMap contributors` doit figurer sur toute
  carte, vue ou export qui affiche ces tracés (assuré automatiquement par le
  composant de carte de l'application via `creditsFor(['submarine-cables'])`).
- Pour consulter les termes complets de la licence ODbL :
  <https://www.openstreetmap.org/copyright> et
  <https://opendatacommons.org/licenses/odbl/1-0/>.

### 2.2 Masses terrestres (Domaine public)

Les contours simplifiés des masses continentales proviennent du jeu de données
vectoriel *110m Land* de Natural Earth.
- Les données de Natural Earth sont expressément placées dans le domaine
  public : <https://www.naturalearthdata.com/about/terms-of-use/>.
- L'attribution `Made with Natural Earth` est suggérée et incluse dans les
  crédits de l'application.

### 2.3 Ouvrages fixes et table d'indices (CC0 1.0)

La table des ouvrages fixes portant de la fibre (`fixed-links.json`) et la table
de décodage des indices de routeurs (`hints.json`) sont composées
manuellement par les contributeurs de Packet Voyage à partir de faits publics et
notoires (codes d'aéroports IATA, coordonnées géographiques arrondies au
centième de degré).
- Les faits et coordonnées géographiques ne sont pas protégeables par le droit
  d'auteur ; la sélection et l'agencement sont en outre dédiés au domaine
  public selon les termes de la licence **CC0 1.0 Universal** :
  <https://creativecommons.org/publicdomain/zero/1.0/>.
- Aucun code CLLI propriétaire d'opérateur nord-américain n'est inclus (§6.1).

## 3. Données NON redistribuées (§6.1)

Pour respecter scrupuleusement les conditions d'utilisation des sources tierces,
**les données suivantes ne sont JAMAIS embarquées dans le dépôt** :
1. **TeleGeography Submarine Cable Map** : les géométries et fiches de
   TeleGeography ne sont pas libres de redistribution sans contrat payant.
   Elles ne sont **pas** présentes dans ce dépôt. Les tracés proviennent
   exclusivement d'OpenStreetMap.
2. **PeeringDB** : les conditions d'utilisation interdisent la redistribution
   en bloc. L'outil CLI interroge PeeringDB **en direct** depuis la machine de
   l'utilisateur avec son consentement explicite (accord VOY-N-01), et
   conserve un cache local non versionné.
3. **Bases d'adresses IP locales (DB-IP / IPinfo)** : téléchargées par l'outil
   CLI au premier usage dans le dossier de cache local de l'utilisateur, jamais
   versionnées dans le dépôt en raison de leur taille et de leur cycle de mise
   à jour.

## 4. Fiches de provenance

Chaque fichier de données possède une fiche jumelle dans `provenance/<id>.json`
(schéma §6.3 du cahier des charges). Le script de garde automatique
`scripts/guards/data-licence.guard.mjs` vérifie à chaque compilation que chaque
jeu de données possède sa fiche et que son empreinte SHA-256 correspond au
contenu réel sur disque.
