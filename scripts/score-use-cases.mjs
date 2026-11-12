/**
 * Score the use cases, to shortlist the best ten.
 *
 * The score is mechanical and explainable — no black box: a case earns points
 * for using a capability only this tool has, for being concrete (a named
 * persona, a situation, an action), and for being demonstrable with what the
 * product does today. The final ten are chosen by reading the shortlist; this
 * script only narrows a thousand lines down to thirty.
 *
 *   node scripts/score-use-cases.mjs            # the shortlist
 *   node scripts/score-use-cases.mjs --top 60   # a longer shortlist
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'docs', 'use-cases');

/** The capabilities that are this product and nothing else. */
const UNIQUE = [
  { re: /rejet[ée]e? par la lumière/i, points: 4, tag: 'rejet par la lumière' },
  { re: /plancher de lumière/i, points: 4, tag: 'plancher de lumière' },
  { re: /câbles? compatibles?/i, points: 4, tag: 'câbles compatibles' },
  { re: /inflation/i, points: 3, tag: 'inflation' },
  { re: /traversée maritime|câble sous-marin|oc[ée]an/i, points: 3, tag: 'traversée' },
  { re: /certitude|déduit|supposé|mesuré/i, points: 2, tag: 'certitude' },
  { re: /étalonnage|calibration/i, points: 3, tag: 'calibration' },
  { re: /lien de partage|fragment/i, points: 2, tag: 'partage sans serveur' },
  { re: /\bMCP\b/i, points: 3, tag: 'MCP' },
  { re: /passeport|tampons?/i, points: 2, tag: 'passeport' },
  { re: /rapport d'incident|GeoJSON|PNG/i, points: 2, tag: 'exports' },
];

/** Signs that the case is concrete rather than generic. */
const CONCRETE = [
  { re: /\d{1,3}\s?(h|min|ms|km|Mo)\b|\b\d{1,2} h\b/, points: 2, tag: 'moment daté' },
  { re: /[A-ZÀ-Ý][a-zà-ÿ]+-?\s*[A-ZÀ-Ý][a-zà-ÿ]+,/, points: 1, tag: 'persona nommée' },
  { re: /il |elle |il\.|elle\.|qui |quand |avant |après |le soir|le matin|chaque /, points: 1, tag: 'situation' },
  { re: /voyage trace|voyage read|voyage explain|voyage export|voyage share|voyage compare/, points: 1, tag: 'commande' },
  { re: /colle|copie le|importe|partage le lien|ouvre le voyage/, points: 1, tag: 'usage du produit' },
];

function scoreLine(line) {
  let points = 0;
  const tags = [];
  for (const rule of UNIQUE) {
    if (rule.re.test(line)) {
      points += rule.points;
      tags.push(rule.tag);
    }
  }
  for (const rule of CONCRETE) {
    if (rule.re.test(line)) {
      points += rule.points;
      tags.push(rule.tag);
    }
  }
  return { points, tags };
}

function main() {
  const arg = process.argv.indexOf('--top');
  const top = arg > 0 ? Number(process.argv[arg + 1]) : 30;
  const files = readdirSync(DIR).filter((name) => name.endsWith('.md')).sort();
  const scored = [];
  for (const name of files) {
    const raw = readFileSync(join(DIR, name), 'utf8');
    for (const line of raw.split('\n')) {
      if (!line.startsWith('- **UC-')) continue;
      const { points, tags } = scoreLine(line);
      scored.push({ file: name, line: line.trim(), points, tags });
    }
  }
  scored.sort((a, b) => b.points - a.points || a.line.localeCompare(b.line));
  console.log(`cas scannés : ${scored.length} · shortlist : ${top}`);
  for (const entry of scored.slice(0, top)) {
    console.log(`\n[${entry.points}] ${entry.tags.join(', ')}\n${entry.line}`);
  }
}

main();
