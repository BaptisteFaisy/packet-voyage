/**
 * The loopback static server — one implementation, for every browser proof.
 *
 * The built site is served on 127.0.0.1 only: nothing outside this machine can
 * reach it, and the browser that drives it never leaves the machine either.
 * The exception the no-network guard makes for this file is named, not a
 * folder: it is the single place where a socket is opened (VOY-N-01).
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Where the built site lives. */
export function distDir(root) {
  return join(root, 'apps', 'web', 'dist');
}

/**
 * Serve the built site on loopback. Port 0 asks the system for a free port;
 * a fixed port is what the demo environment uses, so the URL never moves.
 */
export async function serveDist(root, options = {}) {
  const dist = distDir(root);
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`the site is not built (${dist}/index.html is missing) — run \`pnpm build\` first`);
  }
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(dist, path === '/' ? 'index.html' : path);
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  });
  await new Promise((done) => server.listen(options.port ?? 0, '127.0.0.1', done));
  const port = server.address().port;
  return { server, port, origin: `http://127.0.0.1:${port}` };
}
