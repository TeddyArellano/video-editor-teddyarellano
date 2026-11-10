// Protocolo reel-media://p/<id>/<ruta en public/> → archivos de public/ del proyecto abierto, con soporte de Range
// (sin Range el <video> de la vista previa no puede saltar a un cuadro).
import {protocol} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
import {plantillaDir} from './rutas';

export const ESQUEMA = 'reel-media';
const proyectos = new Map<string, {ruta: string; fuentes: string}>(); // id → carpeta proyecto_remotion y del material

export const registrarEsquema = () =>
  protocol.registerSchemesAsPrivileged([
    {scheme: ESQUEMA, privileges: {standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true}},
  ]);

export const servirProyecto = (id: string, ruta: string, fuentes: string) => proyectos.set(id, {ruta, fuentes});
export const dejarDeServir = (id: string) => proyectos.delete(id);
export const baseDe = (id: string) => `${ESQUEMA}://p/${id}/`;

const TIPOS: Record<string, string> = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

// ruta segura dentro de public/ (o edicion/ para hojas de contacto y borrador); null si se sale
export const resolverMedio = (url: string): string | null => {
  const u = new URL(url);
  const partes = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const id = partes.shift();
  if (!id) return null;
  const p = proyectos.get(id);
  if (!p) return null;
  // __edicion/… = edicion/ (hojas, borrador) · __fuente/… = clips originales (escuchar cortes)
  // __plantilla/… = public/ de la plantilla de la skill (fuentes locales) · lo demás = public/ del proyecto
  const raices: Record<string, string> = {__edicion: path.join(p.ruta, 'edicion'), __fuente: p.fuentes, __plantilla: path.join(plantillaDir(), 'public')};
  const base = raices[partes[0]] ?? path.join(p.ruta, 'public');
  if (partes[0] in raices) partes.shift();
  else if (/^__v\d+$/.test(partes[0] ?? '')) partes.shift(); // versión del corte: solo sirve para que el reproductor no reuse el video viejo
  const f = path.resolve(base, ...partes);
  if (!f.startsWith(base + path.sep)) return null;
  return f;
};

export const manejarProtocolo = () =>
  protocol.handle(ESQUEMA, async (req) => {
    const f = resolverMedio(req.url);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('no encontrado', {status: 404});
    const tam = fs.statSync(f).size;
    const tipo = TIPOS[path.extname(f).toLowerCase()] ?? 'application/octet-stream';
    const rango = req.headers.get('range');
    const comunes = {'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache'};
    if (rango) {
      const m = /bytes=(\d*)-(\d*)/.exec(rango);
      let ini = m && m[1] ? Number(m[1]) : 0;
      let fin = m && m[2] ? Number(m[2]) : tam - 1;
      if (m && !m[1] && m[2]) {
        ini = Math.max(0, tam - Number(m[2]));
        fin = tam - 1;
      }
      if (ini >= tam) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${tam}`}});
      fin = Math.min(fin, tam - 1);
      const flujo = Readable.toWeb(fs.createReadStream(f, {start: ini, end: fin})) as ReadableStream;
      return new Response(flujo, {status: 206, headers: {...comunes, 'Content-Range': `bytes ${ini}-${fin}/${tam}`, 'Content-Length': String(fin - ini + 1)}});
    }
    const flujo = Readable.toWeb(fs.createReadStream(f)) as ReadableStream;
    return new Response(flujo, {status: 200, headers: {...comunes, 'Content-Length': String(tam)}});
  });
