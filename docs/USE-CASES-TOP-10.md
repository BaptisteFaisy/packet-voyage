# Les dix meilleurs cas d'usage

Extrait de `docs/USE-CASES-1000.md` (mille cas, dix domaines). Ce document ne
les invente pas : il les **trie**, et il dit pourquoi.

## Comment le choix a été fait

Cinq critères, appliqués dans l'ordre :

1. **La capacité est unique.** Le cas doit avoir besoin de quelque chose que
   Packet Voyage seul sait faire : le plancher de lumière, le rejet par la
   lumière, les câbles compatibles, la certitude par étape, l'étalonnage, le
   partage sans serveur, le serveur MCP.
2. **Le cas décide.** Il change une décision — une bascule, un ticket, un
   achat, une conduite à tenir — pas une simple curiosité.
3. **Il est concret.** Une personne nommée, une situation, un moment.
4. **Il est honnête.** L'outil peut le faire aujourd'hui, et ses limites rendent
   le cas *plus* solide, pas plus fragile.
5. **Il est démontrable.** Un juge peut le rejouer en une minute.

Le tri mécanique (`scripts/score-use-cases.mjs`) a réduit les 1000 lignes à une
trentaine ; les dix ci-dessous sont le tri humain de cette liste.

## 1. Une position que la physique interdit — UC-op-03

> **UC-op-03** · Nadir Belkacem, chef de NOC 24/7 — Une étape s'affiche à Ashburn alors
> que le délai mesuré l'interdit ; le bandeau « rejetée par la lumière » lui montre
> l'arithmétique. C'est la base de géolocalisation qui se trompe, pas le routeur.

**Pourquoi premier.** C'est la capacité qui n'existe nulle part ailleurs : une
base GeoIP place un routeur à 8 000 km, le délai mesuré ne le permet pas, et
l'outil tranche en montrant le calcul. Le NOC ne devine plus, il **sait où se
trompe**. C'est le cas signature du produit.

**Ce qu'il faut.** Le rejet par la lumière + l'arithmétique affichée : livré.
**La limite qu'il respecte.** L'outil ne dit pas « le routeur est à Paris », il
dit « cette position est impossible à cette distance ».

## 2. La coupure de câble — UC-op-41

> **UC-op-41** · Karim Ouattara, câblogue — Après la coupure du câble au large du cap
> Bonheur, il ouvre la liste des câbles compatibles de la traversée concernée. Il
> sait que la mesure ne dit pas quel câble portait le trafic.

**Pourquoi.** Un câblogue qui doit doubler une traversée obtient une liste
prête à discussing, pas une réponse inventée. Le cas montre la limite qui fait
la valeur : « compatibles », jamais « celui-ci a porté le trafic ».

**Ce qu'il faut.** Traversée maritime + câbles compatibles : livré.

## 3. « Mes données passent-elles par l'océan ? » — UC-cl-47

> **UC-cl-47** · Gaëlle, consultante cloud, doit répondre à un directeur qui demande
> « mes données passent-elles par l'océan ? ». La réponse honnête — une traversée
> maritime est compatible, trois câbles compatibles, rien ne dit lequel — est plus
> solide qu'un « non » ou qu'un « oui » hasardeux.

**Pourquoi.** C'est la question que tout le monde pose et que personne ne peut
répondre honnêtement. Le produit donne une réponse **graduée**, qui tient devant
le client comme devant un dossier. Cas le plus large du lot.

## 4. 3,1 ms et une position déduite — UC-fi-01

> **UC-fi-01** · Claire Ferland, quant — Le 4 mars, elle colle le traceroute de la nuit vers
> le moteur de correspondance d'Euronext Paris et veut savoir si les 3,1 ms
> mesurés sont compatibles avec une liaison directe. Le plancher de lumière
> tranche : à 3,1 ms, la position déduite est rejetée et affichée comme telle.

**Pourquoi.** Enjeu fort, preuve courte : à 3,1 ms, aucune traversée n'est
possible, donc la position déduite est **rejetée par la lumière** et l'écran le
dit. Le produit sert de garde-fou à une décision qui coûte cher.

## 5. La formulation qui tient devant un tribunal — UC-so-12

> **UC-so-12** · Anaïs Brissot, juriste de la propriété intellectuelle — Dans un litige de
> contrefaçon, elle doit situer une diffusion hors de l'Union ; la traversée maritime
> détectée et les câbles compatibles orientent sa demande de conservation, sans
> jamais désigner le câble emprunté. La formulation prudente tient devant un tribunal.

**Pourquoi.** Le cas le plus exigeant sur l'honnêteté : l'outil doit aider sans
surinterpréter. Il donne le fait géographique et la formulation prudente — ni
plus, ni moins.

## 6. 120 ms décomposés — UC-he-01

> **UC-he-01** · Dr Hélène Marchand, cardiologue au CHU de Bordeaux — Avant la réunion de
> 7 h 45, elle lance `voyage trace` vers le serveur d'images et apprend que ses
> 120 ms se décomposent en 88 ms de trajet et 30 ms d'attente serveur. Le plancher
> de lumière sépare la distance parcourue de la file d'attente.

**Pourquoi.** Un public **non réseau**, un enjeu concret (image lagging en
réunion de service), et la décomposition que personne ne fait à la main :
« ce n'est pas le trajet, c'est l'attente ».

## 7. L'inflation lisible depuis un balcon — UC-gp-02

> **UC-gp-02** · Passionnée de réseau — Yasmine bidouille des antennes et veut mesurer
> l'inflation d'un trajet vers un DNS anycast qu'elle teste depuis son balcon. Le
> délai mesuré divisé par le plancher de lumière lui dit si le détour est normal ou
> absurde.

**Pourquoi.** Le grand public est un domaine entier (100 cas) et le mot
« inflation » est le mot le plus lisible du produit : un ratio qu'on peut
répéter à voix haute.

## 8. Baudelaire au lycée — UC-ed-02

> **UC-ed-02** · M. Kowalski, prof de français en seconde au lycée Jean-Moulin à
> Villeurbanne, prépare une séquence sur la distance à partir de Baudelaire.
> L'inflation, délai mesuré divisé par le plancher de lumière, lui donne un chiffre
> propre à commenter sans prétendre connaître le chemin exact.

**Pourquoi.** Un cas où le produit sort du réseau et devient un outil de
vulgarisation : un chiffre vrai, et une formule qui ne prétend rien. Il parle
au jury plus fort que n'importe quel cas d'exploitation.

## 9. Le PNG qui remplace une heure de compte rendu — UC-cy-24

> **UC-cy-24** · Ibrahim Cissé, ingénieur réseau d'un réseau académique — Pour un ticket
> d'interconnexion, il demande une trace au peer et exporte le PNG du trajet pour
> la revue d'architecture. L'image porte les tampons et la certitude, ce qui évite
> une heure de compte rendu verbal.

**Pourquoi.** Un rituel qui existe déjà, dans toutes les équipes réseau : la
revue d'architecture. L'export PNG porte la carte **et** la certitude — l'image
dit ce qui est mesuré et ce qui est déduit.

## 10. Ce que l'outil refuse de faire — UC-op-73

> **UC-op-73** · Antoine Vasseur, responsable SRE télécom — Il refuse l'usage en boucle
> continue : l'outil impose une trace à la fois, cinq secondes d'écart, vingt traces
> par session au plus. La supervision continue reste ailleurs.

**Pourquoi.** Un cas d'usage **négatif** vaut mieux qu'un cas d'usage
supplémentaire : il dit que la limite est le produit, pas un oubli. C'est aussi
la règle du serveur MCP, et elle se démontre en une phrase devant un jury.

## Ce que ces dix cas ont en commun

- Aucun n'a besoin que l'outil **sonde** depuis le navigateur : la mesure vient
  du CLI, sur la machine de la personne, avec son accord.
- Aucun ne repose sur une promesse que le produit ne peut pas tenir : pas de
  « LE câble », pas de « le paquet est passé par là », pas de distance sans
  « au moins ».
- Six des dix sont faisables **aujourd'hui**, sans développement : ce sont des
  cas d'usage, pas des idées.

## Et les 990 autres

Ils sont dans `docs/USE-CASES-1000.md`, dix par domaine, avec le même contrat
d'honnêteté. Les **idées** (ce qu'il reste à construire) restent dans
`docs/IDEAS-1000.md` : un cas d'usage et une idée ne se confondent pas.
