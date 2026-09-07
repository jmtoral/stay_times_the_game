/**
 * Servidor estático mínimo para desarrollo local.
 *
 * El juego NO abre con file:// — los .obj se bloquean por CORS. Hay que servir
 * la carpeta por HTTP. Alternativa equivalente si tienes Python:
 *   python -m http.server 8000
 *
 *   node serve.js          → http://localhost:8000
 *   node serve.js 3000     → http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = Number(process.argv[2]) || 8000;
const RAIZ = __dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.obj':  'text/plain; charset=utf-8',
  '.mtl':  'text/plain; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon'
};

http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(RAIZ, rel === '/' ? 'index.html' : rel);

  // Nunca servir fuera de la raíz del proyecto.
  if (!path.resolve(destino).startsWith(path.resolve(RAIZ))) {
    res.writeHead(403).end('403');
    return;
  }

  fs.readFile(destino, (err, buf) => {
    if (err) { res.writeHead(404).end('404: ' + rel); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}).listen(PUERTO, () => {
  console.log(`Stay Time servido en http://localhost:${PUERTO}`);
});
