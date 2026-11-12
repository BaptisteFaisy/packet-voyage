/**
 * Assemble the ten use-case lots into one document, and check the count.
 *
 *   node scripts/assemble-use-cases.mjs            # writes docs/USE-CASES-1000.md
 *   node scripts/assemble-use-cases.mjs --check    # only counts and reports
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'docs', 'use-cases');
const OUT = join(root, 'docs', 'USE-CASES-1000.md');

function casesOf(file) {
  const text = readFileSync(file, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.startsWith('- **UC-'))
    .map((line) => line.trim());
}

function loadSection(name) {
  const raw = readFileSync(join(DIR, name), 'utf8');
  const cases = casesOf(join(DIR, name));
  const heading = raw.split('\n').find((l) => l.startsWith('# ')) ?? `# ${name}`;
  const intro = raw
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('# ') && !l.startsWith('- **UC-'))
    .join(' ');
  return { name, heading: heading.replace(/^#\s*\d*\.\s*/, ''), intro, cases };
}

function problemsOf(sections) {
  const problems = [];
  for (const section of sections) {
    if (section.cases.length !== 100) problems.push(`${section.name}: ${section.cases.length} cas au lieu de 100`);
    const numbers = section.cases
      .map((line) => Number(/\*\*UC-[a-z]+-(\d+)\*\*/.exec(line)?.[1] ?? 0))
      .filter((n) => n > 0);
    const missing = [];
    for (let i = 1; i <= 100; i += 1) if (!numbers.includes(i)) missing.push(i);
    if (missing.length) problems.push(`${section.name}: numéros manquants ${missing.slice(0, 8).join(', ')}`);
  }
  return problems;
}

function buildDocument(sections, total) {
  const index = sections
    .map((s, i) => `| ${i + 1}. ${s.heading} | \`docs/use-cases/${s.name}\` | ${s.cases.length} |`)
    .join('\n');
  const body = sections
    .map((s, i) => `## ${i + 1}. ${s.heading}\n\n${s.intro}\n\n${s.cases.join('\n')}`)
    .join('\n\n');
  return `# Mille cas d'usage pour Packet Voyage

Réservoir produit, produit le 2026-11-12 par dix lots parallèles (un domaine par
lot), puis assemblé ici. **Ce ne sont pas des promesses** : ce sont des situations
réelles que l'outil sait — ou ne sait pas — traiter. Chaque cas respecte le contrat
d'honnêteté du projet : aucune distance sans « au moins », aucun « ce câble a porté
votre paquet », aucune sonde depuis le navigateur.

Les **1000 idées** (ce qu'il reste à construire) sont dans \`docs/IDEAS-1000.md\` ;
les idées livrées sont marquées \`[done]\` dans \`docs/IDEAS.md\`.

| Domaine | Fichier | Cas |
|---|---|---|
${index}

Total : **${total} cas d'usage**.

---

${body}
`;
}

function main() {
  const check = process.argv.includes('--check');
  const sections = readdirSync(DIR).filter((name) => name.endsWith('.md')).sort().map(loadSection);
  const total = sections.reduce((sum, section) => sum + section.cases.length, 0);
  const problems = problemsOf(sections);

  console.log(`fichiers : ${sections.length} · cas : ${total}`);
  for (const problem of problems) console.log(`  - ${problem}`);
  if (check) process.exit(problems.length === 0 && total === 1000 ? 0 : 1);

  const document = buildDocument(sections, total);
  writeFileSync(OUT, document, 'utf8');
  console.log(`écrit : ${OUT} (${document.length} octets)`);
}

main();
