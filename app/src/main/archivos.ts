// Lectura/escritura de los JSON del proyecto: escritura atómica, detección de conflictos (hash) y respaldos.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {ContenidoArchivo, ResultadoEscritura} from '../shared/tipos';

export const hashTexto = (t: string) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);

export const leerJSON = (f: string): ContenidoArchivo => {
  if (!fs.existsSync(f)) return null;
  const t = fs.readFileSync(f, 'utf8');
  try {
    return {contenido: JSON.parse(t), hash: hashTexto(t)};
  } catch {
    return {contenido: null, hash: hashTexto(t)}; // JSON roto (p. ej. a medio escribir por otro proceso)
  }
};

export const hashArchivo = (f: string) => (fs.existsSync(f) ? hashTexto(fs.readFileSync(f, 'utf8')) : null);

// mismo formato que usa cada archivo hoy: data.json compacto (reel datos usa indent=None), el resto con indentación
const serializar = (f: string, obj: unknown) => (path.basename(f) === 'data.json' ? JSON.stringify(obj) : JSON.stringify(obj, null, 2) + '\n');

const respaldados = new Set<string>(); // un respaldo por archivo y por sesión de la app
export const respaldar = (raiz: string, f: string) => {
  if (respaldados.has(f) || !fs.existsSync(f)) return;
  respaldados.add(f);
  const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const dir = path.join(raiz, 'edicion', 'respaldo', `app-${sello}`);
  const rel = path.relative(raiz, f);
  fs.mkdirSync(path.dirname(path.join(dir, rel)), {recursive: true});
  fs.copyFileSync(f, path.join(dir, rel));
  // se guardan los últimos 15 respaldos de la app
  const base = path.join(raiz, 'edicion', 'respaldo');
  const viejos = fs.readdirSync(base).filter((d) => d.startsWith('app-')).sort();
  for (const d of viejos.slice(0, Math.max(0, viejos.length - 15))) fs.rmSync(path.join(base, d), {recursive: true, force: true});
};

// escribe solo si el archivo sigue como la app lo leyó (hashPrevio); si alguien más (Claude, reel datos) lo cambió → conflicto
export const escribirJSON = (raiz: string, f: string, obj: unknown, hashPrevio: string | null, propias: Set<string>): ResultadoEscritura => {
  const actual = hashArchivo(f);
  if (actual !== null && hashPrevio !== null && actual !== hashPrevio) return {ok: false, conflicto: true, actual: leerJSON(f)};
  respaldar(raiz, f);
  const t = serializar(f, obj);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  const tmp = `${f}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, t);
  fs.renameSync(tmp, f);
  const h = hashTexto(t);
  propias.add(`${f}:${h}`); // el vigilante ignora este cambio (lo hizo la app)
  return {ok: true, hash: h};
};
