// Serves the built client from the API process (task P1-D5; TODO.md, Reference R1): one
// process and one port in production. A non-/api path that names a file in the build gets
// that file; any other gets index.html, so the client's router draws the page.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Router } from 'express';

const here = path.dirname(fileURLToPath(import.meta.url));

/** apps/client/dist, where the root `npm run build` puts the client. */
export const CLIENT_DIST = path.resolve(here, '../../client/dist');

/** `dir` when it holds a client build, otherwise undefined (as in development, before a build). */
export function findClientBuild(dir: string = CLIENT_DIST): string | undefined {
  return existsSync(path.join(dir, 'index.html')) ? dir : undefined;
}

export function clientRouter(clientDir: string): Router {
  const router = express.Router();
  const indexFile = path.join(clientDir, 'index.html');

  // Vite names each file under /assets by a hash of its content, so a name never changes
  // meaning and browsers may keep it for a year. A missing one is a 404, never index.html:
  // a stale tab asking for an old script must not be handed a page instead.
  router.use(
    '/assets',
    express.static(path.join(clientDir, 'assets'), { immutable: true, maxAge: '1y', index: false }),
    (_req, res) => {
      res.sendStatus(404);
    },
  );
  router.use(express.static(clientDir, { index: false }));

  // Every other page is the app. index.html names the current scripts, so it is revalidated
  // on each visit; a deploy then reaches open tabs on their next load.
  router.get('/{*path}', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return router;
}
