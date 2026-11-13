/**
 * The ten best use cases, as data the site can render and demonstrate.
 *
 * One entry per case of `docs/USE-CASES-TOP-10.md`, with the journey that makes
 * it real (a gallery slug) and the catalogue block that answers it. The text is
 * bilingual here, like the gallery, rather than spread across the i18n
 * dictionary: it is prose, not a label.
 */
import type { Language } from '../i18n/context.tsx';

export interface UseCase {
  id: string;
  num: number;
  title: { fr: string; en: string };
  persona: { fr: string; en: string };
  question: { fr: string; en: string };
  answer: { fr: string; en: string };
  /** The gallery journey that demonstrates it. */
  slug: string;
  /** The catalogue block that answers it. */
  block: string;
}

function text(fr: string, en: string) {
  return { fr, en };
}

export const USE_CASES: UseCase[] = [
  {
    id: 'op-03',
    num: 1,
    title: text('La position que la physique interdit', 'A position physics forbids'),
    persona: text('Nadir Belkacem, chef de NOC 24/7', 'Nadir Belkacem, 24/7 NOC lead'),
    question: text('Une étape s’affiche à Ashburn alors que le délai mesuré l’interdit.', 'A hop shows as Ashburn, but the measured delay forbids it.'),
    answer: text('Le bandeau « rejetée par la lumière » montre l’arithmétique : c’est la base de géolocalisation qui se trompe, pas le routeur.', 'The “rejected by the light” banner shows the arithmetic: the geolocation base is wrong, not the router.'),
    slug: 'rejected-by-light',
    block: 'hop',
  },
  {
    id: 'op-41',
    num: 2,
    title: text('La coupure de câble', 'The cable cut'),
    persona: text('Karim Ouattara, câblogue', 'Karim Ouattara, cable-layer'),
    question: text('Après la coupure, quels câbles sont en jeu ?', 'After the cut, which cables are at stake?'),
    answer: text('La liste des câbles compatibles de la traversée — sans jamais dire lequel a porté le trafic.', 'The compatible cables of the crossing — never which one carried the traffic.'),
    slug: 'ocean-crossing',
    block: 'map',
  },
  {
    id: 'cl-47',
    num: 3,
    title: text('« Mes données passent-elles par l’océan ? »', '“Do my data cross an ocean?”'),
    persona: text('Gaëlle, consultante cloud', 'Gaëlle, cloud consultant'),
    question: text('Un directeur demande si ses données traversent l’océan.', 'An executive asks whether their data cross an ocean.'),
    answer: text('Une traversée compatible, trois câbles, rien qui dise lequel : la réponse honnête tient devant un client.', 'One compatible crossing, three cables, nothing that says which: the honest answer holds up in front of a client.'),
    slug: 'ocean-crossing',
    block: 'insights',
  },
  {
    id: 'fi-01',
    num: 4,
    title: text('3,1 ms, et une position déduite', '3.1 ms, and a deduced position'),
    persona: text('Claire Ferland, quant', 'Claire Ferland, quant'),
    question: text('3,1 ms est-il compatible avec une liaison directe ?', 'Is 3.1 ms compatible with a direct link?'),
    answer: text('À 3,1 ms, la position déduite est rejetée par la lumière et affichée comme telle.', 'At 3.1 ms the deduced position is rejected by the light, and shown as such.'),
    slug: 'rejected-by-light',
    block: 'hop',
  },
  {
    id: 'so-12',
    num: 5,
    title: text('La formulation qui tient devant un tribunal', 'Wording that holds up in court'),
    persona: text('Anaïs Brissot, juriste de la propriété intellectuelle', 'Anaïs Brissot, intellectual-property lawyer'),
    question: text('Où situer une diffusion hors de l’Union, sans affine ?', 'Where to place a distribution outside the Union, without guessing?'),
    answer: text('La traversée détectée et les câbles compatibles orientent la demande de conservation, sans désigner le câble.', 'The detected crossing and the compatible cables direct the preservation request, without naming a cable.'),
    slug: 'ocean-crossing',
    block: 'story',
  },
  {
    id: 'he-01',
    num: 6,
    title: text('120 ms décomposés', '120 ms, broken down'),
    persona: text('Dr Hélène Marchand, cardiologue au CHU', 'Dr Hélène Marchand, cardiologist'),
    question: text('Le retard de l’image vient-il du trajet ou du serveur ?', 'Does the image lag come from the path or the server?'),
    answer: text('Le plancher de lumière sépare le trajet (88 ms) de l’attente serveur (30 ms).', 'The light floor separates the path (88 ms) from the server wait (30 ms).'),
    slug: 'detour',
    block: 'insights',
  },
  {
    id: 'gp-02',
    num: 7,
    title: text('L’inflation lisible', 'Inflation you can read'),
    persona: text('Yasmine, passionnée de réseau', 'Yasmine, network enthusiast'),
    question: text('Le détour est-il normal, ou absurde ?', 'Is the detour normal, or absurd?'),
    answer: text('Délai mesuré ÷ plancher de lumière : l’inflation dit si le chemin est raisonnable.', 'Measured delay ÷ light floor: inflation says whether the path is reasonable.'),
    slug: 'anycast',
    block: 'insights',
  },
  {
    id: 'ed-02',
    num: 8,
    title: text('Baudelaire et l’inflation', 'Baudelaire, and inflation'),
    persona: text('M. Kowalski, professeur de français en seconde', 'M. Kowalski, a high-school French teacher'),
    question: text('Comment commenter la distance sans prétendre connaître le chemin ?', 'How to speak of distance without claiming to know the path?'),
    answer: text('L’inflation donne un chiffre à commenter — la preuve n’invente pas le chemin.', 'Inflation gives a number worth commenting on — the proof does not invent the path.'),
    slug: 'continental',
    block: 'insights',
  },
  {
    id: 'cy-24',
    num: 9,
    title: text('Le PNG qui remplace une heure de réunion', 'The PNG that replaces an hour of meetings'),
    persona: text('Ibrahim Cissé, ingénieur réseau académique', 'Ibrahim Cissé, academic-network engineer'),
    question: text('Comment porter un trajet dans la revue d’architecture ?', 'How to carry a path into the architecture review?'),
    answer: text('Le PNG porte la carte, les tampons et la certitude : ce qui est mesuré et ce qui est déduit.', 'The PNG carries the map, the stamps and the certainty: what is measured and what is deduced.'),
    slug: 'continental',
    block: 'export',
  },
  {
    id: 'op-73',
    num: 10,
    title: text('Ce que l’outil refuse', 'What the tool refuses to do'),
    persona: text('Antoine Vasseur, responsable SRE télécom', 'Antoine Vasseur, telecom SRE lead'),
    question: text('Peut-on en faire une boucle de supervision continue ?', 'Can this become a continuous monitoring loop?'),
    answer: text('Une trace à la fois, cinq secondes d’écart, vingt par session : la limite est le produit, pas un oubli.', 'One trace at a time, five seconds apart, twenty per session: the limit is the product, not an oversight.'),
    slug: 'with-gaps',
    block: 'limits',
  },
];

export function caseText(c: UseCase, language: Language, field: 'title' | 'persona' | 'question' | 'answer'): string {
  const value = c[field];
  return language === 'fr' ? value.fr : value.en;
}