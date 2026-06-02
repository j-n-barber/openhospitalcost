import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  let p = (req.url || '/').split('?')[0];
  if (p === '/') p = '/index.html';
  try {
    const data = await readFile(join(root, p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(4321, () => console.log('design preview on http://localhost:4321'));
