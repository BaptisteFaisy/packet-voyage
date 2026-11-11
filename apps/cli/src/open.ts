/**
 * `--open` support: serve the built web app (`apps/web/dist`) on loopback and
 * point the browser at it (VOY-F-41 "propose d'ouvrir l'interface locale").
 *
 * Loopback only (127.0.0.1), ephemeral port, no shell: the browser opener is
 * spawned with an argv array. When the web dist is absent, say so and print
 * the journey path instead of failing the command.
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import type { CliIo } from './runtime.ts';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

/** Find the built web app: env override first, then the monorepo layout. */
export function findWebDist(io: CliIo): string | null {
  const fromEnv = io.env.PACKET_VOYAGE_WEB_DIST;
  const candidates = [
    ...(fromEnv ? [resolve(fromEnv)] : []),
    resolve(io.cwd, 'apps/web/dist'),
    resolve(io.cwd, '../web/dist'),
    resolve(io.cwd, '../../apps/web/dist'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) return candidate;
  }
  return null;
}

function safeJoin(root: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const full = normalize(join(root, decoded === '/' ? 'index.html' : decoded));
  if (!full.startsWith(root.endsWith(sep) ? root : root + sep) && full !== root) return null;
  return full;
}

/** Serve `webDir` plus the journey JSON on loopback; resolves with the URL. */
export function serveLocalUi(
  webDir: string,
  journeyJson: string,
): Promise<{ url: string; close: () => void }> {
  return new Promise((promiseResolve, promiseReject) => {
    const server = createServer((req, res) => {
      const url = req.url ?? '/';
      if (url === '/journey.json') {
        res.writeHead(200, { 'content-type': MIME['.json'] ?? 'application/json' });
        res.end(journeyJson);
        return;
      }
      const file = safeJoin(webDir, url);
      if (!file || !existsSync(file)) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        return;
      }
      readFile(file)
        .then((body) => {
          res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(500, { 'content-type': 'text/plain' });
          res.end('read error');
        });
    });
    server.once('error', promiseReject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      promiseResolve({
        url: `http://127.0.0.1:${port}/#/`,
        close: () => server.close(),
      });
    });
  });
}

const OPENERS: Record<string, string[]> = {
  darwin: ['open'],
  win32: ['rundll32', 'url.dll,FileProtocolHandler'],
  linux: ['xdg-open'],
};

/** Best-effort browser open; never throws, never uses a shell. */
export function openBrowser(io: CliIo, url: string): void {
  const opener = OPENERS[io.platform];
  if (!opener) return;
  const [command, ...prefix] = opener;
  try {
    const child = spawn(command ?? '', [...prefix, url], {
      shell: false,
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', () => {
      /* the URL was already printed; opening is best-effort */
    });
    child.unref();
  } catch {
    /* best-effort only */
  }
}
